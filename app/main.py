"""FastAPI app: health check, the Twilio voice webhook, and the Media Stream socket."""

from __future__ import annotations

import logging
from xml.sax.saxutils import quoteattr

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import PlainTextResponse

from app.bridge import run_bridge
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s"
)
log = logging.getLogger("voice-tester")

app = FastAPI(title="Pretty Good AI voice tester")


@app.get("/health")
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "model": settings.realtime_model,
        "stream_url": settings.websocket_url,
    }


@app.post("/voice")
async def voice(request: Request) -> PlainTextResponse:
    """TwiML for an outbound call. Connects the leg to our WebSocket.

    <Connect> is terminal — TwiML after it never executes — so the stream is the
    last thing in the document. Recording is switched on at call creation
    (app/telephony.py) rather than here, for that reason.

    The scenario and call id ride along as <Parameter> children, which Twilio
    hands back in the stream's `start` event as customParameters. That is how the
    socket knows which patient it is playing without any shared state between
    this process and the CLI.
    """
    settings = get_settings()
    scenario_id = request.query_params.get("scenario", "")
    call_id = request.query_params.get("call_id", "")
    log.info("voice webhook: scenario=%s call_id=%s", scenario_id, call_id)

    # quoteattr, not an f-string alone: a scenario or label containing & or "
    # would otherwise produce malformed TwiML, which Twilio rejects (12100) after
    # the CLI has already told the user the call was placed.
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url={quoteattr(settings.websocket_url)}>
      <Parameter name="scenario" value={quoteattr(scenario_id)} />
      <Parameter name="call_id" value={quoteattr(call_id)} />
    </Stream>
  </Connect>
</Response>"""
    return PlainTextResponse(content=twiml, media_type="text/xml")


@app.websocket("/stream")
async def stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await run_bridge(websocket)
    except Exception:
        log.exception("bridge failed")
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass  # already closed by Twilio
