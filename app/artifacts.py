"""Per-call artifact directory: events, metadata, transcripts.

Timestamps are recorded two ways. Wall clock answers "when did this happen in the
world", which is what you need to line an event up with a Twilio recording.
A monotonic offset from stream start answers "where is this in the call", which
is what goes in the transcript and the bug report, and does not jump if the host
clock is adjusted mid-call.
"""

from __future__ import annotations

import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def format_offset(seconds: float) -> str:
    """0.0 -> '00:00', 101.4 -> '01:41'."""
    seconds = max(0, int(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


class CallArtifacts:
    """Owns one artifacts/calls/<call-id>/ directory."""

    def __init__(self, root: Path, call_id: str) -> None:
        self.dir = Path(root) / call_id
        self.dir.mkdir(parents=True, exist_ok=True)
        self.call_id = call_id
        self.started_wall = datetime.now(timezone.utc)
        self.started_mono = time.monotonic()
        self._events = (self.dir / "events.jsonl").open("a", encoding="utf-8")
        self.turns: list[dict[str, Any]] = []

    @property
    def offset(self) -> float:
        return time.monotonic() - self.started_mono

    def event(self, kind: str, **fields: Any) -> None:
        """Append one structured event. Audio payloads are never written here."""
        record = {
            "t": round(self.offset, 3),
            "wall": datetime.now(timezone.utc).isoformat(),
            "kind": kind,
            **fields,
        }
        self._events.write(json.dumps(record) + "\n")
        self._events.flush()

    def turn(self, speaker: str, text: str, offset: float | None = None) -> None:
        """Record one side saying one thing. speaker is PATIENT or AGENT."""
        text = (text or "").strip()
        if not text:
            return
        at = self.offset if offset is None else offset
        self.turns.append({"at": round(at, 2), "speaker": speaker, "text": text})
        self.event("transcript", speaker=speaker, text=text)

    def write_transcripts(self) -> None:
        ordered = sorted(self.turns, key=lambda t: t["at"])
        lines = [
            f"[{format_offset(t['at'])}] {t['speaker']}: {t['text']}" for t in ordered
        ]
        (self.dir / "transcript.txt").write_text("\n".join(lines) + "\n")
        (self.dir / "transcript.json").write_text(json.dumps(ordered, indent=2))

    def write_metadata(self, **fields: Any) -> None:
        ended = datetime.now(timezone.utc)
        meta = {
            "call_id": self.call_id,
            "started_at": self.started_wall.isoformat(),
            "ended_at": ended.isoformat(),
            "duration_seconds": round(self.offset, 1),
            "git_commit": _git_sha(),
            **fields,
        }
        (self.dir / "metadata.json").write_text(json.dumps(meta, indent=2))

    def close(self) -> None:
        if not self._events.closed:
            self._events.close()


def _git_sha() -> str | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return out.stdout.strip() or None
    except Exception:
        return None
