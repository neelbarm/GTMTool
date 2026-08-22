# Walkthrough script

The case study asks for a screen recording with narration. This is the script for it — a timed
route through the prototype that hits all ten challenges in about **eight minutes**, in an order
that builds rather than jumps around.

Read it aloud as you click. Anything in *italics* is a stage direction, not narration.

Before you start: open the app fresh (or hit reload) so every scenario is in its authored state,
and pick light or dark up front rather than toggling mid-recording.

---

## 0 · The front door — 30s

*Open `/`.*

> This is Meridian, a tax platform for a firm and its clients. Ten challenges were set. They're not
> ten products — they're ten pressures on the same one, so I built one platform that answers all
> ten rather than ten separate demos.
>
> This page maps each challenge to the screen that argues for it, and says what's real versus
> simulated. I'll come back to that at the end.

*Scroll to the seat list.*

> Eight seats, five roles, one application. Let's start on the firm side.

---

## 1 · The dashboard — 1m  *(Challenge 07)*

*Click **Priya Raman**.*

> A preparer's landing page has to answer one question: what should I work on right now. Four tiles
> for what's on fire, then a ranked queue.
>
> The ranking is real — a scoring function over two hundred returns weighing deadline pressure
> non-linearly, stage, complexity against time remaining, blocker severity, staleness, escalations
> and fee.

*Click the score chip on the top row.*

> And it shows its reasons. That matters more than the ranking itself: a preparer who can't see why
> something is top of the list won't trust the list, and will go back to their spreadsheet.
>
> The rule that shapes the whole thing is on the right. Work you can't start isn't urgent, it's
> someone else's — so returns nobody at the firm can move drop out of the queue into a chase list.
> A return only leaves when there's nothing left *we* can do.

---

## 2 · Traceability — 2m  *(Challenge 01)*

*Open **James & Alexis Whitfield** → **Review**.*

> Three panes. The return on the left, why a figure is what it is in the middle, and the page it
> came from on the right.

*Line 1a is already selected.*

> Wages. It's a calculated figure, so the middle pane unfolds the arithmetic — two W-2s, box 1 from
> each. Every input is a link.

*Click "Northwind Systems Inc. — Box 1".*

> And the source pane lights up the exact box. That's the point: the link between a field and its
> source is a coordinate — a document, a page and a rectangle — not a filename. "It came from the
> W-2" isn't traceability, it just moves the manual check somewhere else.

*Click line 5e, State and local taxes.*

> This one shows a transformation. Two inputs, twenty thousand of tax paid, capped by statute at
> ten. Ten thousand of deduction is lost, and the return says so out loud, because that's the line
> clients query most.

*Click line 7, Capital gain.*

> Here's an AI estimate. The broker didn't report cost basis on one lot, so Meridian matched it
> against last year's Schedule D and carried the basis forward. Amber underline, "needs approval" —
> it's on the return, but it can't be filed until a person says yes.

*Click line 11, Gifts to charity.*

> And a conflict. The acknowledgement letter says six and a half thousand; the client's
> questionnaire said seven thousand two hundred. Double underline. The return holds the
> better-evidenced figure and tells you the other one exists, rather than silently picking.

---

## 3 · The affordance system — 45s  *(Challenge 08)*

*Sidebar → **Design decisions** → Affordance system.*

> Everything you just saw is one system. Hue encodes provenance — where a value came from. Ornament
> encodes affordance — what you may do to it. Dashed means you can type here, solid means something
> proposed this, double means two sources disagree, none means you can't change it.
>
> Ornament is the load-bearing one, because it survives greyscale and colour blindness.

*Click **Drain the colour**.*

> Every state is still readable. Nothing in this product is distinguishable by colour alone — each
> one also carries a glyph and a word.

---

## 4 · Trustworthy AI — 1m 15s  *(Challenge 10)*

*Back to the return → **AI activity**.*

