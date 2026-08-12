# Iteration log

What changed between calls and why. Newest last.

Fill one of these in every time a call sounds wrong and you change something. The
"Result" line is the point — a change with no observed outcome is a guess, not an
iteration.

---

## Iteration 1 — 2026-__-__

- **Observed:**
- **Evidence:** call-__, __:__–__:__
- **Hypothesis:**
- **Change:**
- **Result:**

---

<!--
Worked example of the shape to aim for:

## Iteration 2 — 2026-__-__

- Observed: The patient kept talking for about two seconds after the agent
  started speaking, on every turn.
- Evidence: call-02, 01:14-01:19.
- Hypothesis: We truncate the assistant item on OpenAI's side but never tell
  Twilio to drop the audio it has already buffered, so the caller keeps hearing
  audio the model believes it stopped generating.
- Change: Send a `clear` message on the Twilio socket alongside
  `conversation.item.truncate` (app/bridge.py, _handle_barge_in).
- Result: call-03 cut off cleanly mid-word when the agent came in.
-->
