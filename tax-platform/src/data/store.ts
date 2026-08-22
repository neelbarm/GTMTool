import type {
  ActivityEvent,
  Client,
  Insight,
  QuestionnaireItem,
  ReturnField,
  SourceDoc,
  TaxReturn,
  Thread,
  WorkItem,
} from "@/lib/types";
import {
  FLAGSHIP_ACTIVITY,
  FLAGSHIP_INSIGHTS,
  FLAGSHIP_QUESTIONS,
  FLAGSHIP_TASKS,
  FLAGSHIP_THREADS,
} from "./collaboration";
import { FLAGSHIP_DOCS, FLAGSHIP_FIELDS, FLAGSHIP_ID } from "./flagship";
import { GEN_CLIENTS, GEN_DOCS, GEN_RETURNS, GEN_TASKS, GEN_THREADS } from "./generate";
import {
  PERSONA_CLIENTS,
  PERSONA_DOCS,
  PERSONA_QUESTIONS,
  PERSONA_RETURNS,
  PERSONA_TASKS,
  PERSONA_THREADS,
} from "./personas";
import { PERSON_BY_ID } from "./people";

export { FLAGSHIP_ID };

export const CLIENTS: Client[] = [...PERSONA_CLIENTS, ...GEN_CLIENTS];
export const RETURNS: TaxReturn[] = [...PERSONA_RETURNS, ...GEN_RETURNS];
export const DOCS: SourceDoc[] = [...FLAGSHIP_DOCS, ...PERSONA_DOCS, ...GEN_DOCS];
export const FIELDS: ReturnField[] = [...FLAGSHIP_FIELDS];
export const THREADS: Thread[] = [...FLAGSHIP_THREADS, ...PERSONA_THREADS, ...GEN_THREADS];
export const TASKS: WorkItem[] = [...FLAGSHIP_TASKS, ...PERSONA_TASKS, ...GEN_TASKS];
export const INSIGHTS: Insight[] = [...FLAGSHIP_INSIGHTS];
export const QUESTIONS: QuestionnaireItem[] = [...FLAGSHIP_QUESTIONS, ...PERSONA_QUESTIONS];
export const ACTIVITY: ActivityEvent[] = [...FLAGSHIP_ACTIVITY];

const byId = <T extends { id: string }>(xs: T[]) =>
  Object.fromEntries(xs.map((x) => [x.id, x])) as Record<string, T>;

export const RETURN_BY_ID = byId(RETURNS);
export const DOC_BY_ID = byId(DOCS);
export const FIELD_BY_ID = byId(FIELDS);
export const THREAD_BY_ID = byId(THREADS);
export const CLIENT_BY_ID = byId(CLIENTS);
export const INSIGHT_BY_ID = byId(INSIGHTS);
export const TASK_BY_ID = byId(TASKS);

const group = <T,>(xs: T[], key: (x: T) => string) => {
  const m: Record<string, T[]> = {};
  for (const x of xs) (m[key(x)] ??= []).push(x);
  return m;
};

const DOCS_BY_RETURN = group(DOCS, (d) => d.returnId);
const FIELDS_BY_RETURN = group(FIELDS, (f) => f.returnId);
const THREADS_BY_RETURN = group(THREADS, (t) => t.returnId);
const TASKS_BY_RETURN = group(TASKS, (t) => t.returnId);
const INSIGHTS_BY_RETURN = group(INSIGHTS, (i) => i.returnId);
const QUESTIONS_BY_RETURN = group(QUESTIONS, (q) => q.returnId);
const ACTIVITY_BY_RETURN = group(ACTIVITY, (a) => a.returnId);
const RETURNS_BY_CLIENT = group(RETURNS, (x) => x.clientId);

export const docsFor = (returnId: string) => DOCS_BY_RETURN[returnId] ?? [];
export const fieldsFor = (returnId: string) => FIELDS_BY_RETURN[returnId] ?? [];
export const tasksFor = (returnId: string) => TASKS_BY_RETURN[returnId] ?? [];
export const insightsFor = (returnId: string) => INSIGHTS_BY_RETURN[returnId] ?? [];
export const questionsFor = (returnId: string) => QUESTIONS_BY_RETURN[returnId] ?? [];
export const activityFor = (returnId: string) => ACTIVITY_BY_RETURN[returnId] ?? [];
export const returnsForClient = (clientId: string) => RETURNS_BY_CLIENT[clientId] ?? [];

/**
 * The single choke point for the internal/external boundary.
 *
 * Nothing in the UI reads THREADS directly — every surface goes through here,
 * so a client can never be shown an internal thread or an internal turn inside
 * a thread they can otherwise see. One function is easier to trust than a
 * conditional scattered across nine screens.
 */
export function threadsFor(returnId: string, audience: "client" | "firm"): Thread[] {
  const all = THREADS_BY_RETURN[returnId] ?? [];
  if (audience === "firm") return all;
  return all
    .filter((t) => t.visibility === "client-visible")
    .map((t) => ({ ...t, messages: t.messages.filter((m) => !m.internal) }));
}

export function visibleThreads(audience: "client" | "firm"): Thread[] {
  if (audience === "firm") return THREADS;
  return THREADS.filter((t) => t.visibility === "client-visible").map((t) => ({
    ...t,
    messages: t.messages.filter((m) => !m.internal),
  }));
}

/** Resolves a person id OR a client id to a display name. */
export function actorName(id: string): string {
  return PERSON_BY_ID[id]?.name ?? CLIENT_BY_ID[id]?.name ?? id;
}

