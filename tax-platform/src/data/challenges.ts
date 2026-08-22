export interface Challenge {
  n: string;
  title: string;
  /** The one-line position taken. */
  position: string;
  /** Where in the prototype to see it. */
  where: string;
  href: string;
  /** The longer argument, shown on /system. */
  argument: string;
  /** The thing that was deliberately NOT done, and why. */
  tradeoff: string;
}

export const CHALLENGES: Challenge[] = [
  {
    n: "01",
    title: "Source document traceability",
    position:
      "Traceability is a coordinate, not a filename — every figure points at a box on a page, and every derivation shows its arithmetic.",
    where: "Review workspace",
    href: "/returns/RTN-2025-0117/review",
    argument:
      "A citation that says “from the W-2” is not traceability; it just moves the manual check somewhere else. So the link between a field and its source is stored as a document, a page and a rectangle, and clicking a figure scrolls the source pane to that rectangle and lights it up. Calculated fields get the same treatment one level up: the chain unfolds step by step, each step naming its inputs, and each input is itself clickable back to its own source. The chain never dead-ends in a number with no parent — it ends at a box on a document or at a statute.",
    tradeoff:
      "The source pane is drawn from structured fixtures rather than rendered PDFs. Real documents would need OCR and a viewer; neither changes the interaction being tested.",
  },
  {
    n: "02",
    title: "Client & CPA collaboration",
    position:
      "A thread cannot exist without an anchor and a named next-action owner. That is the whole difference between a collaboration layer and an inbox.",
    where: "Inbox",
    href: "/inbox",
    argument:
      "Generic inboxes fail because a message is a first-class object with no relationship to the work. Here every conversation is attached to a document, a return line, a question or the return itself, and it renders wherever that object renders — so the question about charitable giving appears on Schedule A line 11, not just in a list. Visibility is a property of the thread; “internal” is a property of each message inside it, which lets a preparer leave a private aside on a thread the client is reading. One function in the data layer enforces that boundary, so it cannot drift screen by screen.",
    tradeoff:
      "No real-time transport. Replies are local to the session. Read receipts and typing indicators were left out deliberately — they add anxiety without adding accountability.",
  },
  {
    n: "03",
    title: "Where to start",
    position:
      "One card, one verb, one number. Everything a first-time client does not need yet is not merely collapsed — it is absent from the navigation.",
    where: "Ravi Chandra's first run",
    href: "/home",
    argument:
      "A new client's home page shows a single next action at the top with the time it will take, and a three-step setup with progress. The sidebar carries one item. Documents, questions and messages appear only once setup is done, because a navigation item you cannot yet use is a question you have to answer before you can start. The interface then permanently changes shape: the setup card is replaced by a status card, and the full navigation stays.",
    tradeoff:
      "There is no tour, no coach marks and no empty-state illustration. If a screen needs a tour, the screen is wrong.",
  },
  {
    n: "04",
    title: "Getting lost between parts of the app",
    position:
      "Three mechanisms: breadcrumbs for where you are, a Connected rail for what this touches, and a resume bar for the workflow you stepped out of.",
    where: "Any return",
    href: "/returns/RTN-2025-0117",
    argument:
      "Orientation and return-to-work are different problems and need different tools. Breadcrumbs answer “where am I”. The Connected rail answers “what else is this attached to” — the same relationship data everywhere, so a document shows the lines it feeds, the conversations about it and the tasks that reference it. The resume bar answers “how do I get back”: following a link out of a workflow leaves a marker, and a one-click return that survives four hops in between. Every object has its own URL, so a deep link into a specific return line opens with that line selected.",
    tradeoff:
      "No tabs and no split panes at the shell level. They preserve context by hoarding it; at 200 returns you end up managing windows instead of work.",
  },
  {
    n: "05",
    title: "Role-aware experiences",
    position:
      "Roles change scope, capability and landing page. They never change the shell, the vocabulary or the status model.",
    where: "Switch seat",
    href: "/system#roles",
    argument:
      "Six roles could easily become six products. What stops it is holding three things constant: the same chrome, the same interaction language, and the same underlying status record rendered for two audiences. Identity is modelled as a pair — person plus seat — rather than as a property of the login, which is what lets Dana Okafor prepare returns at the firm and file her own without signing out. Permissions are communicated where they bite: a control the role can't use stays visible, greys out and says why, because a missing button teaches nothing and reads as a bug.",
    tradeoff:
      "No real auth. Seats are switchable by anyone, which is exactly what you want in a prototype and exactly what you would not ship.",
  },
  {
    n: "06",
    title: "Return status & progress",
    position:
      "Status is three facts, never one word: where it is · who acts next · what's in the way.",
    where: "Any return overview",
    href: "/returns/RTN-2025-0117",
    argument:
      "“In Progress” fails because it collapses three independent things into one label that each audience expands differently. Splitting them fixes it: six ordered stages, each with a single shared definition that both audiences can read; an explicit owner drawn from the blockers rather than guessed at; and a typed blocker list. The stage test that keeps the list at six: if a state has no entry event and no exit event, it is not a stage, it is a blocker. That is what disqualifies “Open Items” and “Pending Review”. Clients get different words for the same stage and see the same definition — they just don't see the internal review sub-states, because a client cannot act on them.",
    tradeoff:
      "Firms will ask for custom statuses. Allowing them is how you get back to labels nobody agrees on, so the model is fixed and the flexibility lives in blockers and tags.",
  },
  {
    n: "07",
    title: "An actionable dashboard",
    position:
      "Rank by what you can actually move, not by what is loudest. Work blocked on someone else leaves the queue and becomes a chase list.",
    where: "Today",
    href: "/home",
    argument:
      "The scoring function weighs deadline pressure non-linearly, whether the ball is on our side, stage, complexity against time remaining, blocker severity, staleness, escalations and fee — and every score carries its reasons, which are shown on demand. That last part is the load-bearing one: a preparer who cannot see why something is top of the list will not trust the list and will go back to their spreadsheet. Managers get the same data pivoted by person and by bottleneck rather than a second dashboard.",
    tradeoff:
      "No configurable widgets. A dashboard that every user arranges differently cannot be reasoned about, supported or improved.",
  },
  {
    n: "08",
    title: "Clickable vs. editable",
    position:
      "Hue encodes provenance. Ornament encodes affordance. Neither ever carries meaning alone — every state also ships a glyph and a word.",
    where: "The interaction system",
    href: "/system#affordance",
    argument:
      "Colour alone fails for eight per cent of men, in greyscale, and on a bad monitor. So the load-bearing signal is the underline: dashed means you can type here, solid means something proposed this and you decide, double means two sources disagree, none means you cannot change it. Colour then adds provenance on top — violet for machine-generated and not yet accepted, green for verified by a named person, amber for awaiting a decision, red for conflict, neutral for locked. Every figure on every screen renders through one component, which is the only way a system like this survives contact with a tenth screen.",
    tradeoff:
      "Six states is more than most products carry, and each one had to earn its place. “Approved” and “verified” were merged; “imported” was dropped into provenance rather than state.",
  },
  {
    n: "09",
    title: "Complexity made navigable",
    position:
      "Summary and detail are the same screen at different depths, not two screens. Depth is opened, never navigated to.",
    where: "Documents at volume",
    href: "/returns/RTN-2025-0117/documents",
    argument:
      "The prototype ships hundreds of documents and 200+ returns so filtering, grouping and virtualised scrolling are tested against volume rather than a demo row. Three levers do the work: grouping that reflects how the work is actually organised (by form type, by who acted last, by what is unresolved), filters that compose and stay visible so you always know what you are looking at, and progressive disclosure that opens in place — a derivation chain expands under the figure rather than throwing you into a new page. Persistent context along the top means the return you are inside never leaves the screen.",
    tradeoff:
      "No infinite scroll. Counts and pagination tell you the size of the problem; infinite scroll hides it.",
  },
  {
    n: "10",
    title: "Trustworthy AI",
    position:
      "Every AI output answers the same five questions in the same order, and says out loud what it is unsure about.",
    where: "AI activity",
    href: "/returns/RTN-2025-0117/ai",
    argument:
      "What it did · why · the evidence · what is uncertain · what to do. Confidence is shown as a band with the number as secondary detail, because “84%” invites false precision while “Likely” tells you how much to trust it. The uncertainty line is the single most trust-building element in the product and it is never omitted — one insight even says “none worth reporting, this is arithmetic”, which is what makes the others credible. Correction is a first-class path, not an error state: correcting a figure records who corrected it and what the model got wrong, and that record stays visible on the return.",
    tradeoff:
      "No chat. A conversational surface would let the AI make claims with no evidence attached, which is the opposite of what this model is for.",
  },
];

export const CHALLENGE_BY_N = Object.fromEntries(CHALLENGES.map((c) => [c.n, c])) as Record<
  string,
  Challenge
>;
