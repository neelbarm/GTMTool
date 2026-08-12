#!/usr/bin/env python3
"""Run the evaluator over finished calls, and build the bug report from the ones
a human has confirmed.

Two steps, deliberately separate:

    python scripts/build_bug_report.py --evaluate     # ask the model for candidates
    # ...listen to each recording, set "validated": true on the real ones...
    python scripts/build_bug_report.py --report       # write docs/bug-report.md

Only findings with "validated": true reach the report. The gap between the two
commands is where you actually listen to the audio, which is the part the
challenge is really asking for.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import ConfigError, get_settings  # noqa: E402
from app.evaluator import evaluate_call_dir  # noqa: E402
from app.scenario import find_scenario  # noqa: E402

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}

HEADER = """\
# Bug report

Issues found by calling the Pretty Good AI assessment line with the scenarios in
`scenarios/`. Every entry below was flagged by the post-call evaluator and then
confirmed by listening to the recording at the timestamp given.

Candidate findings the evaluator produced that did not survive that check are
still in each call's `evaluation.json`, marked `"validated": false`.

| ID | Severity | Call | Time | Observed | Expected | Patient impact |
|----|----------|------|------|----------|----------|----------------|"""


def evaluate_all(settings, force: bool = False) -> int:
    """Evaluate calls that have not been evaluated yet.

    Already-evaluated calls are skipped by default. Re-evaluating rewrites
    evaluation.json, and the "validated": true flags in there are hand-set after
    listening to the audio — the most expensive thing in this project. Adding two
    new calls must not silently discard that work. --force re-runs anyway, and
    carries the existing flags across.
    """
    count = skipped = 0
    for meta_path in sorted(settings.artifacts_dir.glob("*/metadata.json")):
        call_dir = meta_path.parent
        if not (call_dir / "transcript.txt").exists():
            continue

        existing_path = call_dir / "evaluation.json"
        if existing_path.exists() and not force:
            skipped += 1
            continue

        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        scenario_id = meta.get("scenario_id")
        if not scenario_id:
            print(f"  {call_dir.name}: no scenario in metadata, skipping")
            continue

        previously_validated = _validated_keys(existing_path)
        scenario = find_scenario(scenario_id)
        result = evaluate_call_dir(settings, call_dir, scenario)

        restored = 0
        for finding in result.get("findings", []):
            if _finding_key(finding) in previously_validated:
                finding["validated"] = True
                restored += 1
        if restored:
            existing_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

        n = len(result.get("findings", []))
        note = f", {restored} validation(s) carried over" if restored else ""
        print(f"  {call_dir.name}: {n} candidate finding(s){note}")
        count += n

    if skipped:
        print(f"  ({skipped} already evaluated — pass --force to redo them)")
    print(f"\n{count} new candidates. Listen to each recording, then set")
    print('"validated": true on the ones that hold up, and run --report.')
    return 0


def _finding_key(finding: dict) -> tuple[str, str]:
    return (finding.get("timestamp", ""), (finding.get("title") or "").strip().lower())


def _validated_keys(eval_path: Path) -> set[tuple[str, str]]:
    if not eval_path.exists():
        return set()
    try:
        data = json.loads(eval_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set()
    return {
        _finding_key(f)
        for f in data.get("findings", [])
        if f.get("validated") is True
    }


def build_report(settings) -> int:
    rows = []
    for eval_path in sorted(settings.artifacts_dir.glob("*/evaluation.json")):
        call_dir = eval_path.parent
        data = json.loads(eval_path.read_text(encoding="utf-8"))
        for finding in data.get("findings", []):
            if finding.get("validated") is True:
                rows.append((call_dir.name, data.get("scenario_id", "?"), finding))

    rows.sort(key=lambda r: SEVERITY_ORDER.get(r[2].get("severity", "low"), 3))

    lines = [HEADER]
    for i, (call_name, scenario_id, f) in enumerate(rows, start=1):
        audio = f"[{call_name}](../artifacts/calls/{call_name}/recording.mp3)"
        lines.append(
            f"| BUG-{i:02d} "
            f"| {f.get('severity', '?')} "
            f"| {audio}<br>`{scenario_id}` "
            f"| {f.get('timestamp', '?')} "
            f"| {_cell(f.get('title'))} — \"{_cell(f.get('evidence'))}\" "
            f"| {_cell(f.get('expected_behavior'))} "
            f"| {_cell(f.get('impact'))} |"
        )

    if not rows:
        lines.append("| — | — | — | — | _No validated findings yet._ | — | — |")

    out = Path("docs/bug-report.md")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {out} with {len(rows)} validated finding(s)")
    return 0


def _cell(text: str | None) -> str:
    """Keep a value from breaking the markdown table."""
    return (text or "").replace("|", "\\|").replace("\n", " ").strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evaluate", action="store_true")
    parser.add_argument("--report", action="store_true")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-evaluate calls that already have an evaluation.json",
    )
    args = parser.parse_args()
    if not (args.evaluate or args.report):
        parser.error("pass --evaluate or --report")

    try:
        settings = get_settings()
    except ConfigError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.evaluate:
        return evaluate_all(settings, force=args.force)
    return build_report(settings)


if __name__ == "__main__":
    raise SystemExit(main())
