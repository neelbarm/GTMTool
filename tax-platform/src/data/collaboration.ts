import type {
  ActivityEvent,
  Insight,
  QuestionnaireItem,
  Thread,
  WorkItem,
} from "@/lib/types";
import { FLAGSHIP_ID } from "./flagship";

/* ============================================================================
   COLLABORATION  (Challenge 02)

   Three rules make this a collaboration layer rather than an inbox:

   1. A thread cannot exist without an anchor. Every conversation is attached to
      a document, a return field, a questionnaire item or the return itself, and
      it is rendered wherever that object is rendered.
   2. A thread cannot exist without a named next-action owner. "Unassigned" is
      how requests die, so the model has no such value.
   3. Visibility is a property of the thread, and `internal` is a property of
      each message inside it — so a preparer can leave a private aside on a
      thread the client is reading, and the client simply never sees that turn.

   Switch to a client persona and every internal thread and every internal turn
   disappears from the UI. That is the whole permissions demo.
   ========================================================================== */

export const FLAGSHIP_THREADS: Thread[] = [
  {
    id: "TH-0117-01",
    returnId: FLAGSHIP_ID,
    subject: "Charitable giving — we can substantiate $6,500 of the $7,200",
    visibility: "client-visible",
    kind: "question",
    status: "awaiting-client",
    nextActionOwner: "james-whitfield",
    nextActionSide: "client",
    anchor: { type: "field", id: "F-SCHA-11", label: "Schedule A · line 11 — Gifts to charity" },
    dueDate: "2026-03-20",
    createdAt: "2026-03-09T16:20:00Z",
    updatedAt: "2026-03-12T09:05:00Z",
    participantIds: ["priya-raman", "james-whitfield", "marcus-webb"],
    messages: [
      {
        id: "M-01",
        authorId: "priya-raman",
        at: "2026-03-09T16:20:00Z",
        body:
          "Hi James — on the questionnaire you put your 2025 giving at $7,200, but the only acknowledgement letter we have is Riverkeep's for $6,500. Do you have a letter or receipt for the other $700? If it was several small gifts under $250 each, a bank or card statement showing them is enough.",
        internal: false,
        kind: "message",
      },
      {
        id: "M-02",
        authorId: "priya-raman",
        at: "2026-03-09T16:22:00Z",
        body:
          "Marcus — putting the documented $6,500 on the return for now so review isn't held up. If he can't substantiate the rest we file at $6,500; the difference is only about $170 of tax.",
        internal: true,
        kind: "message",
      },
      {
        id: "M-03",
        authorId: "marcus-webb",
        at: "2026-03-09T17:41:00Z",
        body: "Agreed. Don't move it without a letter. Flag it on the sign-off packet either way.",
        internal: true,
        kind: "message",
      },
      {
        id: "M-04",
        authorId: "james-whitfield",
        at: "2026-03-12T09:05:00Z",
        body:
          "I think the extra was a donation at a school auction in October. Let me dig around for the receipt — give me a few days.",
        internal: false,
        kind: "message",
      },
    ],
  },
  {
    id: "TH-0117-02",
    returnId: FLAGSHIP_ID,
    subject: "We need what you paid for 240 shares of Corvine Semiconductor",
    visibility: "client-visible",
    kind: "document-request",
    status: "awaiting-client",
    nextActionOwner: "james-whitfield",
    nextActionSide: "client",
    anchor: { type: "document", id: "DOC-1099B-CASCADE", label: "1099-B — Cascade Brokerage" },
    dueDate: "2026-03-18",
    createdAt: "2026-03-05T11:02:00Z",
    updatedAt: "2026-03-10T14:30:00Z",
    participantIds: ["priya-raman", "james-whitfield"],
    messages: [
      {
        id: "M-05",
        authorId: "priya-raman",
        at: "2026-03-05T11:02:00Z",
        body:
          "Cascade didn't report a cost basis for the Corvine shares you sold in June — they were bought before brokers had to track it. We found $9,480.00 on your 2024 return for what looks like the same lot and used that, but we'd rather confirm it than estimate. A trade confirmation or an old statement showing the March 2019 purchase would settle it.",
        internal: false,
        kind: "message",
      },
      {
        id: "M-06",
        authorId: "james-whitfield",
        at: "2026-03-10T14:30:00Z",
        body: "Cascade only lets me download three years. I've emailed them for the 2019 confirm.",
        internal: false,
        kind: "message",
      },
    ],
  },
  {
    id: "TH-0117-03",
    returnId: FLAGSHIP_ID,
    subject: "Corrected 1095-A restates SLCSP — recheck the premium tax credit",
    visibility: "internal",
    kind: "review-note",
    status: "open",
    nextActionOwner: "priya-raman",
    nextActionSide: "firm",
    anchor: { type: "document", id: "DOC-1095A-CORRECTED", label: "1095-A (CORRECTED)" },
    dueDate: "2026-03-16",
    createdAt: "2026-03-07T08:15:00Z",
    updatedAt: "2026-03-07T08:15:00Z",
    participantIds: ["marcus-webb", "priya-raman"],
    messages: [
      {
        id: "M-07",
        authorId: "marcus-webb",
        at: "2026-03-07T08:15:00Z",
        body:
          "The marketplace restated box 33B from $10,980 to $11,412. They took no advance credit so there's probably nothing to reconcile, but I want Form 8962 rerun and a note in the file saying we checked. Don't release the packet until this is closed.",
        internal: true,
        kind: "message",
      },
    ],
  },
  {
    id: "TH-0117-04",
    returnId: FLAGSHIP_ID,
    subject: "QBI on the Sable Creek K-1 — is the studio an SSTB?",
    visibility: "internal",
    kind: "review-note",
    status: "open",
    nextActionOwner: "marcus-webb",
    nextActionSide: "firm",
    anchor: { type: "field", id: "F-1040-13", label: "Form 1040 · line 13 — QBI deduction" },
    dueDate: "2026-03-17",
    createdAt: "2026-03-11T13:40:00Z",
    updatedAt: "2026-03-11T15:02:00Z",
    participantIds: ["priya-raman", "marcus-webb"],
    messages: [
      {
        id: "M-08",
        authorId: "priya-raman",
        at: "2026-03-11T13:40:00Z",
        body:
          "Meridian is proposing the full 20% on both the Schedule C and the K-1. Sable Creek is a design studio — I don't think that's a specified service trade, but you've seen this argued both ways. His taxable income is under the threshold anyway so it may be moot for 2025.",
        internal: true,
        kind: "message",
      },
      {
        id: "M-09",
        authorId: "marcus-webb",
        at: "2026-03-11T15:02:00Z",
        body:
          "Design isn't listed, and he's under the threshold, so take it. Write the reasoning into the file — if he crosses the threshold next year it matters.",
        internal: true,
        kind: "message",
      },
    ],
  },
  {
    id: "TH-0117-05",
    returnId: FLAGSHIP_ID,
    subject: "Property tax statement — received, thanks",
    visibility: "client-visible",
    kind: "document-request",
    status: "resolved",
    nextActionOwner: "priya-raman",
    nextActionSide: "firm",
    anchor: { type: "document", id: "DOC-PROPTAX", label: "Multnomah County property tax statement" },
    createdAt: "2026-02-06T10:00:00Z",
    updatedAt: "2026-02-09T18:04:00Z",
    participantIds: ["priya-raman", "james-whitfield"],
    messages: [
      {
        id: "M-10",
        authorId: "priya-raman",
        at: "2026-02-06T10:00:00Z",
        body: "We need your 2025 Multnomah County property tax statement to finish Schedule A.",
        internal: false,
        kind: "message",
      },
      {
        id: "M-11",
        authorId: "james-whitfield",
        at: "2026-02-09T18:02:00Z",
        body: "Attached.",
        internal: false,
        kind: "message",
        attachmentDocIds: ["DOC-PROPTAX"],
      },
      {
        id: "M-12",
        authorId: "system",
        at: "2026-02-09T18:04:00Z",
        body: "Request fulfilled — document matched to Schedule A line 5b.",
        internal: false,
        kind: "request-fulfilled",
      },
    ],
  },
  {
    id: "TH-0117-06",
    returnId: FLAGSHIP_ID,
    subject: "You'll owe about $472 — and a note about 2026",
    visibility: "client-visible",
    kind: "question",
    status: "open",
    nextActionOwner: "james-whitfield",
    nextActionSide: "client",
    dueDate: "2026-04-01",
    anchor: { type: "return", id: FLAGSHIP_ID, label: "2025 Form 1040" },
    createdAt: "2026-03-12T12:00:00Z",
    updatedAt: "2026-03-12T12:00:00Z",
    participantIds: ["priya-raman", "james-whitfield"],
    messages: [
      {
        id: "M-13",
        authorId: "priya-raman",
        at: "2026-03-12T12:00:00Z",
        body:
          "Heads up before you see the packet: you owe $471.55 rather than getting a refund, because the consulting work and the Sable Creek income had no withholding. Nothing is wrong. For 2026 you can either raise your withholding at Northwind or make quarterly payments — happy to set either up, just tell me which you'd prefer.",
        internal: false,
        kind: "message",
      },
    ],
  },
];

