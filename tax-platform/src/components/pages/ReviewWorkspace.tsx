"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CornerDownRight,
  FileText,
  GitCompareArrows,
  Info,
  Lock,
  MessageSquarePlus,
  Pencil,
  ShieldQuestion,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { DerivationStep, ReturnField, SourceRef, TaxReturn } from "@/lib/types";
import { useSession, useMe } from "@/components/session";
import { useDocuments, useFields, useInsights, useThreads } from "@/components/hooks";
import { DOC_BY_ID, linksFor } from "@/data/store";
import { money, num, pct } from "@/lib/format";
import { Badge, Button, Card, cx, Disclosure, EmptyState, SectionHeader, Tip } from "@/components/ui";
import { ConfidenceBadge, FIELD_STATE, FieldValue, ProvenanceChip, StateChip } from "@/components/affordance";
import { DocumentViewer } from "@/components/doc-viewer";
import { ConnectedRail } from "@/components/connected";

/* ============================================================================
   REVIEW WORKSPACE  (Challenge 01)

   Three panes, and the middle one is the argument.

     LEFT     the return, as a preparer reads it — form, line, label, figure
     MIDDLE   why this figure is what it is
     RIGHT    the page it was read from, with the exact box lit up

   The rule the middle pane obeys: a trace never ends in a number without a
   parent. Extracted figures end at a rectangle on a document. Calculated ones
   unfold into steps, and every input in every step is itself a link — either to
   another line (which reopens this whole pane on that line) or to a source box.
   Locked figures end at a statute or an IRS record, and say so.
   ========================================================================== */

export function ReviewWorkspace({ ret }: { ret: TaxReturn }) {
  const fields = useFields(ret.id);
  const params = useSearchParams();
  const router = useRouter();
  const urlField = params.get("field");

  const [selectedId, setSelectedId] = React.useState<string>(urlField ?? fields[0]?.id ?? "");
  const [docId, setDocId] = React.useState<string | undefined>();
  const [boxId, setBoxId] = React.useState<string | undefined>();

  const selected = fields.find((f) => f.id === selectedId) ?? fields[0];

  /* Deep links land on a specific line (Challenge 04). */
  React.useEffect(() => {
    if (urlField && urlField !== selectedId && fields.some((f) => f.id === urlField)) {
      setSelectedId(urlField);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlField]);

  /* Selecting a line resets the source pane to that line's first source. */
  React.useEffect(() => {
    if (!selected) return;
    const first = selected.sources[0];
    setDocId(first?.docId);
    setBoxId(first?.boxId);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      router.replace(`/returns/${ret.id}/review?field=${id}`, { scroll: false });
    },
    [router, ret.id],
  );

  const showRef = React.useCallback((r: SourceRef) => {
    setDocId(r.docId);
    setBoxId(r.boxId);
  }, []);

  const doc = docId ? DOC_BY_ID[docId] : undefined;

  if (fields.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <EmptyState
            icon={<FileText className="h-4 w-4" />}
            title="No return lines prepared yet"
            body="Traceability is authored in depth for the Whitfield 2025 return. Open that one to see the full chain."
            action={
              <Link
                href="/returns/RTN-2025-0117/review"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-on"
              >
                Open the Whitfield return
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-0 xl:h-[calc(100dvh-98px)] xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,1.05fr)] xl:overflow-hidden">
      <FieldList fields={fields} selectedId={selected.id} onSelect={select} />
      <TracePane field={selected} ret={ret} onShowRef={showRef} activeRef={{ docId, boxId }} onSelectField={select} />
      <div className="flex min-h-0 flex-col border-line bg-canvas p-3 xl:border-l">
        {doc ? (
          <DocumentViewer
            doc={doc}
            highlight={boxId}
            className="min-h-[420px] flex-1"
            footer={
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11.5px] text-ink3">
                  {boxId ? <>Highlighted: box {boxId}</> : "Click any box to see what it feeds"}
                </span>
                <Link
                  href={`/returns/${ret.id}/documents?doc=${doc.id}`}
                  className="shrink-0 text-[12px] font-medium text-brand-ink hover:underline"
                >
                  Open in Documents
                </Link>
              </div>
            }
          />
        ) : (
          <Card className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<Lock className="h-4 w-4" />}
              title="No source document"
              body="This figure is calculated or fixed by statute. Its chain ends in the panel to the left, not on a page."
            />
          </Card>
        )}
      </div>
    </div>
  );
}

/* --- Left: the return ----------------------------------------------------- */

