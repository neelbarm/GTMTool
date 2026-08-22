"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  FileUp,
  MessageSquare,
  PartyPopper,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Page } from "@/components/shell/AppShell";
import { useSession, useMe } from "@/components/session";
import { useMyReturns, useSetup, useTasks, useThreads } from "@/components/hooks";
import { STAGES, STAGE_BY_ID } from "@/data/taxonomy";
import { FILING_DEADLINE } from "@/data/generate";
import { ago, date, daysUntil, money, plural, until } from "@/lib/format";
import { Badge, Button, Card, cx, Meter, SectionHeader, Tip } from "@/components/ui";
import { BlockerRow, OwnerChip, StageTrack } from "@/components/status";
import { actorName } from "@/data/store";
import type { TaxReturn, WorkItem } from "@/lib/types";
import { tasksFor as tasksForClient } from "@/data/store";

/* ============================================================================
   CLIENT HOME  (Challenges 03 and 06)

   Two states of the same page, and the transition between them is the design:

     FIRST RUN     one card, one verb, one number. Navigation is one item long.
     ESTABLISHED   status first, then only what actually needs the client.

   The first-run version never shows a return, a stage or a figure, because a
   client with nothing filed yet cannot act on any of them. It shows the three
   things that unblock their preparer, in the order they unblock them.
   ========================================================================== */

export function ClientHome() {
  const me = useMe();
  const returns = useMyReturns();
  const active = returns.find((r) => r.stage !== "accepted") ?? returns[0];
  const setup = useSetup(active?.id);
  const firstRun = active?.stage === "intake" && !setup.complete;

  if (!active) {
    return (
      <Page>
        <Card className="p-8 text-center text-[13px] text-ink3">No return on file yet.</Card>
      </Page>
    );
  }

  return (
    <Page>
      {firstRun ? (
        <FirstRun name={me.name.split(" ")[0]} ret={active} setup={setup} />
      ) : (
        <Established name={me.name.split(" ")[0]} returns={returns} justFinished={setup.complete && active.stage === "intake"} />
      )}
    </Page>
  );
}

/* --- First run ------------------------------------------------------------ */

