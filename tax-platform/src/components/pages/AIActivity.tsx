"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Check,
  CircleHelp,
  FileSearch,
  GitCompareArrows,
  Lightbulb,
  MessageSquarePlus,
  PencilLine,
  Sparkles,
  Undo2,
} from "lucide-react";
import type { Evidence, Insight, InsightKind, TaxReturn } from "@/lib/types";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession } from "@/components/session";
import { useFields, useInsights } from "@/components/hooks";
import { DOC_BY_ID, FIELD_BY_ID } from "@/data/store";
import { ago, dateTime, money, pct, plural } from "@/lib/format";
import { Badge, Button, Card, cx, Disclosure, EmptyState, Meter, SectionHeader, Segmented, Tip, type Tone } from "@/components/ui";
import { ConfidenceBadge, ConfidenceGlyph } from "@/components/affordance";

/* ============================================================================
   AI ACTIVITY  (Challenge 10)

   Every insight answers the same five questions, always in this order:

       what it did · why · the evidence · what it is unsure about · what to do

   Two rules do most of the trust-building work:

   1. The uncertainty line is never omitted. One insight on this return says
      "none worth reporting — this is arithmetic against a published figure",
      and that is precisely what makes the other seven credible.

   2. Correction is a normal path, not an error state. Correcting a figure
      records who corrected it and what the model got wrong, and that record
      stays on the return rather than disappearing into a log.
   ========================================================================== */

const KIND_META: Record<InsightKind, { label: string; icon: React.ReactNode; tone: Tone }> = {
  recommendation: { label: "Recommendation", icon: <Lightbulb className="h-3.5 w-3.5" />, tone: "brand" },
  warning: { label: "Warning", icon: <AlertTriangle className="h-3.5 w-3.5" />, tone: "warn" },
  discrepancy: { label: "Discrepancy", icon: <GitCompareArrows className="h-3.5 w-3.5" />, tone: "crit" },
  "missing-document": { label: "Missing evidence", icon: <FileSearch className="h-3.5 w-3.5" />, tone: "warn" },
  optimisation: { label: "Opportunity", icon: <Sparkles className="h-3.5 w-3.5" />, tone: "good" },
};

type Filter = "open" | "resolved" | "all";

export function AIActivity({ ret }: { ret: TaxReturn }) {
  const insights = useInsights(ret.id);
  const fields = useFields(ret.id);
  const params = useSearchParams();
  const focus = params.get("insight");
  const [filter, setFilter] = React.useState<Filter>("open");
  const { audience } = useSession();

  const open = insights.filter((i) => i.status === "new");
  const resolved = insights.filter((i) => i.status !== "new");
  const shown = filter === "open" ? open : filter === "resolved" ? resolved : insights;

  const aiTouched = fields.filter((f) => f.provenance === "extracted" || f.provenance === "calculated").length;
  const humanChecked = fields.filter((f) => f.state === "verified").length;

  React.useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`insight-${focus}`);
    if (el) {
      setFilter("all");
      requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  }, [focus]);

  if (insights.length === 0) {
    return (
      <Page>
        <Card>
          <EmptyState
            icon={<Sparkles className="h-4 w-4" />}
            title="No AI activity on this return"
            body="AI output is authored in depth for the Whitfield 2025 return."
          />
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        challenge="Challenge 10"
        title="What Meridian did on this return"
        lede={
          audience === "client"
            ? "Everything our software noticed, in plain language — and what your accountant decided about each one. Nothing here goes on your return without a person agreeing to it."
            : "Eight findings. Each one shows its evidence, says what it is unsure about, and can be corrected without leaving the page. Nothing here is applied until you say so."
        }
        actions={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "Needs a decision", count: open.length },
              { value: "resolved", label: "Settled", count: resolved.length },
              { value: "all", label: "All", count: insights.length },
            ]}
          />
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink3">Figures Meridian produced</p>
            <p className="tnum mt-1 text-[22px] font-semibold leading-none text-ink">{aiTouched}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink3">Checked by a person</p>
            <p className="tnum mt-1 text-[22px] font-semibold leading-none text-ink">
              {humanChecked}
              <span className="text-[13px] font-normal text-ink3"> of {fields.length}</span>
            </p>
            <Meter className="mt-2" value={humanChecked / Math.max(1, fields.length)} tone="good" height={4} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink3">Corrections recorded</p>
            <p className="tnum mt-1 text-[22px] font-semibold leading-none text-ink">
              {insights.filter((i) => i.status === "corrected").length}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-snug text-ink3">
              Kept on the return, not swept into a log.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {shown.map((i) => (
          <InsightCard key={i.id} insight={i} returnId={ret.id} focused={focus === i.id} />
        ))}
        {shown.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Check className="h-4 w-4" />}
              title="Nothing waiting on a decision"
              body="Every finding on this return has been accepted, corrected or dismissed by a person."
            />
          </Card>
        ) : null}
      </div>
    </Page>
  );
}

