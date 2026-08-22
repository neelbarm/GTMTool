# Meridian — an AI-powered tax platform, designed from scratch

A working prototype for the AI Engineer case study: *Designing an AI-Powered Tax Platform From
Scratch*. Ten product challenges were set. They are not ten products — they are ten pressures on
the same one, so this is **one cohesive platform that answers all ten**, not ten disconnected demos.

Everything below is clickable. Open the front door, pick a seat, and go in.

---

## The thesis

> A CPA should be able to defend any number on a return in two clicks. A client should always know
> the one thing they need to do next. The AI in the middle should be legible enough to trust rather
> than re-check by hand.

Three structural decisions carry most of the ten challenges:

1. **Status is three facts, never one word** — *where it is · who acts next · what's in the way.*
   "In Progress" fails because it collapses three independent things into one label that each
   audience expands differently.
2. **Hue encodes provenance; ornament encodes affordance.** Colour says where a value came from;
   the underline says what you may do to it. Neither ever carries meaning alone — every state also
   ships a glyph and a word.
3. **Traceability is a coordinate, not a filename.** A figure points at a document, a page and a
   rectangle. Calculated figures unfold into steps, and every input in every step is itself a link.

The full argument, including what was deliberately *not* built and why, is on the **`/system`**
page inside the app.

---

## Where each challenge lives

| # | Challenge | Where to look | Position taken |
|---|---|---|---|
| 01 | Source document traceability | `/returns/RTN-2025-0117/review` | Every figure points at a rectangle on a page; every derivation shows its arithmetic and its inputs |
| 02 | Client & CPA collaboration | `/inbox` | A thread cannot exist without an anchor and a named next-action owner |
| 03 | Where to start | `/home` as **Ravi Chandra** | One card, one verb, one number; deferred nav until setup is done |
| 04 | Getting lost between parts | any return | Breadcrumbs for *where*, a Connected rail for *what this touches*, a resume bar for *how to get back* |
| 05 | Role-aware experiences | the seat switcher · `/system#roles` | Roles change scope, capability and landing page — never the shell or the vocabulary |
| 06 | Return status & progress | `/returns/RTN-2025-0117` | Six stages, one shared definition each, plus an explicit owner and typed blockers |
| 07 | An actionable dashboard | `/home` as **Priya Raman** | Rank by what you can actually move; every score shows its own reasons |
| 08 | Clickable vs. editable | `/system#affordance` | Six states, one component, ornament as the load-bearing signal |
| 09 | Complexity made navigable | `/returns` and any Documents tab | Presets, visible removable filter chips, explicit counts, disclosure in place |
| 10 | Trustworthy AI | `/returns/RTN-2025-0117/ai` | The same five questions every time, and the uncertainty line is never omitted |

## The eight seats

Switch at any time from the account button — no sign-out, no separate logins.

**At the firm**
- **Priya Raman** — Senior preparer. The main firm-side path; start here.
- **Marcus Webb** — Review partner. Sees every return; can approve and file.
- **Elena Brandt** — Firm administrator. Practice-wide view, edits nothing.
- **Tom Ferris** — Seasonal staff. Deliberately restricted, to show how permissions are communicated.
- **Dana Okafor** — Preparer *and* a taxpayer with her own 1040 in the same system. The dual-identity case.

**As a client**
- **James Whitfield** — Mid-engagement. The same return the CPAs are reviewing, in plain language.
- **Nadia Solomon** — Business owner with an entity return and a personal one.
- **Ravi Chandra** — Has never signed in. The first-run experience.

A narration script for the video deliverable is in
**[WALKTHROUGH.md](WALKTHROUGH.md)** — a timed route that hits all ten challenges in about eight
minutes.

## A five-minute tour

1. **`/` → Start as a CPA.** The queue is ranked by a real scoring function — click any score to
   see the reasons that produced it. Work you *can't* start is deliberately not in the queue.
2. **Open James & Alexis Whitfield → Review.** Click line 1a: the derivation unfolds, and the
   source pane lights up the exact box on the W-2. Click **line 7** — an estimated cost basis
   needing approval — then **Schedule A line 11**, where two sources disagree and the return says so.
3. **AI activity.** Eight findings, each with evidence, reasoning behind a disclosure, and a plain
   statement of what it isn't sure about. Correct one; the correction stays on the return.
