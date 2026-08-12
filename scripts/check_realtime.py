#!/usr/bin/env python3
"""Preflight: does the Realtime API accept our session config?

The audio format block changed shape between the beta and GA Realtime APIs, and a
wrong format does not error politely on a phone call — it plays static. This opens
a session, sends the exact config the bridge sends, and prints what comes back, so
the answer costs a second instead of a phone call.

    python scripts/check_realtime.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import websockets  # noqa: E402

from app.bridge import REALTIME_URL, session_config  # noqa: E402
from app.config import ConfigError, get_settings  # noqa: E402
from app.scenario import find_scenario  # noqa: E402


async def main() -> int:
    try:
        settings = get_settings()
    except ConfigError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    scenario = find_scenario("01_new_appointment")
    url = REALTIME_URL.format(model=settings.realtime_model)
    print(f"connecting to {settings.realtime_model} ...")

    async with websockets.connect(
        url,
        additional_headers={"Authorization": f"Bearer {settings.openai_api_key}"},
        max_size=None,
    ) as ws:
        await ws.send(json.dumps(session_config(scenario, settings)))
        for _ in range(10):
            event = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
            kind = event.get("type")
            if kind == "session.updated":
                audio = event.get("session", {}).get("audio", {})
                print("\nOK — session accepted. Audio the server agreed to:")
                print(json.dumps(audio, indent=2))
                print(
                    "\nBoth input and output format should be mu-law. If they say "
                    "pcm16, the format block was ignored and Twilio will hear static."
                )
                return 0
            if kind == "error":
                print("\nREJECTED:", json.dumps(event.get("error"), indent=2))
                print(
                    "\nFix app/bridge.py MULAW_FORMAT against the current Realtime "
                    "docs, then re-run this."
                )
                return 1
    print("no session.updated received")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
