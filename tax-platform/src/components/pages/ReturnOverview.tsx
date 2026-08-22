"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FileText,
  Flag,
  MessageSquare,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import type { TaxReturn } from "@/lib/types";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession } from "@/components/session";
import { useDocuments, useFields, useInsights, useTasks, useThreads } from "@/components/hooks";
import { STAGES, STAGE_BY_ID } from "@/data/taxonomy";
import { actorName, activityFor } from "@/data/store";
import { person } from "@/data/people";
import { ago, date, daysUntil, money, plural, until } from "@/lib/format";
import { Avatar, Badge, Button, Card, cx, Dot, EmptyState, Meter, SectionHeader, Tip } from "@/components/ui";
import { BlockerRow, OwnerChip, StageTrack } from "@/components/status";
import { FieldValue } from "@/components/affordance";

/* ============================================================================
   RETURN OVERVIEW  (Challenge 06)

   The page is laid out as the five questions the brief asks, in order, with
   nothing between them:

     1. Where is it            the stage track
     2. What's happened        the history, collapsed to the last few events
     3. What has to happen     the next-step list, ordered
     4. Who owns the next move the owner chip, derived not typed
     5. What's blocking it     the blocker list, typed and dated

   A client sees the same five answers in different words, and sees fewer
   figures — not because they are hidden, but because a figure they cannot act
   on is noise until the return is finished.
   ========================================================================== */

