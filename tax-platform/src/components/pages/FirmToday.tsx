"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Clock,
  Flame,
  Hourglass,
  Info,
  Send,
  TrendingUp,
} from "lucide-react";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession, useMe } from "@/components/session";
import { useScopedReturns } from "@/components/hooks";
import { BUCKET_META, bucketise, isAtRisk, rank, type Bucket, type ScoredReturn } from "@/lib/priority";
import { STAGES, STAGE_BY_ID } from "@/data/taxonomy";
import { FILING_DEADLINE, TODAY } from "@/data/generate";
import { compactMoney, daysUntil, plural } from "@/lib/format";
import { Badge, Button, Card, cx, Dot, EmptyState, SectionHeader, Segmented, Stat, Tip } from "@/components/ui";
import { OwnerChip, StatusInline } from "@/components/status";
import { person } from "@/data/people";
import type { StageId } from "@/lib/types";
import { PermissionNote } from "@/components/shell/RoleSwitcher";

/* ============================================================================
   TODAY  (Challenge 07)

   Organised around one question and its answer, in this order:
     1. what is on fire            (the four tiles)
     2. what should I open next    (the ranked queue, with its reasons)
     3. what can I only chase      (waiting, kept out of the queue)
     4. where is the practice slow (the pipeline, for managers)
   ========================================================================== */

type Scope = "mine" | "team";