function FirstRun({
  name,
  ret,
  setup,
}: {
  name: string;
  ret: TaxReturn;
  setup: ReturnType<typeof useSetup>;
}) {
  const next = setup.next!;
  const tasks = useTasks(ret.id);
  const threads = useThreads(ret.id);
  const welcome = threads[0];

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="pb-1 pt-2">
        <Badge tone="ai" icon={<Sparkles className="h-3 w-3" />}>
          Challenge 03 · first-time client
        </Badge>
      </div>

      <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.015em] text-ink">
        Welcome, {name}.
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink2">
        Three things and we can start your {ret.taxYear} return. About 17 minutes in total — you can
        stop and come back.
      </p>

      {/* The single next action */}
      <Card className="mt-6 overflow-hidden border-brand-line">
        <div className="border-b border-brand-line bg-brand-soft px-4 py-2">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-brand-ink">
            Start here
          </span>
        </div>
        <div className="p-5">
          <h2 className="text-[18px] font-semibold tracking-tight text-ink">{next.label}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">{next.blurb}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <NextActionButton step={next.id} returnId={ret.id} />
            <span className="inline-flex items-center gap-1 text-[12.5px] text-ink3">
              <Clock className="h-3.5 w-3.5" />
              about {next.minutes} minutes
            </span>
          </div>
        </div>
      </Card>

      {/* Progress */}
      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[13px] font-semibold text-ink">Setting up</h3>
          <span className="tnum text-[12px] text-ink3">
            {setup.done} of {setup.total} done
          </span>
        </div>
        <Meter value={setup.done / setup.total} height={5} />
        <ul className="mt-3 space-y-1.5">
          {setup.steps.map((s, i) => (
            <li
              key={s.id}
              className={cx(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                s.done
                  ? "border-good-line bg-good-soft"
                  : s.id === next.id
                    ? "border-line bg-surface"
                    : "border-line bg-surface opacity-60",
              )}
            >
              <span
                className={cx(
                  "tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  s.done ? "bg-good text-white" : "bg-sunken text-ink3",
                )}
              >
                {s.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cx("flex-1 text-[13px]", s.done ? "text-good-ink line-through" : "text-ink")}>
                {s.label}
              </span>
              <span className="tnum shrink-0 text-[11.5px] text-ink4">{s.minutes} min</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What happens next — sets expectations so the wait isn't silent */}
      <Card className="mt-6 p-4">
        <SectionHeader
          title="What happens after that"
          hint="So the quiet period in the middle doesn't feel like nothing is happening."
        />
        <ol className="mt-3 space-y-2.5">
          {STAGES.slice(1).map((s, i) => (
            <li key={s.id} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sunken text-[10.5px] font-semibold text-ink3">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-ink">{s.clientLabel}</span>
                <span className="block text-[12px] leading-relaxed text-ink3">{s.definition}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {welcome ? (
        <Card className="mt-4 p-4">
          <SectionHeader
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            title={`A note from ${actorName(welcome.messages[0].authorId)}`}
            action={
              <Link href={`/inbox/${welcome.id}`} className="text-[12px] font-medium text-brand-ink hover:underline">
                Reply
              </Link>
            }
          />
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink2">{welcome.messages[0].body}</p>
        </Card>
      ) : null}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-ink3">
        <ShieldCheck className="h-3.5 w-3.5" />
        {plural(tasks.length, "task")} in total. Your accountant is {actorName(ret.preparerId)}.
      </p>
    </div>
  );
}

function NextActionButton({ step, returnId }: { step: string; returnId: string }) {
  const { addUpload, toggleTask } = useSession();
  const tasks = useTasks(returnId);
  const [busy, setBusy] = React.useState(false);

  if (step === "questions") {
    return (
      <Link
        href={`/returns/${returnId}/questions`}
        className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-[14px] font-medium text-brand-on shadow-e1 transition-colors hover:bg-brand-hover"
      >
        Answer the questions
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  const label = step === "identity" ? "Add a photo of your ID" : "Add your documents";
  const kind = step === "identity" ? "ID document" : "W-2";
  const task = tasks.find((t) =>
    step === "identity" ? /identity/i.test(t.title) : /income documents/i.test(t.title),
  );

  return (
    <Button
      variant="primary"
      size="lg"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        addUpload({
          id: `UP-${Date.now()}`,
          returnId,
          name: step === "identity" ? "Driver's licence.jpg" : "W-2 — Lumen Health.pdf",
          kind,
        });
        if (task) toggleTask(task.id, true);
        setBusy(false);
      }}
    >
      <FileUp className="h-4 w-4" />
      {label}
    </Button>
  );
}

/* --- Established ---------------------------------------------------------- */

function Established({
  name,
  returns,
  justFinished,
}: {
  name: string;
  returns: TaxReturn[];
  justFinished: boolean;
}) {
  const primary = returns.find((r) => r.stage !== "accepted") ?? returns[0];
  const openTasks = useClientTasks(returns);

  return (
    <>
      {justFinished ? (
        <Card className="mb-5 flex items-start gap-3 border-good-line bg-good-soft p-4">
          <PartyPopper className="mt-0.5 h-4 w-4 shrink-0 text-good-ink" />
          <div>
            <p className="text-[13.5px] font-semibold text-good-ink">Setup done — thank you.</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink2">
              Your accountant has everything they need to start. Documents, questions and messages
              have appeared in the sidebar; you&rsquo;ll get a message here when there&rsquo;s
              something to look at.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Hello, {name}</h1>
          <p className="mt-1 text-[13px] text-ink2">
            {openTasks.length === 0
              ? "Nothing needs you right now."
              : `${plural(openTasks.length, "thing")} ${openTasks.length === 1 ? "needs" : "need"} your attention.`}
          </p>
        </div>
        <Badge tone={daysUntil(FILING_DEADLINE) <= 21 ? "warn" : "neutral"} icon={<CalendarClock className="h-3 w-3" />}>
          {daysUntil(FILING_DEADLINE)} days to 15 April
        </Badge>
      </div>

      {openTasks.length > 0 ? (
        <Card className="mb-5 overflow-hidden">
          <div className="px-4 py-3">
            <SectionHeader
              title="Needs you"
              hint="Each of these is holding something up. Nothing else on this page is urgent."
            />
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {openTasks.map((t) => (
              <ClientTaskRow key={t.id} task={t} />
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="mb-5 flex items-center gap-3 border-good-line bg-good-soft p-4">
          <CircleCheck className="h-4 w-4 shrink-0 text-good-ink" />
          <p className="text-[13px] text-good-ink">
            Nothing needs you right now. We&rsquo;ll message you the moment it does.
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {returns.map((r) => (
          <ReturnStatusCard key={r.id} ret={r} primary={r.id === primary.id} />
        ))}
      </div>
    </>
  );
}

function useClientTasks(returns: TaxReturn[]) {
  const { doneTasks, personId } = useSession();
  const ids = returns.map((r) => r.id).join(",");
  return React.useMemo(() => {
    const out: WorkItem[] = [];
    for (const r of returns) {
      for (const t of tasksForClient(r.id)) {
        if (t.side !== "client") continue;
        if (doneTasks[t.id] || t.status === "done") continue;
        out.push(t);
      }
    }
    return out.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, doneTasks, personId]);
}

function ClientTaskRow({ task }: { task: WorkItem }) {
  const { toggleTask } = useSession();
  const overdue = daysUntil(task.dueDate) < 0;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button
        onClick={() => toggleTask(task.id, true)}
        aria-label={`Mark "${task.title}" done`}
        className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[5px] border border-line-strong transition-colors hover:border-good hover:bg-good-soft"
        style={{ height: 18, width: 18 }}
      >
        <Check className="h-3 w-3 text-transparent hover:text-good" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">{task.title}</p>
        {task.detail ? (
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink3">{task.detail}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={overdue ? "crit" : daysUntil(task.dueDate) <= 3 ? "warn" : "neutral"} size="sm">
            {until(task.dueDate)}
          </Badge>
          {task.linked.map((l) => (
            <Link
              key={l.id}
              href={
                l.type === "document"
                  ? `/returns/${task.returnId}/documents?doc=${l.id}`
                  : l.type === "field"
                    ? `/returns/${task.returnId}`
                    : `/inbox/${l.id}`
              }
              className="aff-link text-[11.5px] text-brand-ink"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink4" />
    </li>
  );
}

function ReturnStatusCard({ ret, primary }: { ret: TaxReturn; primary: boolean }) {
  const stage = STAGE_BY_ID[ret.stage];
  const done = ret.stage === "accepted";
  return (
    <Card className={cx("overflow-hidden", primary && "border-line-strong")}>
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/returns/${ret.id}`} className="aff-link block truncate text-[14px] font-semibold text-ink">
              {ret.clientName}
            </Link>
            <p className="text-[11.5px] text-ink3">
              {ret.taxYear} · Form {ret.form}
            </p>
          </div>
          {done ? (
            <Badge tone="good" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              Accepted
            </Badge>
          ) : (
            <OwnerChip side={ret.owner} audience="client" />
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <StageTrack stage={ret.stage} audience="client" />
        <p className="text-[12.5px] leading-relaxed text-ink2">{stage.definition}</p>

        {ret.blockers.length > 0 ? (
          <div className="space-y-1.5">
            {ret.blockers.map((b) => (
              <BlockerRow key={b.id} blocker={b} audience="client" />
            ))}
          </div>
        ) : null}

        {ret.outcome !== 0 && ret.stage !== "intake" ? (
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-[12.5px] text-ink3">
              {done
                ? ret.outcome > 0
                  ? "Refunded to you"
                  : "You paid"
                : ret.outcome > 0
                  ? "Expected refund"
                  : "Expected to owe"}
            </span>
            <Tip
              wide
              content="A figure the return currently produces, not a promise. It can still change while the return is open."
            >
              <span
                className={cx(
                  "tnum text-[16px] font-semibold",
                  ret.outcome > 0 ? "text-good-ink" : "text-ink",
                )}
              >
                {money(Math.abs(ret.outcome))}
              </span>
            </Tip>
          </div>
        ) : null}

        <p className="text-[11.5px] text-ink4">
          Prepared by {actorName(ret.preparerId)} · last update {ago(ret.lastActivity)}
          {done ? ` · filed ${date(ret.lastActivity)}` : ""}
        </p>
      </div>
    </Card>
  );
}
