"""Regression tests for the playback and turn-ordering bugs found in review.

These are subtle enough to reintroduce by accident, and both fail silently on a
real call — the first as a bot that talks over the agent, the second as a
transcript that reads out of order. Neither shows up as an exception.
"""

from __future__ import annotations

import asyncio
import json
import time

import pytest

from app.artifacts import CallArtifacts
from app.bridge import Bridge
from app.config import Settings
from app.scenario import find_scenario


class FakeTwilio:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send_text(self, payload: str) -> None:
        self.sent.append(json.loads(payload))

    def of_type(self, event: str) -> list[dict]:
        return [m for m in self.sent if m.get("event") == event]


class FakeOpenAI:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send(self, payload: str) -> None:
        self.sent.append(json.loads(payload))

    def types(self) -> list[str]:
        return [m["type"] for m in self.sent]


@pytest.fixture
def bridge(tmp_path):
    b = Bridge.__new__(Bridge)
    b.settings = Settings(
        twilio_account_sid="ACtest",
        twilio_auth_token="tok",
        twilio_phone_number="+13334445555",
        openai_api_key="sk-test",
        public_base_url="https://abc.ngrok.app",
    )
    b.twilio = FakeTwilio()
    b.openai = FakeOpenAI()
    b.art = CallArtifacts(tmp_path, "test-call")
    b.scenario = find_scenario("01_new_appointment")
    b.stream_sid = "MZ1"
    b.marks = []
    b.latest_media_ms = 0
    b.response_start_ms = None
    b.current_item_id = None
    b.agent_started_at = None
    b.patient_started_at = None
    b.heard_anything = False
    yield b
    b.art.close()


async def _queue_audio(bridge, chunks: int = 40) -> None:
    for _ in range(chunks):
        await bridge._play({"delta": "AAAA", "item_id": "item_1"})


def test_barge_in_clears_twilio_after_generation_finished(bridge):
    """The bug: the model finishes generating long before Twilio finishes
    playing, so gating the `clear` on generation state skips it during exactly
    the window where the caller can still hear us."""
    asyncio.run(_queue_audio(bridge))
    assert len(bridge.marks) == 40, "audio should still be queued at Twilio"

    # response.audio.done arrives — must not disturb playback state.
    assert bridge.response_start_ms is not None

    bridge.latest_media_ms = 900
    asyncio.run(bridge._handle_barge_in())

    assert bridge.twilio.of_type("clear"), "no clear sent; caller keeps hearing us"
    assert "conversation.item.truncate" in bridge.openai.types()


def test_playback_state_resets_only_when_marks_drain(bridge):
    asyncio.run(_queue_audio(bridge, chunks=3))
    assert bridge.response_start_ms is not None

    for _ in range(2):
        bridge.marks.pop(0)
    assert bridge.response_start_ms is not None, "reset too early — still audible"

    bridge.marks.pop(0)
    bridge._reset_playback()
    assert bridge.response_start_ms is None
    assert bridge.current_item_id is None


def test_no_clear_when_nothing_is_queued(bridge):
    asyncio.run(bridge._handle_barge_in())
    assert not bridge.twilio.of_type("clear")


def test_barge_in_scenario_never_interrupts_itself(bridge):
    bridge.scenario = find_scenario("09_interruption")
    assert bridge.scenario.barge_in is True
    asyncio.run(_queue_audio(bridge))
    asyncio.run(bridge._handle_barge_in())
    assert not bridge.twilio.of_type("clear"), "barge-in scenario should not yield"


def test_transcript_ordered_by_when_spoken_not_when_transcribed(bridge):
    """Input transcription is async and can land after a later patient turn."""
    bridge.art.turn("PATIENT", "second thing", 20.0)
    bridge.art.turn("AGENT", "first thing", 10.0)
    bridge.art.write_transcripts()

    text = (bridge.art.dir / "transcript.txt").read_text(encoding="utf-8")
    assert text.index("first thing") < text.index("second thing")
    assert text.startswith("[00:10] AGENT:")


def test_drain_waits_for_playback_then_gives_up(bridge):
    bridge.marks = ["m0"]

    async def scenario():
        async def clear_soon():
            await asyncio.sleep(0.2)
            bridge.marks.clear()

        asyncio.create_task(clear_soon())
        start = time.monotonic()
        await bridge._drain_playback(timeout=5)
        return time.monotonic() - start

    waited = asyncio.run(scenario())
    assert 0.15 < waited < 2.0, f"drain should track playback, waited {waited:.2f}s"


def test_drain_gives_up_if_a_mark_never_arrives(bridge):
    bridge.marks = ["m0"]
    start = time.monotonic()
    asyncio.run(bridge._drain_playback(timeout=0.5))
    assert time.monotonic() - start < 2.0, "drain must be capped"
