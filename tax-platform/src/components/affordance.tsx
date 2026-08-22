"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  GitCompareArrows,
  Lock,
  Pencil,
  Sparkles,
  Sigma,
  FileText,
  UserRound,
  Landmark,
  History,
} from "lucide-react";
import type { FieldState, Provenance } from "@/lib/types";
import { Badge, cx, Tip, type Tone } from "./ui";
import { money, pct } from "@/lib/format";

/* ============================================================================
   THE AFFORDANCE SYSTEM  (Challenge 08)

   Two encodings, kept strictly separate:

     HUE      says where the value came from and what state it is in
     ORNAMENT says what you are allowed to do to it

   Ornament is the load-bearing one, because it survives greyscale, colour
   blindness and a bad monitor:

     dashed underline   you can type here
     solid underline    something proposed this; you decide
     double underline   two sources disagree
     no underline       you cannot change this

   And a third rule that matters more than either: every state also carries a
   glyph and a word. Nothing in this product is distinguishable by colour alone.
   ========================================================================== */

export interface StateMeta {
  label: string;
  short: string;
  tone: Tone;
  icon: React.ReactNode;
  /** The class applied to the value itself. */
  ornament: string;
  /** Plain-language explanation, shown on hover and on /system. */
  meaning: string;
  editable: boolean;
}

const ICON = "h-3.5 w-3.5";

export const FIELD_STATE: Record<FieldState, StateMeta> = {
  verified: {
    label: "Verified by a person",
    short: "Verified",
    tone: "good",
    icon: <Check className={ICON} strokeWidth={2.5} />,
    ornament: "border-b border-transparent",
    meaning:
      "A named person checked this against its source and put their name to it. Editing it clears the verification.",
    editable: true,
  },
  "ai-suggested": {
    label: "Suggested by Meridian",
    short: "AI suggested",
    tone: "ai",
    icon: <Sparkles className={ICON} />,
    ornament: "aff-ai",
    meaning:
      "Meridian proposed this figure. It is on the return, but no person has confirmed it yet. It cannot be filed in this state.",
    editable: true,
  },
  "needs-approval": {
    label: "Needs approval",
    short: "Approve",
    tone: "warn",
    icon: <AlertTriangle className={ICON} />,
    ornament: "aff-ai border-b-[var(--warn-line)] hover:border-b-[var(--warn)] hover:bg-warn-soft",
    meaning:
      "An estimate or a judgement call. Someone with authority has to say yes before the return can move to review.",
    editable: true,
  },
  conflict: {
    label: "Sources disagree",
    short: "Conflict",
    tone: "crit",
    icon: <GitCompareArrows className={ICON} />,
    ornament:
      "border-b-[3px] border-double border-b-[var(--crit-line)] hover:border-b-[var(--crit)] hover:bg-crit-soft cursor-pointer",
    meaning:
      "Two sources give different answers. The return holds the better-evidenced one and says so, rather than silently picking.",
    editable: true,
  },
  editable: {
    label: "Editable",
    short: "Editable",
    tone: "neutral",
    icon: <Pencil className={ICON} />,
    ornament: "aff-editable",
    meaning: "A person enters this directly. Nothing has been proposed.",
    editable: true,
  },
  locked: {
    label: "Locked",
    short: "Locked",
    tone: "neutral",
    icon: <Lock className={ICON} />,
    ornament: "aff-locked",
    meaning:
      "Computed from other lines, fixed by statute, or read from an IRS record. Change what feeds it instead.",
    editable: false,
  },
};

export const PROVENANCE: Record<Provenance, { label: string; icon: React.ReactNode; blurb: string }> = {
  extracted: {
    label: "Read from a document",
    icon: <FileText className="h-3 w-3" />,
    blurb: "Lifted from a box on a source document.",
  },
  calculated: {
    label: "Calculated",
    icon: <Sigma className="h-3 w-3" />,
    blurb: "Derived from other figures on the return.",
  },
  "client-entered": {
    label: "Client answered",
    icon: <UserRound className="h-3 w-3" />,
    blurb: "Given by the client in the questionnaire.",
  },
  "preparer-entered": {
    label: "Preparer entered",
    icon: <Pencil className="h-3 w-3" />,
    blurb: "Typed in by firm staff.",
  },
  "prior-year": {
    label: "From last year",
    icon: <History className="h-3 w-3" />,
    blurb: "Carried forward from a previously filed return.",
  },
  "irs-record": {
    label: "IRS record",
    icon: <Landmark className="h-3 w-3" />,
    blurb: "Read from the IRS account transcript.",
  },
};

/* --- The chips ------------------------------------------------------------ */

