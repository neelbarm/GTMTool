#!/usr/bin/env python3
"""Download the Twilio recording for a call and convert it to MP3.

Twilio records two-party calls dual-channel, so the WAV it hands back already has
both sides — there is nothing to mix locally. We keep the WAV as the higher-quality
original (gitignored) and commit the MP3, which is what the submission asks for.

    python scripts/fetch_recordings.py --call-sid CAxxxx --call-id 1432-weekend-booking
    python scripts/fetch_recordings.py --all
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests  # noqa: E402

from app.config import ConfigError, get_settings  # noqa: E402
from app.telephony import build_client  # noqa: E402


def convert_to_mp3(wav: Path) -> Path:
    mp3 = wav.with_suffix(".mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "64k", str(mp3)],
        check=True,
    )
    return mp3


def fetch_one(settings, call_sid: str, call_id: str) -> bool:
    client = build_client(settings)
    recordings = list(client.recordings.list(call_sid=call_sid, limit=5))
    if not recordings:
        print(f"  no recording yet for {call_sid} (Twilio can lag a few seconds)")
        return False

    rec = recordings[0]
    out_dir = settings.artifacts_dir / call_id
    out_dir.mkdir(parents=True, exist_ok=True)
    wav = out_dir / "recording.wav"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Recordings/{rec.sid}.wav"
    response = requests.get(
        url,
        auth=(settings.twilio_account_sid, settings.twilio_auth_token),
        timeout=120,
    )
    response.raise_for_status()
    wav.write_bytes(response.content)

    mp3 = convert_to_mp3(wav)
    print(f"  {mp3}  ({rec.channels} channel(s), {rec.duration}s)")

    meta_path = out_dir / "metadata.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        meta["recording_sid"] = rec.sid
        meta["recording_channels"] = rec.channels
        meta["recording_duration_seconds"] = rec.duration
        meta_path.write_text(json.dumps(meta, indent=2))
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--call-sid")
    parser.add_argument("--call-id")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Fetch for every artifact directory that has a call SID but no MP3",
    )
    args = parser.parse_args()

    try:
        settings = get_settings()
    except ConfigError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.all:
        for meta_path in sorted(settings.artifacts_dir.glob("*/metadata.json")):
            meta = json.loads(meta_path.read_text())
            sid = meta.get("twilio_call_sid")
            if not sid or (meta_path.parent / "recording.mp3").exists():
                continue
            print(meta_path.parent.name)
            fetch_one(settings, sid, meta_path.parent.name)
        return 0

    if not (args.call_sid and args.call_id):
        parser.error("need --call-sid and --call-id, or --all")
    print(args.call_id)
    return 0 if fetch_one(settings, args.call_sid, args.call_id) else 1


if __name__ == "__main__":
    raise SystemExit(main())
