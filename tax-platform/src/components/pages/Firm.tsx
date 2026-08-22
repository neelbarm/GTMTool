"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Building2, ChevronRight, TrendingUp, UserRound, Users } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useScopedReturns } from "@/components/hooks";
import { useSession } from "@/components/session";
import { CLIENT_BY_ID, CLIENTS, RETURNS } from "@/data/store";
import { STAGES } from "@/data/taxonomy";
import { person, PEOPLE, FIRM } from "@/data/people";
import { compactMoney, daysUntil, plural } from "@/lib/format";
import { rank, scoreReturn } from "@/lib/priority";
import { Avatar, Badge, Card, cx, EmptyState, SearchInput, SectionHeader, Stat, Tip } from "@/components/ui";
import { StatusInline } from "@/components/status";

/* --- Client book ---------------------------------------------------------- */

export function ClientsPage() {
  const scoped = useScopedReturns();
  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(25);

  const rows = React.useMemo(() => {
    const m = new Map<string, { id: string; name: string; returns: typeof scoped }>();
    for (const r of scoped) {
      const e = m.get(r.clientId) ?? { id: r.clientId, name: r.clientName, returns: [] };
      e.returns.push(r);
      m.set(r.clientId, e);
    }
    const needle = q.trim().toLowerCase();
    return [...m.values()]
      .filter((c) => !needle || c.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scoped, q]);

  return (
    <Page>
      <PageHeader
        title="Clients"
        lede={`${rows.length} clients with a return in your scope. Open one to see everything filed for them.`}
        actions={<SearchInput value={q} onChange={setQ} placeholder="Find a client…" className="w-64" />}
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="h-4 w-4" />} title="No clients match" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.slice(0, limit).map((c) => {
              const client = CLIENT_BY_ID[c.id];
              const open = c.returns.filter((r) => r.stage !== "accepted");
              const blocked = c.returns.reduce((a, r) => a + r.blockers.length, 0);
              return (
                <li key={c.id}>
                  <Link
                    href={`/returns/${c.returns[0].id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised"
                  >
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                        client?.kind === "business"
                          ? "border-line bg-raised text-ink3"
                          : "border-line bg-raised text-ink3",
                      )}
                    >
                      {client?.kind === "business" ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <UserRound className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{c.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink3">
                        <span>{client?.segment ?? "Individual"}</span>
                        <span>·</span>
                        <span>{plural(c.returns.length, "return")}</span>
                        {client?.since ? (
                          <>
                            <span>·</span>
                            <span>client since {client.since}</span>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-2 sm:flex">
                      {blocked > 0 ? (
                        <Badge tone="warn" size="sm" icon={<AlertTriangle className="h-3 w-3" />}>
                          {blocked}
                        </Badge>
                      ) : null}
                      {open.length > 0 ? (
                        <span className="w-40">
                          <StatusInline ret={open[0]} audience="firm" />
                        </span>
                      ) : (
                        <Badge tone="good" size="sm">
                          all filed
                        </Badge>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink4" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {rows.length > limit ? (
            <button
              onClick={() => setLimit((l) => l + 40)}
              className="w-full border-t border-line py-2.5 text-[12.5px] font-medium text-brand-ink hover:bg-raised"
            >
              Show more · {rows.length - limit} remaining
            </button>
          ) : null}
        </Card>
      )}
    </Page>
  );
}

/* --- Practice (administrator) --------------------------------------------- */

export function PracticePage() {
  const all = RETURNS;
  const scored = React.useMemo(() => rank(all), [all]);

  const open = all.filter((r) => r.stage !== "accepted" && r.stage !== "filed");
  const atRisk = scored.filter((s) => !s.waiting && s.daysToDue <= 14 && s.ret.stage !== "signoff");
  const waiting = scored.filter((s) => s.waiting);
  const fees = all.reduce((a, r) => a + r.fee, 0);

  const staff = React.useMemo(() => {
    const ids = new Set(all.map((r) => r.preparerId));
    return [...ids]
      .map((id) => {
        const rs = all.filter((r) => r.preparerId === id);
        const openRs = rs.filter((r) => r.stage !== "accepted" && r.stage !== "filed");
        const load = openRs.reduce((a, r) => a + r.complexity, 0);
        return {
          id,
          name: person(id).name,
          hue: person(id).hue,
          initials: person(id).initials,
          total: rs.length,
          open: openRs.length,
          load,
          urgent: openRs.filter((r) => daysUntil(r.dueDate) <= 14 && r.owner === "firm").length,
        };
      })
      .sort((a, b) => b.load - a.load);
  }, [all]);

  const maxLoad = Math.max(...staff.map((s) => s.load), 1);

  return (
    <Page wide>
      <PageHeader
        challenge="Challenge 05"
        title="Practice"
        lede={`${FIRM.name} · ${FIRM.staffCount} staff, ${FIRM.seasonalCount} of them seasonal. An administrator sees everything and can edit nothing — the same shell, a different scope.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open returns" value={open.length} hint={`of ${all.length} this season`} />
        <Stat label="At risk" tone="warn" value={atRisk.length} hint="Under 14 days and not at sign-off" />
        <Stat label="Waiting on clients" tone="neutral" value={waiting.length} hint="Cannot be progressed internally" />
        <Stat label="Engaged fees" value={compactMoney(fees)} hint="Across every open engagement" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card className="p-4">
          <SectionHeader
            icon={<Users className="h-3.5 w-3.5" />}
            title="Who is carrying what"
            hint="Weighted by complexity, not headcount — five simple 1040s is not the same week as five partnerships."
          />
          <ul className="mt-4 space-y-2.5">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <Avatar initials={s.initials} hue={s.hue} size={26} />
                <span className="w-28 shrink-0 truncate text-[12.5px] text-ink">{s.name}</span>
                <span className="min-w-0 flex-1">
                  <Tip
                    wide
                    content={`${s.open} open returns, weighted load ${s.load}. ${s.urgent} of them are due inside a fortnight with the ball on our side.`}
                  >
                    <span className="block h-4 w-full rounded-[3px] bg-sunken">
                      <span
                        className="block h-4 rounded-[3px] bg-brand transition-[width] duration-500"
                        style={{ width: `${(s.load / maxLoad) * 100}%` }}
                      />
                    </span>
                  </Tip>
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[12px] font-semibold text-ink">{s.open}</span>
                {s.urgent > 2 ? (
                  <Badge tone="warn" size="sm">
                    {s.urgent} urgent
                  </Badge>
                ) : (
                  <span className="w-[62px]" />
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink3">
            Bars are a single measure on one scale — weighted open load. Comparing two different
            measures on one chart is the fastest way to make a dashboard lie, so headcount and
            revenue live in their own tiles above.
          </p>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <SectionHeader icon={<TrendingUp className="h-3.5 w-3.5" />} title="Season funnel" />
            <ul className="mt-3 space-y-2">
              {STAGES.map((s, i) => {
                const n = all.filter((r) => r.stage === s.id).length;
                const w = (n / all.length) * 100;
                return (
                  <li key={s.id}>
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className="text-ink2">{s.firmLabel}</span>
                      <span className="tnum font-semibold text-ink">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-sunken">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${w}%`,
                          background: `var(--seq-${Math.min(5, i + 1)})`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-4">
            <SectionHeader
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              title="Needs a partner's attention"
              hint="Ranked by the same engine the preparers see."
            />
            <ul className="mt-3 space-y-1.5">
              {atRisk.slice(0, 6).map((s) => (
                <li key={s.ret.id}>
                  <Link
                    href={`/returns/${s.ret.id}`}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 transition-colors hover:border-line-strong hover:bg-raised"
                  >
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{s.ret.clientName}</span>
                    <span className="tnum shrink-0 text-[11.5px] text-ink3">{s.daysToDue}d</span>
                    <span className="tnum shrink-0 rounded bg-sunken px-1.5 text-[11px] font-semibold text-ink2">
                      {s.score}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}
