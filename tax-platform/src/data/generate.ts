import type {
  Blocker,
  BlockerKind,
  Client,
  DocKind,
  SourceDoc,
  StageId,
  TaxReturn,
  Thread,
  WorkItem,
} from "@/lib/types";
import { BLOCKER_COPY, nextActionSide } from "./taxonomy";
import { genericFacsimile } from "./facsimile";

/* ============================================================================
   The long tail.

   Challenge 09 asks for search, filtering and hierarchy tested against real
   volume rather than a handful of demo rows, so the prototype ships ~210
   returns and ~900 documents. All of it is generated from a fixed seed, which
   means the dataset is identical on the server and in the browser (no
   hydration drift) and identical between two people opening the demo — a bug
   report can say "return 0093" and mean something.
   ========================================================================== */

/** Everything in this prototype is relative to one pinned instant. */
export const TODAY = new Date("2026-03-13T09:00:00Z");
export const FILING_DEADLINE = new Date("2026-04-15T00:00:00Z");

/* mulberry32 — small, fast, and stable across engines. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(20260313);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const chance = (p: number) => r() < p;

const FIRST = [
  "Alan", "Beatrice", "Caleb", "Diana", "Elliot", "Farah", "Gideon", "Harriet", "Ivan", "Jasmine",
  "Kofi", "Leona", "Malik", "Nora", "Omar", "Petra", "Quentin", "Rosa", "Samir", "Tessa",
  "Ulric", "Vera", "Wendell", "Ximena", "Yusuf", "Zoe", "Marta", "Desmond", "Iris", "Bruno",
  "Colette", "Hugo", "Ines", "Piotr", "Anouk", "Theo", "Lucia", "Rafael", "Greta", "Milo",
];
const LAST = [
  "Alvarado", "Bergström", "Castellanos", "Duarte", "Eriksen", "Faulkner", "Grigoryan", "Hollis",
  "Ibarra", "Jensen", "Kowalski", "Lindqvist", "Marchetti", "Nakamura", "Ortiz", "Pemberton",
  "Quintero", "Rasmussen", "Sandoval", "Thorne", "Ustinov", "Vasquez", "Wainwright", "Xiong",
  "Yamamoto", "Zieliński", "Okonjo", "Petrov", "Halloran", "Beaumont",
];
const BIZ_A = ["Copper", "Sable", "Harbor", "Alder", "Iron", "Willow", "Granite", "Marlow", "Verdant", "Northfield", "Quarry", "Kestrel", "Lantern", "Ridgeway", "Ольха", "Cobalt", "Pinegate", "Thistle"];
const BIZ_B = ["Creek", "& Sons", "Labs", "Works", "Partners", "Collective", "Group", "Studio", "Provisions", "Holdings", "Foundry", "Logistics", "Dental", "Orthodontics", "Roofing", "Analytics"];
const BIZ_C = ["LLC", "Inc.", "LP", "PC", "Co."];

const DOC_KINDS: DocKind[] = [
  "W-2", "1099-INT", "1099-DIV", "1099-B", "1099-NEC", "1099-MISC", "1099-R", "1098", "1098-T",
  "1095-A", "K-1", "Receipt", "Bank statement", "Property tax", "Charity letter", "Mileage log",
  "Depreciation schedule",
];

const ISSUERS = [
  "Harbor Savings Bank", "Cascade Brokerage", "Northwind Systems Inc.", "Clearfield Labs LLC",
  "Bridgepoint Advisory", "Cascadia Mortgage Co.", "Riverkeep Foundation", "Multnomah County",
  "Pacific Trust", "Willamette Credit Union", "Sable Creek Studio LLC", "Evergreen Payroll",
  "Ridgeline Capital", "Meridian Index Fund", "Statewide Title", "Alder Property Mgmt",
];

const PREPARERS = ["priya-raman", "anna-liu", "raj-mehta", "sofia-alvarez", "dana-okafor"];
const REVIEWERS = ["marcus-webb", "ben-carter"];
const SEASONAL = ["tom-ferris", "grace-kim"];

const STAGE_WEIGHTS: [StageId, number][] = [
  ["intake", 0.14],
  ["prepare", 0.26],
  ["review", 0.22],
  ["signoff", 0.16],
  ["filed", 0.08],
  ["accepted", 0.14],
];

function weightedStage(): StageId {
  const x = r();
  let acc = 0;
  for (const [s, w] of STAGE_WEIGHTS) {
    acc += w;
    if (x <= acc) return s;
  }
  return "prepare";
}

const BLOCKERS_BY_STAGE: Record<StageId, BlockerKind[]> = {
  intake: ["missing-document", "unanswered-question", "id-verification"],
  prepare: ["missing-document", "unanswered-question"],
  review: ["review-comment", "unanswered-question"],
  signoff: ["client-signature", "payment-authorisation"],
  filed: ["irs-processing"],
  accepted: [],
};

function iso(d: Date) {
  return d.toISOString();
}
function daysFrom(base: Date, days: number) {
  return new Date(base.getTime() + days * 86_400_000);
}

/* --- Clients -------------------------------------------------------------- */

