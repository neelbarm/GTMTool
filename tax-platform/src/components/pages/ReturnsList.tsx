"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, Check, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import type { StageId, TaxReturn } from "@/lib/types";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession } from "@/components/session";
import { useScopedReturns } from "@/components/hooks";
import { STAGES, STAGE_BY_ID } from "@/data/taxonomy";
import { person } from "@/data/people";
import { compactMoney, daysUntil, plural, until } from "@/lib/format";
import { rank, scoreReturn } from "@/lib/priority";
import { Badge, Button, Card, cx, EmptyState, SearchInput, Segmented, Tip } from "@/components/ui";
import { StatusInline, OwnerChip } from "@/components/status";

/* ============================================================================
   RETURNS AT VOLUME  (Challenge 09)

   200+ rows is where a list either works or doesn't. Three things carry it:

     PRESETS   named answers to the questions people actually ask, so the
               common case is one click rather than four filters
     CHIPS     every active condition is visible and individually removable
     COUNTS    the header always says how many of how many, because knowing
               the size of the result is part of trusting it
   ========================================================================== */

type Sort = "priority" | "due" | "name" | "activity";

interface Preset {
  id: string;
  label: string;
  blurb: string;
  apply: (r: TaxReturn, personId: string) => boolean;
}

const PRESETS: Preset[] = [
  { id: "all", label: "Everything", blurb: "Every return in scope", apply: () => true },
  {
    id: "mine-open",
    label: "Mine, open",
    blurb: "Assigned to me and not yet filed",
    apply: (r, p) => (r.preparerId === p || r.reviewerId === p) && r.stage !== "filed" && r.stage !== "accepted",
  },
  {
    id: "ours",
    label: "Ball with us",
    blurb: "Nothing external is blocking these",
    apply: (r) => r.owner === "firm" && r.stage !== "accepted",
  },
  {
    id: "waiting",
    label: "Waiting on clients",
    blurb: "Chase list",
    apply: (r) => r.owner === "client" && r.stage !== "accepted",
  },
  {
    id: "stale",
    label: "Gone quiet",
    blurb: "Nobody has touched these in a fortnight",
    apply: (r) => daysUntil(r.lastActivity) <= -14 && r.stage !== "filed" && r.stage !== "accepted",
  },
  {
    id: "flagged",
    label: "Flagged",
    blurb: "IRS notices, new clients, key accounts",
    apply: (r) => r.flags.length > 0,
  },
];

