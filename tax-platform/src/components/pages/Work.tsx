"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  FileText,
  Hash,
  History,
  ListChecks,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type { ActivityEvent, TaxReturn, WorkItem } from "@/lib/types";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession } from "@/components/session";
import { useTasks } from "@/components/hooks";
import { useVisibleReturnIds } from "@/components/session";
import { ACTIVITY, RETURN_BY_ID, TASKS, actorName, activityFor } from "@/data/store";
import { person } from "@/data/people";
import { ago, dateTime, plural, until, daysUntil } from "@/lib/format";
import { Avatar, Badge, Card, cx, EmptyState, SectionHeader, Segmented, Meter } from "@/components/ui";
import { ConnectedRail } from "@/components/connected";
import { linksFor } from "@/data/store";

/* --- Tasks on one return -------------------------------------------------- */

export function ReturnTasks({ ret }: { ret: TaxReturn }) {
  const tasks = useTasks(ret.id);
  const { audience, toggleTask } = useSession();
  const params = useSearchParams();
  const focus = params.get("task");

  const ours = tasks.filter((t) => t.side === "firm");
  const theirs = tasks.filter((t) => t.side === "client");
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <Page>
      <PageHeader
        title="Tasks"
        lede="Split by who has to do them, because that is the only division that changes what you do next."
        meta={
          <div className="max-w-xs">
            <Meter value={done / Math.max(1, tasks.length)} tone="good" height={5} />
            <p className="mt-1 text-[11.5px] text-ink3">
              {done} of {tasks.length} complete
            </p>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskColumn
          title={audience === "client" ? "Your accountant" : "Us"}
          blurb="Firm-side work."
          tasks={ours}
          onToggle={toggleTask}
          focus={focus}
          returnId={ret.id}
        />
        <TaskColumn
          title={audience === "client" ? "You" : ret.clientName}
          blurb="Client-side work. These are the ones worth chasing."
          tasks={theirs}
          onToggle={toggleTask}
          focus={focus}
          returnId={ret.id}
        />
      </div>
    </Page>
  );
}