export const GEN_CLIENTS: Client[] = [];
export const GEN_RETURNS: TaxReturn[] = [];
export const GEN_DOCS: SourceDoc[] = [];
export const GEN_THREADS: Thread[] = [];
export const GEN_TASKS: WorkItem[] = [];

let docSeq = 1000;
let returnSeq = 1000;

function makeBlockers(stage: StageId, returnId: string): Blocker[] {
  const kinds = BLOCKERS_BY_STAGE[stage];
  if (kinds.length === 0) return [];
  const n = stage === "filed" ? 1 : chance(0.42) ? 0 : int(1, 2);
  const out: Blocker[] = [];
  const used = new Set<BlockerKind>();
  for (let i = 0; i < n; i++) {
    const kind = pick(kinds);
    if (used.has(kind)) continue;
    used.add(kind);
    out.push({
      id: `${returnId}-BLK-${i}`,
      kind,
      label: BLOCKER_COPY[kind].firm,
      owner: BLOCKER_COPY[kind].side,
      since: iso(daysFrom(TODAY, -int(1, 26))),
      severity: chance(0.25) ? "high" : chance(0.5) ? "medium" : "low",
    });
  }
  return out;
}

function makeDocsFor(ret: TaxReturn, count: number) {
  for (let i = 0; i < count; i++) {
    const kind = pick(DOC_KINDS);
    const issuer = pick(ISSUERS);
    const uploaded = daysFrom(TODAY, -int(3, 70));
    GEN_DOCS.push({
      id: `DOC-${++docSeq}`,
      returnId: ret.id,
      name: `${kind} — ${issuer}.pdf`,
      kind,
      issuer,
      pages: kind === "Prior-year return" ? int(18, 42) : int(1, 6),
      bytes: int(48, 900) * 1024,
      uploadedBy: chance(0.62) ? ret.clientId : pick([...PREPARERS, "system"]),
      uploadedAt: iso(uploaded),
      source: chance(0.55) ? "client-upload" : chance(0.5) ? "bank-connect" : "firm-scan",
      status: chance(0.08) ? "needs-review" : chance(0.03) ? "processing" : "processed",
      confidence: Math.round((0.62 + r() * 0.37) * 100) / 100,
      taxYear: ret.taxYear,
      facsimile: genericFacsimile(kind, issuer, ret.taxYear, [
        int(400, 90_000) + Math.round(r() * 100) / 100,
        int(100, 20_000),
        int(0, 4_000),
      ]),
    });
  }
}

const CLIENT_COUNT = 62;

for (let c = 0; c < CLIENT_COUNT; c++) {
  const isBiz = chance(0.36);
  const name = isBiz
    ? `${pick(BIZ_A)} ${pick(BIZ_B)} ${pick(BIZ_C)}`.replace("Ольха", "Alder")
    : `${pick(FIRST)} ${pick(LAST)}`;
  const clientId = `CL-${(c + 1).toString().padStart(3, "0")}`;
  GEN_CLIENTS.push({
    id: clientId,
    name,
    kind: isBiz ? "business" : "individual",
    since: int(2014, 2025),
    segment: isBiz ? pick(["Small business", "Partnership", "Corporation"] as const) : "Individual",
    contactId: clientId,
  });

  const returnCount = isBiz && chance(0.5) ? 2 : 1;
  for (let k = 0; k < returnCount; k++) {
    const taxYear = 2025;
    const stage = weightedStage();
    const id = `RTN-${taxYear}-${(++returnSeq).toString()}`;
    const blockers = makeBlockers(stage, id);
    const form = isBiz
      ? k === 0
        ? pick(["1120-S", "1065", "1120"] as const)
        : "1040"
      : "1040";
    const complexity = isBiz ? int(2, 5) : int(1, 4);
    const extended = chance(0.18);
    const docsExpected = int(4, 26) + complexity * 2;
    const docsReceived =
      stage === "intake" ? int(0, Math.max(1, docsExpected - 3)) : int(Math.max(1, docsExpected - 3), docsExpected);
    const ret: TaxReturn = {
      id,
      clientId,
      clientName: name,
      taxYear,
      form,
      stage,
      preparerId: chance(0.16) ? pick(SEASONAL) : pick(PREPARERS),
      reviewerId: pick(REVIEWERS),
      owner: nextActionSide(blockers, stage),
      dueDate: iso(extended ? new Date("2026-10-15T00:00:00Z") : FILING_DEADLINE),
      extended,
      complexity,
      outcome: chance(0.58) ? int(180, 14_500) : -int(120, 22_000),
      agi: int(38_000, 940_000),
      blockers,
      docsExpected,
      docsReceived,
      openQuestions: stage === "accepted" || stage === "filed" ? 0 : int(0, 6),
      unresolvedInsights: stage === "accepted" ? 0 : int(0, 5),
      lastActivity: iso(daysFrom(TODAY, -int(0, 21))),
      fee: int(4, 62) * 100,
      serviceLine: isBiz
        ? "Business"
        : chance(0.12)
          ? "Multi-state"
          : chance(0.06)
            ? "Trust"
            : "Individual",
      flags: [
        ...(chance(0.1) ? (["new-client"] as const) : []),
        ...(chance(0.07) ? (["vip"] as const) : []),
        ...(chance(0.05) ? (["irs-notice"] as const) : []),
        ...(chance(0.06) ? (["multi-state"] as const) : []),
        ...(chance(0.09) ? (["k1-pending"] as const) : []),
      ],
    };
    GEN_RETURNS.push(ret);
    makeDocsFor(ret, Math.max(2, Math.round(docsReceived * 0.6)));
  }
}

