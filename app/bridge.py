"""The Twilio <-> OpenAI Realtime relay. This is the part that has to sound good.

Design notes that matter more than the code:

*Audio never gets transcoded.* Twilio Media Streams carry base64 G.711 mu-law at
8 kHz, and the Realtime API accepts and emits the same, so frames are handed
across untouched. Every resample would add latency to a budget the listener
can hear.

*Interruption is handled on both sides.* When the agent starts talking over us we
tell OpenAI to truncate the assistant item (so the model's memory matches what
was actually heard) AND send Twilio a `clear` (so audio already sitting in
Twilio's buffer is dropped). Doing only the first is the classic bug: the model
believes it stopped, and the caller keeps hearing it talk for another two
seconds.

*Event names are checked against a set, not a string.* The Realtime API renamed
several events between beta and GA. Accepting both spellings costs three lines
and avoids a silent no-audio failure if this runs against a different API
version than the one it was written for.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from pathlib import Path
from typing import Any

import websockets
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.artifacts import CallArtifacts
from app.config import get_settings
from app.scenario import END_CALL_TOOL, build_prompt, find_scenario

log = logging.getLogger("voice-tester.bridge")

REALTIME_URL = "wss://api.openai.com/v1/realtime?model={model}"

# Twilio speaks G.711 mu-law. The GA Realtime API takes a format object; the beta
# took a bare string. We send the GA shape and log whatever the server echoes back
# so a mismatch shows up in the first ten seconds rather than as static.
MULAW_FORMAT = {"type": "audio/pcmu"}

# Both spellings of the events we care about, beta and GA.
AUDIO_DELTA = {"response.audio.delta", "response.output_audio.delta"}
AUDIO_DONE = {"response.audio.done", "response.output_audio.done"}
PATIENT_TRANSCRIPT = {
    "response.audio_transcript.done",
    "response.output_audio_transcript.done",
}
AGENT_TRANSCRIPT = {"conversation.item.input_audio_transcription.completed"}
SPEECH_STARTED = {"input_audio_buffer.speech_started"}

# If neither side has said anything this long after connecting, say hello rather
# than sit in mutual silence.
OPENING_SILENCE_SECONDS = 3.0


def session_config(scenario, settings) -> dict[str, Any]:
    return {
        "type": "session.update",
        "session": {
            "type": "realtime",
            "instructions": build_prompt(scenario),
            "output_modalities": ["audio"],
            "audio": {
                "input": {
                    "format": MULAW_FORMAT,
                    "transcription": {"model": "gpt-4o-mini-transcribe"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        # Phone agents leave real gaps mid-sentence. 700ms stops
                        # us cutting them off; see docs/iteration-log.md.
                        "silence_duration_ms": 700,
                    },
                },
                "output": {
                    "format": MULAW_FORMAT,
                    "voice": settings.realtime_voice,
                },
            },
            "tools": [END_CALL_TOOL],
            "tool_choice": "auto",
        },
    }


class Bridge:
    def __init__(self, twilio_ws: WebSocket) -> None:
        self.twilio = twilio_ws
        self.settings = get_settings()
        self.openai: Any = None
        self.art: CallArtifacts | None = None
        self.scenario = None

        self.stream_sid: str | None = None
        self.call_sid: str | None = None
        self.done = asyncio.Event()
        self.completion_reason = "unknown"

        # Playback bookkeeping, all in Twilio's stream-relative milliseconds.
        self.latest_media_ms = 0
        self.response_start_ms: int | None = None
        self.current_item_id: str | None = None
        self.marks: list[str] = []
        self.heard_anything = False

    # ---------- lifecycle ----------

    async def run(self) -> None:
        if not await self._await_start():
            return
        model = self.settings.realtime_model
        async with websockets.connect(
            REALTIME_URL.format(model=model),
            additional_headers={
                "Authorization": f"Bearer {self.settings.openai_api_key}"
            },
            max_size=None,
        ) as openai_ws:
            self.openai = openai_ws
            await openai_ws.send(json.dumps(session_config(self.scenario, self.settings)))
            self.art.event("session_configured", model=model)

            tasks = [
                asyncio.create_task(self._pump_twilio()),
                asyncio.create_task(self._pump_openai()),
                asyncio.create_task(self._watchdog()),
                asyncio.create_task(self._opening_nudge()),
            ]
            try:
                await self.done.wait()
            finally:
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)

    async def _await_start(self) -> bool:
        """Block until Twilio's `start` event; set up the scenario and artifacts."""
        while True:
            try:
                message = json.loads(await self.twilio.receive_text())
            except (WebSocketDisconnect, RuntimeError):
                return False
            if message.get("event") != "start":
                continue

            start = message["start"]
            self.stream_sid = start["streamSid"]
            self.call_sid = start.get("callSid")
            params = start.get("customParameters", {}) or {}
            scenario_id = params.get("scenario", "")
            call_id = params.get("call_id") or self.call_sid or "unknown-call"

            self.scenario = find_scenario(scenario_id)
            self.art = CallArtifacts(self.settings.artifacts_dir, call_id)
            self.art.event(
                "stream_start",
                stream_sid=self.stream_sid,
                call_sid=self.call_sid,
                scenario=self.scenario.id,
            )
            log.info("stream start: call=%s scenario=%s", call_id, self.scenario.id)
            return True

    # ---------- Twilio -> OpenAI ----------

    async def _pump_twilio(self) -> None:
        try:
            while True:
                message = json.loads(await self.twilio.receive_text())
                event = message.get("event")

                if event == "media":
                    self.latest_media_ms = int(message["media"]["timestamp"])
                    await self.openai.send(
                        json.dumps(
                            {
                                "type": "input_audio_buffer.append",
                                "audio": message["media"]["payload"],
                            }
                        )
                    )
                elif event == "mark":
                    if self.marks:
                        self.marks.pop(0)
                elif event == "stop":
                    self.art.event("stream_stop")
                    self._finish("twilio_stop")
                    return
        except (WebSocketDisconnect, RuntimeError):
            self.art.event("twilio_disconnected")
            self._finish("twilio_disconnected")
        except Exception as exc:
            log.exception("twilio pump died")
            self.art.event("error", where="twilio_pump", detail=str(exc))
            self._finish("error")

    # ---------- OpenAI -> Twilio ----------

    async def _pump_openai(self) -> None:
        try:
            async for raw in self.openai:
                event = json.loads(raw)
                kind = event.get("type", "")

                if kind in AUDIO_DELTA:
                    await self._play(event)
                elif kind in SPEECH_STARTED:
                    self.heard_anything = True
                    await self._handle_barge_in()
                elif kind in PATIENT_TRANSCRIPT:
                    self.art.turn("PATIENT", event.get("transcript", ""))
                elif kind in AGENT_TRANSCRIPT:
                    self.heard_anything = True
                    self.art.turn("AGENT", event.get("transcript", ""))
                elif kind == "response.function_call_arguments.done":
                    await self._handle_tool_call(event)
                elif kind in AUDIO_DONE:
                    self.response_start_ms = None
                    self.current_item_id = None
                elif kind == "session.updated":
                    # Echoes the audio format the server actually accepted.
                    self.art.event(
                        "session_updated",
                        audio=event.get("session", {}).get("audio"),
                    )
                elif kind == "error":
                    log.error("realtime error: %s", event.get("error"))
                    self.art.event("realtime_error", detail=event.get("error"))
        except websockets.exceptions.ConnectionClosed:
            self.art.event("realtime_closed")
            self._finish("realtime_closed")
        except Exception as exc:
            log.exception("openai pump died")
            self.art.event("error", where="openai_pump", detail=str(exc))
            self._finish("error")

    async def _play(self, event: dict[str, Any]) -> None:
        """Forward one chunk of generated audio to the call."""
        payload = event.get("delta")
        if not payload:
            return
        if self.response_start_ms is None:
            self.response_start_ms = self.latest_media_ms
            self.current_item_id = event.get("item_id")

        await self.twilio.send_text(
            json.dumps(
                {
                    "event": "media",
                    "streamSid": self.stream_sid,
                    "media": {"payload": payload},
                }
            )
        )
        # A mark per chunk tells us when Twilio has finished playing it, which is
        # how we know whether there is still audio in flight to clear.
        mark = f"m{len(self.marks)}"
        self.marks.append(mark)
        await self.twilio.send_text(
            json.dumps(
                {
                    "event": "mark",
                    "streamSid": self.stream_sid,
                    "mark": {"name": mark},
                }
            )
        )

    async def _handle_barge_in(self) -> None:
        """The agent started speaking. Stop ours, on both sides."""
        if self.scenario.barge_in:
            return  # this scenario deliberately talks over the agent
        if not self.marks or self.response_start_ms is None:
            return

        spoken_ms = max(0, self.latest_media_ms - self.response_start_ms)
        if self.current_item_id:
            await self.openai.send(
                json.dumps(
                    {
                        "type": "conversation.item.truncate",
                        "item_id": self.current_item_id,
                        "content_index": 0,
                        "audio_end_ms": spoken_ms,
                    }
                )
            )
        await self.twilio.send_text(
            json.dumps({"event": "clear", "streamSid": self.stream_sid})
        )
        self.art.event("barge_in", truncated_at_ms=spoken_ms)

        self.marks.clear()
        self.response_start_ms = None
        self.current_item_id = None

    async def _handle_tool_call(self, event: dict[str, Any]) -> None:
        if event.get("name") != "end_call":
            return
        try:
            args = json.loads(event.get("arguments") or "{}")
        except json.JSONDecodeError:
            args = {}
        reason = args.get("reason", "other")
        self.art.event("end_call_tool", reason=reason, summary=args.get("summary"))
        log.info("model asked to hang up: %s", reason)
        # Let the goodbye finish playing out before we cut the line.
        await asyncio.sleep(1.5)
        self._finish(f"model_ended:{reason}")

    # ---------- termination ----------

    async def _watchdog(self) -> None:
        await asyncio.sleep(self.settings.max_call_seconds)
        self.art.event("max_duration_reached")
        log.warning("hard stop at %ss", self.settings.max_call_seconds)
        self._finish("max_duration")

    async def _opening_nudge(self) -> None:
        """Break a mutual-silence standoff if neither side opens."""
        await asyncio.sleep(OPENING_SILENCE_SECONDS)
        if self.heard_anything:
            return
        self.art.event("opening_nudge")
        await self.openai.send(
            json.dumps(
                {
                    "type": "response.create",
                    "response": {"instructions": "Say a short natural hello."},
                }
            )
        )

    def _finish(self, reason: str) -> None:
        if not self.done.is_set():
            self.completion_reason = reason
            self.done.set()


async def run_bridge(twilio_ws: WebSocket) -> None:
    bridge = Bridge(twilio_ws)
    try:
        await bridge.run()
    finally:
        art = bridge.art
        if art is not None:
            art.write_transcripts()
            art.write_metadata(
                scenario_id=bridge.scenario.id if bridge.scenario else None,
                twilio_call_sid=bridge.call_sid,
                source_number=bridge.settings.twilio_phone_number,
                destination=bridge.settings.allowed_destination,
                realtime_model=bridge.settings.realtime_model,
                realtime_voice=bridge.settings.realtime_voice,
                termination_reason=bridge.completion_reason,
            )
            art.close()
            log.info("artifacts written to %s", art.dir)
        _hangup(bridge)


def _hangup(bridge: Bridge) -> None:
    """Make sure the leg is actually torn down, whatever went wrong."""
    if not bridge.call_sid:
        return
    try:
        from app.telephony import build_client

        build_client(bridge.settings).calls(bridge.call_sid).update(status="completed")
    except Exception as exc:
        log.debug("hangup skipped (%s) — call likely already ended", exc)
