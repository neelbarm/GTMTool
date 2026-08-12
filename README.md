# Pretty Good AI voice tester

Places automated phone calls to the Pretty Good AI assessment line, plays a
realistic fictional patient on the line, and captures everything needed to judge
how the receptionist agent behaved: a two-sided recording, a speaker-labelled
transcript, structured event logs, and a post-call analysis pass.

Each call is driven by a scenario file — a patient with a name and a date of
birth, a goal, and rules for how to push toward it. The twelve scenarios in
`scenarios/` cover routine scheduling through to the cases where a receptionist
is most likely to get something wrong: weekend bookings, ambiguous dates,
half-remembered medications, and requests it should refuse.

## How it works

```
scripts/run_call.py
    │  validates settings, checks the destination against the allowlist
    ▼
Twilio outbound call ── recording on, dual channel, hard time limit
    │
    ▼  POST /voice  →  TwiML: <Connect><Stream>
Twilio bidirectional Media Stream (WebSocket, G.711 mu-law 8 kHz)
    │
    ▼  /stream
app/bridge.py ──────► OpenAI Realtime session (same mu-law, no transcoding)
    │                  patient voice, turn detection, end_call tool
    ▼
artifacts/calls/<call>/  metadata.json · events.jsonl · transcript.txt/json
    │
    ▼
app/evaluator.py → evaluation.json → (you listen) → docs/bug-report.md
```

Longer reasoning about why it is built this way is in
[docs/architecture.md](docs/architecture.md).

## Safety

This code dials exactly one number. `ASSESSMENT_LINE` in `app/config.py` is a
constant, not a setting; `ALLOWED_DESTINATION` in `.env` must match it or the app
refuses to start, and every path to the Twilio calls API goes through
`assert_allowed()`. `tests/test_destination_guard.py` proves that a typo'd digit,
a differently-formatted version of the same number, or any other destination
raises before the Twilio SDK is touched.

Every call also carries a `time_limit` and the bridge has its own watchdog, so a
wedged session cannot hold the line open.

All patient identities in `scenarios/` are fictional.

## Setup

Requires Python 3.11, `ffmpeg` (for MP3 conversion), a Twilio account with one
voice-capable number, an OpenAI API key with Realtime access, and a tunnel.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then fill it in
```

Start the tunnel and put its https URL in `PUBLIC_BASE_URL`:

```bash
ngrok http 8000           # or: cloudflared tunnel --url http://localhost:8000
```

Check the Realtime session config is accepted before spending a call on it:

```bash
python scripts/check_realtime.py
```

This matters because the Realtime API's audio format block changed shape between
the beta and GA versions, and the wrong shape does not fail loudly — it plays
static down the phone. The script prints the format the server actually agreed
to. Both directions should be mu-law.

## Running a call

Two terminals. Server first:

```bash
uvicorn app.main:app --port 8000
```

Then:

```bash
python scripts/run_call.py --scenario scenarios/07_weekend_booking.yaml
```

The call runs, the bridge writes artifacts when it ends, then:

```bash
python scripts/fetch_recordings.py --all      # download recordings, convert to MP3
python scripts/build_bug_report.py --evaluate # candidate findings per call
# listen to each recording at the timestamps given, mark the real ones
python scripts/build_bug_report.py --report   # writes docs/bug-report.md
```

`--evaluate` skips calls that already have an `evaluation.json`, so running it
again after adding a couple of calls will not overwrite the `"validated": true`
flags you set by hand. `--force` re-runs them and carries those flags across.

Run `fetch_recordings.py` before evaluating. The bridge measures time from when
the call is *answered*, Twilio records from when it is *initiated*, so transcript
timestamps are shifted onto the recording's clock as part of the download —
otherwise every timestamp in the bug report would point at the wrong moment in
the audio by however long the line rang. The shift is recorded as
`recording_offset_seconds` in `metadata.json`, and the pre-shift values are kept
as `at_stream` in `transcript.json`.

## Environment variables

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio credentials |
| `TWILIO_PHONE_NUMBER` | The single number all test calls come from, E.164 |
| `OPENAI_API_KEY` | Realtime session and post-call evaluator |
| `PUBLIC_BASE_URL` | https tunnel URL, no trailing slash |
| `ALLOWED_DESTINATION` | Must equal the constant in `app/config.py` |
| `REALTIME_MODEL` | Default `gpt-realtime-2.1` |
| `REALTIME_VOICE` | Default `cedar` |
| `EVALUATOR_MODEL` | Text model for post-call analysis |
| `ARTIFACTS_DIR` | Default `artifacts/calls` |
| `MAX_CALL_SECONDS` | Hard stop, default 240 |

## What each call produces

```
artifacts/calls/1432-weekend-booking/
  metadata.json    scenario, call SID, duration, model, git SHA, why it ended
  events.jsonl     timestamped stream events — barge-ins, errors, tool calls
  transcript.txt   [00:41] PATIENT: Could I come in this Sunday around ten?
  transcript.json  the same, machine-readable
  recording.mp3    both sides, from Twilio's dual-channel recording
  evaluation.json  candidate findings, all marked "validated": false
```

Transcripts come from the Realtime session rather than a separate pass: the
agent's side from input audio transcription, the patient's side from the model's
own output transcript. Both sides are already attributed, so there is no
diarisation step to get wrong.

## Known limitations

- Transcription of the agent's side is done by a model listening to 8 kHz phone
  audio. Names, medication names and numbers are the least reliable part; the
  recording is the source of truth and the bug report cites timestamps so any
  claim can be checked against it.
- The evaluator proposes findings, it does not confirm them. Nothing reaches
  `docs/bug-report.md` until a human has listened.
- `ngrok`'s free tier issues a new URL each restart, so `PUBLIC_BASE_URL` needs
  updating whenever the tunnel restarts.
- The bridge accepts both the beta and GA spellings of several Realtime events.
  That is deliberate defensiveness against an API rename, not evidence that both
  versions were tested.
- One call at a time. Concurrency was not needed and was not built.
- Turn timestamps mark when each side *started* speaking, since transcription
  finishes at unpredictable times. They are accurate to about the length of a
  turn, which is enough to find a moment in a recording but not to measure
  response latency.
