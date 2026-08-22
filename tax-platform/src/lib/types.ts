/* ============================================================================
   Domain model.

   The one structural decision worth calling out up front, because eight of the
   ten challenges lean on it:

   A return's condition is NOT a single status string. It is three orthogonal
   facts, always rendered together:

       STAGE    where the return is in the process        (ordered, 6 values)
       OWNER    who has to act next                       (client | firm | irs)
       BLOCKERS what is actually stopping it              (0..n, typed)

   "In Progress" fails because it collapses those three into one word that each
   audience expands differently. Keeping them separate is what lets the same
   underlying record render as a precise internal state for a reviewer and as a
   plain sentence for a client without either of them being lied to.
   ========================================================================== */

export type RoleId =
  | "individual"
  | "business"
  | "preparer"
  | "reviewer"
  | "admin"
  | "seasonal";

export type Audience = "client" | "firm";

export interface Role {
  id: RoleId;
  label: string;
  audience: Audience;
  /** One line shown in the role switcher and on the permission sheet. */
  summary: string;
  /** Capabilities drive both navigation and the affordance layer. */
  can: Capability[];
}

export type Capability =
  | "view.own-return"
  | "view.all-returns"
  | "view.assigned-returns"
  | "view.internal-notes"
  | "view.firm-admin"
  | "edit.return-fields"
  | "edit.own-answers"
  | "verify.ai-output"
  | "approve.return"
  | "sign.return"
  | "file.return"
  | "message.client"
  | "manage.staff"
  | "manage.billing";

/* --- Stage ---------------------------------------------------------------- */

export type StageId =
  | "intake"
  | "prepare"
  | "review"
  | "signoff"
  | "filed"
  | "accepted";

export interface Stage {
  id: StageId;
  index: number;
  /** What firm staff see. */
  firmLabel: string;
  /** What the client sees. Different words, identical meaning. */
  clientLabel: string;
  /** The single shared definition. Both audiences can read this exact text. */
  definition: string;
  /** The event that moves a return INTO this stage. */
  entry: string;
  /** The event that moves a return OUT of this stage. */
  exit: string;
  /** Who normally holds the ball while a return sits here. */
  typicalOwner: ActorSide;
  /** Who performs the entry event. Often NOT the same as typicalOwner. */
  entryActor: ActorSide;
}

export type ActorSide = "client" | "firm" | "irs";

/* --- Blockers ------------------------------------------------------------- */

export type BlockerKind =
  | "missing-document"
  | "unanswered-question"
  | "client-signature"
  | "review-comment"
  | "id-verification"
  | "payment-authorisation"
  | "irs-processing";

export interface Blocker {
  id: string;
  kind: BlockerKind;
  label: string;
  /** Who has to clear it. This is what drives "who owns the next action". */
  owner: ActorSide;
  since: string;
  severity: "low" | "medium" | "high";
  /** Deep link to the object that resolves it. */
  href?: string;
}

/* --- People --------------------------------------------------------------- */

export interface Person {
  id: string;
  name: string;
  initials: string;
  email: string;
  title: string;
  roles: RoleId[];
  /** A firm employee who also files personally has a client identity too. */
  personalReturnId?: string;
  hue: number;
  isDemoPersona?: boolean;
}

export interface Client {
  id: string;
  name: string;
  kind: "individual" | "business";
  since: number;
  segment: "Individual" | "Small business" | "Partnership" | "Corporation";
  contactId: string;
  /** Client accounts that have never signed in change the whole first run. */
  firstRun?: boolean;
}

/* --- Returns -------------------------------------------------------------- */

export type FormType = "1040" | "1120-S" | "1065" | "1120" | "1041";

export interface TaxReturn {
  id: string;
  clientId: string;
  clientName: string;
  taxYear: number;
  form: FormType;
  stage: StageId;
  preparerId: string;
  reviewerId: string;
  /** Which side holds the ball right now — derived from blockers, then stage. */
  owner: ActorSide;
  dueDate: string;
  extended: boolean;
  /** 1–5. Drives both prioritisation and how much UI we unfold by default. */
  complexity: number;
  /** Positive = refund, negative = balance due. */
  outcome: number;
  agi: number;
  blockers: Blocker[];
  docsExpected: number;
  docsReceived: number;
  openQuestions: number;
  unresolvedInsights: number;
  lastActivity: string;
  /** Realised revenue on the engagement — managers rank partly on this. */
  fee: number;
  serviceLine: "Individual" | "Business" | "Trust" | "Multi-state";
  flags: ReturnFlag[];
}

export type ReturnFlag =
  | "new-client"
  | "vip"
  | "irs-notice"
  | "amended"
  | "multi-state"
  | "k1-pending";

/* --- Documents ------------------------------------------------------------ */

export type DocKind =
  | "W-2"
  | "1099-INT"
  | "1099-DIV"
  | "1099-B"
  | "1099-NEC"
  | "1099-MISC"
  | "1099-R"
  | "1098"
  | "1098-T"
  | "1095-A"
  | "K-1"
  | "Receipt"
  | "Bank statement"
  | "Prior-year return"
  | "Property tax"
  | "Charity letter"
  | "Mileage log"
  | "Depreciation schedule"
  | "ID document";

export type DocStatus =
  | "processed"
  | "processing"
  | "needs-review"
  | "superseded"
  | "rejected";