> Eight findings, and every one answers the same five questions in the same order: what it did, why,
> the evidence, what it's unsure about, and what to do.
>
> Confidence is a band with the number as secondary detail — "84%" invites false precision,
> "Likely" tells you how much to trust it.

*Point at the violet uncertainty block.*

> This is the most important element on the page and it's never omitted. Here it says the match is
> on ticker and share count, not a lot identifier — so if the client sold part of a larger position,
> the gain is overstated. One finding on this return says "none worth reporting, this is
> arithmetic", and that's exactly what makes the other seven credible.

*Click **Correct it**, type a figure and a reason, save.*

> Correction is a normal path, not an error state. It records who corrected it and what the model
> got wrong, and that stays on the return rather than disappearing into a log.

---

## 5 · Collaboration and the internal boundary — 1m  *(Challenge 02)*

*Sidebar → **Inbox** → the charitable-giving thread.*

> Two rules make this a collaboration layer instead of an inbox. Every thread is anchored to
> something — this one to Schedule A line 11, and that's a live link. And every thread names who has
> to act next; there's no "unassigned", because that's how requests die.
>
> Inside a thread the client can read, there are two internal notes between the preparer and the
> reviewer. Watch what happens to them.

---

## 6 · One product, two audiences — 1m 15s  *(Challenges 05 and 06)*

*Account button → **Switch seat** → **James Whitfield**.*

> Same person, same login, different seat. This is the client's view of the return we were just
> reviewing.
>
> The internal notes are gone — that boundary is enforced once in the data layer, not by conditions
> scattered across nine screens.

*Open the return.*

> Status is the same record, rendered for a different audience. Six stages, and each one carries a
> single shared definition both audiences can read.
>
> And status is never one word. It's always three facts together — where it is, who acts next, and
> what's in the way. "In Progress" fails because it collapses those three into one label that each
> side expands differently. Splitting them is what stops a client and a reviewer walking away with
> different ideas of what's happening.

---

## 7 · First run — 1m  *(Challenge 03)*

*Switch seat → **Ravi Chandra**.*

> A brand-new client who has never signed in. One card, one verb, one number, and the time it takes.
>
> The navigation is one item long. Documents, questions and messages aren't collapsed — they're
> absent, because a nav item you can't use yet is a question you have to answer before you can
> start.

*Complete the three steps.*

> And once setup is done the interface permanently changes shape: the navigation fills in, and the
> home page swaps the setup card for a status card.

---

## 8 · Scale, and the seats you haven't seen — 45s  *(Challenges 04 and 09)*

*Switch seat → **Marcus Webb** → **Returns**.*

> A reviewer sees the whole practice — two hundred returns. Presets for the questions people
> actually ask, filters that stay visible as removable chips, and explicit counts, because knowing
> the size of a result is part of trusting it.

*Press ⌘K, type "corvine".*

> One search index across returns, return lines, documents and conversations — so a line, the
> document it was read from and the argument about it are one keystroke apart.

*Optional, if time: switch to **Tom Ferris**, open a client thread.*

> Seasonal staff can't message clients. The control stays visible, greys out and explains itself —
> a button that vanishes teaches nothing and reads as a bug.

---

## 9 · Close — 30s

*Sidebar → **Design decisions**, scroll to "The ten positions".*

> Every position, the argument for it, and the thing I deliberately didn't build — no configurable
> dashboard widgets, no chat surface for the AI, no custom statuses.
>
> And at the bottom, what's genuinely wired up versus simulated. The prioritisation engine, the
> search index, the permission boundary and the arithmetic on that return are all real. There's no
> OCR, no model, and no backend — the documents are fixtures with per-box coordinates, and the AI
> output is authored JSON. The brief asked how I'd present AI output and build trust around it, not
> whether I could build the model.

---

## If you only have three minutes

Front door → Priya's dashboard, open one score → Whitfield Review, click line 1a then line 11 →
AI activity, read one uncertainty block → switch to James Whitfield and show the internal notes
disappear.
