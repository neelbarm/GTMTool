#!/usr/bin/env python3
"""Place one test call.

    python scripts/run_call.py --scenario scenarios/07_weekend_booking.yaml

Requires the FastAPI server and a tunnel to already be running — see README.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import ConfigError, get_settings  # noqa: E402
from app.scenario import load_scenario  # noqa: E402
from app.telephony import DestinationNotAllowed, place_assessment_call  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Call the assessment line once.")
    parser.add_argument("--scenario", required=True, help="Path to a scenario YAML")
    parser.add_argument(
        "--label", help="Override the artifact directory name (default: NN-scenario-id)"
    )
    args = parser.parse_args()

    try:
        settings = get_settings()
    except ConfigError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    scenario_path = Path(args.scenario)
    scenario = load_scenario(scenario_path)
    call_id = args.label or f"{datetime.now():%H%M}-{scenario.slug}"

    print(f"scenario   {scenario.id}")
    print(f"goal       {scenario.primary_goal}")
    print(f"from       {settings.twilio_phone_number}")
    print(f"to         {settings.allowed_destination}")
    print(f"artifacts  {settings.artifacts_dir / call_id}")

    try:
        sid = place_assessment_call(
            settings,
            scenario_id=scenario_path.stem,
            call_id=call_id,
        )
    except DestinationNotAllowed as exc:
        print(f"blocked: {exc}", file=sys.stderr)
        return 3

    print(f"\ncall sid   {sid}")
    print("Listen in on the server logs. Artifacts land when the call ends.")
    print(f"Then: python scripts/fetch_recordings.py --call-sid {sid} --call-id {call_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
