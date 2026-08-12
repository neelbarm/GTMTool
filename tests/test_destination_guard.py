"""The allowlist is the one piece of this project that must not have a bug.

These tests exist to prove that no input reaches the Twilio API except the
assessment line — including the numbers most likely to show up by accident:
the number on the Athena confirmation screen, a Twilio test number, a typo'd
digit, and anything that merely *contains* the right digits.
"""

from __future__ import annotations

import pytest

from app.config import ASSESSMENT_LINE
from app.telephony import DestinationNotAllowed, assert_allowed, place_assessment_call


class FakeCalls:
    def __init__(self) -> None:
        self.created: list[dict] = []

    def create(self, **kwargs):
        self.created.append(kwargs)
        return type("Call", (), {"sid": "CAfake"})()


class FakeClient:
    def __init__(self) -> None:
        self.calls = FakeCalls()


class FakeSettings:
    twilio_phone_number = "+13334445555"
    public_base_url = "https://example.ngrok.app"
    max_call_seconds = 240


REJECTED = [
    "+18054398009",  # one digit off
    "+18054398008 ",  # trailing space
    " +18054398008",  # leading space
    "18054398008",  # no plus
    "+1 805 439 8008",  # spaces
    "+1-805-439-8008",  # the format the PDF prints it in
    "8054398008",  # bare digits
    "+15005550006",  # a Twilio magic test number
    "+14155550100",  # someone else entirely
    "",
    None,
    "not a phone number",
    "+18054398008x",  # extension suffix
]


@pytest.mark.parametrize("number", REJECTED)
def test_rejects_everything_but_the_assessment_line(number):
    with pytest.raises(DestinationNotAllowed):
        assert_allowed(number)


def test_accepts_the_assessment_line():
    assert assert_allowed(ASSESSMENT_LINE) == ASSESSMENT_LINE


@pytest.mark.parametrize("number", [n for n in REJECTED if isinstance(n, str) and n])
def test_place_call_never_reaches_twilio_for_bad_destination(number):
    client = FakeClient()
    with pytest.raises(DestinationNotAllowed):
        place_assessment_call(
            FakeSettings(),
            scenario_id="01_new_appointment",
            call_id="test",
            destination=number,
            client=client,
        )
    assert client.calls.created == [], "a call was created for a blocked destination"


def test_place_call_dials_the_assessment_line_with_recording_on():
    client = FakeClient()
    sid = place_assessment_call(
        FakeSettings(),
        scenario_id="07_weekend_booking",
        call_id="test",
        client=client,
    )
    assert sid == "CAfake"
    (created,) = client.calls.created
    assert created["to"] == ASSESSMENT_LINE
    assert created["from_"] == FakeSettings.twilio_phone_number
    assert created["record"] is True
    assert created["recording_channels"] == "dual"
    # Without a time limit a wedged bridge could hold the line open indefinitely.
    assert created["time_limit"] == FakeSettings.max_call_seconds
    assert "scenario=07_weekend_booking" in created["url"]


def test_default_destination_is_the_assessment_line():
    """place_assessment_call's default must not be overridable to somewhere else."""
    client = FakeClient()
    place_assessment_call(
        FakeSettings(), scenario_id="x", call_id="test", client=client
    )
    assert client.calls.created[0]["to"] == ASSESSMENT_LINE
