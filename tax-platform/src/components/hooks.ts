"use client";

import * as React from "react";
import { useSession, useVisibleReturnIds } from "./session";
import {
  DOC_BY_ID,
  RETURN_BY_ID,
  RETURNS,
  docsFor,
  fieldsFor,
  insightsFor,
  questionsFor,
  tasksFor,
  threadsFor,
} from "@/data/store";
import type { Insight, ReturnField, SourceDoc, TaxReturn, Thread, WorkItem } from "@/lib/types";
import { person } from "@/data/people";

/* Every screen reads the data through these hooks rather than the store, so a
   local edit made anywhere is visible everywhere without a refresh. */

export function useScopedReturns(): TaxReturn[] {
  const allow = useVisibleReturnIds();
  return React.useMemo(() => RETURNS.filter((r) => allow.has(r.id)), [allow]);
}

/** A client's own returns, most recent tax year first, entity returns after. */
export function useMyReturns() {
  const { audience, personId } = useSession();
  const scoped = useScopedReturns();
  return React.useMemo(() => {
    if (audience !== "client") return [];
    const me = person(personId);
    const extra = me.personalReturnId ? [RETURN_BY_ID[me.personalReturnId]] : [];
    const all = [...scoped, ...extra.filter((x): x is TaxReturn => Boolean(x))];
    const seen = new Set<string>();
    return all
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .sort((a, b) => b.taxYear - a.taxYear || (a.form === "1040" ? 1 : -1));
  }, [audience, scoped, personId]);
}

export function useActiveReturn(): TaxReturn | undefined {
  const mine = useMyReturns();
  return React.useMemo(() => mine.find((r) => r.stage !== "accepted") ?? mine[0], [mine]);
}

/* --- Field / insight state with local edits merged in --------------------- */

export function useFields(returnId: string): ReturnField[] {
  const { fieldOverrides } = useSession();
  return React.useMemo(
    () =>
      fieldsFor(returnId).map((f) => {
        const o = fieldOverrides[f.id];
        if (!o) return f;
        return {
          ...f,
          value: o.value ?? f.value,
          state: o.state,
          verifiedBy: o.state === "verified" ? o.by : f.verifiedBy,
          verifiedAt: o.state === "verified" ? o.at : f.verifiedAt,
          conflict: o.state === "conflict" ? f.conflict : undefined,
        };
      }),
    [returnId, fieldOverrides],
  );
}

export function useInsights(returnId: string): Insight[] {
  const { insightOverrides } = useSession();
  return React.useMemo(
    () =>
      insightsFor(returnId).map((i) => {
        const o = insightOverrides[i.id];
        if (!o) return i;
        return {
          ...i,
          status: o.status,
          resolution: { by: o.by, at: o.at, note: o.note, correctedTo: o.correctedTo },
        };
      }),
    [returnId, insightOverrides],
  );
}

export function useDocuments(returnId: string): SourceDoc[] {
  const { uploads } = useSession();
  return React.useMemo(() => {
    const extra: SourceDoc[] = uploads
      .filter((u) => u.returnId === returnId)
      .map((u) => ({
        id: u.id,
        returnId,
        name: u.name,
        kind: u.kind as SourceDoc["kind"],
        issuer: "Uploaded in this session",
        pages: 1,
        bytes: 142_000,
        uploadedBy: "you",
        uploadedAt: u.at,
        source: "client-upload",
        status: "processing",
        confidence: 0,
        taxYear: RETURN_BY_ID[returnId]?.taxYear ?? 2025,
      }));
    return [...extra, ...docsFor(returnId)];
  }, [returnId, uploads]);
}

export function useThreads(returnId: string): Thread[] {
  const { audience, replies, resolvedThreads } = useSession();
  return React.useMemo(
    () =>
      threadsFor(returnId, audience).map((t) => ({
        ...t,
        messages: [...t.messages, ...(replies[t.id] ?? [])],
        status: resolvedThreads[t.id] ? ("resolved" as const) : t.status,
      })),
    [returnId, audience, replies, resolvedThreads],
  );
}

export function useTasks(returnId: string): WorkItem[] {
  const { doneTasks } = useSession();
  return React.useMemo(
    () =>
      tasksFor(returnId).map((t) =>
        doneTasks[t.id] ? { ...t, status: "done" as const } : t,
      ),
    [returnId, doneTasks],
  );
}

export function useQuestions(returnId: string) {
  const { answers } = useSession();
  return React.useMemo(
    () =>
      questionsFor(returnId).map((q) =>
        answers[q.id] !== undefined
          ? { ...q, answer: answers[q.id], status: "answered" as const }
          : q,
      ),
    [returnId, answers],
  );
}

/* --- First-run progress (Challenge 03) ------------------------------------ */

export interface Setup {
  steps: { id: string; label: string; done: boolean; href: string; blurb: string; minutes: number }[];
  done: number;
  total: number;
  complete: boolean;
  next?: Setup["steps"][number];
}

export function useSetup(returnId: string | undefined): Setup {
  const tasks = useTasks(returnId ?? "");
  const questions = useQuestions(returnId ?? "");
  const docs = useDocuments(returnId ?? "");
  const { uploads } = useSession();

  return React.useMemo(() => {
    const idTask = tasks.find((t) => t.kind === "upload" && /identity/i.test(t.title));
    const uploadedIds = uploads.filter((u) => u.returnId === returnId);
    const idDone = idTask ? idTask.status === "done" : docs.some((d) => d.kind === "ID document");
    const docsDone = uploadedIds.length > 0 || docs.some((d) => d.kind === "W-2");
    const answered = questions.filter((q) => q.status === "answered").length;
    const questionsDone = questions.length > 0 && answered === questions.length;

    const steps = [
      {
        id: "identity",
        label: "Verify who you are",
        blurb: "A photo of your licence or passport. The IRS requires it before we can file.",
        done: idDone,
        href: `/documents?step=identity`,
        minutes: 2,
      },
      {
        id: "documents",
        label: "Add your tax documents",
        blurb: "Anything that arrived marked “important tax document”. Your W-2 is the one we need first.",
        done: docsDone,
        href: `/documents`,
        minutes: 5,
      },
      {
        id: "questions",
        label: `Answer ${questions.length} questions about your year`,
        blurb: "Marriage, moves, side income. Each one says why we're asking.",
        done: questionsDone,
        href: `/questions`,
        minutes: 10,
      },
    ];
    const done = steps.filter((s) => s.done).length;
    return {
      steps,
      done,
      total: steps.length,
      complete: done === steps.length,
      next: steps.find((s) => !s.done),
    };
  }, [tasks, questions, docs, uploads, returnId]);
}

/** True while a client account still looks brand new. */
export function useIsFirstRun() {
  const { audience } = useSession();
  const active = useActiveReturn();
  const setup = useSetup(active?.id);
  return audience === "client" && active?.stage === "intake" && !setup.complete;
}

export function docName(id: string) {
  return DOC_BY_ID[id]?.name ?? id;
}