export function ReturnsList() {
  const { audience, personId } = useSession();
  const all = useScopedReturns();

  const [preset, setPreset] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [stages, setStages] = React.useState<Set<StageId>>(new Set());
  const [sort, setSort] = React.useState<Sort>("priority");
  const [limit, setLimit] = React.useState(40);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const activePreset = PRESETS.find((p) => p.id === preset)!;

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (!activePreset.apply(r, personId)) return false;
      if (stages.size && !stages.has(r.stage)) return false;
      if (needle && !`${r.clientName} ${r.id} ${r.form} ${r.serviceLine}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [all, activePreset, personId, stages, q]);

  const sorted = React.useMemo(() => {
    if (sort === "priority") return rank(filtered).map((s) => s.ret);
    const c = [...filtered];
    if (sort === "due") c.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
    if (sort === "name") c.sort((a, b) => a.clientName.localeCompare(b.clientName));
    if (sort === "activity") c.sort((a, b) => +new Date(b.lastActivity) - +new Date(a.lastActivity));
    return c;
  }, [filtered, sort]);

  const shown = sorted.slice(0, limit);
  const stageCounts = React.useMemo(() => {
    const m = new Map<StageId, number>();
    for (const r of all) m.set(r.stage, (m.get(r.stage) ?? 0) + 1);
    return m;
  }, [all]);

  const toggleStage = (s: StageId) => {
    const next = new Set(stages);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStages(next);
    setLimit(40);
  };

  return (
    <Page wide>
      <PageHeader
        challenge={audience === "firm" ? "Challenge 09" : undefined}
        title={audience === "client" ? "My returns" : "Returns"}
        lede={
          audience === "client"
            ? "Every return we hold for you, past and present."
            : `${all.length} returns in your scope. Start from a preset, then narrow.`
        }
      />

      {audience === "firm" ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const n = all.filter((r) => p.apply(r, personId)).length;
            const on = p.id === preset;
            return (
              <Tip key={p.id} content={p.blurb}>
                <button
                  onClick={() => {
                    setPreset(p.id);
                    setLimit(40);
                  }}
                  className={cx(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
                    on
                      ? "border-brand bg-brand text-brand-on"
                      : "border-line bg-surface text-ink2 hover:border-line-strong hover:bg-raised",
                  )}
                >
                  {p.label}
                  <span className={cx("tnum", on ? "opacity-70" : "text-ink4")}>{n}</span>
                </button>
              </Tip>
            );
          })}
        </div>
      ) : null}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-2.5">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setLimit(40);
            }}
            placeholder="Client, id or form…"
            className="w-full sm:w-72"
          />
          <Button
            variant={filtersOpen || stages.size > 0 ? "primary" : "secondary"}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Stage
            {stages.size > 0 ? (
              <span className="tnum ml-0.5 rounded-full bg-[color-mix(in_oklch,var(--brand-on)_25%,transparent)] px-1.5 text-[11px]">
                {stages.size}
              </span>
            ) : null}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-ink4" />
            <Segmented
              size="sm"
              value={sort}
              onChange={setSort}
              options={[
                { value: "priority", label: "Priority", title: "The scoring engine's order" },
                { value: "due", label: "Due" },
                { value: "name", label: "Name" },
                { value: "activity", label: "Recent" },
              ]}
            />
          </div>
        </div>

        {filtersOpen ? (
          <div className="a-fade-up flex flex-wrap gap-1.5 border-t border-line p-3">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleStage(s.id)}
                aria-pressed={stages.has(s.id)}
                className={cx(
                  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11.5px] font-medium transition-colors",
                  stages.has(s.id)
                    ? "border-brand bg-brand text-brand-on"
                    : "border-line bg-surface text-ink2 hover:border-line-strong hover:bg-raised",
                )}
              >
                {stages.has(s.id) ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                {s.firmLabel}
                <span className={cx("tnum", stages.has(s.id) ? "opacity-70" : "text-ink4")}>
                  {stageCounts.get(s.id) ?? 0}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2 text-[11.5px] text-ink3">
          Showing <b className="tnum text-[12px] text-ink">{Math.min(limit, sorted.length)}</b> of{" "}
          <b className="tnum text-[12px] text-ink">{sorted.length}</b>
          {sorted.length !== all.length ? <> (from {all.length})</> : null}
          {[...stages].map((s) => (
            <span
              key={s}
              className="inline-flex h-[22px] items-center gap-1 rounded-full border border-brand-line bg-brand-soft pl-2 pr-1 font-medium text-brand-ink"
            >
              {STAGE_BY_ID[s].firmLabel}
              <button onClick={() => toggleStage(s)} aria-label="Remove" className="rounded-full p-0.5 hover:bg-brand-line">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      </Card>

      {sorted.length === 0 ? (
        <Card>
          <EmptyState icon={<Search className="h-4 w-4" />} title="No returns match" body="Try a different preset or clear the search." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="hairline-b bg-raised">
                  <Th className="w-[26%]">Client</Th>
                  <Th className="w-[16%]">Stage</Th>
                  <Th className="w-[13%]">Next move</Th>
                  <Th className="w-[13%]">Blocking</Th>
                  <Th className="w-[11%]">Due</Th>
                  <Th className="w-[13%]">Preparer</Th>
                  <Th className="w-[8%] text-right">Score</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => (
                  <Row key={r.id} ret={r} />
                ))}
              </tbody>
            </table>
          </div>
          {sorted.length > limit ? (
            <button
              onClick={() => setLimit((l) => l + 60)}
              className="w-full border-t border-line py-2.5 text-[12.5px] font-medium text-brand-ink transition-colors hover:bg-raised"
            >
              Show {Math.min(60, sorted.length - limit)} more · {sorted.length - limit} remaining
            </button>
          ) : null}
        </Card>
      )}
    </Page>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cx("px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3", className)}
    >
      {children}
    </th>
  );
}

function Row({ ret }: { ret: TaxReturn }) {
  const { audience } = useSession();
  const s = scoreReturn(ret);
  const prep = person(ret.preparerId);
  const overdue = daysUntil(ret.dueDate) < 0;

  return (
    <tr className="group transition-colors hover:bg-raised">
      <td className="px-3 py-2.5">
        <Link href={`/returns/${ret.id}`} className="aff-link block truncate text-[13px] font-medium text-ink">
          {ret.clientName}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink3">
          <span>
            {ret.taxYear} · {ret.form}
          </span>
          {ret.flags.slice(0, 2).map((f) => (
            <Badge key={f} tone={f === "irs-notice" ? "crit" : "ai"} size="sm">
              {f.replace("-", " ")}
            </Badge>
          ))}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <StatusInline ret={ret} audience={audience} />
      </td>
      <td className="px-3 py-2.5">
        <OwnerChip side={ret.owner} audience={audience} size="sm" name={ret.owner === "firm" ? prep.name : ret.clientName} />
      </td>
      <td className="px-3 py-2.5">
        {ret.blockers.length === 0 ? (
          <span className="text-[12px] text-ink4">—</span>
        ) : (
          <Tip wide content={ret.blockers.map((b) => b.label).join(" · ")}>
            <span className="inline-flex items-center gap-1 text-[12px] text-warn-ink">
              <AlertTriangle className="h-3 w-3" />
              {plural(ret.blockers.length, "item")}
            </span>
          </Tip>
        )}
      </td>
      <td className={cx("tnum px-3 py-2.5 text-[12px]", overdue ? "font-semibold text-crit-ink" : "text-ink2")}>
        {until(ret.dueDate)}
      </td>
      <td className="truncate px-3 py-2.5 text-[12px] text-ink2">{prep.name}</td>
      <td className="px-3 py-2.5 text-right">
        <Tip
          wide
          side="top"
          content={
            <span className="block">
              <b className="text-ink">Priority {s.score}</b>
              {s.reasons.slice(0, 4).map((r) => (
                <span key={r.label} className="mt-1 block text-ink2">
                  +{r.points} {r.label}
                </span>
              ))}
            </span>
          }
        >
          <span className="tnum inline-block rounded-md bg-sunken px-1.5 py-0.5 text-[11.5px] font-semibold text-ink2">
            {s.score}
          </span>
        </Tip>
      </td>
    </tr>
  );
}
