"use client";

import * as React from "react";
import { FileWarning, Minus, Plus, ScanSearch } from "lucide-react";
import type { SourceDoc } from "@/lib/types";
import { Badge, cx, IconButton, Tip } from "@/components/ui";
import { bytes, date, pct } from "@/lib/format";
import { ConfidenceBadge } from "./affordance";

/* ============================================================================
   The source pane.

   Documents are drawn from structured fixtures rather than rendered from PDFs,
   because the thing being tested is the LINK, not the rasteriser. Each box on
   a page carries a percentage rectangle, so highlighting a figure's source is a
   real coordinate lookup that survives zoom, dark mode and a phone screen —
   exactly as it would against a real OCR bounding box.
   ========================================================================== */

export function FacsimilePage({
  doc,
  highlight,
  onPick,
  zoom = 1,
  className,
}: {
  doc: SourceDoc;
  highlight?: string;
  onPick?: (boxId: string) => void;
  zoom?: number;
  className?: string;
}) {
  const f = doc.facsimile;

  if (!f) {
    return (
      <div className={cx("paper flex aspect-[17/22] items-center justify-center rounded-md", className)}>
        <span className="flex flex-col items-center gap-2 text-[12.5px] text-[oklch(0.5_0.01_265)]">
          <FileWarning className="h-5 w-5" />
          Still processing — no page to show yet.
        </span>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "paper relative aspect-[17/22] w-full overflow-hidden rounded-md border border-[oklch(0.82_0.008_95)] shadow-e1",
        className,
      )}
      style={{ fontSize: `${zoom * 100}%` }}
    >
      {/* Letterhead */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-[4%] pt-[2.5%]">
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.62em] font-medium leading-tight">{f.title}</p>
          <p className="font-mono text-[0.5em] leading-tight opacity-60">{f.subtitle}</p>
        </div>
        {f.omb ? <p className="shrink-0 font-mono text-[0.46em] opacity-55">{f.omb}</p> : null}
      </div>
      <div
        className="absolute inset-x-[4%] top-[7.5%] h-px"
        style={{ background: "oklch(0.75 0.01 95)" }}
      />

      {f.boxes.map((b) => {
        const on = b.id === highlight;
        return (
          <button
            key={b.id}
            type="button"
            onClick={onPick ? () => onPick(b.id) : undefined}
            data-box={b.id}
            aria-label={`${b.label}: ${b.value}`}
            className={cx(
              "absolute overflow-hidden rounded-[3px] border px-[0.5%] py-[0.3%] text-left transition-all duration-200",
              on
                ? "z-10 border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_16%,transparent)] ring-2 ring-[var(--brand)] ring-offset-1"
                : "border-[oklch(0.8_0.008_95)] hover:border-[oklch(0.6_0.01_95)] hover:bg-[oklch(0.96_0.01_95)]",
              onPick && "cursor-pointer",
            )}
            style={{
              left: `${b.rect.x}%`,
              top: `${b.rect.y}%`,
              width: `${b.rect.w}%`,
              height: `${b.rect.h}%`,
            }}
          >
            <span className="block truncate font-mono text-[0.42em] uppercase leading-tight opacity-60">
              {b.label}
            </span>
            <span
              className={cx(
                "mt-[0.2em] block whitespace-pre-line font-mono text-[0.62em] leading-snug",
                on && "font-semibold",
              )}
            >
              {b.value}
            </span>
          </button>
        );
      })}

      {/* Footer marks, so the page reads as a real form rather than a table */}
      <div className="absolute inset-x-[4%] bottom-[3%] flex items-end justify-between">
        <span className="font-mono text-[0.44em] opacity-45">
          Retained by Harbor Lane CPA · {doc.id}
        </span>
        <span className="font-mono text-[0.44em] opacity-45">Page 1</span>
      </div>

      {doc.status === "superseded" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="rotate-[-18deg] rounded border-[3px] px-6 py-2 font-mono text-[1.1em] font-bold uppercase tracking-widest"
            style={{ color: "oklch(0.55 0.19 25 / 0.5)", borderColor: "oklch(0.55 0.19 25 / 0.4)" }}
          >
            Superseded
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* --- Framed viewer with chrome -------------------------------------------- */

export function DocumentViewer({
  doc,
  highlight,
  onPick,
  footer,
  className,
}: {
  doc: SourceDoc;
  highlight?: string;
  onPick?: (boxId: string) => void;
  footer?: React.ReactNode;
  className?: string;
}) {
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => setZoom(1), [doc.id]);

  return (
    <div className={cx("flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-sunken", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-ink">{doc.name}</p>
          <p className="truncate text-[11px] text-ink3">
            {doc.issuer} · {date(doc.uploadedAt)} · {bytes(doc.bytes)}
          </p>
        </div>
        {doc.confidence > 0 ? <ConfidenceBadge value={doc.confidence} size="sm" /> : null}
        <div className="flex shrink-0 items-center rounded-md border border-line">
          <IconButton
            label="Zoom out"
            className="h-6 w-6 rounded-r-none"
            onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
          >
            <Minus className="h-3 w-3" />
          </IconButton>
          <span className="tnum w-9 text-center text-[11px] text-ink3">{Math.round(zoom * 100)}%</span>
          <IconButton
            label="Zoom in"
            className="h-6 w-6 rounded-l-none"
            onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))}
          >
            <Plus className="h-3 w-3" />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <FacsimilePage doc={doc} highlight={highlight} onPick={onPick} zoom={zoom} />
        {doc.pages > 1 ? (
          <p className="mt-2 text-center text-[11px] text-ink3">
            Showing page 1 of {doc.pages}. Remaining pages are not rendered in the prototype.
          </p>
        ) : null}
      </div>

      {footer ? <div className="shrink-0 border-t border-line bg-surface px-3 py-2">{footer}</div> : null}
    </div>
  );
}

export function DocStatusBadge({ doc }: { doc: SourceDoc }) {
  if (doc.status === "superseded")
    return (
      <Badge tone="crit" size="sm">
        superseded
      </Badge>
    );
  if (doc.status === "needs-review")
    return (
      <Badge tone="warn" size="sm">
        needs review
      </Badge>
    );
  if (doc.status === "processing")
    return (
      <Badge tone="ai" size="sm">
        reading…
      </Badge>
    );
  if (doc.status === "rejected")
    return (
      <Badge tone="crit" size="sm">
        rejected
      </Badge>
    );
  return null;
}

export function ExtractionNote({ doc }: { doc: SourceDoc }) {
  return (
    <Tip
      wide
      content={
        <>
          Meridian read {doc.facsimile?.boxes.length ?? 0} boxes from this document at{" "}
          {pct(doc.confidence)} average confidence. Click any box to see which return lines it feeds.
        </>
      }
    >
      <span className="inline-flex items-center gap-1 text-[11.5px] text-ink3">
        <ScanSearch className="h-3 w-3" />
        {doc.facsimile?.boxes.length ?? 0} fields read
      </span>
    </Tip>
  );
}
