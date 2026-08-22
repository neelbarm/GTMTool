import type { Blocker, BlockerKind, Role, Stage, StageId } from "@/lib/types";

/* ============================================================================
   THE SHARED STATUS MODEL  (Challenge 06)

   Six stages. Every stage carries ONE definition that both audiences can read,
   plus the two events that bound it. If a stage can't be described by a single
   entry event and a single exit event, it isn't a stage — it's a blocker, and
   it belongs in the blocker list instead.

   That test is what keeps the list at six. "Open Items" and "Pending Review"
   are the classic offenders: neither has an entry event, because both describe
   something stuck rather than somewhere reached.
   ========================================================================== */

export const STAGES: Stage[] = [
  {
    id: "intake",
    index: 0,
    firmLabel: "Intake",
    clientLabel: "Collecting your documents",
    definition:
      "We are gathering the documents and answers needed to start the return. Nothing has been prepared yet.",
    entry: "Engagement accepted for the tax year",
    exit: "All required documents received and the questionnaire is complete",
    typicalOwner: "client",
    entryActor: "client",
  },
  {
    id: "prepare",
    index: 1,
    firmLabel: "Preparation",
    clientLabel: "We're preparing your return",
    definition:
      "A preparer is building the return from your documents. You may still get questions, but nothing more is needed from you right now.",
    entry: "Preparer assigned and first form opened",
    exit: "Preparer marks the return complete and sends it to review",
    typicalOwner: "firm",
    entryActor: "firm",
  },
  {
    id: "review",
    index: 2,
    firmLabel: "Review",
    clientLabel: "A second CPA is checking it",
    definition:
      "A second, more senior CPA is checking every figure and the positions taken. Changes here go back to the preparer, not to you.",
    entry: "Return submitted to review",
    exit: "Reviewer signs off with no open review comments",
    typicalOwner: "firm",
    entryActor: "firm",
  },
  {
    id: "signoff",
    index: 3,
    firmLabel: "Client sign-off",
    clientLabel: "Ready for your signature",
    definition:
      "The return is finished and correct as far as we can tell. It cannot be filed until you review it and sign Form 8879.",
    entry: "Reviewer approves and the return packet is released to the client",
    exit: "Signed Form 8879 received",
    typicalOwner: "client",
    entryActor: "firm",
  },
  {
    id: "filed",
    index: 4,
    firmLabel: "Filed",
    clientLabel: "Filed with the IRS",
    definition:
      "We have transmitted the return. The IRS has not confirmed acceptance yet — this usually takes 24 to 48 hours.",
    entry: "E-file transmitted",
    exit: "IRS acknowledgement received",
    typicalOwner: "irs",
    entryActor: "firm",
  },
  {
    id: "accepted",
    index: 5,
    firmLabel: "Accepted",
    clientLabel: "Accepted by the IRS",
    definition:
      "The IRS has accepted the return. It is done. Amendments start a new return rather than reopening this one.",
    entry: "IRS acknowledgement received",
    exit: "—",
    typicalOwner: "irs",
    entryActor: "irs",
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<
  StageId,
  Stage
>;

export function stageLabel(id: StageId, audience: "client" | "firm") {
  const s = STAGE_BY_ID[id];
  return audience === "client" ? s.clientLabel : s.firmLabel;
}

/* --- Blocker vocabulary --------------------------------------------------- */

export const BLOCKER_COPY: Record<
  BlockerKind,
  { firm: string; client: string; side: "client" | "firm" | "irs" }
> = {
  "missing-document": {
    firm: "Missing document",
    client: "We still need a document from you",
    side: "client",
  },
  "unanswered-question": {
    firm: "Unanswered question",
    client: "There's a question waiting for you",
    side: "client",
  },
  "client-signature": {
    firm: "Awaiting signature",
    client: "Your signature is needed",
    side: "client",
  },
  "review-comment": {
    firm: "Open review comment",
    client: "Our reviewer is finishing a check",
    side: "firm",
  },
  "id-verification": {
    firm: "Identity not verified",
    client: "We need to verify your identity",
    side: "client",
  },
  "payment-authorisation": {
    firm: "Payment authorisation pending",
    client: "Payment details needed",
    side: "client",
  },
  "irs-processing": {
    firm: "With the IRS",
    client: "The IRS is processing it",
    side: "irs",
  },
};

/** The single place that decides who holds the ball. */
export function nextActionSide(blockers: Blocker[], stageId: StageId) {
  if (blockers.length > 0) {
    const rank: Record<string, number> = { client: 0, firm: 1, irs: 2 };
    return [...blockers].sort((a, b) => rank[a.owner] - rank[b.owner])[0].owner;
  }
  return STAGE_BY_ID[stageId].typicalOwner;
}

/* ============================================================================
   ROLES  (Challenge 05)

   Six roles, one shell. Roles differ in three ways and only three ways:
     1. which returns they can see     (scope)
     2. which verbs they can perform   (capability)
     3. what the landing page is       (intent)
   Everything else — the nav chrome, the affordance language, the status model —
   is identical, which is what stops this becoming six products.
   ========================================================================== */

export const ROLES: Role[] = [
  {
    id: "individual",
    label: "Individual taxpayer",
    audience: "client",
    summary: "Files a personal return. Sees only their own return, in plain language.",
    can: ["view.own-return", "edit.own-answers", "sign.return", "message.client"],
  },
  {
    id: "business",
    label: "Business owner",
    audience: "client",
    summary:
      "Files an entity return and a personal one. Same client experience, two returns to switch between.",
    can: ["view.own-return", "edit.own-answers", "sign.return", "message.client"],
  },
  {
    id: "preparer",
    label: "Tax preparer",
    audience: "firm",
    summary: "Builds returns. Can edit figures and accept AI output, but cannot approve a return.",
    can: [
      "view.assigned-returns",
      "view.internal-notes",
      "edit.return-fields",
      "verify.ai-output",
      "message.client",
    ],
  },
  {
    id: "reviewer",
    label: "Reviewer",
    audience: "firm",
    summary: "Signs off on other people's work. Can approve and file. Sees every assigned return.",
    can: [
      "view.all-returns",
      "view.internal-notes",
      "edit.return-fields",
      "verify.ai-output",
      "approve.return",
      "file.return",
      "message.client",
    ],
  },
  {
    id: "admin",
    label: "Firm administrator",
    audience: "firm",
    summary: "Runs the practice. Sees capacity and billing across every return, edits none of them.",
    can: ["view.all-returns", "view.firm-admin", "manage.staff", "manage.billing"],
  },
  {
    id: "seasonal",
    label: "Seasonal staff",
    audience: "firm",
    summary:
      "Temporary help during filing season. Data entry on assigned returns only; no client contact, no client-visible messaging.",
    can: ["view.assigned-returns", "edit.return-fields"],
  },
];

export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<
  Role["id"],
  Role
>;

/** Human-readable reason a capability is withheld — shown instead of a dead button. */
export const CAPABILITY_COPY: Record<string, string> = {
  "approve.return": "Only a reviewer can approve a return for filing.",
  "file.return": "Only a reviewer can transmit a return to the IRS.",
  "message.client":
    "Seasonal staff can't message clients. Add an internal note and a preparer will pick it up.",
  "view.internal-notes": "Internal notes are visible to firm staff only.",
  "edit.return-fields": "This role has read-only access to return figures.",
  "manage.staff": "Staff management is limited to firm administrators.",
  "view.firm-admin": "Practice-wide reporting is limited to firm administrators.",
};

export const SERVICE_LINES = ["Individual", "Business", "Trust", "Multi-state"] as const;