export interface SourceDoc {
  id: string;
  returnId: string;
  name: string;
  kind: DocKind;
  issuer: string;
  pages: number;
  bytes: number;
  uploadedBy: string;
  uploadedAt: string;
  source: "client-upload" | "bank-connect" | "prior-year" | "firm-scan" | "payroll-connect";
  status: DocStatus;
  /** Extraction confidence for the document as a whole. */
  confidence: number;
  taxYear: number;
  /** Rendered facsimile content, so the viewer shows something real-looking. */
  facsimile?: Facsimile;
  supersededBy?: string;
}

/** A deliberately small description of a page, enough to draw a believable form. */
export interface Facsimile {
  title: string;
  subtitle: string;
  omb: string;
  boxes: FacsimileBox[];
}

export interface FacsimileBox {
  id: string;
  label: string;
  value: string;
  /** Percent of the page, so highlights survive any zoom level. */
  rect: { x: number; y: number; w: number; h: number };
  mono?: boolean;
  wide?: boolean;
}

/* --- Return fields & traceability ---------------------------------------- */

export type Provenance =
  | "extracted"
  | "calculated"
  | "client-entered"
  | "preparer-entered"
  | "prior-year"
  | "irs-record";

export type FieldState =
  | "ai-suggested"
  | "verified"
  | "needs-approval"
  | "conflict"
  | "locked"
  | "editable";

export interface SourceRef {
  docId: string;
  page: number;
  /** Which box on the facsimile to light up. */
  boxId: string;
  snippet: string;
}

export interface DerivationStep {
  label: string;
  /** Human-readable arithmetic, e.g. "68,400.00 + 3,120.00". */
  expression: string;
  value: number;
  /** Where each input came from, so the chain never dead-ends. */
  inputs?: { label: string; value: number; fieldId?: string; ref?: SourceRef }[];
  note?: string;
}

export interface ReturnField {
  id: string;
  returnId: string;
  form: string;
  line: string;
  label: string;
  value: number;
  provenance: Provenance;
  state: FieldState;
  confidence?: number;
  sources: SourceRef[];
  derivation?: DerivationStep[];
  verifiedBy?: string;
  verifiedAt?: string;
  lockedReason?: string;
  /** Set when extraction and a second source disagree. */
  conflict?: { otherValue: number; otherLabel: string; explanation: string };
  priorYearValue?: number;
  section: string;
}

/* --- Collaboration -------------------------------------------------------- */

export type ThreadVisibility = "client-visible" | "internal";
export type ThreadStatus = "open" | "awaiting-client" | "answered" | "resolved";
export type ThreadKind = "document-request" | "question" | "review-note" | "notice";

export interface AnchorRef {
  type: "document" | "field" | "questionnaire" | "return" | "task";
  id: string;
  label: string;
}

export interface Thread {
  id: string;
  returnId: string;
  subject: string;
  visibility: ThreadVisibility;
  kind: ThreadKind;
  status: ThreadStatus;
  /** Never "unassigned". A request nobody owns is how things get lost. */
  nextActionOwner: string;
  nextActionSide: ActorSide;
  anchor: AnchorRef;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  participantIds: string[];
}

export interface Message {
  id: string;
  authorId: string;
  at: string;
  body: string;
  /** An internal aside inside a client-visible thread. Invisible to clients. */
  internal: boolean;
  kind: "message" | "system" | "request-fulfilled";
  attachmentDocIds?: string[];
}

/* --- Tasks & questionnaire ------------------------------------------------ */

export interface WorkItem {
  id: string;
  returnId: string;
  title: string;
  detail?: string;
  assigneeId: string;
  side: ActorSide;
  dueDate: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  kind: "upload" | "answer" | "review" | "prepare" | "sign" | "call" | "file";
  linked: AnchorRef[];
  estimateMin?: number;
}

export interface QuestionnaireItem {
  id: string;
  returnId: string;
  section: string;
  question: string;
  /** Every question says why it is being asked. Trust is built from this. */
  why: string;
  type: "yes-no" | "short-text" | "money" | "choice";
  choices?: string[];
  answer?: string;
  status: "unanswered" | "answered" | "flagged";
  /** Answering some questions reveals others. */
  revealsIds?: string[];
  hiddenUnless?: { id: string; equals: string };
  prefill?: { value: string; from: string };
}

/* --- AI ------------------------------------------------------------------- */

export type InsightKind =
  | "recommendation"
  | "warning"
  | "discrepancy"
  | "missing-document"
  | "optimisation";

export type InsightStatus = "new" | "accepted" | "dismissed" | "corrected" | "asked-client";

export interface Evidence {
  label: string;
  detail: string;
  ref?: SourceRef;
  fieldId?: string;
  strength: "strong" | "supporting" | "weak";
}

export interface Insight {
  id: string;
  returnId: string;
  kind: InsightKind;
  title: string;
  /** One sentence, in the user's language, that says what to do. */
  summary: string;
  confidence: number;
  impact?: { label: string; amount: number };
  evidence: Evidence[];
  /** Short chain, never a wall of text. Hidden behind a disclosure. */
  reasoning: string[];
  /** Said plainly. The single most trust-building thing an AI feature can do. */
  uncertainty: string;
  action: { primary: string; secondary: string };
  status: InsightStatus;
  model: string;
  at: string;
  fieldId?: string;
  docId?: string;
  /** Recorded when a human accepts, corrects or dismisses it. Never silent. */
  resolution?: { by: string; at: string; note: string; correctedTo?: number };
}

/* --- Activity ------------------------------------------------------------- */

export interface ActivityEvent {
  id: string;
  returnId: string;
  at: string;
  actorId: string;
  verb: string;
  object: string;
  href?: string;
  kind: "stage" | "document" | "message" | "field" | "ai" | "task";
}