export function StateChip({
  state,
  size = "md",
  showLabel = true,
}: {
  state: FieldState;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const m = FIELD_STATE[state];
  return (
    <Tip content={m.meaning} wide>
      <Badge tone={m.tone} icon={m.icon} size={size}>
        {showLabel ? m.short : ""}
      </Badge>
    </Tip>
  );
}

export function ProvenanceChip({ provenance }: { provenance: Provenance }) {
  const p = PROVENANCE[provenance];
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] text-ink3">
      <span className="text-ink4">{p.icon}</span>
      {p.label}
    </span>
  );
}

/* --- Confidence ----------------------------------------------------------- */

export function ConfidenceBadge({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const band = value >= 0.9 ? "High" : value >= 0.75 ? "Likely" : "Uncertain";
  const tone: Tone = value >= 0.9 ? "good" : value >= 0.75 ? "warn" : "crit";
  return (
    <Tip
      wide
      content={
        <>
          <b>{band} — {pct(value)}</b>
          <br />
          {value >= 0.9
            ? "Read cleanly from a labelled box. Spot-check it."
            : value >= 0.75
              ? "Inferred rather than read directly. Worth a look."
              : "An estimate or a contested reading. Check this one properly."}
        </>
      }
    >
      <span
        className={cx(
          "inline-flex items-center gap-1.5 rounded-full border px-1.5 font-medium",
          size === "sm" ? "h-[18px] text-[10.5px]" : "h-[22px] text-[11.5px]",
          tone === "good"
            ? "border-good-line bg-good-soft text-good-ink"
            : tone === "warn"
              ? "border-warn-line bg-warn-soft text-warn-ink"
              : "border-crit-line bg-crit-soft text-crit-ink",
        )}
      >
        <ConfidenceGlyph value={value} tone={tone} />
        {band}
      </span>
    </Tip>
  );
}

/** Three bars — readable without colour, and quicker to scan than a number. */
export function ConfidenceGlyph({ value, tone }: { value: number; tone: Tone }) {
  const filled = value >= 0.9 ? 3 : value >= 0.75 ? 2 : 1;
  const fill =
    tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--crit)";
  return (
    <svg viewBox="0 0 12 9" className="h-[9px] w-3 shrink-0" aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={i * 4.5}
          y={6 - i * 2.5}
          width="3"
          height={3 + i * 2.5}
          rx="1"
          fill={i < filled ? fill : "currentColor"}
          opacity={i < filled ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}

/* --- The value itself ----------------------------------------------------- */

/**
 * Every figure on every screen renders through this component. That is the
 * only way an affordance system actually stays consistent — if the rule lives
 * in one place, a new screen cannot invent a seventh state by accident.
 */
export function FieldValue({
  value,
  state,
  onActivate,
  selected,
  align = "right",
  size = "md",
  prefix,
  className,
  format = money,
}: {
  value: number;
  state: FieldState;
  onActivate?: () => void;
  selected?: boolean;
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
  prefix?: React.ReactNode;
  className?: string;
  format?: (n: number) => string;
}) {
  const m = FIELD_STATE[state];
  const interactive = Boolean(onActivate);
  const Cmp = interactive ? "button" : "span";
  return (
    <Cmp
      {...(interactive
        ? { onClick: onActivate, type: "button" as const, "aria-pressed": selected }
        : {})}
      className={cx(
        "tnum inline-flex items-center gap-1.5 rounded-[3px] px-1 font-medium leading-tight",
        size === "sm" ? "text-[12.5px]" : size === "lg" ? "text-[17px]" : "text-[13.5px]",
        align === "right" ? "justify-end text-right" : "text-left",
        m.ornament,
        state === "locked" ? "text-ink2" : "text-ink",
        selected && "bg-brand-soft ring-1 ring-brand-line",
        className,
      )}
      title={interactive ? `${m.label} — click to trace` : m.label}
    >
      {prefix}
      {format(value)}
      <span
        className={cx(
          "shrink-0",
          state === "verified"
            ? "text-good"
            : state === "ai-suggested"
              ? "text-ai"
              : state === "needs-approval"
                ? "text-warn"
                : state === "conflict"
                  ? "text-crit"
                  : "text-ink4",
        )}
        aria-hidden
      >
        {m.icon}
      </span>
      <span className="sr-only">{m.label}</span>
    </Cmp>
  );
}

/* --- The legend, used on /system and in the review pane's help ------------ */

export const AFFORDANCE_ORDER: FieldState[] = [
  "verified",
  "ai-suggested",
  "needs-approval",
  "conflict",
  "editable",
  "locked",
];
