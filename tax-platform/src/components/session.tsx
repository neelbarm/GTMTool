"use client";

import * as React from "react";
import type { Capability, FieldState, Message, RoleId } from "@/lib/types";
import { ROLE_BY_ID } from "@/data/taxonomy";
import { person } from "@/data/people";
import { CLIENT_BY_ID, RETURN_BY_ID } from "@/data/store";

/* ============================================================================
   Session = who you are + what you have changed.

   Two decisions worth naming:

   1. Identity is a PAIR — (person, role) — not a single value. Dana Okafor is
      one account with two seats: preparer at the firm, and a taxpayer with her
      own 1040. Modelling that as `person.currentRole` rather than as two logins
      is what makes the switch feel like changing desks instead of signing out.

   2. Every action in this prototype actually mutates state. Verifying a figure,
      accepting an AI suggestion, answering a question, uploading a document —
      all of it writes here and every screen re-reads it. Nothing is a dead
      button, because a prototype that only looks clickable can't be evaluated.
   ========================================================================== */

export type Theme = "light" | "dark";

export interface FieldOverride {
  value?: number;
  state: FieldState;
  by: string;
  at: string;
  note?: string;
}

export interface InsightOverride {
  status: "accepted" | "dismissed" | "corrected" | "asked-client";
  by: string;
  at: string;
  note: string;
  correctedTo?: number;
}

export interface UploadedDoc {
  id: string;
  returnId: string;
  name: string;
  kind: string;
  at: string;
}

export interface ResumePoint {
  label: string;
  href: string;
  note?: string;
}

export interface Recent {
  label: string;
  sublabel?: string;
  href: string;
  kind: string;
}

interface SessionValue {
  hydrated: boolean;

  personId: string;
  roleId: RoleId;
  audience: "client" | "firm";
  clientId?: string;
  switchTo: (personId: string, roleId: RoleId) => void;
  can: (c: Capability) => boolean;

  theme: Theme;
  setTheme: (t: Theme) => void;

  fieldOverrides: Record<string, FieldOverride>;
  setFieldState: (fieldId: string, o: FieldOverride) => void;

  insightOverrides: Record<string, InsightOverride>;
  resolveInsight: (id: string, o: InsightOverride) => void;

  answers: Record<string, string>;
  answer: (questionId: string, value: string) => void;

  doneTasks: Record<string, boolean>;
  toggleTask: (id: string, done: boolean) => void;

  uploads: UploadedDoc[];
  addUpload: (d: Omit<UploadedDoc, "at">) => void;

  replies: Record<string, Message[]>;
  reply: (threadId: string, m: Message) => void;

  resolvedThreads: Record<string, boolean>;
  resolveThread: (id: string, v: boolean) => void;

  /** Challenge 04 — the workflow you can get back to. */
  resume: ResumePoint | null;
  setResume: (r: ResumePoint | null) => void;

  recents: Recent[];
  pushRecent: (r: Recent) => void;

  onboarded: Record<string, boolean>;
  setOnboarded: (returnId: string, v: boolean) => void;

  reset: () => void;
}

const Ctx = React.createContext<SessionValue | null>(null);

const KEY = "meridian.session.v1";

interface Persisted {
  personId: string;
  roleId: RoleId;
  theme: Theme;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [personId, setPersonId] = React.useState("priya-raman");
  const [roleId, setRoleId] = React.useState<RoleId>("preparer");
  const [theme, setThemeState] = React.useState<Theme>("light");

  const [fieldOverrides, setFieldOverrides] = React.useState<Record<string, FieldOverride>>({});
  const [insightOverrides, setInsightOverrides] = React.useState<Record<string, InsightOverride>>({});
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [doneTasks, setDoneTasks] = React.useState<Record<string, boolean>>({});
  const [uploads, setUploads] = React.useState<UploadedDoc[]>([]);
  const [replies, setReplies] = React.useState<Record<string, Message[]>>({});
  const [resolvedThreads, setResolvedThreads] = React.useState<Record<string, boolean>>({});
  const [resume, setResume] = React.useState<ResumePoint | null>(null);
  const [recents, setRecents] = React.useState<Recent[]>([]);
  const [onboarded, setOnboardedState] = React.useState<Record<string, boolean>>({});

