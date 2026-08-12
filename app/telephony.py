"""Outbound dialing, and the guard that makes it safe.

Everything that can reach the Twilio calls API goes through assert_allowed().
There is no second path. Recording is requested at call creation rather than in
TwiML because <Connect> ends TwiML execution, so anything that starts a recording
has to happen before it or via the REST parameter — the REST parameter is one
fewer thing to get wrong, and it records from initiation.
"""

from __future__ import annotations

from urllib.parse import urlencode

from twilio.rest import Client

from app.config import ASSESSMENT_LINE, Settings, is_e164


class DestinationNotAllowed(RuntimeError):
    """Raised when something tries to dial anything but the assessment line."""


def assert_allowed(number: str) -> str:
    """Return `number` if it is the assessment line, otherwise refuse.

    Deliberately strict: exact string match against the constant, after an E.164
    shape check. No normalisation, no "close enough" matching on the last ten
    digits — a number that is not character-for-character the assessment line does
    not get dialed.
    """
    if not isinstance(number, str) or not number:
        raise DestinationNotAllowed(f"Destination must be a string, got {number!r}")
    if not is_e164(number):
        raise DestinationNotAllowed(f"Destination {number!r} is not valid E.164")
    if number != ASSESSMENT_LINE:
        raise DestinationNotAllowed(
            f"Refusing to dial {number!r}. This build only calls {ASSESSMENT_LINE}."
        )
    return number


def build_client(settings: Settings) -> Client:
    return Client(settings.twilio_account_sid, settings.twilio_auth_token)


def place_assessment_call(
    settings: Settings,
    scenario_id: str,
    call_id: str,
    *,
    destination: str = ASSESSMENT_LINE,
    client: Client | None = None,
) -> str:
    """Dial the assessment line for one scenario. Returns the Twilio Call SID.

    The scenario travels as a query parameter on the webhook URL rather than in
    shared memory, so the CLI and the web server stay separate processes with no
    state between them.
    """
    assert_allowed(destination)

    query = urlencode({"scenario": scenario_id, "call_id": call_id})
    client = client or build_client(settings)

    call = client.calls.create(
        to=destination,
        from_=settings.twilio_phone_number,
        url=f"{settings.public_base_url}/voice?{query}",
        method="POST",
        record=True,
        recording_channels="dual",
        recording_track="both",
        time_limit=settings.max_call_seconds,
    )
    return call.sid