function FieldList({
  fields,
  selectedId,
  onSelect,
}: {
  fields: ReturnField[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = React.useState<"all" | "unresolved">("all");

  const shown = React.useMemo(
    () =>
      filter === "all"
        ? fields
        : fields.filter((f) => f.state !== "verified" && f.state !== "locked"),
    [fields, filter],
  );

  const sections = React.useMemo(() => {
    const m = new Map<string, ReturnField[]>();
    for (const f of shown) {
      const key = `${f.form} · ${f.section}`;
      m.set(key, [...(m.get(key) ?? []), f]);
    }
    return [...m.entries()];
  }, [shown]);

  const unresolved = fields.filter((f) => f.state !== "verified" && f.state !== "locked").length;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = shown.findIndex((f) => f.id === selectedId);
    const next = e.key === "ArrowDown" ? Math.min(shown.length - 1, i + 1) : Math.max(0, i - 1);
    if (shown[next]) onSelect(shown[next].id);
  };

  return (
    <div
      className="flex max-h-[52vh] min-h-0 flex-col border-b border-line bg-surface xl:max-h-none xl:border-b-0 xl:border-r"
      onKeyDown={onKey}
    >
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-ink">Return lines</span>
          <div className="flex rounded-md border border-line p-0.5">
            {(["all", "unresolved"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cx(
                  "rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                  filter === k ? "bg-raised text-ink" : "text-ink3 hover:text-ink",
                )}
              >
                {k === "all" ? `All ${fields.length}` : `Open ${unresolved}`}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-ink3">↑ ↓ to move between lines</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sections.map(([label, items]) => (
          <div key={label}>
            <div className="sticky top-0 z-10 bg-raised px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink3 hairline-b">
              {label}
            </div>
            <ul>
              {items.map((f) => {
                const on = f.id === selectedId;
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => onSelect(f.id)}
                      className={cx(
                        "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                        on ? "bg-brand-soft" : "hover:bg-raised",
                      )}
                    >
                      <span
                        className={cx(
                          "tnum mt-[3px] w-7 shrink-0 text-[11px] font-semibold",
                          on ? "text-brand-ink" : "text-ink4",
                        )}
                      >
                        {f.line}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx("block truncate text-[12.5px]", on ? "font-semibold text-ink" : "text-ink2")}>
                          {f.label}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={cx(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              f.state === "verified"
                                ? "bg-good"
                                : f.state === "ai-suggested"
                                  ? "bg-ai"
                                  : f.state === "needs-approval"
                                    ? "bg-warn"
                                    : f.state === "conflict"
                                      ? "bg-crit"
                                      : "bg-ink4",
                            )}
                          />
                          <span className="truncate text-[11px] text-ink3">{FIELD_STATE[f.state].short}</span>
                        </span>
                      </span>
                      <span className="tnum shrink-0 pt-[1px] text-[12px] font-medium text-ink">
                        {num(f.value)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {shown.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck className="h-4 w-4" />}
            title="Every line is settled"
            body="Nothing on this return is unverified, estimated or in conflict."
          />
        ) : null}
      </div>
    </div>
  );
}

/* --- Middle: the trace ---------------------------------------------------- */

function TracePane({
  field,
  ret,
  onShowRef,
  activeRef,
  onSelectField,
}: {
  field: ReturnField;
  ret: TaxReturn;
  onShowRef: (r: SourceRef) => void;
  activeRef: { docId?: string; boxId?: string };
  onSelectField: (id: string) => void;
}) {
  const { setFieldState, can, personId } = useSession();
  const me = useMe();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const meta = FIELD_STATE[field.state];
  const canEdit = can("edit.return-fields");

  React.useEffect(() => {
    setEditing(false);
    setDraft(String(field.value));
  }, [field.id, field.value]);

  const commit = (state: "verified", note?: string, value?: number) =>
    setFieldState(field.id, { state, by: personId, at: new Date().toISOString(), note, value });

  const delta = field.priorYearValue !== undefined ? field.value - field.priorYearValue : undefined;

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto bg-canvas">
      <div className="space-y-4 p-4">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink3">
            <span className="font-medium text-ink2">{field.form}</span>
            <span>·</span>
            <span>line {field.line}</span>
            <span>·</span>
            <ProvenanceChip provenance={field.provenance} />
          </div>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-ink">{field.label}</h2>

          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="tnum h-9 w-40 rounded-md border border-brand bg-surface px-2 text-right text-[17px] font-semibold text-ink outline-none"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const v = Number(draft);
                    if (!Number.isNaN(v)) commit("verified", "Edited by hand", v);
                    setEditing(false);
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <FieldValue value={field.value} state={field.state} size="lg" align="left" />
            )}

            {delta !== undefined && Math.abs(delta) > 0.005 ? (
              <Tip
                wide
                content={`Last year this line was ${money(field.priorYearValue!)}. Year-on-year movement is shown on every line that has a prior-year figure — it is the cheapest error check there is.`}
              >
                <span
                  className={cx(
                    "tnum inline-flex items-center gap-1 text-[12px] font-medium",
                    delta > 0 ? "text-ink2" : "text-ink2",
                  )}
                >
                  {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {delta > 0 ? "+" : "−"}
                  {money(Math.abs(delta))} vs {ret.taxYear - 1}
                </span>
              </Tip>
            ) : null}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <StateChip state={field.state} />
            {field.confidence !== undefined && field.state !== "locked" ? (
              <ConfidenceBadge value={field.confidence} />
            ) : null}
            {field.verifiedBy ? (
              <span className="text-[11.5px] text-ink3">
                by {field.verifiedBy === personId ? "you" : field.verifiedBy.replace("-", " ")}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-[12.5px] leading-relaxed text-ink3">{meta.meaning}</p>
        </div>

        {/* Conflict */}
        {field.conflict ? (
          <Card className="border-crit-line bg-crit-soft p-3.5">
            <SectionHeader
              icon={<GitCompareArrows className="h-3.5 w-3.5" />}
              title="Two sources disagree"
              hint={field.conflict.explanation}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ConflictOption
                label="On the return"
                sub={field.sources[0] ? DOC_BY_ID[field.sources[0].docId]?.name : "Documented figure"}
                value={field.value}
                recommended
                onPick={() => commit("verified", "Kept the documented figure")}
                disabled={!canEdit}
              />
              <ConflictOption
                label={field.conflict.otherLabel}
                sub="Not substantiated by a document"
                value={field.conflict.otherValue}
                onPick={() => commit("verified", "Took the client's figure", field.conflict!.otherValue)}
                disabled={!canEdit}
              />
            </div>
          </Card>
        ) : null}

        {/* Derivation */}
        {field.derivation && field.derivation.length > 0 ? (
          <Card className="p-3.5">
            <SectionHeader
              title="How this figure was reached"
              hint={
                field.derivation.length === 1
                  ? "One step. Every input below links to where it came from."
                  : `${field.derivation.length} steps, in order. Every input links to where it came from.`
              }
            />
            <ol className="mt-3 space-y-2.5">
              {field.derivation.map((step, i) => (
                <DerivationRow
                  key={i}
                  step={step}
                  index={i}
                  last={i === field.derivation!.length - 1}
                  onShowRef={onShowRef}
                  onSelectField={onSelectField}
                />
              ))}
            </ol>
          </Card>
        ) : null}

        {/* Sources */}
        {field.sources.length > 0 ? (
          <Card className="p-3.5">
            <SectionHeader
              title={field.sources.length === 1 ? "Read from this document" : `Read from ${field.sources.length} documents`}
              hint="Click one to light up the exact box it was read from."
            />
            <ul className="mt-3 space-y-1.5">
              {field.sources.map((s, i) => {
                const d = DOC_BY_ID[s.docId];
                const on = activeRef.docId === s.docId && activeRef.boxId === s.boxId;
                return (
                  <li key={i}>
                    <button
                      onClick={() => onShowRef(s)}
                      className={cx(
                        "flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
                        on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong hover:bg-raised",
                      )}
                    >
                      <FileText className={cx("mt-0.5 h-3.5 w-3.5 shrink-0", on ? "text-brand" : "text-ink4")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink">{d?.name ?? s.docId}</span>
                        <span className="mt-0.5 block font-mono text-[11.5px] text-ink3">{s.snippet}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-ink4">
                        p.{s.page} · box {s.boxId}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        {field.lockedReason ? (
          <div className="flex items-start gap-2 rounded-lg border border-line bg-raised px-3 py-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink4" />
            <p className="text-[12.5px] leading-relaxed text-ink2">
              <b className="font-semibold text-ink">Why this can&rsquo;t be edited.</b> {field.lockedReason}
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <Actions
          field={field}
          ret={ret}
          canEdit={canEdit}
          onEdit={() => setEditing(true)}
          onVerify={() => commit("verified", "Checked against source")}
        />

        <ConnectedRail links={linksFor("field", field.id, ret.id)} title="Connected to this line" />
      </div>
    </div>
  );
}

function ConflictOption({
  label,
  sub,
  value,
  recommended,
  onPick,
  disabled,
}: {
  label: string;
  sub?: string;
  value: number;
  recommended?: boolean;
  onPick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      className="rounded-lg border border-line bg-surface p-2.5 text-left transition-colors hover:border-brand disabled:pointer-events-none disabled:opacity-50"
    >
      <span className="flex items-center gap-1.5">
        <span className="text-[11.5px] font-medium text-ink2">{label}</span>
        {recommended ? (
          <Badge tone="good" size="sm">
            on the return
          </Badge>
        ) : null}
      </span>
      <span className="tnum mt-1 block text-[16px] font-semibold text-ink">{money(value)}</span>
      {sub ? <span className="mt-0.5 block truncate text-[11px] text-ink3">{sub}</span> : null}
    </button>
  );
}

function DerivationRow({
  step,
  index,
  last,
  onShowRef,
  onSelectField,
}: {
  step: DerivationStep;
  index: number;
  last: boolean;
  onShowRef: (r: SourceRef) => void;
  onSelectField: (id: string) => void;
}) {
  return (
    <li className="relative pl-7">
      <span className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-[10.5px] font-semibold text-ink3">
        {index + 1}
      </span>
      {!last ? <span className="absolute left-[10px] top-6 bottom-[-10px] w-px bg-line" /> : null}

      <p className="text-[12.5px] font-medium text-ink">{step.label}</p>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <code className="tnum rounded bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink2">
          {step.expression}
        </code>
        <span className="text-ink4">=</span>
        <span className={cx("tnum font-mono text-[13px] font-semibold", last ? "text-ink" : "text-ink2")}>
          {num(step.value)}
        </span>
      </div>

      {step.inputs && step.inputs.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {step.inputs.map((inp, i) => (
            <li key={i} className="flex items-baseline gap-1.5 text-[11.5px]">
              <CornerDownRight className="h-3 w-3 shrink-0 translate-y-[2px] text-ink4" />
              {inp.fieldId ? (
                <button onClick={() => onSelectField(inp.fieldId!)} className="aff-link text-brand-ink">
                  {inp.label}
                </button>
              ) : inp.ref ? (
                <button onClick={() => onShowRef(inp.ref!)} className="aff-link text-brand-ink">
                  {inp.label}
                </button>
              ) : (
                <span className="text-ink2">{inp.label}</span>
              )}
              <span className="tnum ml-auto shrink-0 font-mono text-ink3">{num(inp.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {step.note ? (
        <p className="mt-1.5 flex gap-1.5 rounded-md border border-line bg-raised px-2 py-1.5 text-[11.5px] leading-relaxed text-ink2">
          <Info className="mt-[1px] h-3 w-3 shrink-0 text-ink4" />
          {step.note}
        </p>
      ) : null}
    </li>
  );
}

function Actions({
  field,
  ret,
  canEdit,
  onEdit,
  onVerify,
}: {
  field: ReturnField;
  ret: TaxReturn;
  canEdit: boolean;
  onEdit: () => void;
  onVerify: () => void;
}) {
  const { can, setResume } = useSession();
  const locked = field.state === "locked";

  if (locked) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {field.state !== "verified" ? (
        <Button variant="primary" size="md" onClick={onVerify} disabled={!canEdit}>
          <Check className="h-3.5 w-3.5" />
          {field.state === "needs-approval"
            ? "Approve this estimate"
            : field.state === "ai-suggested"
              ? "Accept and verify"
              : "Mark verified"}
        </Button>
      ) : (
        <Badge tone="good" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
          Verified
        </Badge>
      )}
      <Button size="md" onClick={onEdit} disabled={!canEdit}>
        <Pencil className="h-3.5 w-3.5" />
        Change the figure
      </Button>
      {can("message.client") ? (
        <Link
          href={`/inbox?compose=${field.id}`}
          onClick={() =>
            setResume({
              label: `${field.form} line ${field.line}`,
              href: `/returns/${ret.id}/review?field=${field.id}`,
              note: "Review workspace",
            })
          }
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Ask the client
        </Link>
      ) : null}
      {!canEdit ? (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink3">
          <ShieldQuestion className="h-3.5 w-3.5" />
          Your role has read-only access to return figures.
        </span>
      ) : null}
    </div>
  );
}