/* ============================================================================
   AI OUTPUT  (Challenge 10)

   Every insight carries the same five things, in the same order, every time:
   what it did · why · the evidence · what it is unsure about · what to do.
   Confidence is never shown as a bare percentage — it is shown as a band with
   the percentage as secondary detail, because "84%" invites false precision
   and "Likely" tells you how much to trust it.
   ========================================================================== */

export const FLAGSHIP_INSIGHTS: Insight[] = [
  {
    id: "INS-0117-01",
    returnId: FLAGSHIP_ID,
    kind: "discrepancy",
    title: "Charitable giving doesn't match the letter on file",
    summary:
      "The client answered $7,200 but only $6,500 is substantiated. Ask for a receipt, or file at $6,500.",
    confidence: 0.62,
    impact: { label: "Tax at stake", amount: 168 },
    fieldId: "F-SCHA-11",
    evidence: [
      {
        label: "Riverkeep Foundation acknowledgement",
        detail: "States $6,500.00 in cash contributions received during 2025, no goods or services given.",
        ref: { docId: "DOC-CHARITY-RIVERKEEP", page: 1, boxId: "total", snippet: "6,500.00" },
        strength: "strong",
      },
      {
        label: "Client questionnaire, answered 12 Feb",
        detail: "\"Roughly how much did you give to charity in 2025?\" — answered $7,200.",
        strength: "supporting",
      },
      {
        label: "No other acknowledgement letters uploaded",
        detail: "14 documents on file for 2025; only one is a charitable acknowledgement.",
        strength: "supporting",
      },
    ],
    reasoning: [
      "Read $6,500.00 from the Riverkeep letter and matched it to Schedule A line 11.",
      "Compared it against the client's own questionnaire answer of $7,200.",
      "Found no second acknowledgement covering the $700.00 difference.",
      "Used the documented figure, because an undocumented deduction is the one a reviewer has to defend.",
    ],
    uncertainty:
      "A gift under $250 doesn't need an acknowledgement letter, so the extra $700 may be perfectly valid and simply undocumented here. This is a question for the client, not an error.",
    action: { primary: "Ask the client", secondary: "File at $6,500" },
    status: "asked-client",
    model: "meridian-review-v4",
    at: "2026-03-09T16:18:00Z",
    resolution: {
      by: "priya-raman",
      at: "2026-03-09T16:20:00Z",
      note: "Asked the client for a receipt. Thread TH-0117-01.",
    },
  },
  {
    id: "INS-0117-02",
    returnId: FLAGSHIP_ID,
    kind: "missing-document",
    title: "Cost basis estimated from last year's return",
    summary:
      "Cascade left basis blank on one lot. We reused $9,480.00 from the 2024 Schedule D — approve it or supply the real figure.",
    confidence: 0.71,
    impact: { label: "Effect on tax if wrong by 10%", amount: 142 },
    fieldId: "F-1040-7",
    docId: "DOC-1099B-CASCADE",
    evidence: [
      {
        label: "1099-B marks the lot non-covered",
        detail: "Box 5 checked; box 1e blank for 240 shares of Corvine Semiconductor.",
        ref: { docId: "DOC-1099B-CASCADE", page: 1, boxId: "1e-nc", snippet: "— not provided" },
        strength: "strong",
      },
      {
        label: "2024 Schedule D detail lists the same lot",
        detail: "240 shares, acquired 03/2019, basis $9,480.00. Ticker, share count and date all match.",
        ref: { docId: "DOC-PRIOR-2024", page: 1, boxId: "corvine", snippet: "basis 9,480.00" },
        strength: "strong",
      },
    ],
    reasoning: [
      "Detected a sale with proceeds but no basis, which would otherwise be taxed on the full $96,412.80.",
      "Searched prior-year returns for a lot with the same ticker, share count and acquisition month.",
      "Found exactly one match on the 2024 Schedule D detail schedule.",
      "Carried its basis forward and flagged the field as needing approval.",
    ],
    uncertainty:
      "Matching is on ticker, share count and acquisition month — not on a lot identifier, because none is reported. If the client sold part of a larger position, or reinvested dividends into it, the real basis is higher than $9,480.00 and the gain here is overstated.",
    action: { primary: "Approve the estimate", secondary: "Request the trade confirmation" },
    status: "new",
    model: "meridian-extract-v3",
    at: "2026-03-05T10:58:00Z",
  },
  {
    id: "INS-0117-03",
    returnId: FLAGSHIP_ID,
    kind: "optimisation",
    title: "A $4,368 QBI deduction is available and not yet taken",
    summary:
      "Schedule C and K-1 income both qualify under §199A. Taking it reduces the balance due by about $1,048.",
    confidence: 0.84,
    impact: { label: "Reduces tax by", amount: 1048 },
    fieldId: "F-1040-13",
    evidence: [
      {
        label: "K-1 box 20 reports §199A information",
        detail: "Code Z, $9,340.00 — the partnership has already determined this is qualified income.",
        ref: { docId: "DOC-K1-SABLECREEK", page: 1, boxId: "20", snippet: "Code Z 9,340.00" },
        strength: "strong",
      },
      {
        label: "Schedule C net profit of $12,500.00",
        detail: "Consulting income from Bridgepoint Advisory, no employees, no W-2 wage limitation.",
        ref: { docId: "DOC-1099NEC-BRIDGEPOINT", page: 1, boxId: "1", snippet: "12,500.00" },
        strength: "strong",
      },
      {
        label: "Taxable income is below the 2025 phase-out",
        detail: "$217,096.55 before the deduction, against a joint threshold of $394,600.",
        strength: "supporting",
      },
    ],
    reasoning: [
      "Identified $21,840.00 of income that may be qualified business income.",
      "Confirmed the K-1 itself reports §199A information, so the partnership has taken a view.",
      "Checked taxable income against the phase-out threshold — no limitation applies.",
      "Applied the flat 20%.",
    ],
    uncertainty:
      "Whether the Schedule C consulting work is a specified service trade or business is a judgement call, not a lookup. If it is, the deduction still stands at this income level, but it would phase out entirely if the return crossed the threshold in a later year.",
    action: { primary: "Take the deduction", secondary: "Leave it out" },
    status: "new",
    model: "meridian-review-v4",
    at: "2026-03-11T13:32:00Z",
  },
  {
    id: "INS-0117-04",
    returnId: FLAGSHIP_ID,
    kind: "warning",
    title: "A corrected 1095-A arrived after the return was prepared",
    summary: "Box 33B moved by $432. Form 8962 was computed before the correction landed — rerun it.",
    confidence: 0.91,
    docId: "DOC-1095A-CORRECTED",
    evidence: [
      {
        label: "Two 1095-A statements for the same policy",
        detail: "Policy 4471-OR, issued 18 Feb and 06 Mar. The later one is marked CORRECTED.",
        ref: { docId: "DOC-1095A-CORRECTED", page: 1, boxId: "33B", snippet: "11,412.00" },
        strength: "strong",
      },
      {
        label: "Form 8962 last computed 03 Mar",
        detail: "Three days before the corrected statement was uploaded.",
        strength: "strong",
      },
    ],
    reasoning: [
      "Compared the two statements box by box; only 33B differs.",
      "Checked when the premium tax credit was last computed against when the correction arrived.",
      "Advance credit is $0.00, so the reconciliation most likely nets to nothing — but 'most likely' isn't a filing position.",
    ],
    uncertainty:
      "SLCSP only changes the outcome if the household claims a credit. Nothing in the file says they intend to, so this may be a no-op — which is exactly why it is a warning rather than a correction.",
    action: { primary: "Rerun Form 8962", secondary: "Mark as no effect" },
    status: "new",
    model: "meridian-review-v4",
    at: "2026-03-06T16:44:00Z",
  },
  {
    id: "INS-0117-05",
    returnId: FLAGSHIP_ID,
    kind: "recommendation",
    title: "Itemising beats the standard deduction by $5,442",
    summary: "Schedule A totals $35,442.11 against a $30,000 standard deduction. Itemised is selected.",
    confidence: 0.99,
    impact: { label: "Reduces tax by", amount: 1306 },
    fieldId: "F-1040-12",
    evidence: [
      {
        label: "Schedule A line 17",
        detail: "$35,442.11, driven mostly by $18,942.11 of mortgage interest.",
        fieldId: "F-SCHA-17",
        strength: "strong",
      },
      {
        label: "2025 standard deduction, married filing jointly",
        detail: "$30,000.00.",
        strength: "strong",
      },
    ],
    reasoning: [
      "Totalled Schedule A after applying the SALT cap.",
      "Compared it against the standard deduction for the filing status on the return.",
      "Selected the larger figure.",
    ],
    uncertainty: "None worth reporting. This is arithmetic against a published figure, not a judgement.",
    action: { primary: "Keep itemised", secondary: "Force standard deduction" },
    status: "accepted",
    model: "meridian-review-v4",
    at: "2026-03-08T15:50:00Z",
    resolution: {
      by: "marcus-webb",
      at: "2026-03-11T09:20:00Z",
      note: "Confirmed during review.",
    },
  },
  {
    id: "INS-0117-06",
    returnId: FLAGSHIP_ID,
    kind: "recommendation",
    title: "Untaxed side income will grow the 2026 balance due",
    summary:
      "$21,840 of income had no withholding. Suggest quarterly payments or a W-4 change before 15 April.",
    confidence: 0.77,
    impact: { label: "Estimated 2026 exposure", amount: 3900 },
    evidence: [
      {
        label: "Schedule C and K-1 income with no withholding",
        detail: "$12,500.00 + $9,340.00, neither subject to payroll withholding.",
        fieldId: "F-1040-8",
        strength: "strong",
      },
      {
        label: "Balance due grew year over year",
        detail: "2024 closed with a $310 refund; 2025 owes $471.55.",
        strength: "supporting",
      },
    ],
    reasoning: [
      "Compared withheld tax against total tax.",
      "Attributed the shortfall to income streams with no withholding attached.",
      "Extrapolated 2026 on the assumption the side income repeats at the same level.",
    ],
    uncertainty:
      "This assumes the consulting work and the partnership distribution recur in 2026 at 2025 levels. Neither is contracted, and the client has not said either way.",
    action: { primary: "Draft the client note", secondary: "Not relevant" },
    status: "new",
    model: "meridian-advisor-v2",
    at: "2026-03-12T11:50:00Z",
  },
  {
    id: "INS-0117-07",
    returnId: FLAGSHIP_ID,
    kind: "warning",
    title: "Mortgage interest fell 4.1% against last year",
    summary: "$18,942.11 against $19,744.02. Consistent with normal amortisation — no action needed.",
    confidence: 0.94,
    fieldId: "F-SCHA-8a",
    evidence: [
      {
        label: "1098 box 1 for 2025",
        detail: "$18,942.11 from Cascadia Mortgage Co.",
        ref: { docId: "DOC-1098-CASCADIA", page: 1, boxId: "1", snippet: "18,942.11" },
        strength: "strong",
      },
      { label: "2024 Schedule A line 8a", detail: "$19,744.02.", strength: "strong" },
    ],
    reasoning: [
      "Compared every Schedule A line against the prior year.",
      "Flagged the only line that moved more than 3%.",
      "Checked the movement against the outstanding principal, which fell consistently.",
    ],
    uncertainty: "None. This is a variance check, surfaced so nobody has to run it by hand.",
    action: { primary: "Dismiss", secondary: "Open Schedule A" },
    status: "dismissed",
    model: "meridian-review-v4",
    at: "2026-03-08T15:52:00Z",
    resolution: {
      by: "priya-raman",
      at: "2026-03-08T16:01:00Z",
      note: "Normal amortisation. Dismissed.",
    },
  },
  {
    id: "INS-0117-08",
    returnId: FLAGSHIP_ID,
    kind: "discrepancy",
    title: "State withholding was double-counted",
    summary: "Read Northwind's box 17 twice. A preparer corrected it from $21,190.25 to $11,754.25.",
    confidence: 0.55,
    fieldId: "F-SCHA-5a",
    evidence: [
      {
        label: "Northwind W-2 box 17",
        detail: "$9,436.00 — appears once on the form.",
        ref: { docId: "DOC-W2-NORTHWIND", page: 1, boxId: "17", snippet: "9,436.00" },
        strength: "strong",
      },
      {
        label: "Clearfield W-2 box 17",
        detail: "$2,318.25.",
        ref: { docId: "DOC-W2-CLEARFIELD", page: 1, boxId: "17", snippet: "2,318.25" },
        strength: "strong",
      },
    ],
    reasoning: [
      "The Northwind W-2 was uploaded twice — once by the client and once by the payroll connector.",
      "Both copies were read, and both box 17 values were summed.",
      "The duplicate was detected only after a preparer questioned the total.",
    ],
    uncertainty:
      "Deduplication compares issuer EIN, employee and box 1. It failed here because the payroll copy carried a different document date. The rule has not been changed — this correction is recorded against the model, not silently patched.",
    action: { primary: "Corrected by preparer", secondary: "View the correction" },
    status: "corrected",
    model: "meridian-extract-v3",
    at: "2026-03-08T15:20:00Z",
    resolution: {
      by: "priya-raman",
      at: "2026-03-08T15:30:00Z",
      note: "Removed the duplicate W-2 and re-derived line 5a from the two distinct employers.",
      correctedTo: 11_754.25,
    },
  },
];

