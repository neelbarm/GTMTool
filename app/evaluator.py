"""Post-call analysis.

The live patient model is a bad judge of its own call — it was busy being a
patient, and it has an obvious interest in believing the call went well. So
findings come from a separate text-only pass over the finished transcript, with
the scenario's expectations supplied as context.

Its output is never treated as truth. Every finding is 'potential' until a human
listens to the recording at the stated timestamp; only then does
build_bug_report.py let it into docs/bug-report.md.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from openai import OpenAI

from app.config import Settings
from app.scenario import Scenario

SYSTEM = """\
You review transcripts of phone calls made to a medical office's AI receptionist,
looking for genuine defects in the receptionist's behaviour.

You will be given a test scenario and a transcript. PATIENT is the caller (a
simulated test patient). AGENT is the receptionist under test. You are judging
the AGENT only. Never report a problem with the PATIENT's behaviour.

Report a finding only when the transcript shows it plainly. Things worth
reporting:
- Confirming something the office cannot actually do (weekend appointments,
  emailing test results, guaranteeing insurance coverage).
- Inventing specifics it has no way to know.
- Contradicting itself between two points in the same call.
- Losing track of what was already agreed.
- Failing to ask an obvious clarifying question and guessing instead.
- Answering a different question than the one asked.

Not worth reporting: wording you would have phrased differently, ordinary
politeness, the patient being vague on purpose, or transcription noise.

Rules:
- Quote evidence verbatim from the transcript. Never paraphrase into the evidence
  field, and never write a quote that is not in the transcript.
- Use the timestamp attached to the line you are quoting. Do not estimate one.
- If the agent behaved correctly, return an empty findings list. A clean call is a
  perfectly good result and is more useful than an invented complaint.
- Severity: high = the patient could act on false information; medium = the call
  fails its purpose or frustrates a reasonable person; low = a real but minor rough
  edge.

Return only JSON matching the requested schema."""

SCHEMA_HINT = """\
{
  "scenario_id": "string",
  "verdict": "clean" | "potential_bug",
  "findings": [
    {
      "title": "string",
      "severity": "high" | "medium" | "low",
      "timestamp": "MM:SS",
      "evidence": "verbatim quote from the transcript",
      "expected_behavior": "string",
      "impact": "string"
    }
  ],
  "call_quality": {
    "goal_reached": true,
    "turn_taking": "good" | "acceptable" | "poor",
    "transcript_confidence": "high" | "medium" | "low"
  }
}"""


def evaluate(
    settings: Settings,
    scenario: Scenario,
    transcript: str,
    *,
    client: OpenAI | None = None,
) -> dict[str, Any]:
    client = client or OpenAI(api_key=settings.openai_api_key)

    user = f"""\
# Scenario: {scenario.id}

Patient's intent: {scenario.intent}
What the patient was trying to achieve: {scenario.primary_goal}
What would count as a notable outcome: {scenario.success_signal}
Risk areas to weigh: {', '.join(scenario.risk_tags) or 'none stated'}

# Transcript

{transcript}

# Output

Return JSON matching this shape and nothing else:

{SCHEMA_HINT}"""

    response = client.chat.completions.create(
        model=settings.evaluator_model,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    result = json.loads(response.choices[0].message.content)
    result.setdefault("scenario_id", scenario.id)

    # The model does not get to promote its own findings past 'potential'.
    for finding in result.get("findings", []):
        finding["status"] = "potential"
        finding["validated"] = False
    return result


def evaluate_call_dir(settings: Settings, call_dir: Path, scenario: Scenario) -> dict:
    transcript = (call_dir / "transcript.txt").read_text()
    result = evaluate(settings, scenario, transcript)
    (call_dir / "evaluation.json").write_text(json.dumps(result, indent=2))
    return result