function TaskColumn({
  title,
  blurb,
  tasks,
  onToggle,
  focus,
  returnId,
}: {
  title: string;
  blurb: string;
  tasks: WorkItem[];
  onToggle: (id: string, done: boolean) => void;
  focus: string | null;
  returnId: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3">
        <SectionHeader title={title} hint={blurb} />
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={<CircleCheck className="h-4 w-4" />} title="Nothing outstanding" />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {tasks.map((t) => (
            <li
              key={t.id}
              id={`task-${t.id}`}
              className={cx("px-4 py-3 transition-colors", focus === t.id && "bg-brand-soft")}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggle(t.id, t.status !== "done")}
                  aria-label={`Toggle "${t.title}"`}
                  className={cx(
                    "mt-0.5 flex shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                    t.status === "done"
                      ? "border-good bg-good text-white"
                      : "border-line-strong hover:border-good hover:bg-good-soft",
                  )}
                  style={{ height: 18, width: 18 }}
                >
                  {t.status === "done" ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cx("text-[13px] font-medium", t.status === "done" ? "text-ink3 line-through" : "text-ink")}>
                    {t.title}
                  </p>
                  {t.detail ? (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-ink3">{t.detail}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge
                      tone={
                        t.status === "done"
                          ? "good"
                          : t.status === "blocked"
                            ? "crit"
                            : daysUntil(t.dueDate) < 0
                              ? "crit"
                              : daysUntil(t.dueDate) <= 3
                                ? "warn"
                                : "neutral"
                      }
                      size="sm"
                    >
                      {t.status === "done" ? "done" : t.status === "blocked" ? "blocked" : until(t.dueDate)}
                    </Badge>
                    {t.estimateMin ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink4">
                        <Clock className="h-3 w-3" />
                        {t.estimateMin} min
                      </span>
                    ) : null}
                    <span className="text-[11px] text-ink4">{actorName(t.assigneeId)}</span>
                  </div>
                  {t.linked.length > 0 ? (
                    <div className="mt-2">
                      <ConnectedRail flat links={linksFor("task", t.id, returnId)} title="Linked to" />
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* --- Full history --------------------------------------------------------- */

const KIND_ICON: Record<ActivityEvent["kind"], React.ReactNode> = {
  stage: <CalendarClock className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  message: <MessageSquare className="h-3.5 w-3.5" />,
  field: <Hash className="h-3.5 w-3.5" />,
  ai: <Sparkles className="h-3.5 w-3.5" />,
  task: <ListChecks className="h-3.5 w-3.5" />,
};

export function ReturnActivity({ ret }: { ret: TaxReturn }) {
  const events = activityFor(ret.id);
  const [kind, setKind] = React.useState<string>("all");

  const shown = kind === "all" ? events : events.filter((e) => e.kind === kind);

  return (
    <Page>
      <div className="mx-auto max-w-[780px]">
        <PageHeader
          title="History"
          lede="Everything that has happened to this return, oldest at the bottom. Nothing is deleted — corrections appear as events rather than replacing what came before."
          actions={
            <Segmented
              size="sm"
              value={kind}
              onChange={setKind}
              options={[
                { value: "all", label: "All" },
                { value: "document", label: "Documents" },
                { value: "message", label: "Messages" },
                { value: "ai", label: "AI" },
                { value: "field", label: "Figures" },
              ]}
            />
          }
        />

        {shown.length === 0 ? (
          <Card>
            <EmptyState icon={<History className="h-4 w-4" />} title="Nothing recorded" />
          </Card>
        ) : (
          <Card className="p-4">
            <ol className="relative space-y-4 pl-6">
              <span className="absolute bottom-2 left-[11px] top-2 w-px bg-line" aria-hidden />
              {shown.map((e) => {
                const p = person(e.actorId);
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={cx(
                        "absolute -left-6 flex h-[22px] w-[22px] items-center justify-center rounded-full border bg-surface",
                        e.kind === "ai" ? "border-ai-line text-ai" : "border-line text-ink4",
                      )}
                    >
                      {KIND_ICON[e.kind]}
                    </span>
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-[13px] leading-relaxed text-ink2">
                        <b className="font-semibold text-ink">{actorName(e.actorId)}</b> {e.verb}{" "}
                        {e.href ? (
                          <Link href={e.href} className="aff-link font-medium text-brand-ink">
                            {e.object}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{e.object}</span>
                        )}
                      </p>
                      <span className="shrink-0 text-[11.5px] text-ink4" title={dateTime(e.at)}>
                        {ago(e.at)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}
      </div>
    </Page>
  );
}

/* --- Global "My work" ----------------------------------------------------- */

export function MyWork() {
  const { personId, audience, doneTasks, toggleTask } = useSession();
  const allow = useVisibleReturnIds();

  const mine = React.useMemo(
    () =>
      TASKS.filter((t) => allow.has(t.returnId))
        .filter((t) => (audience === "client" ? t.side === "client" : t.assigneeId === personId))
        .map((t) => (doneTasks[t.id] ? { ...t, status: "done" as const } : t))
        .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)),
    [allow, audience, personId, doneTasks],
  );

  const open = mine.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => daysUntil(t.dueDate) < 0);
  const grouped = React.useMemo(() => {
    const m = new Map<string, WorkItem[]>();
    for (const t of open) {
      const d = daysUntil(t.dueDate);
      const key = d < 0 ? "Overdue" : d === 0 ? "Today" : d <= 7 ? "This week" : "Later";
      m.set(key, [...(m.get(key) ?? []), t]);
    }
    return ["Overdue", "Today", "This week", "Later"].filter((k) => m.has(k)).map((k) => [k, m.get(k)!] as const);
  }, [open]);

  return (
    <Page>
      <PageHeader
        title="My work"
        lede={
          open.length === 0
            ? "Nothing assigned to you is outstanding."
            : `${plural(open.length, "open task")}${overdue.length ? `, ${overdue.length} overdue` : ""}. Grouped by when, not by which return — this is a to-do list, not a filing cabinet.`
        }
      />

      {grouped.length === 0 ? (
        <Card>
          <EmptyState icon={<CircleCheck className="h-4 w-4" />} title="All clear" body="Nothing is waiting on you." />
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([label, items]) => (
            <Card key={label} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line bg-raised px-3.5 py-2">
                <span
                  className={cx(
                    "text-[12px] font-semibold",
                    label === "Overdue" ? "text-crit-ink" : "text-ink2",
                  )}
                >
                  {label}
                </span>
                <span className="tnum ml-auto text-[11.5px] text-ink3">{items.length}</span>
              </div>
              <ul className="divide-y divide-line">
                {items.map((t) => {
                  const ret = RETURN_BY_ID[t.returnId];
                  return (
                    <li key={t.id} className="flex items-start gap-3 px-3.5 py-2.5">
                      <button
                        onClick={() => toggleTask(t.id, true)}
                        aria-label={`Complete "${t.title}"`}
                        className="mt-0.5 flex shrink-0 items-center justify-center rounded-[5px] border border-line-strong transition-colors hover:border-good hover:bg-good-soft"
                        style={{ height: 18, width: 18 }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink">{t.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink3">
                          {ret ? (
                            <Link href={`/returns/${ret.id}`} className="aff-link text-brand-ink">
                              {ret.clientName}
                            </Link>
                          ) : null}
                          <span>·</span>
                          <span className={cx(daysUntil(t.dueDate) < 0 && "font-medium text-crit-ink")}>
                            {until(t.dueDate)}
                          </span>
                          {t.estimateMin ? (
                            <>
                              <span>·</span>
                              <span>{t.estimateMin} min</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