/* --- Work items ----------------------------------------------------------- */

export const FLAGSHIP_TASKS: WorkItem[] = [
  {
    id: "WI-0117-01",
    returnId: FLAGSHIP_ID,
    title: "Approve or replace the estimated Corvine cost basis",
    detail: "Blocks review sign-off — a filed return can't rest on an estimate nobody approved.",
    assigneeId: "priya-raman",
    side: "firm",
    dueDate: "2026-03-16",
    status: "todo",
    kind: "review",
    estimateMin: 10,
    linked: [
      { type: "field", id: "F-1040-7", label: "1040 line 7 — Capital gain" },
      { type: "document", id: "DOC-1099B-CASCADE", label: "1099-B — Cascade Brokerage" },
    ],
  },
  {
    id: "WI-0117-02",
    returnId: FLAGSHIP_ID,
    title: "Rerun Form 8962 against the corrected 1095-A",
    assigneeId: "priya-raman",
    side: "firm",
    dueDate: "2026-03-16",
    status: "todo",
    kind: "prepare",
    estimateMin: 15,
    linked: [{ type: "document", id: "DOC-1095A-CORRECTED", label: "1095-A (CORRECTED)" }],
  },
  {
    id: "WI-0117-03",
    returnId: FLAGSHIP_ID,
    title: "Second-review Schedule A and the QBI position",
    assigneeId: "marcus-webb",
    side: "firm",
    dueDate: "2026-03-17",
    status: "in-progress",
    kind: "review",
    estimateMin: 30,
    linked: [{ type: "field", id: "F-1040-13", label: "1040 line 13 — QBI deduction" }],
  },
  {
    id: "WI-0117-04",
    returnId: FLAGSHIP_ID,
    title: "Send a receipt for the extra $700 of charitable giving",
    assigneeId: "james-whitfield",
    side: "client",
    dueDate: "2026-03-20",
    status: "todo",
    kind: "upload",
    linked: [{ type: "field", id: "F-SCHA-11", label: "Schedule A line 11" }],
  },
  {
    id: "WI-0117-05",
    returnId: FLAGSHIP_ID,
    title: "Send the 2019 Corvine trade confirmation",
    assigneeId: "james-whitfield",
    side: "client",
    dueDate: "2026-03-18",
    status: "blocked",
    detail: "Waiting on Cascade Brokerage to retrieve it.",
    kind: "upload",
    linked: [{ type: "document", id: "DOC-1099B-CASCADE", label: "1099-B — Cascade Brokerage" }],
  },
  {
    id: "WI-0117-06",
    returnId: FLAGSHIP_ID,
    title: "Tell us how you'd like to handle 2026 payments",
    assigneeId: "james-whitfield",
    side: "client",
    dueDate: "2026-04-01",
    status: "todo",
    kind: "answer",
    linked: [{ type: "task", id: "TH-0117-06", label: "Thread — 2026 payments" }],
  },
];

