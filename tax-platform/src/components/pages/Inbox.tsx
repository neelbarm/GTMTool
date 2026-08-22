"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCheck,
  EyeOff,
  FileText,
  Hash,
  Inbox as InboxIcon,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { Message, Thread } from "@/lib/types";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession, useMe } from "@/components/session";
import { useVisibleReturnIds } from "@/components/session";
import { RETURN_BY_ID, THREAD_BY_ID, actorHue, actorInitials, actorName, linksFor, visibleThreads } from "@/data/store";
import { ago, dateTime, plural, until } from "@/lib/format";
import { Avatar, Badge, Button, Card, cx, EmptyState, SectionHeader, Segmented, Tip } from "@/components/ui";
import { ConnectedRail } from "@/components/connected";
import { OwnerChip } from "@/components/status";

/* ============================================================================
   INBOX  (Challenge 02)

   The two things that stop this being a generic inbox:

     ANCHOR   every thread is attached to a document, a return line, a question
              or the return itself, and shows that anchor in the header with a
              live link. There is no "general" bucket.

     OWNER    every thread names who has to act next. There is no "unassigned"
              — that value is how requests quietly die.

   The internal boundary is enforced in the data layer, not in this component:
   `visibleThreads(audience)` strips internal threads AND internal turns inside
   client-visible threads. Switch to a client seat and watch the count drop.
   ========================================================================== */

type Filter = "mine" | "client" | "internal" | "resolved" | "all";