  /* Identity and theme persist; the demo's edits deliberately do not, so a
     reload always gives a reviewer the scenario back in its authored state. */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Persisted>;
        if (p.personId) setPersonId(p.personId);
        if (p.roleId) setRoleId(p.roleId);
        if (p.theme) setThemeState(p.theme);
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setThemeState("dark");
      }
    } catch {
      /* private mode, blocked storage — the defaults are fine */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ personId, roleId, theme } satisfies Persisted));
    } catch {
      /* ignore */
    }
  }, [personId, roleId, theme, hydrated]);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const role = ROLE_BY_ID[roleId];
  const audience = role.audience;

  const clientId = React.useMemo(() => {
    if (audience !== "client") return undefined;
    return CLIENT_BY_ID[personId] ? personId : undefined;
  }, [audience, personId]);

  const value = React.useMemo<SessionValue>(() => {
    const now = () => new Date().toISOString();
    return {
      hydrated,
      personId,
      roleId,
      audience,
      clientId,
      switchTo: (p, r) => {
        setPersonId(p);
        setRoleId(r);
        setResume(null);
      },
      can: (c) => role.can.includes(c),
      theme,
      setTheme: setThemeState,

      fieldOverrides,
      setFieldState: (id, o) => setFieldOverrides((s) => ({ ...s, [id]: o })),

      insightOverrides,
      resolveInsight: (id, o) => setInsightOverrides((s) => ({ ...s, [id]: o })),

      answers,
      answer: (q, v) => setAnswers((s) => ({ ...s, [q]: v })),

      doneTasks,
      toggleTask: (id, done) => setDoneTasks((s) => ({ ...s, [id]: done })),

      uploads,
      addUpload: (d) => setUploads((s) => [...s, { ...d, at: now() }]),

      replies,
      reply: (t, m) => setReplies((s) => ({ ...s, [t]: [...(s[t] ?? []), m] })),

      resolvedThreads,
      resolveThread: (id, v) => setResolvedThreads((s) => ({ ...s, [id]: v })),

      resume,
      setResume,

      recents,
      pushRecent: (r) =>
        setRecents((s) => [r, ...s.filter((x) => x.href !== r.href)].slice(0, 8)),

      onboarded,
      setOnboarded: (rid, v) => setOnboardedState((s) => ({ ...s, [rid]: v })),

      reset: () => {
        setFieldOverrides({});
        setInsightOverrides({});
        setAnswers({});
        setDoneTasks({});
        setUploads([]);
        setReplies({});
        setResolvedThreads({});
        setOnboardedState({});
        setResume(null);
      },
    };
  }, [
    hydrated,
    personId,
    roleId,
    audience,
    clientId,
    role,
    theme,
    fieldOverrides,
    insightOverrides,
    answers,
    doneTasks,
    uploads,
    replies,
    resolvedThreads,
    resume,
    recents,
    onboarded,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>");
  return v;
}

/** The current person's display record. */
export function useMe() {
  const { personId } = useSession();
  return person(personId);
}

/**
 * Which returns the current identity is allowed to open.
 * A client sees their own plus any entity they are the named contact for.
 */
export function useVisibleReturnIds() {
  const { audience, personId, clientId, can } = useSession();
  return React.useMemo(() => {
    const all = Object.values(RETURN_BY_ID);
    if (audience === "client") {
      return new Set(
        all
          .filter(
            (r) =>
              r.clientId === clientId ||
              CLIENT_BY_ID[r.clientId]?.contactId === personId ||
              RETURN_BY_ID[person(personId).personalReturnId ?? ""]?.id === r.id,
          )
          .map((r) => r.id),
      );
    }
    if (can("view.all-returns")) return new Set(all.map((r) => r.id));
    return new Set(
      all.filter((r) => r.preparerId === personId || r.reviewerId === personId).map((r) => r.id),
    );
  }, [audience, personId, clientId, can]);
}