export function actorInitials(id: string): string {
  const p = PERSON_BY_ID[id];
  if (p) return p.initials;
  const c = CLIENT_BY_ID[id];
  if (c)
    return c.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  return id.slice(0, 2).toUpperCase();
}

export function actorHue(id: string): number {
  const p = PERSON_BY_ID[id];
  if (p) return p.hue;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

/* --- Which returns a given identity can see ------------------------------- */

export function scopedReturns(opts: {
  audience: "client" | "firm";
  personId: string;
  clientId?: string;
  canSeeAll: boolean;
}): TaxReturn[] {
  if (opts.audience === "client") {
    const own = RETURNS.filter((x) => x.clientId === opts.clientId);
    /* A business owner also sees the entity returns they are the contact for. */
    const entity = RETURNS.filter(
      (x) => CLIENT_BY_ID[x.clientId]?.contactId === opts.personId && x.clientId !== opts.clientId,
    );
    return [...own, ...entity];
  }
  if (opts.canSeeAll) return RETURNS;
  return RETURNS.filter((x) => x.preparerId === opts.personId || x.reviewerId === opts.personId);
}

/* --- Cross-object links (Challenge 04) ------------------------------------ */

export interface LinkedObject {
  type: "document" | "field" | "thread" | "task" | "questionnaire" | "return" | "insight";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

/**
 * Given any object, what else is attached to it?
 *
 * This is the data behind the "Connected" rail. Relationships are declared once
 * here and rendered identically wherever you are, which is what makes moving
 * between a document, the field it feeds and the thread about it feel like one
 * place rather than four.
 */
export function linksFor(
  kind: "document" | "field" | "thread" | "task",
  id: string,
  returnId: string,
): LinkedObject[] {
  const out: LinkedObject[] = [];
  const base = `/returns/${returnId}`;

  if (kind === "document") {
    for (const f of fieldsFor(returnId)) {
      if (f.sources.some((s) => s.docId === id)) {
        out.push({
          type: "field",
          id: f.id,
          label: `${f.form} · line ${f.line}`,
          sublabel: f.label,
          href: `${base}/review?field=${f.id}`,
        });
      }
    }
    for (const t of THREADS_BY_RETURN[returnId] ?? []) {
      if (t.anchor.type === "document" && t.anchor.id === id) {
        out.push({ type: "thread", id: t.id, label: t.subject, sublabel: "Conversation", href: `/inbox/${t.id}` });
      }
    }
    for (const t of tasksFor(returnId)) {
      if (t.linked.some((l) => l.type === "document" && l.id === id)) {
        out.push({ type: "task", id: t.id, label: t.title, sublabel: "Task", href: `${base}/tasks?task=${t.id}` });
      }
    }
    for (const i of insightsFor(returnId)) {
      if (i.docId === id || i.evidence.some((e) => e.ref?.docId === id)) {
        out.push({ type: "insight", id: i.id, label: i.title, sublabel: "AI insight", href: `${base}/ai?insight=${i.id}` });
      }
    }
  }

  if (kind === "field") {
    const f = FIELD_BY_ID[id];
    if (f) {
      const seen = new Set<string>();
      for (const s of f.sources) {
        if (seen.has(s.docId)) continue;
        seen.add(s.docId);
        const d = DOC_BY_ID[s.docId];
        if (d)
          out.push({
            type: "document",
            id: d.id,
            label: d.name,
            sublabel: `Page ${s.page} · box ${s.boxId}`,
            href: `${base}/documents?doc=${d.id}`,
          });
      }
    }
    for (const t of THREADS_BY_RETURN[returnId] ?? []) {
      if (t.anchor.type === "field" && t.anchor.id === id) {
        out.push({ type: "thread", id: t.id, label: t.subject, sublabel: "Conversation", href: `/inbox/${t.id}` });
      }
    }
    for (const i of insightsFor(returnId)) {
      if (i.fieldId === id) {
        out.push({ type: "insight", id: i.id, label: i.title, sublabel: "AI insight", href: `${base}/ai?insight=${i.id}` });
      }
    }
    for (const t of tasksFor(returnId)) {
      if (t.linked.some((l) => l.type === "field" && l.id === id)) {
        out.push({ type: "task", id: t.id, label: t.title, sublabel: "Task", href: `${base}/tasks?task=${t.id}` });
      }
    }
  }

  if (kind === "thread") {
    const t = THREAD_BY_ID[id];
    if (t && t.anchor.type !== "return") {
      const href =
        t.anchor.type === "document"
          ? `${base}/documents?doc=${t.anchor.id}`
          : t.anchor.type === "field"
            ? `${base}/review?field=${t.anchor.id}`
            : `${base}/tasks?task=${t.anchor.id}`;
      out.push({
        type: t.anchor.type === "field" ? "field" : t.anchor.type === "document" ? "document" : "task",
        id: t.anchor.id,
        label: t.anchor.label,
        sublabel: "Anchored to",
        href,
      });
    }
  }

  if (kind === "task") {
    const t = TASK_BY_ID[id];
    for (const l of t?.linked ?? []) {
      const href =
        l.type === "document"
          ? `${base}/documents?doc=${l.id}`
          : l.type === "field"
            ? `${base}/review?field=${l.id}`
            : l.type === "task"
              ? `/inbox/${l.id}`
              : base;
      out.push({
        type: l.type === "questionnaire" ? "questionnaire" : (l.type as LinkedObject["type"]),
        id: l.id,
        label: l.label,
        href,
      });
    }
  }

  return out;
}

export const STATS = {
  returns: RETURNS.length,
  documents: DOCS.length,
  threads: THREADS.length,
  tasks: TASKS.length,
  clients: CLIENTS.length,
};
