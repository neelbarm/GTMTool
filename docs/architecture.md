# Architecture

The system is a Python CLI that asks Twilio to place a call, and a FastAPI process
that answers the resulting Media Stream and bridges it to an OpenAI Realtime
session. Audio moves as G.711 mu-law at 8 kHz in both directions and is never
transcoded: Twilio emits mu-law, the Realtime API accepts and returns mu-law, so
frames are handed across as they arrive. The scenario for each call travels as a
`<Parameter>` on the TwiML stream and comes back in Twilio's `start` event, which
keeps the CLI and the server as two independent processes with no shared state.
Twilio records the leg itself, dual-channel, from initiation — so the two-sided
recording the submission requires is a download rather than something this code
has to mix, align, or drift-correct.

The central decision was to use a speech-to-speech realtime model rather than an
STT → LLM → TTS chain. The challenge states plainly that voice interaction quality
is judged before code review and that submissions failing it are rejected without
further review, which makes conversational latency the binding constraint rather
than one quality among several. A pipeline architecture pays a serialised penalty
at every turn — transcription has to finish before generation starts, generation
before synthesis — and, more damagingly, it discards the prosodic cues that tell a
listener when a turn has actually ended, which is what produces the stilted
half-second-late feel that reads immediately as a bot. A realtime model keeps
turn detection in the same system that hears the audio. The cost is real: less
introspectable than a pipeline, no cheap swap of the STT component, and pricing
per audio token rather than per text token. For ten to fifteen short calls that
trade is clearly worth it, and it would look different for a product running
thousands of hours a month.

The second decision worth naming is how little the Python owns. It would have been
easy to build a state machine that tracked whether identity had been confirmed or
an appointment agreed, but every one of those judgements requires understanding a
sentence, and a regex that infers intent from a phone transcript is a bug generator
wearing a state machine's clothes. So Python owns only what it can decide without
interpretation — elapsed time, turn counts, silence, and hanging up — and the model
signals a finished conversation by calling an `end_call` tool, which our code then
executes. Termination stays deterministic without pretending to a semantic
understanding the code does not have. The same reasoning drives the post-call
evaluator being a separate text pass rather than something the live model reports:
the patient model was busy being a patient and has an obvious interest in believing
its call went well, so it is the wrong witness. The evaluator proposes findings and
marks every one `potential`; only findings a human has confirmed against the audio
reach the bug report.

Infrastructure is deliberately absent. There is no database, no queue, no
dashboard, no deployment. Artifacts are files in a directory, the tunnel is ngrok,
and calls run one at a time. Everything that exists here exists because a specific
deliverable needed it.