export function FirmToday() {
  const { personId, roleId, can } = useSession();
  const me = useMe();
  const all = useScopedReturns();
  const managerCapable = can("view.all-returns");
  const [scope, setScope] = React.useState<Scope>(managerCapable ? "team" : "mine");
  const [stageFilter, setStageFilter] = React.useState<StageId | null>(null);

  const mineOnly = React.useMemo(
    () => all.filter((r) => r.preparerId === personId || r.reviewerId === personId),
    [all, personId],
  );

  const pool = scope === "mine" ? mineOnly : all;
  const filtered = React.useMemo(
    () => (stageFilter ? pool.filter((r) => r.stage === stageFilter) : pool),
    [pool, stageFilter],
  );

  const scored = React.useMemo(() => rank(filtered), [filtered]);
  const buckets = React.useMemo(() => bucketise(scored), [scored]);

  const daysLeft = daysUntil(FILING_DEADLINE);
  const atRisk = scored.filter(isAtRisk).length;
  const filedRecently = all.filter(
    (r) => (r.stage === "filed" || r.stage === "accepted") && daysUntil(r.lastActivity) > -8,
  ).length;

  return (
    <Page wide>
      <PageHeader
        challenge="Challenge 07"
        title={`${greeting()}, ${me.name.split(" ")[0]}`}
        lede={
          <>
            {plural(buckets.now.length, "return")} need you today. The order below is computed, not
            alphabetical — open any score to see exactly why it ranks where it does.
          </>
        }
        actions={
          managerCapable ? (
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: "mine", label: "My returns", count: mineOnly.length },
                { value: "team", label: "Whole team", count: all.length },
              ]}
            />
          ) : (
            <Badge tone="neutral" icon={<Info className="h-3 w-3" />}>
              {plural(mineOnly.length, "assigned return")}
            </Badge>
          )
        }
      />

      {roleId === "seasonal" ? (
        <PermissionNote>
          You&rsquo;re signed in as seasonal staff. You can prepare the returns assigned to you, but
          client messaging and review sign-off are hidden — the controls stay visible and explain
          themselves rather than disappearing.
        </PermissionNote>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Do now"
          tone="crit"
          value={buckets.now.length}
          hint="Yours to move, and time-critical."
          icon={<Flame className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Waiting on someone"
          tone="warn"
          value={buckets.waiting.length}
          hint="You can chase these; you can't work them."
          icon={<Hourglass className="h-3.5 w-3.5" />}
        />
        <Stat
          label="At risk"
          tone="warn"
          value={atRisk}
          hint="Still early in the process with the deadline in sight." 
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Days to 15 April"
          value={daysLeft}
          hint={`${filedRecently} filed in the last week.`}
          icon={<CalendarClock className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0 space-y-5">
          {stageFilter ? (
            <div className="flex items-center gap-2 rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-[12.5px] text-brand-ink">
              <Info className="h-3.5 w-3.5" />
              Filtered to <b>{STAGE_BY_ID[stageFilter].firmLabel}</b>
              <button onClick={() => setStageFilter(null)} className="ml-auto font-medium underline">
                Clear
              </button>
            </div>
          ) : null}

          {(["now", "week", "scheduled"] as Bucket[]).map((b) => (
            <QueueSection key={b} bucket={b} items={buckets[b]} defaultOpen={b !== "scheduled"} />
          ))}

          {scored.length === 0 ? (
            <Card>
              <EmptyState
                icon={<TrendingUp className="h-4 w-4" />}
                title="Nothing in this view"
                body="Change the filter or switch scope to see more."
              />
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-5">
          <WaitingList items={buckets.waiting} />
          <Pipeline
            returns={pool}
            onPick={(s) => setStageFilter((cur) => (cur === s ? null : s))}
            active={stageFilter}
          />
        </div>
      </div>
    </Page>
  );
}

function greeting() {
  const h = TODAY.getUTCHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/* --- The queue ------------------------------------------------------------ */

function QueueSection({
  bucket,
  items,
  defaultOpen,
}: {
  bucket: Bucket;
  items: ScoredReturn[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [limit, setLimit] = React.useState(8);
  const meta = BUCKET_META[bucket];
  const shown = items.slice(0, limit);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-raised"
        aria-expanded={open}
      >
        <Dot tone={bucket === "now" ? "crit" : bucket === "week" ? "warn" : "neutral"} />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink">{meta.label}</span>
          <span className="block text-[11.5px] text-ink3">{meta.blurb}</span>
        </span>
        <span className="tnum ml-auto shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[11.5px] font-semibold text-ink2">
          {items.length}
        </span>
        <ChevronDown className={cx("h-4 w-4 shrink-0 text-ink4 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="border-t border-line">
          {items.length === 0 ? (
            <p className="px-4 py-4 text-[12.5px] text-ink3">
              Nothing in this band right now.
            </p>
          ) : null}
          <ul className="divide-y divide-line">
            {shown.map((s, i) => (
              <QueueRow key={s.ret.id} s={s} index={i} />
            ))}
          </ul>
          {items.length > limit ? (
            <button
              onClick={() => setLimit((l) => l + 12)}
              className="w-full border-t border-line py-2 text-[12.5px] font-medium text-brand-ink transition-colors hover:bg-raised"
            >
              Show {Math.min(12, items.length - limit)} more of {items.length}
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function QueueRow({ s, index }: { s: ScoredReturn; index: number }) {
  const { audience } = useSession();
  const [why, setWhy] = React.useState(false);
  const r = s.ret;
  const prep = person(r.preparerId);

  return (
    <li className="group">
      <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-raised">
        <span className="tnum mt-0.5 w-5 shrink-0 text-right text-[11.5px] font-semibold text-ink4">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/returns/${r.id}`}
              className="aff-link truncate text-[13.5px] font-semibold text-ink hover:text-brand-ink"
            >
              {r.clientName}
            </Link>
            <span className="text-[11.5px] text-ink4">
              {r.taxYear} · {r.form}
            </span>
            {r.flags.includes("irs-notice") ? (
              <Badge tone="crit" size="sm" icon={<AlertTriangle className="h-3 w-3" />}>
                IRS notice
              </Badge>
            ) : null}
            {r.flags.includes("new-client") ? (
              <Badge tone="ai" size="sm">
                new client
              </Badge>
            ) : null}
            {r.flags.includes("vip") ? (
              <Badge tone="brand" size="sm">
                key client
              </Badge>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink3">
            <StatusInline ret={r} audience={audience} />
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className={cx("tnum", s.daysToDue <= 7 && "font-semibold text-crit-ink")}>
                {s.daysToDue < 0
                  ? `${Math.abs(s.daysToDue)}d overdue`
                  : r.extended
                    ? "extended to Oct"
                    : `${s.daysToDue}d left`}
              </span>
            </span>
            <span className="hidden sm:inline">{prep.name}</span>
            {r.blockers.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-warn-ink">
                <AlertTriangle className="h-3 w-3" />
                {plural(r.blockers.length, "blocker")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setWhy((w) => !w)}
            aria-expanded={why}
            className={cx(
              "tnum inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11.5px] font-semibold transition-colors",
              why
                ? "border-brand bg-brand-soft text-brand-ink"
                : "border-line bg-surface text-ink2 hover:border-line-strong hover:bg-raised",
            )}
            title="Why is this ranked here?"
          >
            {s.score}
            <ChevronDown className={cx("h-3 w-3 transition-transform", why && "rotate-180")} />
          </button>
          <Link
            href={`/returns/${r.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[12px] font-medium text-ink2 opacity-0 transition-all hover:border-line-strong hover:text-ink focus:opacity-100 group-hover:opacity-100"
          >
            Open
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {why ? (
        <div className="a-fade-up border-t border-line bg-sunken px-4 py-3 pl-12">
          <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.04em] text-ink3">
            Why it scores {s.score}
          </p>
          <ul className="space-y-1">
            {s.reasons.map((rs) => (
              <li key={rs.label} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="tnum w-8 shrink-0 text-right font-semibold text-ink2">+{rs.points}</span>
                <span className="min-w-0">
                  <span className="text-ink">{rs.label}</span>
                  {rs.detail ? <span className="text-ink3"> — {rs.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 border-t border-line pt-2 text-[11.5px] leading-relaxed text-ink3">
            Scores are relative, not absolute — they only mean something against the rest of this
            list. Work you cannot start is never ranked here; it sits in{" "}
            <b className="font-medium text-ink2">Waiting on someone else</b>.
          </p>
        </div>
      ) : null}
    </li>
  );
}

/* --- Waiting list --------------------------------------------------------- */

function WaitingList({ items }: { items: ScoredReturn[] }) {
  const [nudged, setNudged] = React.useState<Record<string, boolean>>({});
  const sorted = React.useMemo(
    () =>
      [...items].sort((a, b) => {
        const aw = oldestWait(a);
        const bw = oldestWait(b);
        return bw - aw;
      }),
    [items],
  );
  const top = sorted.slice(0, 6);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3">
        <SectionHeader
          icon={<Hourglass className="h-3.5 w-3.5" />}
          title="Waiting on someone else"
          hint="Deliberately outside the queue. The only useful action here is a nudge."
        />
      </div>
      {top.length === 0 ? (
        <EmptyState title="Nothing outstanding" body="Every open return is yours to move." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {top.map((s) => {
            const days = oldestWait(s);
            return (
              <li key={s.ret.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/returns/${s.ret.id}`}
                    className="aff-link block truncate text-[12.5px] font-medium text-ink"
                  >
                    {s.ret.clientName}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink3">
                    <OwnerChip side={s.ret.owner} audience="firm" size="sm" />
                    <span className="tnum">{days}d</span>
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={nudged[s.ret.id] ? "ghost" : "secondary"}
                  disabled={nudged[s.ret.id]}
                  onClick={() => setNudged((n) => ({ ...n, [s.ret.id]: true }))}
                >
                  {nudged[s.ret.id] ? "Sent" : <><Send className="h-3 w-3" />Nudge</>}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {sorted.length > top.length ? (
        <Link
          href="/returns?owner=client"
          className="block border-t border-line py-2 text-center text-[12.5px] font-medium text-brand-ink hover:bg-raised"
        >
          See all {sorted.length}
        </Link>
      ) : null}
    </Card>
  );
}

function oldestWait(s: ScoredReturn) {
  const d = s.ret.blockers.map((b) => -daysUntil(b.since));
  return d.length ? Math.max(...d) : -daysUntil(s.ret.lastActivity);
}

/* --- Pipeline ------------------------------------------------------------- */

const SEQ = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)"];

/**
 * Stages are ORDERED, so this uses a single-hue sequential ramp rather than a
 * categorical palette — encoding an ordered sequence with arbitrary hues is the
 * classic way to make a chart lie about its own data.
 */
function Pipeline({
  returns,
  onPick,
  active,
}: {
  returns: { stage: StageId }[];
  onPick: (s: StageId) => void;
  active: StageId | null;
}) {
  const counts = STAGES.map((s) => ({
    stage: s,
    n: returns.filter((r) => r.stage === s.id).length,
  }));
  const total = counts.reduce((a, c) => a + c.n, 0) || 1;
  const open = counts.filter((c) => c.stage.index < 4).reduce((a, c) => a + c.n, 0);

  return (
    <Card className="p-4">
      <SectionHeader
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        title="Where the work is sitting"
        hint="Click a stage to filter the queue."
      />

      <div className="mt-3.5 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
        {counts.map((c, i) => {
          if (c.n === 0) return null;
          const on = active === c.stage.id;
          return (
            <Tip
              key={c.stage.id}
              className="h-full"
              style={{ width: `${(c.n / total) * 100}%`, minWidth: 8 }}
              content={
                <span className="block">
                  <b className="text-ink">{c.stage.firmLabel}</b> — {c.n} of {total}
                  <span className="mt-1 block text-ink2">{c.stage.definition}</span>
                </span>
              }
            >
              <button
                onClick={() => onPick(c.stage.id)}
                aria-label={`${c.stage.firmLabel}: ${c.n} returns`}
                className={cx("h-2.5 w-full rounded-full transition-opacity", !on && active && "opacity-35")}
                style={{ background: SEQ[Math.min(4, c.stage.index)] }}
              />
            </Tip>
          );
        })}
      </div>

      <ul className="mt-3 space-y-1">
        {counts.map((c) => (
          <li key={c.stage.id}>
            <button
              onClick={() => onPick(c.stage.id)}
              className={cx(
                "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-raised",
                active === c.stage.id && "bg-brand-soft",
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: SEQ[Math.min(4, c.stage.index)] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink2">{c.stage.firmLabel}</span>
              <span className="tnum text-[12px] font-semibold text-ink">{c.n}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink3">
        <b className="font-semibold text-ink2">{open}</b> returns are still open across{" "}
        {compactMoney(returns.length * 2200)} of engaged fees.
      </p>
    </Card>
  );
}