4. **Inbox.** Open the charitable-giving thread: a client-visible conversation with two internal
   notes inside it.
5. **Switch seat → James Whitfield.** Same return, same status record, different words — and both
   internal notes are gone.
6. **Switch seat → Ravi Chandra.** One nav item, one next action. Complete the three steps and
   watch the navigation and the home page change shape.

---

## What's genuinely wired up

- **The prioritisation engine.** A real scoring function (`src/lib/priority.ts`) over 200+ returns:
  non-linear deadline pressure, whether the firm can act at all, stage, complexity against time
  remaining, blocker severity, staleness, escalations, unsettled AI findings and fee. Every score
  carries its reasons and the UI shows them.
- **Search.** One index across returns, return lines, documents, conversations and tasks
  (`src/lib/search.ts`), driving the ⌘K palette.
- **The traceability chain.** The arithmetic on the flagship return actually reconciles — every
  derivation sums to the figure it claims to produce, and the return foots from wages down to the
  $471.55 balance due.
- **Permissions.** One function (`threadsFor`) gates the internal/client boundary; one hook
  (`useVisibleReturnIds`) gates scope. Switching seats really re-filters the data.
- **Every action mutates state** and every screen re-reads it: verify a figure, accept or correct
  an AI suggestion, answer a question, upload a document, reply to a thread, resolve it.
- **Colour.** Both chart ramps were run through a colour-vision validator in light *and* dark for
  lightness band, chroma floor, CVD separation and surface contrast. The numbers are on `/system`.

## What's simulated, on purpose

- **No OCR.** Source documents are drawn from structured fixtures with per-box percentage
  rectangles — so highlighting is a real coordinate lookup against fake pages.
- **No model.** AI output is authored JSON in a fixed shape (`src/data/collaboration.ts`). The
  brief asked for the interaction *around* AI, not the inference.
- **No backend, no auth, no database.** The long tail is generated from a fixed seed at module load,
  so the dataset is byte-identical on the server, in the browser and between two people opening the
  demo.
- **Tax arithmetic** is correct where it is shown and stops before it would need a real engine: the
  2025 rate tables are quoted in a derivation note, not implemented.
- **Edits live in memory for the session.** A reload returns every scenario to its authored state —
  which is what you want when several people are clicking through the same demo. Only the chosen
  seat and the theme persist.

## Decisions worth explaining

- **All ten challenges, one product.** The brief said to choose the challenges assigned; none were
  attached. Answering them separately would have dodged the hardest part — they constrain each
  other, and the interesting work is in the constraints.
- **No configurable dashboard widgets.** A dashboard every user arranges differently can't be
  reasoned about, supported or improved.
- **No chat surface for the AI.** Conversation would let the model make claims with no evidence
  attached, which is the opposite of what this interaction model is for.
- **No custom statuses.** Firms will ask. Allowing them is how you get back to labels nobody agrees
  on; the flexibility lives in blockers and flags instead.
- **Dark mode is a separate set of validated steps**, not an inversion of the light palette.
- **The demo date is pinned to 13 March 2026**, mid-season, 33 days from the filing deadline. Every
  relative date in the product is computed from it, so the scenario never drifts.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
```

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · zero runtime
dependencies beyond React and an icon set. No environment variables, no services.

## Layout

```
src/
  app/                     routes; (product) carries the app shell
  components/
    ui.tsx                 primitives
    affordance.tsx         the six field states — the one place the rule lives
    status.tsx             stage · owner · blockers, rendered as a triple
    session.tsx            identity (person + seat) and every local mutation
    shell/                 nav, breadcrumbs, resume bar, ⌘K palette, seat switcher
    pages/                 one file per screen
  data/
    taxonomy.ts            stages, blockers, roles, capabilities
    flagship.ts            the hand-authored return: documents and every line
    collaboration.ts       threads, AI findings, tasks, questionnaire, history
    generate.ts            the seeded long tail (200+ returns, 900+ documents)
    store.ts               selectors, scope, and the internal/client boundary
  lib/
    priority.ts            the scoring engine
    search.ts              the cross-object index
    types.ts               the domain model
```

Fictional firm, fictional clients, invented figures. Nothing here is tax advice.