export function Inbox({ threadId }: { threadId?: string }) {
  const { audience, personId, resolvedThreads, replies } = useSession();
  const allow = useVisibleReturnIds();
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>(threadId ? "all" : "mine");

  const all = React.useMemo(
    () =>
      visibleThreads(audience)
        .filter((t) => allow.has(t.returnId))
        .map((t) => ({
          ...t,
          messages: [...t.messages, ...(replies[t.id] ?? [])],
          status: resolvedThreads[t.id] ? ("resolved" as const) : t.status,
        }))
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [audience, allow, resolvedThreads, replies],
  );

  const counts = {
    mine: all.filter(
      (t) =>
        t.status !== "resolved" &&
        (audience === "client" ? t.nextActionSide === "client" : t.nextActionOwner === personId),
    ).length,
    client: all.filter((t) => t.status !== "resolved" && t.nextActionSide === "client").length,
    internal: all.filter((t) => t.visibility === "internal" && t.status !== "resolved").length,
    resolved: all.filter((t) => t.status === "resolved").length,
    all: all.length,
  };

  const shown = React.useMemo(() => {
    switch (filter) {
      case "mine":
        return all.filter(
          (t) =>
            t.status !== "resolved" &&
            (audience === "client" ? t.nextActionSide === "client" : t.nextActionOwner === personId),
        );
      case "client":
        return all.filter((t) => t.status !== "resolved" && t.nextActionSide === "client");
      case "internal":
        return all.filter((t) => t.visibility === "internal" && t.status !== "resolved");
      case "resolved":
        return all.filter((t) => t.status === "resolved");
      default:
        return all;
    }
  }, [all, filter, audience, personId]);

  const active = threadId ? all.find((t) => t.id === threadId) : shown[0];

  /* Opening a thread from elsewhere must never leave it invisible in the list
     beside it — that reads as a bug, and it breaks the way back. */
  React.useEffect(() => {
    if (active && !shown.some((t) => t.id === active.id)) setFilter("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const options =
    audience === "firm"
      ? ([
          { value: "mine", label: "Needs me", count: counts.mine },
          { value: "client", label: "With the client", count: counts.client },
          { value: "internal", label: "Internal", count: counts.internal },
          { value: "resolved", label: "Resolved", count: counts.resolved },
          { value: "all", label: "All", count: counts.all },
        ] as const)
      : ([
          { value: "mine", label: "Needs you", count: counts.mine },
          { value: "all", label: "All", count: counts.all },
          { value: "resolved", label: "Done", count: counts.resolved },
        ] as const);

  return (
    <Page wide>
      <PageHeader
        challenge={audience === "firm" ? "Challenge 02" : undefined}
        title={audience === "client" ? "Messages" : "Inbox"}
        lede={
          audience === "client"
            ? "Every message is attached to the part of your return it's about, so nothing gets lost in an email chain."
            : "Every thread is anchored to something and owned by someone. Nothing here is a general-purpose message."
        }
        actions={
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={options as never}
          />
        }
      />

      {audience === "firm" ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-raised px-3 py-2.5">
          <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink4" />
          <p className="text-[12.5px] leading-relaxed text-ink2">
            <b className="font-semibold text-ink">{plural(counts.internal, "internal thread")}</b>{" "}
            {counts.internal === 1 ? "is" : "are"} visible to you and invisible to clients — as are
            internal notes left inside threads the client can otherwise read. Switch to a client
            seat and the boundary applies live.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Card className="overflow-hidden xl:max-h-[calc(100dvh-220px)] xl:overflow-y-auto">
          {shown.length === 0 ? (
            <EmptyState
              icon={<CheckCheck className="h-4 w-4" />}
              title="Nothing here"
              body={filter === "mine" ? "Nothing is waiting on you." : "No threads match this filter."}
            />
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  active={t.id === active?.id}
                  onOpen={() => router.push(`/inbox/${t.id}`)}
                />
              ))}
            </ul>
          )}
        </Card>

        <div className="min-w-0">
          {active ? (
            <ThreadView thread={active} />
          ) : (
            <Card>
              <EmptyState icon={<InboxIcon className="h-4 w-4" />} title="Pick a conversation" />
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

/* --- List row ------------------------------------------------------------- */

function ThreadRow({
  thread,
  active,
  onOpen,
}: {
  thread: Thread;
  active: boolean;
  onOpen: () => void;
}) {
  const { audience } = useSession();
  const last = thread.messages[thread.messages.length - 1];
  const ret = RETURN_BY_ID[thread.returnId];
  const internal = thread.visibility === "internal";

  return (
    <li>
      <button
        onClick={onOpen}
        className={cx(
          "flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition-colors",
          active ? "bg-brand-soft" : "hover:bg-raised",
          internal && !active && "bg-[color-mix(in_oklch,var(--sunken)_60%,transparent)]",
        )}
      >
        <div className="flex items-start gap-2">
          {internal ? (
            <Tip content="Internal — clients never see this thread.">
              <Lock className="mt-[3px] h-3 w-3 shrink-0 text-ink4" />
            </Tip>
          ) : null}
          <span className={cx("min-w-0 flex-1 truncate text-[13px]", active ? "font-semibold text-ink" : "font-medium text-ink")}>
            {thread.subject}
          </span>
          <span className="shrink-0 text-[11px] text-ink4">{ago(thread.updatedAt)}</span>
        </div>

        {last ? (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-ink3">
            <span className="font-medium text-ink2">{actorName(last.authorId)}:</span> {last.body}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {thread.status === "resolved" ? (
            <Badge tone="good" size="sm" icon={<Check className="h-3 w-3" />}>
              resolved
            </Badge>
          ) : (
            <OwnerChip side={thread.nextActionSide} audience={audience} name={actorName(thread.nextActionOwner)} size="sm" />
          )}
          <AnchorChip thread={thread} compact />
          {audience === "firm" && ret ? (
            <span className="truncate text-[11px] text-ink4">{ret.clientName}</span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

function AnchorChip({ thread, compact }: { thread: Thread; compact?: boolean }) {
  const icon =
    thread.anchor.type === "document" ? (
      <FileText className="h-3 w-3" />
    ) : thread.anchor.type === "field" ? (
      <Hash className="h-3 w-3" />
    ) : (
      <MessageSquare className="h-3 w-3" />
    );
  const href =
    thread.anchor.type === "document"
      ? `/returns/${thread.returnId}/documents?doc=${thread.anchor.id}`
      : thread.anchor.type === "field"
        ? `/returns/${thread.returnId}/review?field=${thread.anchor.id}`
        : `/returns/${thread.returnId}`;

  if (compact) {
    return (
      <Badge tone="neutral" size="sm" icon={icon}>
        {thread.anchor.label}
      </Badge>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[12px] font-medium text-ink2 transition-colors hover:border-line-strong hover:bg-raised hover:text-ink"
    >
      {icon}
      {thread.anchor.label}
      <ArrowRight className="h-3 w-3 text-ink4" />
    </Link>
  );
}

/* --- Thread ---------------------------------------------------------------- */

function ThreadView({ thread }: { thread: Thread }) {
  const { audience, personId, can, reply, resolveThread, setResume } = useSession();
  const me = useMe();
  const [draft, setDraft] = React.useState("");
  const [internal, setInternal] = React.useState(thread.visibility === "internal");
  const ret = RETURN_BY_ID[thread.returnId];
  const canMessageClient = can("message.client");

  React.useEffect(() => {
    setInternal(thread.visibility === "internal");
    setDraft("");
  }, [thread.id, thread.visibility]);

  const send = () => {
    if (!draft.trim()) return;
    const m: Message = {
      id: `M-${Date.now()}`,
      authorId: personId,
      at: new Date().toISOString(),
      body: draft.trim(),
      internal: audience === "firm" ? internal : false,
      kind: "message",
    };
    reply(thread.id, m);
    setDraft("");
  };

  return (
    <Card className="flex min-h-[520px] flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {thread.visibility === "internal" ? (
                <Badge tone="neutral" size="sm" icon={<Lock className="h-3 w-3" />}>
                  internal only
                </Badge>
              ) : (
                <Badge tone="brand" size="sm" icon={<Users className="h-3 w-3" />}>
                  {audience === "client" ? "with your accountant" : "client can see this"}
                </Badge>
              )}
              <Badge tone="neutral" size="sm">
                {thread.kind.replace("-", " ")}
              </Badge>
            </div>
            <h2 className="mt-1.5 text-[15.5px] font-semibold tracking-tight text-ink">{thread.subject}</h2>
          </div>
          {thread.status !== "resolved" ? (
            <Button
              size="sm"
              onClick={() => resolveThread(thread.id, true)}
              title="Marks the request satisfied and takes it out of everyone's queue"
            >
              <Check className="h-3.5 w-3.5" />
              Mark resolved
            </Button>
          ) : (
            <Badge tone="good" icon={<Check className="h-3.5 w-3.5" />}>
              Resolved
            </Badge>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-ink3">About:</span>
          <span onClick={() => setResume({ label: thread.subject, href: `/inbox/${thread.id}`, note: "Conversation" })}>
            <AnchorChip thread={thread} />
          </span>
          {thread.status !== "resolved" ? (
            <>
              <span className="text-[11.5px] text-ink3">Next move:</span>
              <OwnerChip
                side={thread.nextActionSide}
                audience={audience}
                name={actorName(thread.nextActionOwner)}
              />
            </>
          ) : null}
          {thread.dueDate && thread.status !== "resolved" ? (
            <Badge tone={until(thread.dueDate).includes("overdue") ? "crit" : "neutral"} size="sm">
              {until(thread.dueDate)}
            </Badge>
          ) : null}
          {audience === "firm" && ret ? (
            <Link href={`/returns/${ret.id}`} className="aff-link text-[11.5px] text-brand-ink">
              {ret.clientName} · {ret.taxYear}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-canvas p-4">
        {thread.messages.map((m) => (
          <MessageBubble key={m.id} m={m} mine={m.authorId === personId} />
        ))}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line bg-surface p-3">
        {audience === "firm" && !canMessageClient ? (
          <p className="flex items-center gap-2 rounded-md border border-warn-line bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Seasonal staff can&rsquo;t message clients. You can still add an internal note and a
            preparer will pick it up.
          </p>
        ) : null}

        <div className="flex items-start gap-2.5">
          <Avatar initials={me.initials} hue={me.hue} size={28} />
          <div className="min-w-0 flex-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
              }}
              rows={2}
              placeholder={
                internal ? "Internal note — the client will never see this…" : "Write a reply…"
              }
              className={cx(
                "w-full resize-none rounded-md border px-2.5 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink4 focus:outline-none",
                internal
                  ? "border-warn-line bg-warn-soft focus:border-warn"
                  : "border-line bg-surface focus:border-brand",
              )}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {audience === "firm" && thread.visibility === "client-visible" ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-ink2">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--warn)]"
                  />
                  <EyeOff className="h-3.5 w-3.5" />
                  Internal note
                </label>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                className="ml-auto"
                onClick={send}
                disabled={!draft.trim() || (audience === "firm" && !internal && !canMessageClient)}
              >
                <Send className="h-3 w-3" />
                {internal ? "Add internal note" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {linksFor("thread", thread.id, thread.returnId).length > 0 ? (
        <div className="shrink-0 border-t border-line p-3.5">
          <ConnectedRail
            flat
            links={linksFor("thread", thread.id, thread.returnId)}
            title="Where this lives on the return"
            resumeLabel={thread.subject}
          />
        </div>
      ) : null}
    </Card>
  );
}

function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  if (m.kind === "request-fulfilled") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-good-line bg-good-soft px-3 py-2 text-[12px] text-good-ink">
        <CheckCheck className="h-3.5 w-3.5 shrink-0" />
        {m.body}
      </div>
    );
  }

  return (
    <div className={cx("flex gap-2.5", m.internal && "pl-4")}>
      <Avatar initials={actorInitials(m.authorId)} hue={actorHue(m.authorId)} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[12.5px] font-semibold text-ink">
            {mine ? "You" : actorName(m.authorId)}
          </span>
          <span className="text-[11px] text-ink4">{dateTime(m.at)}</span>
          {m.internal ? (
            <Badge tone="warn" size="sm" icon={<EyeOff className="h-3 w-3" />}>
              internal — client can&rsquo;t see this
            </Badge>
          ) : null}
        </div>
        <div
          className={cx(
            "mt-1 rounded-lg border px-3 py-2 text-[13px] leading-relaxed",
            m.internal
              ? "border-dashed border-warn-line bg-warn-soft text-ink"
              : "border-line bg-surface text-ink",
          )}
        >
          {m.body}
          {m.attachmentDocIds?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.attachmentDocIds.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-raised px-2 py-1 text-[11.5px] text-ink2"
                >
                  <Paperclip className="h-3 w-3" />
                  {d}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
