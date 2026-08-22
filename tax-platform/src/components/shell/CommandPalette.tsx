"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CornerDownLeft,
  FileText,
  Hash,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { searchAll, type ResultKind, type SearchResult } from "@/lib/search";
import { useSession, useVisibleReturnIds } from "@/components/session";
import { RETURN_BY_ID } from "@/data/store";
import { cx, Kbd, Modal } from "@/components/ui";

const KIND_ICON: Record<ResultKind, React.ReactNode> = {
  return: <LayoutGrid className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  thread: <MessageSquare className="h-3.5 w-3.5" />,
  task: <ListChecks className="h-3.5 w-3.5" />,
  field: <Hash className="h-3.5 w-3.5" />,
  page: <ArrowRight className="h-3.5 w-3.5" />,
};

const KIND_LABEL: Record<ResultKind, string> = {
  return: "Returns",
  document: "Documents",
  thread: "Conversations",
  task: "Tasks",
  field: "Return lines",
  page: "Go to",
};

const ORDER: ResultKind[] = ["page", "return", "field", "document", "thread", "task"];

/**
 * One search box for the whole product.
 *
 * It searches across object *types* — a return, a line on that return, the
 * document that line was read from, and the conversation about it are all one
 * keystroke away from each other. That is what stops navigation becoming a
 * memory test at 200 returns.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const router = useRouter();
  const { audience, pushRecent, recents } = useSession();
  const allow = useVisibleReturnIds();
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
    }
  }, [open]);

  const results = React.useMemo(
    () => searchAll(q, { allowReturnIds: allow, audience, limit: 28 }),
    [q, allow, audience],
  );

  const grouped = React.useMemo(() => {
    const g = new Map<ResultKind, SearchResult[]>();
    for (const r of results) {
      const arr = g.get(r.kind) ?? [];
      arr.push(r);
      g.set(r.kind, arr);
    }
    return ORDER.filter((k) => g.has(k)).map((k) => [k, g.get(k)!] as const);
  }, [results]);

  const flat = React.useMemo(() => grouped.flatMap(([, xs]) => xs), [grouped]);

  React.useEffect(() => {
    setCursor(0);
  }, [q]);

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const go = React.useCallback(
    (r: SearchResult) => {
      pushRecent({
        label: r.title,
        sublabel: r.subtitle,
        href: r.href,
        kind: r.kind,
      });
      router.push(r.href);
      onClose();
    },
    [router, onClose, pushRecent],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(flat.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && flat[cursor]) {
      e.preventDefault();
      go(flat[cursor]);
    }
  };

  let idx = -1;

  return (
    <Modal open={open} onClose={onClose} align="top" className="max-w-[620px]">
      <div className="flex h-11 items-center gap-2.5 border-b border-line px-3.5">
        <Search className="h-4 w-4 shrink-0 text-ink4" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search returns, lines, documents, conversations…"
          className="h-full flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink4"
          aria-label="Search everything"
        />
        <Kbd>esc</Kbd>
      </div>

      <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain p-1.5">
        {!q ? (
          <>
            {recents.length > 0 ? (
              <Group label="Recent">
                {recents.map((r) => (
                  <Row
                    key={r.href}
                    icon={KIND_ICON[(r.kind as ResultKind) ?? "page"] ?? KIND_ICON.page}
                    title={r.label}
                    subtitle={r.sublabel}
                    onClick={() => {
                      router.push(r.href);
                      onClose();
                    }}
                  />
                ))}
              </Group>
            ) : null}
            <Group label="Try">
              <Hint>Whitfield</Hint>
              <Hint>line 7</Hint>
              <Hint>1099-B</Hint>
              <Hint>charitable</Hint>
            </Group>
          </>
        ) : flat.length === 0 ? (
          <div className="px-3 py-10 text-center text-[13px] text-ink3">
            Nothing matches <span className="font-medium text-ink">{q}</span>.
          </div>
        ) : (
          grouped.map(([kind, xs]) => (
            <Group key={kind} label={KIND_LABEL[kind]}>
              {xs.map((r) => {
                idx++;
                const active = idx === cursor;
                const ret = r.returnId ? RETURN_BY_ID[r.returnId] : undefined;
                return (
                  <Row
                    key={`${r.kind}-${r.id}`}
                    active={active}
                    icon={KIND_ICON[r.kind]}
                    title={r.title}
                    subtitle={r.subtitle}
                    meta={r.kind !== "return" && r.kind !== "page" && ret ? ret.clientName : undefined}
                    onClick={() => go(r)}
                    onMouseEnter={() => setCursor(flat.indexOf(r))}
                  />
                );
              })}
            </Group>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line bg-raised px-3.5 py-2 text-[11px] text-ink3">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span className="flex items-center gap-1">
          <Kbd>
            <CornerDownLeft className="h-2.5 w-2.5" />
          </Kbd>{" "}
          open
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-ai" />
          searching {results.length > 0 ? `${results.length} of ` : ""}every object
        </span>
      </div>
    </Modal>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink4">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  meta,
  active,
  onClick,
  onMouseEnter,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  active?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      data-active={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
        active ? "bg-brand-soft" : "hover:bg-raised",
      )}
    >
      <span className={cx("shrink-0", active ? "text-brand-ink" : "text-ink4")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{title}</span>
        {subtitle ? <span className="block truncate text-[11.5px] text-ink3">{subtitle}</span> : null}
      </span>
      {meta ? <span className="shrink-0 truncate text-[11.5px] text-ink4">{meta}</span> : null}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 py-1 text-[12.5px] text-ink3">
      <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[11.5px] text-ink2">
        {children}
      </span>
    </div>
  );
}
