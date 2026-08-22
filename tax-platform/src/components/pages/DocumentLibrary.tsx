"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  FileText,
  FileUp,
  Filter,
  Inbox,
  Layers,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { DocKind, SourceDoc, TaxReturn } from "@/lib/types";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession } from "@/components/session";
import { useDocuments } from "@/components/hooks";
import { linksFor } from "@/data/store";
import { actorName } from "@/data/store";
import { ago, bytes, plural } from "@/lib/format";
import { Badge, Button, Card, cx, EmptyState, SearchInput, SectionHeader, Segmented, Tip } from "@/components/ui";
import { DocStatusBadge, DocumentViewer, ExtractionNote } from "@/components/doc-viewer";
import { ConnectedRail } from "@/components/connected";
import { ConfidenceBadge } from "@/components/affordance";

/* ============================================================================
   DOCUMENTS  (Challenge 09)

   Three levers, and they compose:

     GROUP BY   reflects how the work is actually organised, not the schema
     FILTERS    stay visible as removable chips, so you always know what you
                are looking at and can undo one condition at a time
     PAGE SIZE  is explicit — counts tell you the size of the problem;
                infinite scroll hides it

   Detail opens beside the list rather than replacing it, so scanning and
   reading are the same task at two depths instead of two screens.
   ========================================================================== */

type GroupBy = "kind" | "status" | "who" | "none";

