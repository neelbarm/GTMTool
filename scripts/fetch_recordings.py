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
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests  # noqa: E402

from app.artifacts import format_offset  # noqa: E402
from app.config import ConfigError, get_settings  # noqa: E402
from app.telephony import build_client  # noqa: E402


def convert_to_mp3(wav: Path) -> Path:
    mp3 = wav.with_suffix(".mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "64k", str(mp3)],
        check=True,
    )
    return mp3


def align_transcripts(out_dir: Path, meta: dict, rec) -> float:
    """Shift transcript timestamps onto the recording's clock.

    The bridge measures offsets from the moment the Media Stream opens, which is
    when the call is *answered*. Twilio starts recording when the call is
    *initiated*, so every transcript timestamp sits later in the audio than its
    number suggests, by however long the line rang. Since the documented
    validation step is "listen at the timestamp given", that gap has to be closed
    or every citation in the bug report points at the wrong moment.

    Returns the shift in seconds.
    """
    stream_started = datetime.fromisoformat(meta["started_at"])
    recording_started = rec.start_time
    if recording_started is None:
        return 0.0
    if recording_started.tzinfo is None:
        recording_started = recording_started.replace(tzinfo=timezone.utc)

    shift = (stream_started - recording_started).total_seconds()
    if shift <= 0:
        return 0.0

    transcript_json = out_dir / "transcript.json"
    if not transcript_json.exists():
        return shift

    turns = json.loads(transcript_json.read_text(encoding="utf-8"))
    for turn in turns:
        turn["at_stream"] = turn["at"]
        turn["at"] = round(turn["at"] + shift, 2)
    transcript_json.write_text(json.dumps(turns, indent=2), encoding="utf-8")

    lines = [
        f"[{format_offset(t['at'])}] {t['speaker']}: {t['text']}"
        for t in sorted(turns, key=lambda t: t["at"])
    ]
    (out_dir / "transcript.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  shifted transcript by {shift:.1f}s to match the recording")
    return shift


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
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta["recording_sid"] = rec.sid
        meta["recording_channels"] = rec.channels
        meta["recording_duration_seconds"] = rec.duration
        shift = align_transcripts(out_dir, meta, rec)
        meta["recording_offset_seconds"] = shift
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
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
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
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
