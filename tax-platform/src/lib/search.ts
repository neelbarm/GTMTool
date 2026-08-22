import { DOCS, FIELDS, RETURNS, TASKS, THREADS } from "@/data/store";

/* ============================================================================
   One index over every object type.

   Challenge 09 asks for search that holds up against volume, and Challenge 04
   asks that moving between object types never costs you your place. Both point
   at the same thing: a single ranked index, not a search box per screen. The
   command palette and every filter box read from here.
   ========================================================================== */

export type ResultKind = "return" | "document" | "thread" | "task" | "field" | "page";

export interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  returnId?: string;
  score: number;
}

interface Entry {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  returnId?: string;
  hay: string;
  weight: number;
}

export const PAGES: { title: string; subtitle: string; href: string; audience: "any" | "firm" | "client" }[] = [
  { title: "Today", subtitle: "Your ranked work queue", href: "/home", audience: "firm" },
  { title: "Home", subtitle: "What needs you", href: "/home", audience: "client" },
  { title: "Returns", subtitle: "Every return you can see", href: "/returns", audience: "any" },
  { title: "Inbox", subtitle: "Conversations and requests", href: "/inbox", audience: "any" },
  { title: "My work", subtitle: "Tasks assigned to you", href: "/tasks", audience: "any" },
  { title: "Clients", subtitle: "The client book", href: "/clients", audience: "firm" },
  { title: "Practice", subtitle: "Capacity, throughput and revenue", href: "/practice", audience: "firm" },
  { title: "Design system", subtitle: "The rules this product is built on", href: "/system", audience: "any" },
];

let INDEX: Entry[] | null = null;

function build(): Entry[] {
  const out: Entry[] = [];

  for (const r of RETURNS) {
    out.push({
      kind: "return",
      id: r.id,
      title: r.clientName,
      subtitle: `${r.taxYear} Form ${r.form} · ${r.id}`,
      href: `/returns/${r.id}`,
      returnId: r.id,
      hay: `${r.clientName} ${r.id} ${r.form} ${r.taxYear} ${r.serviceLine} ${r.stage} ${r.flags.join(" ")}`.toLowerCase(),
      weight: 3,
    });
  }
  for (const d of DOCS) {
    out.push({
      kind: "document",
      id: d.id,
      title: d.name,
      subtitle: `${d.kind} · ${d.issuer}`,
      href: `/returns/${d.returnId}/documents?doc=${d.id}`,
      returnId: d.returnId,
      hay: `${d.name} ${d.kind} ${d.issuer} ${d.id}`.toLowerCase(),
      weight: 2,
    });
  }
  for (const t of THREADS) {
    out.push({
      kind: "thread",
      id: t.id,
      title: t.subject,
      subtitle: t.visibility === "internal" ? "Internal note" : "Client conversation",
      href: `/inbox/${t.id}`,
      returnId: t.returnId,
      hay: `${t.subject} ${t.kind} ${t.messages.map((m) => m.body).join(" ")}`.toLowerCase(),
      weight: 2,
    });
  }
  for (const t of TASKS) {
    out.push({
      kind: "task",
      id: t.id,
      title: t.title,
      subtitle: `Task · ${t.kind}`,
      href: `/returns/${t.returnId}/tasks?task=${t.id}`,
      returnId: t.returnId,
      hay: `${t.title} ${t.detail ?? ""} ${t.kind}`.toLowerCase(),
      weight: 1.5,
    });
  }
  for (const f of FIELDS) {
    out.push({
      kind: "field",
      id: f.id,
      title: `${f.form} line ${f.line} — ${f.label}`,
      subtitle: `On ${f.returnId}`,
      href: `/returns/${f.returnId}/review?field=${f.id}`,
      returnId: f.returnId,
      hay: `${f.form} ${f.line} ${f.label} ${f.section}`.toLowerCase(),
      weight: 2,
    });
  }
  return out;
}

export function searchAll(
  query: string,
  opts: { limit?: number; allowReturnIds?: Set<string>; audience?: "client" | "firm" } = {},
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  INDEX ??= build();
  const terms = q.split(/\s+/).filter(Boolean);
  const out: SearchResult[] = [];

  for (const p of PAGES) {
    if (opts.audience && p.audience !== "any" && p.audience !== opts.audience) continue;
    const hay = `${p.title} ${p.subtitle}`.toLowerCase();
    if (terms.every((t) => hay.includes(t))) {
      out.push({ kind: "page", id: p.href, title: p.title, subtitle: p.subtitle, href: p.href, score: 12 });
    }
  }

  for (const e of INDEX) {
    if (opts.allowReturnIds && e.returnId && !opts.allowReturnIds.has(e.returnId)) continue;
    let score = 0;
    let ok = true;
    for (const t of terms) {
      const i = e.hay.indexOf(t);
      if (i === -1) {
        ok = false;
        break;
      }
      score += t.length * (i === 0 ? 3 : e.hay[i - 1] === " " ? 2 : 1);
    }
    if (!ok) continue;
    out.push({
      kind: e.kind,
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      href: e.href,
      returnId: e.returnId,
      score: score * e.weight,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 24);
}