/* --- A few generated threads and tasks, so the firm inbox has volume ------ */

const THREAD_BODIES = [
  "Following up on this so we can keep the return moving — no rush today, but it will hold up review by the end of the week.",
  "Left a note on the file. Whoever picks this up next, the answer changes Schedule A, so don't file around it.",
  "Chased this by phone as well. If nothing lands by Friday I'd rather file without it and amend later.",
  "This is the last outstanding item on the return. Everything else is prepared and ready for review.",
  "Checked the prior year — same treatment was taken then, so I'm comfortable carrying it forward unless you disagree.",
  "Client says they'll dig it out this week. Flagging it here so it doesn't get lost between us.",
  "Reviewed and happy with the position. Noting it on the file in case the IRS ever asks how we got here.",
  "Small one, but it changes the balance due, so I'd rather settle it before the packet goes out.",
];

const THREAD_SUBJECTS = [
  "Missing 1099 from the brokerage",
  "Confirm the home office square footage",
  "Which vehicle was used for business?",
  "Do you still hold the rental on Alder St?",
  "Signature needed on Form 8879",
  "State apportionment for the Washington sales",
  "Depreciation schedule for the 2025 equipment",
  "Estimated payments for next year",
  "K-1 hasn't arrived from the partnership",
  "Confirm dependants for 2025",
];

const ACTIVE_STAGES: StageId[] = ["intake", "prepare", "review", "signoff"];
const activeReturns = GEN_RETURNS.filter((x) => ACTIVE_STAGES.includes(x.stage));

activeReturns.slice(0, 90).forEach((ret, i) => {
  const internal = chance(0.38);
  const clientSide = !internal && chance(0.6);
  GEN_THREADS.push({
    id: `TH-G-${i.toString().padStart(3, "0")}`,
    returnId: ret.id,
    subject: pick(THREAD_SUBJECTS),
    visibility: internal ? "internal" : "client-visible",
    kind: internal ? "review-note" : chance(0.5) ? "document-request" : "question",
    status: clientSide ? "awaiting-client" : chance(0.3) ? "resolved" : "open",
    nextActionOwner: clientSide ? ret.clientId : ret.preparerId,
    nextActionSide: clientSide ? "client" : "firm",
    anchor: { type: "return", id: ret.id, label: `${ret.taxYear} Form ${ret.form}` },
    dueDate: iso(daysFrom(TODAY, int(-6, 14))),
    createdAt: iso(daysFrom(TODAY, -int(2, 30))),
    updatedAt: iso(daysFrom(TODAY, -int(0, 8))),
    participantIds: [ret.preparerId, ret.clientId],
    messages: [
      {
        id: `TH-G-${i}-M0`,
        authorId: ret.preparerId,
        at: iso(daysFrom(TODAY, -int(2, 30))),
        body: pick(THREAD_BODIES),
        internal,
        kind: "message",
      },
    ],
  });
});

activeReturns.slice(0, 120).forEach((ret, i) => {
  GEN_TASKS.push({
    id: `WI-G-${i.toString().padStart(3, "0")}`,
    returnId: ret.id,
    title: pick([
      "Prepare Schedule C",
      "Reconcile the brokerage statements",
      "Second review",
      "Chase the outstanding K-1",
      "Release the sign-off packet",
      "Roll forward the depreciation schedule",
      "Check the multi-state apportionment",
    ]),
    assigneeId: ret.stage === "review" ? ret.reviewerId : ret.preparerId,
    side: "firm",
    dueDate: iso(daysFrom(TODAY, int(-4, 16))),
    status: chance(0.2) ? "in-progress" : chance(0.1) ? "blocked" : "todo",
    kind: ret.stage === "review" ? "review" : "prepare",
    estimateMin: int(10, 120),
    linked: [{ type: "return", id: ret.id, label: `${ret.clientName} · ${ret.taxYear}` }],
  });
});