export function DocumentLibrary({ ret }: { ret: TaxReturn }) {
  const docs = useDocuments(ret.id);
  const params = useSearchParams();
  const router = useRouter();
  const { audience, addUpload } = useSession();

  const [q, setQ] = React.useState("");
  const [kinds, setKinds] = React.useState<Set<string>>(new Set());
  const [status, setStatus] = React.useState<Set<string>>(new Set());
  const [group, setGroup] = React.useState<GroupBy>("kind");
  const [limit, setLimit] = React.useState(30);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const urlDoc = params.get("doc");
  const urlBox = params.get("box") ?? undefined;
  const [selectedId, setSelectedId] = React.useState<string | undefined>(urlDoc ?? docs[0]?.id);

  React.useEffect(() => {
    if (urlDoc) setSelectedId(urlDoc);
  }, [urlDoc]);

  const select = (id: string) => {
    setSelectedId(id);
    router.replace(`/returns/${ret.id}/documents?doc=${id}`, { scroll: false });
  };

  const allKinds = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.kind, (m.get(d.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [docs]);

  const allStatuses = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.status, (m.get(d.status) ?? 0) + 1);
    return [...m.entries()];
  }, [docs]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return docs.filter((d) => {
      if (kinds.size && !kinds.has(d.kind)) return false;
      if (status.size && !status.has(d.status)) return false;
      if (needle && !`${d.name} ${d.issuer} ${d.kind}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [docs, q, kinds, status]);

  const groups = React.useMemo(() => groupDocs(filtered, group), [filtered, group]);
  const selected = docs.find((d) => d.id === selectedId);
  const activeFilters = kinds.size + status.size + (q ? 1 : 0);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
    setLimit(30);
  };

  let shown = 0;

  return (
    <Page wide>
      <PageHeader
        challenge={audience === "firm" ? "Challenge 09" : undefined}
        title={audience === "client" ? "Your documents" : "Documents"}
        lede={
          audience === "client"
            ? "Everything we have for your return, and what each one was used for."
            : `${plural(docs.length, "document")} on this return. Filter and group to find the one you want; open one to see every line it feeds.`
        }
        actions={
          <Button
            variant="primary"
            onClick={() =>
              addUpload({
                id: `UP-${Date.now()}`,
                returnId: ret.id,
                name: "Scanned receipt.pdf",
                kind: "Receipt",
              })
            }
          >
            <FileUp className="h-3.5 w-3.5" />
            Add a document
          </Button>
        }
      />

      {/* Filter bar */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-2.5">
          <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(30); }} placeholder="Search by name or issuer…" className="w-full sm:w-72" />
          <Button
            variant={filtersOpen || activeFilters > 0 ? "primary" : "secondary"}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilters > 0 ? (
              <span className="tnum ml-0.5 rounded-full bg-[color-mix(in_oklch,var(--brand-on)_25%,transparent)] px-1.5 text-[11px]">
                {activeFilters}
              </span>
            ) : null}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[12px] text-ink3 sm:inline">Group by</span>
            <Segmented
              size="sm"
              value={group}
              onChange={setGroup}
              options={[
                { value: "kind", label: "Form type" },
                { value: "status", label: "State" },
                { value: "who", label: "Who added it" },
                { value: "none", label: "Flat" },
              ]}
            />
          </div>
        </div>

        {filtersOpen ? (
          <div className="a-fade-up border-t border-line p-3">
            <FilterGroup label="Form type">
              {allKinds.map(([k, n]) => (
                <Chip key={k} on={kinds.has(k)} onClick={() => toggle(kinds, setKinds, k)} count={n}>
                  {k}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="State" className="mt-3">
              {allStatuses.map(([k, n]) => (
                <Chip key={k} on={status.has(k)} onClick={() => toggle(status, setStatus, k)} count={n}>
                  {k}
                </Chip>
              ))}
            </FilterGroup>
          </div>
        ) : null}

        {activeFilters > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
            <span className="text-[11.5px] text-ink3">Showing</span>
            <b className="tnum text-[12px] text-ink">{filtered.length}</b>
            <span className="text-[11.5px] text-ink3">of {docs.length} where</span>
            {q ? <RemovableChip onRemove={() => setQ("")}>name contains “{q}”</RemovableChip> : null}
            {[...kinds].map((k) => (
              <RemovableChip key={k} onRemove={() => toggle(kinds, setKinds, k)}>
                {k}
              </RemovableChip>
            ))}
            {[...status].map((k) => (
              <RemovableChip key={k} onRemove={() => toggle(status, setStatus, k)}>
                {k}
              </RemovableChip>
            ))}
            <button
              onClick={() => {
                setQ("");
                setKinds(new Set());
                setStatus(new Set());
              }}
              className="ml-1 text-[11.5px] font-medium text-brand-ink hover:underline"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        {/* List */}
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Inbox className="h-4 w-4" />}
                title="Nothing matches"
                body="Loosen a filter — the chips above show every condition currently applied."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {groups.map(([label, items]) => {
                const slice = items.slice(0, Math.max(0, limit - shown));
                shown += slice.length;
                if (slice.length === 0) return null;
                return (
                  <Card key={label} className="overflow-hidden">
                    {group !== "none" ? (
                      <div className="flex items-center gap-2 border-b border-line bg-raised px-3 py-1.5">
                        <Layers className="h-3 w-3 text-ink4" />
                        <span className="text-[11.5px] font-semibold text-ink2">{label}</span>
                        <span className="tnum ml-auto text-[11px] text-ink3">{items.length}</span>
                      </div>
                    ) : null}
                    <ul className="divide-y divide-line">
                      {slice.map((d) => (
                        <DocRow key={d.id} doc={d} selected={d.id === selectedId} onSelect={() => select(d.id)} />
                      ))}
                    </ul>
                  </Card>
                );
              })}
              {filtered.length > limit ? (
                <button
                  onClick={() => setLimit((l) => l + 40)}
                  className="w-full rounded-lg border border-line bg-surface py-2.5 text-[12.5px] font-medium text-brand-ink transition-colors hover:bg-raised"
                >
                  Show {Math.min(40, filtered.length - limit)} more · {filtered.length - limit} remaining
                </button>
              ) : (
                <p className="py-1 text-center text-[11.5px] text-ink4">
                  All {filtered.length} shown
                </p>
              )}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="min-w-0">
          {selected ? (
            <div className="space-y-3 xl:sticky xl:top-[112px]">
              <DocumentViewer
                doc={selected}
                highlight={urlBox}
                className="max-h-[62vh]"
                footer={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <ExtractionNote doc={selected} />
                    <span className="text-[11.5px] text-ink3">
                      added by {actorName(selected.uploadedBy)} · {ago(selected.uploadedAt)}
                    </span>
                  </div>
                }
              />
              {selected.supersededBy ? (
                <Card className="border-crit-line bg-crit-soft p-3">
                  <p className="text-[12.5px] leading-relaxed text-crit-ink">
                    <b className="font-semibold">A newer version of this document exists.</b> Figures
                    on the return use the corrected copy. This one is kept because the return was
                    prepared against it.
                  </p>
                  <button
                    onClick={() => select(selected.supersededBy!)}
                    className="mt-2 text-[12px] font-medium text-brand-ink hover:underline"
                  >
                    Open the corrected version
                  </button>
                </Card>
              ) : null}
              <ConnectedRail
                links={linksFor("document", selected.id, ret.id)}
                title="What this document feeds"
                resumeLabel={selected.name}
              />
            </div>
          ) : (
            <Card>
              <EmptyState icon={<FileText className="h-4 w-4" />} title="Pick a document" />
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

/* --- Pieces --------------------------------------------------------------- */

function DocRow({
  doc,
  selected,
  onSelect,
}: {
  doc: SourceDoc;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={cx(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
          selected ? "bg-brand-soft" : "hover:bg-raised",
        )}
      >
        <FileText className={cx("h-4 w-4 shrink-0", selected ? "text-brand" : "text-ink4")} />
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[13px]", selected ? "font-semibold text-ink" : "text-ink")}>
            {doc.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink3">
            <span>{doc.issuer}</span>
            <span>·</span>
            <span>{ago(doc.uploadedAt)}</span>
            <span>·</span>
            <span className="tnum">{bytes(doc.bytes)}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <DocStatusBadge doc={doc} />
          {doc.confidence > 0 ? <ConfidenceBadge value={doc.confidence} size="sm" /> : null}
        </span>
      </button>
    </li>
  );
}

function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink3">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
  count,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11.5px] font-medium transition-colors",
        on
          ? "border-brand bg-brand text-brand-on"
          : "border-line bg-surface text-ink2 hover:border-line-strong hover:bg-raised",
      )}
    >
      {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      {children}
      {count !== undefined ? (
        <span className={cx("tnum", on ? "opacity-70" : "text-ink4")}>{count}</span>
      ) : null}
    </button>
  );
}

function RemovableChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-brand-line bg-brand-soft pl-2 pr-1 text-[11.5px] font-medium text-brand-ink">
      {children}
      <button onClick={onRemove} aria-label="Remove filter" className="rounded-full p-0.5 hover:bg-brand-line">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function groupDocs(docs: SourceDoc[], by: GroupBy): [string, SourceDoc[]][] {
  if (by === "none") return [["All", docs]];
  const m = new Map<string, SourceDoc[]>();
  for (const d of docs) {
    const key =
      by === "kind"
        ? d.kind
        : by === "status"
          ? STATUS_LABEL[d.status]
          : actorName(d.uploadedBy);
    m.set(key, [...(m.get(key) ?? []), d]);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

const STATUS_LABEL: Record<string, string> = {
  processed: "Read and matched",
  processing: "Still reading",
  "needs-review": "Needs a look",
  superseded: "Superseded",
  rejected: "Rejected",
};