/* --- Questionnaire -------------------------------------------------------- */

export const FLAGSHIP_QUESTIONS: QuestionnaireItem[] = [
  {
    id: "Q-0117-01",
    returnId: FLAGSHIP_ID,
    section: "Your household",
    question: "Was your filing status still married filing jointly for all of 2025?",
    why: "It sets your standard deduction and your bracket, so almost everything downstream depends on it.",
    type: "yes-no",
    answer: "Yes",
    status: "answered",
    prefill: { value: "Yes", from: "Your 2024 return" },
  },
  {
    id: "Q-0117-02",
    returnId: FLAGSHIP_ID,
    section: "Your household",
    question: "Did anyone move in or out of your household during 2025?",
    why: "Dependants and household size change credits you may be eligible for.",
    type: "yes-no",
    answer: "No",
    status: "answered",
  },
  {
    id: "Q-0117-03",
    returnId: FLAGSHIP_ID,
    section: "Giving",
    question: "Roughly how much did you give to charity in 2025?",
    why: "We compare your answer to the acknowledgement letters on file, so nothing gets missed and nothing is claimed twice.",
    type: "money",
    answer: "$7,200",
    status: "flagged",
  },
  {
    id: "Q-0117-04",
    returnId: FLAGSHIP_ID,
    section: "Income",
    question: "Did you do any consulting or freelance work in 2025?",
    why: "This income usually arrives with no tax withheld, which changes what you owe in April.",
    type: "yes-no",
    answer: "Yes",
    status: "answered",
    revealsIds: ["Q-0117-05"],
  },
  {
    id: "Q-0117-05",
    returnId: FLAGSHIP_ID,
    section: "Income",
    question: "Did you have expenses against that consulting work?",
    why: "Business expenses reduce the income you're taxed on. Most people forget mileage and home office.",
    type: "yes-no",
    answer: "No",
    status: "answered",
    hiddenUnless: { id: "Q-0117-04", equals: "Yes" },
  },
  {
    id: "Q-0117-06",
    returnId: FLAGSHIP_ID,
    section: "Property",
    question: "Did you sell or refinance any property in 2025?",
    why: "Both create tax events that don't always generate a form, so we have to ask.",
    type: "yes-no",
    status: "unanswered",
  },
  {
    id: "Q-0117-07",
    returnId: FLAGSHIP_ID,
    section: "Accounts",
    question: "Did you hold more than $10,000 in accounts outside the United States at any point?",
    why: "If yes, a separate FinCEN filing is required and the penalties for missing it are severe.",
    type: "yes-no",
    answer: "No",
    status: "answered",
  },
];

