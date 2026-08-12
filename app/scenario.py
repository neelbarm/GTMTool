"""Scenarios: what the fictional patient wants, and how we ask the model to be one.

The division of labour here is deliberate. The YAML and the prompt describe
*behaviour* — who the patient is, what they want, how to talk. The Python side
owns only what it can decide without interpreting speech: elapsed time, turn
count, silence. Deciding "has the agent confirmed my appointment?" requires
understanding a sentence, so that judgement is left to the model, which signals
it by calling the end_call tool. That keeps termination deterministic (our code
hangs up) without pretending a regex can read intent.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field


class Patient(BaseModel):
    name: str
    date_of_birth: str
    phone_last_four: str
    extra: dict[str, str] = Field(default_factory=dict)


class Scenario(BaseModel):
    id: str
    patient: Patient
    intent: str
    primary_goal: str
    success_signal: str
    follow_ups: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    end_condition: str
    risk_tags: list[str] = Field(default_factory=list)
    # Only set on the one scenario that deliberately talks over the agent.
    barge_in: bool = False

    @property
    def slug(self) -> str:
        return self.id.replace("_", "-")


def load_scenario(path: str | Path) -> Scenario:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"No scenario at {path}")
    return Scenario.model_validate(yaml.safe_load(path.read_text()))


def find_scenario(scenario_id: str, root: Path = Path("scenarios")) -> Scenario:
    """Look a scenario up by id or filename stem, e.g. '07_weekend_booking'."""
    for candidate in sorted(root.glob("*.yaml")):
        if candidate.stem == scenario_id:
            return load_scenario(candidate)
    for candidate in sorted(root.glob("*.yaml")):
        scenario = load_scenario(candidate)
        if scenario.id == scenario_id:
            return scenario
    raise FileNotFoundError(f"No scenario matching {scenario_id!r} in {root}/")


# Section 1 is identical for every call. Keeping it constant means differences
# between calls come from the scenario, not from prompt drift.
_VOICE_RULES = """\
You are a person making a phone call to a medical office. You are speaking out
loud on a telephone, not writing.

- Keep ordinary replies to one or two short sentences.
- Never use markdown, bullet points, lists, or headings. You are talking.
- Do not narrate your thinking or describe what you are doing.
- Small natural disfluencies are fine. Long monologues are not.
- If you cannot hear or did not catch something, say "Sorry, could you repeat
  that?" once. Do not keep asking.
- You are a real patient. Never say or imply that you are an AI, a test, a bot,
  or an automated system, even if asked directly. If pressed, act mildly
  confused and steer back to your reason for calling."""

_CONVERSATION_RULES = """\
- Answer what you are asked, directly, and nothing more. Do not volunteer your
  whole life story.
- Ask at most one clarifying question at a time.
- If the other person states a fact about you that is wrong, correct it once,
  politely.
- If they ask you the same question twice, answer it again and gently note that
  you already gave it.
- If they ask a third time, or you are clearly going in circles, stop pushing,
  say something polite, and call the end_call tool with reason="loop"."""


def build_prompt(scenario: Scenario) -> str:
    """Assemble the session instructions from the scenario."""
    follow_ups = "\n".join(f"- {f}" for f in scenario.follow_ups) or "- (none)"
    constraints = "\n".join(f"- {c}" for c in scenario.constraints) or "- (none)"
    extra = "\n".join(f"- {k}: {v}" for k, v in scenario.patient.extra.items())

    return f"""\
# How you speak

{_VOICE_RULES}

# Who you are

Your name is {scenario.patient.name}. Your date of birth is
{scenario.patient.date_of_birth}. The last four digits of your phone number are
{scenario.patient.phone_last_four}.
{extra}

These are the only personal details you have. If you are asked for something you
were not given — an address, a member ID, a doctor's name — improvise something
plausible and ordinary, and stay consistent with it for the rest of the call.

# Why you are calling

{scenario.intent}

What you are trying to achieve: {scenario.primary_goal}

How to behave:
{constraints}

If the conversation goes one of these ways:
{follow_ups}

# Ending the call

{scenario.end_condition}

When that has happened — or if you are stuck in a loop, or the other side cannot
help you and has said so clearly — say a short natural goodbye and then call the
end_call tool. Do not call end_call before you have actually said goodbye out
loud, and do not keep talking after you have called it.

Do not hang up merely because you got an answer to your first question. Push
politely toward the goal above first."""


END_CALL_TOOL = {
    "type": "function",
    "name": "end_call",
    "description": (
        "Hang up. Call this only after you have said goodbye out loud and the "
        "conversation is genuinely finished."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "reason": {
                "type": "string",
                "enum": ["goal_reached", "refused", "loop", "cannot_help", "other"],
                "description": "Why the call is ending.",
            },
            "summary": {
                "type": "string",
                "description": "One sentence on what the agent actually did.",
            },
        },
        "required": ["reason"],
    },
}