/* --- The card ------------------------------------------------------------- */

function InsightCard({
  insight,
  returnId,
  focused,
}: {
  insight: Insight;
  returnId: string;
  focused: boolean;
}) {
  const { resolveInsight, personId, can, audience } = useSession();
  const [correcting, setCorrecting] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [note, setNote] = React.useState("");
  const meta = KIND_META[insight.kind];
  const settled = insight.status !== "new";
  const readOnly = audience === "client" || !can("verify.ai-output");

  const resolve = (status: "accepted" | "dismissed" | "asked-client", text: string) =>
    resolveInsight(insight.id, { status, by: personId, at: new Date().toISOString(), note: text });

  return (
    <Card
      id={`insight-${insight.id}`}
      className={cx(
        "scroll-mt-28 overflow-hidden transition-shadow",
        focused && "ring-2 ring-brand",
        settled && "opacity-[0.92]",
      )}
    >
      {/* Header — what it did */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-line px-4 py-3">
        <span
          className={cx(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
            meta.tone === "crit"
              ? "border-crit-line bg-crit-soft text-crit-ink"
              : meta.tone === "warn"
                ? "border-warn-line bg-warn-soft text-warn-ink"
                : meta.tone === "good"
                  ? "border-good-line bg-good-soft text-good-ink"
                  : "border-brand-line bg-brand-soft text-brand-ink",
          )}
        >
          {meta.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={meta.tone} size="sm">
              {meta.label}
            </Badge>
            <ConfidenceBadge value={insight.confidence} size="sm" />
            {insight.impact ? (
              <Badge tone="neutral" size="sm">
                {insight.impact.label} {money(insight.impact.amount)}
              </Badge>
            ) : null}
            <StatusPill status={insight.status} />
          </div>
          <h3 className="mt-1.5 text-[14.5px] font-semibold tracking-tight text-ink">{insight.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink2">{insight.summary}</p>
        </div>
      </div>

      <div className="space-y-3.5 px-4 py-3.5">
        {/* Evidence */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink3">
            What it&rsquo;s based on
          </p>
          <ul className="space-y-1.5">
            {insight.evidence.map((e, i) => (
              <EvidenceRow key={i} e={e} returnId={returnId} />
            ))}
          </ul>
        </div>

        {/* Why — folded, because most people don't need it most of the time */}
        <Disclosure
          summary={`How it got there · ${plural(insight.reasoning.length, "step")}`}
          className="rounded-md border border-line bg-raised px-3 py-2"
        >
          <ol className="mt-2 space-y-1.5">
            {insight.reasoning.map((r, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink2">
                <span className="tnum shrink-0 font-semibold text-ink4">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ol>
          <p className="mt-2.5 border-t border-line pt-2 text-[11px] text-ink4">
            {insight.model} · run {dateTime(insight.at)}
          </p>
        </Disclosure>

        {/* Uncertainty — never collapsed, never omitted */}
        <div className="flex gap-2.5 rounded-lg border border-ai-line bg-ai-soft px-3 py-2.5">
          <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ai-ink" />
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ai-ink">
              What it&rsquo;s not sure about
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">{insight.uncertainty}</p>
          </div>
        </div>

        {/* Resolution or actions */}
        {settled ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2.5">
            <Check className="h-3.5 w-3.5 shrink-0 text-good" />
            <p className="min-w-0 flex-1 text-[12.5px] text-ink2">
              <b className="font-medium text-ink">
                {insight.resolution?.by === personId ? "You" : (insight.resolution?.by ?? "").replace("-", " ")}
              </b>{" "}
              {insight.status === "accepted"
                ? "accepted this"
                : insight.status === "dismissed"
                  ? "dismissed this"
                  : insight.status === "corrected"
                    ? "corrected it"
                    : "asked the client"}
              {insight.resolution?.note ? ` — ${insight.resolution.note}` : ""}
              {insight.resolution?.correctedTo !== undefined
                ? ` Figure set to ${money(insight.resolution.correctedTo)}.`
                : ""}
            </p>
            {insight.resolution ? (
              <span className="shrink-0 text-[11.5px] text-ink4">{ago(insight.resolution.at)}</span>
            ) : null}
            {!readOnly ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  resolveInsight(insight.id, {
                    status: "accepted",
                    by: personId,
                    at: new Date().toISOString(),
                    note: "Reopened",
                  })
                }
                title="Reopening keeps the original decision in the history"
              >
                <Undo2 className="h-3 w-3" />
                Reopen
              </Button>
            ) : null}
          </div>
        ) : readOnly ? (
          <p className="rounded-lg border border-line bg-raised px-3 py-2.5 text-[12.5px] text-ink3">
            Your accountant will decide on this. Nothing changes on your return until they do.
          </p>
        ) : correcting ? (
          <CorrectionForm
            insight={insight}
            value={value}
            note={note}
            setValue={setValue}
            setNote={setNote}
            onCancel={() => setCorrecting(false)}
            onSubmit={() => {
              resolveInsight(insight.id, {
                status: "corrected",
                by: personId,
                at: new Date().toISOString(),
                note: note || "Corrected by hand",
                correctedTo: value === "" ? undefined : Number(value),
              });
              setCorrecting(false);
            }}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="md" onClick={() => resolve("accepted", insight.action.primary)}>
              <Check className="h-3.5 w-3.5" />
              {insight.action.primary}
            </Button>
            <Button size="md" onClick={() => resolve("dismissed", insight.action.secondary)}>
              <Ban className="h-3.5 w-3.5" />
              {insight.action.secondary}
            </Button>
            <Button size="md" variant="ghost" onClick={() => setCorrecting(true)}>
              <PencilLine className="h-3.5 w-3.5" />
              Correct it
            </Button>
            {insight.kind === "discrepancy" || insight.kind === "missing-document" ? (
              <Button size="md" variant="ghost" onClick={() => resolve("asked-client", "Asked the client")}>
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Ask the client
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}

function CorrectionForm({
  insight,
  value,
  note,
  setValue,
  setNote,
  onCancel,
  onSubmit,
}: {
  insight: Insight;
  value: string;
  note: string;
  setValue: (v: string) => void;
  setNote: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const field = insight.fieldId ? FIELD_BY_ID[insight.fieldId] : undefined;
  return (
    <div className="a-fade-up rounded-lg border border-ai-line bg-surface p-3.5">
      <SectionHeader
        icon={<PencilLine className="h-3.5 w-3.5" />}
        title="Correct it"
        hint="Your correction goes on the return and stays visible, along with what the model got wrong."
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        {field ? (
          <label className="block">
            <span className="block text-[11.5px] font-medium text-ink2">
              {field.form} line {field.line}
            </span>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={String(field.value)}
              className="tnum mt-1 h-8 w-full rounded-md border border-line bg-surface px-2 text-right text-[13px] text-ink focus:border-brand focus:outline-none"
            />
          </label>
        ) : (
          <div />
        )}
        <label className="block">
          <span className="block text-[11.5px] font-medium text-ink2">What did it get wrong?</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. matched the wrong lot — client sold a partial position"
            className="mt-1 h-8 w-full rounded-md border border-line bg-surface px-2 text-[13px] text-ink placeholder:text-ink4 focus:border-brand focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onSubmit}>
          Save the correction
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function EvidenceRow({ e, returnId }: { e: Evidence; returnId: string }) {
  const href = e.ref
    ? `/returns/${returnId}/documents?doc=${e.ref.docId}&box=${e.ref.boxId}`
    : e.fieldId
      ? `/returns/${returnId}/review?field=${e.fieldId}`
      : undefined;
  const doc = e.ref ? DOC_BY_ID[e.ref.docId] : undefined;

  const body = (
    <>
      <Tip
        content={
          e.strength === "strong"
            ? "Directly supports the finding."
            : e.strength === "supporting"
              ? "Consistent with it, but not sufficient alone."
              : "Weak — mentioned so you can weigh it yourself."
        }
      >
        <span className="mt-[3px] shrink-0">
          <ConfidenceGlyph
            value={e.strength === "strong" ? 0.95 : e.strength === "supporting" ? 0.8 : 0.5}
            tone={e.strength === "strong" ? "good" : e.strength === "supporting" ? "warn" : "crit"}
          />
        </span>
      </Tip>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium text-ink">{e.label}</span>
        <span className="block text-[12px] leading-relaxed text-ink3">{e.detail}</span>
        {doc ? <span className="mt-0.5 block truncate text-[11px] text-ink4">{doc.name}</span> : null}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex items-start gap-2.5 rounded-md border border-line bg-surface px-2.5 py-2 transition-colors hover:border-line-strong hover:bg-raised"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface px-2.5 py-2">{body}</div>
      )}
    </li>
  );
}

function StatusPill({ status }: { status: Insight["status"] }) {
  if (status === "new") return null;
  const map: Record<string, { label: string; tone: Tone }> = {
    accepted: { label: "Accepted", tone: "good" },
    dismissed: { label: "Dismissed", tone: "neutral" },
    corrected: { label: "Corrected by a person", tone: "warn" },
    "asked-client": { label: "Asked the client", tone: "brand" },
  };
  const m = map[status];
  return (
    <Badge tone={m.tone} size="sm">
      {m.label}
    </Badge>
  );
}