export function ReturnOverview({ ret }: { ret: TaxReturn }) {
  const { audience, can } = useSession();
  const fields = useFields(ret.id);
  const docs = useDocuments(ret.id);
  const threads = useThreads(ret.id);
  const tasks = useTasks(ret.id);
  const insights = useInsights(ret.id);
  const activity = activityFor(ret.id);

  const stage = STAGE_BY_ID[ret.stage];
  const openTasks = tasks.filter((t) => t.status !== "done");
  const openThreads = threads.filter((t) => t.status !== "resolved");
  const unresolvedAI = insights.filter((i) => i.status === "new");
  const headline = fields.find((f) => f.line === "37") ?? fields.find((f) => f.line === "11");

  const nextSteps = buildNextSteps(ret, openTasks.length, openThreads.length, unresolvedAI.length);

  return (
    <Page wide>
      <PageHeader
        challenge={audience === "firm" ? "Challenge 06" : undefined}
        title={audience === "client" ? `Your ${ret.taxYear} return` : ret.clientName}
        lede={stage.definition}
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">Form {ret.form}</Badge>
            <Badge tone="neutral">{ret.taxYear}</Badge>
            {audience === "firm" ? <Badge tone="neutral">{ret.id}</Badge> : null}
            <Badge tone={daysUntil(ret.dueDate) <= 14 ? "warn" : "neutral"} icon={<CalendarClock className="h-3 w-3" />}>
              {until(ret.dueDate)}
            </Badge>
            {ret.flags.map((f) => (
              <Badge key={f} tone={f === "irs-notice" ? "crit" : "ai"} size="sm" icon={<Flag className="h-3 w-3" />}>
                {f.replace("-", " ")}
              </Badge>
            ))}
          </div>
        }
        actions={
          audience === "firm" ? (
            <>
              <Link
                href={`/returns/${ret.id}/review`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
              >
                Open review
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {can("approve.return") ? (
                <Button variant="primary">
                  <Send className="h-3.5 w-3.5" />
                  Approve for filing
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* 1 · Where it is  +  4 · who owns it  +  5 · what's blocking */}
          <Card className="p-4">
            <SectionHeader
              title="Where this return is"
              hint="Stage, owner and blockers are three separate facts. Shown together, they can only mean one thing."
            />
            <div className="mt-3.5">
              <StageTrack stage={ret.stage} audience={audience} size="lg" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Fact label="Stage">
                <span className="text-[13px] font-semibold text-ink">
                  {audience === "client" ? stage.clientLabel : stage.firmLabel}
                </span>
              </Fact>
              <Fact label="Next move belongs to">
                <OwnerChip
                  side={ret.owner}
                  audience={audience}
                  name={ret.owner === "firm" ? person(ret.preparerId).name : ret.clientName}
                />
              </Fact>
              <Fact label="Blocking completion">
                {ret.blockers.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-good-ink">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Nothing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    <AlertCircle className="h-3.5 w-3.5 text-warn" />
                    {plural(ret.blockers.length, "item")}
                  </span>
                )}
              </Fact>
            </div>

            {ret.blockers.length > 0 ? (
              <div className="mt-3.5 space-y-1.5 border-t border-line pt-3.5">
                {ret.blockers.map((b) => (
                  <BlockerRow key={b.id} blocker={b} audience={audience} />
                ))}
              </div>
            ) : null}
          </Card>

          {/* 3 · what has to happen next */}
          <Card className="p-4">
            <SectionHeader
              title="What has to happen next"
              hint="In order. Each step names who does it."
            />
            <ol className="mt-3 space-y-2">
              {nextSteps.map((s, i) => (
                <li key={s.label} className="flex items-start gap-2.5">
                  <span
                    className={cx(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold",
                      i === 0 ? "bg-brand text-brand-on" : "bg-sunken text-ink3",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block text-[13px]", i === 0 ? "font-semibold text-ink" : "text-ink2")}>
                      {s.label}
                    </span>
                    <span className="block text-[11.5px] text-ink3">{s.who}</span>
                  </span>
                  {s.href ? (
                    <Link href={s.href} className="shrink-0 text-[12px] font-medium text-brand-ink hover:underline">
                      Open
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>

          {/* Figures — firm always; client only once meaningful */}
          {audience === "firm" && fields.length > 0 ? (
            <Card className="p-4">
              <SectionHeader
                title="The figures that matter"
                hint="Each one carries its own state. Click through to trace it."
                action={
                  <Link href={`/returns/${ret.id}/review`} className="text-[12px] font-medium text-brand-ink hover:underline">
                    All {fields.length} lines
                  </Link>
                }
              />
              <ul className="mt-3 divide-y divide-line">
                {["11", "12", "24", "33", "37"]
                  .map((l) => fields.find((f) => f.line === l))
                  .filter((f): f is NonNullable<typeof f> => Boolean(f))
                  .map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-2">
                      <span className="tnum w-8 shrink-0 text-[11.5px] text-ink4">{f.line}</span>
                      <Link
                        href={`/returns/${ret.id}/review?field=${f.id}`}
                        className="aff-link min-w-0 flex-1 truncate text-[13px] text-ink"
                      >
                        {f.label}
                      </Link>
                      <FieldValue value={f.value} state={f.state} size="sm" />
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}

          {audience === "client" && headline && ret.stage !== "intake" ? (
            <Card className="p-4">
              <SectionHeader
                title={ret.outcome > 0 ? "What you should get back" : "What you'll owe"}
                hint="Still provisional while the return is open."
              />
              <p className="tnum mt-2 text-[28px] font-semibold tracking-tight text-ink">
                {money(Math.abs(ret.outcome))}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink3">
                Nothing is due until 15 April. Your accountant will walk you through it before you
                sign anything.
              </p>
            </Card>
          ) : null}

          {/* 2 · what's already happened */}
          <Card className="p-4">
            <SectionHeader
              title="What's already happened"
              action={
                <Link href={`/returns/${ret.id}/activity`} className="text-[12px] font-medium text-brand-ink hover:underline">
                  Full history
                </Link>
              }
            />
            {activity.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-ink3">Nothing recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {activity.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5">
                    <Avatar
                      initials={person(e.actorId).initials}
                      hue={person(e.actorId).hue}
                      size={20}
                      title={person(e.actorId).name}
                    />
                    <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink2">
                      <b className="font-medium text-ink">{actorName(e.actorId)}</b> {e.verb}{" "}
                      {e.href ? (
                        <Link href={e.href} className="aff-link text-brand-ink">
                          {e.object}
                        </Link>
                      ) : (
                        <span className="text-ink">{e.object}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-ink4">{ago(e.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Rail */}
        <div className="min-w-0 space-y-4">
          {unresolvedAI.length > 0 ? (
            <Card className="overflow-hidden border-ai-line">
              <div className="flex items-center gap-2 border-b border-ai-line bg-ai-soft px-3.5 py-2">
                <Sparkles className="h-3.5 w-3.5 text-ai-ink" />
                <span className="text-[12px] font-semibold text-ai-ink">
                  {plural(unresolvedAI.length, "thing")} Meridian found
                </span>
              </div>
              <ul className="divide-y divide-line">
                {unresolvedAI.slice(0, 3).map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/returns/${ret.id}/ai?insight=${i.id}`}
                      className="block px-3.5 py-2.5 transition-colors hover:bg-raised"
                    >
                      <p className="text-[12.5px] font-medium text-ink">{i.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink3">{i.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/returns/${ret.id}/ai`}
                className="block border-t border-line py-2 text-center text-[12px] font-medium text-brand-ink hover:bg-raised"
              >
                Review all AI activity
              </Link>
            </Card>
          ) : null}

          <Card className="p-3.5">
            <SectionHeader
              icon={<FileText className="h-3.5 w-3.5" />}
              title="Documents"
              action={
                <Link href={`/returns/${ret.id}/documents`} className="text-[12px] font-medium text-brand-ink hover:underline">
                  Open
                </Link>
              }
            />
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-ink2">
                  <b className="tnum font-semibold text-ink">{ret.docsReceived}</b> of {ret.docsExpected} expected
                </span>
                <span className="tnum text-ink3">
                  {Math.round((ret.docsReceived / ret.docsExpected) * 100)}%
                </span>
              </div>
              <Meter
                className="mt-1.5"
                value={ret.docsReceived / ret.docsExpected}
                tone={ret.docsReceived >= ret.docsExpected ? "good" : "brand"}
              />
              <p className="mt-2 text-[11.5px] text-ink3">
                {docs.length} on file · last added {docs[0] ? ago(docs[0].uploadedAt) : "—"}
              </p>
            </div>
          </Card>

          <Card className="p-3.5">
            <SectionHeader
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              title="Open conversations"
              action={
                <Link href="/inbox" className="text-[12px] font-medium text-brand-ink hover:underline">
                  Inbox
                </Link>
              }
            />
            {openThreads.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-ink3">Nothing open.</p>
            ) : (
              <ul className="mt-2.5 space-y-1.5">
                {openThreads.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/inbox/${t.id}`}
                      className="group flex items-start gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 transition-colors hover:border-line-strong hover:bg-raised"
                    >
                      <Dot
                        tone={t.visibility === "internal" ? "neutral" : t.nextActionSide === "client" ? "warn" : "brand"}
                        className="mt-1.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-ink">{t.subject}</span>
                        <span className="block truncate text-[11px] text-ink3">
                          {t.visibility === "internal" ? "Internal · " : ""}
                          {actorName(t.nextActionOwner)} to act
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-3.5">
            <SectionHeader icon={<Users className="h-3.5 w-3.5" />} title="Who's on this" />
            <ul className="mt-2.5 space-y-2">
              {[
                ["Preparer", ret.preparerId],
                ["Reviewer", ret.reviewerId],
              ].map(([role, id]) => {
                const p = person(id);
                return (
                  <li key={role} className="flex items-center gap-2.5">
                    <Avatar initials={p.initials} hue={p.hue} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">{p.name}</span>
                      <span className="block text-[11px] text-ink3">{role}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink3">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function buildNextSteps(ret: TaxReturn, openTasks: number, openThreads: number, ai: number) {
  const preparer = person(ret.preparerId).name;
  const reviewer = person(ret.reviewerId).name;
  const idx = STAGE_BY_ID[ret.stage].index;

  const steps: { label: string; who: string; href?: string }[] = [];

  if (ret.blockers.length > 0) {
    const b = ret.blockers[0];
    steps.push({
      label:
        b.owner === "client"
          ? "Clear what's outstanding with the client"
          : b.owner === "firm"
            ? "Close the open review comment"
            : "Wait for the IRS acknowledgement",
      who: b.owner === "client" ? ret.clientName : b.owner === "firm" ? preparer : "The IRS",
      href: b.href,
    });
  }

  if (ai > 0 && idx < 3) {
    steps.push({
      label: `Settle ${plural(ai, "AI finding")}`,
      who: preparer,
      href: `/returns/${ret.id}/ai`,
    });
  }

  for (const s of STAGES.slice(idx + 1)) {
    steps.push({
      label: s.entry,
      who: s.entryActor === "client" ? ret.clientName : s.entryActor === "firm" ? reviewer : "The IRS",
    });
    if (steps.length >= 5) break;
  }

  if (steps.length === 0) {
    steps.push({ label: "Nothing outstanding", who: "This return is finished." });
  }
  return steps.slice(0, 5);
}