/* --- Activity ------------------------------------------------------------- */

export const FLAGSHIP_ACTIVITY: ActivityEvent[] = [
  { id: "AC-15", returnId: FLAGSHIP_ID, at: "2026-03-12T12:00:00Z", actorId: "priya-raman", verb: "started a thread", object: "You'll owe about $472 — and a note about 2026", kind: "message", href: "/inbox/TH-0117-06" },
  { id: "AC-14", returnId: FLAGSHIP_ID, at: "2026-03-12T09:05:00Z", actorId: "james-whitfield", verb: "replied on", object: "Charitable giving", kind: "message", href: "/inbox/TH-0117-01" },
  { id: "AC-13", returnId: FLAGSHIP_ID, at: "2026-03-11T15:02:00Z", actorId: "marcus-webb", verb: "approved the position on", object: "QBI deduction", kind: "field", href: "/returns/RTN-2025-0117/review?field=F-1040-13" },
  { id: "AC-12", returnId: FLAGSHIP_ID, at: "2026-03-11T13:32:00Z", actorId: "system", verb: "found", object: "a $4,368 QBI deduction not yet taken", kind: "ai", href: "/returns/RTN-2025-0117/ai" },
  { id: "AC-11", returnId: FLAGSHIP_ID, at: "2026-03-11T09:20:00Z", actorId: "marcus-webb", verb: "verified", object: "line 12 — Deduction taken", kind: "field", href: "/returns/RTN-2025-0117/review?field=F-1040-12" },
  { id: "AC-10", returnId: FLAGSHIP_ID, at: "2026-03-10T14:30:00Z", actorId: "james-whitfield", verb: "replied on", object: "Corvine cost basis", kind: "message", href: "/inbox/TH-0117-02" },
  { id: "AC-09", returnId: FLAGSHIP_ID, at: "2026-03-09T10:05:00Z", actorId: "priya-raman", verb: "moved the return to", object: "Review", kind: "stage" },
  { id: "AC-08", returnId: FLAGSHIP_ID, at: "2026-03-07T08:15:00Z", actorId: "marcus-webb", verb: "left an internal note on", object: "1095-A (CORRECTED)", kind: "message", href: "/inbox/TH-0117-03" },
  { id: "AC-07", returnId: FLAGSHIP_ID, at: "2026-03-06T16:40:00Z", actorId: "james-whitfield", verb: "uploaded", object: "1095-A (CORRECTED)", kind: "document", href: "/returns/RTN-2025-0117/documents?doc=DOC-1095A-CORRECTED" },
  { id: "AC-06", returnId: FLAGSHIP_ID, at: "2026-03-08T15:30:00Z", actorId: "priya-raman", verb: "corrected an AI figure on", object: "Schedule A line 5a", kind: "ai", href: "/returns/RTN-2025-0117/ai?insight=INS-0117-08" },
  { id: "AC-05", returnId: FLAGSHIP_ID, at: "2026-03-05T10:58:00Z", actorId: "system", verb: "flagged", object: "a missing cost basis on the 1099-B", kind: "ai", href: "/returns/RTN-2025-0117/ai?insight=INS-0117-02" },
  { id: "AC-04", returnId: FLAGSHIP_ID, at: "2026-03-02T11:30:00Z", actorId: "priya-raman", verb: "added", object: "Schedule K-1 — Sable Creek Studio", kind: "document", href: "/returns/RTN-2025-0117/documents?doc=DOC-K1-SABLECREEK" },
  { id: "AC-03", returnId: FLAGSHIP_ID, at: "2026-02-09T18:02:00Z", actorId: "james-whitfield", verb: "uploaded", object: "Property tax statement", kind: "document", href: "/returns/RTN-2025-0117/documents?doc=DOC-PROPTAX" },
  { id: "AC-02", returnId: FLAGSHIP_ID, at: "2026-02-04T14:22:00Z", actorId: "james-whitfield", verb: "uploaded", object: "4 documents", kind: "document", href: "/returns/RTN-2025-0117/documents" },
  { id: "AC-01", returnId: FLAGSHIP_ID, at: "2026-01-22T19:30:00Z", actorId: "james-whitfield", verb: "started", object: "the 2025 engagement", kind: "stage" },
];
