"use client";

import * as React from "react";
import { AlertCircle, ArrowRight, Building2, CircleCheck, Landmark, UserRound } from "lucide-react";
import type { ActorSide, Blocker, StageId, TaxReturn } from "@/lib/types";
import { BLOCKER_COPY, STAGES, STAGE_BY_ID } from "@/data/taxonomy";
import { Badge, cx, Dot, Tip, type Tone } from "./ui";
import { daysUntil, plural } from "@/lib/format";

/* ============================================================================
   STATUS  (Challenge 06)

   The rule this file enforces: a stage label is never rendered on its own.
   Everywhere status appears, it appears as the same triple —

       where it is   ·   who acts next   ·   what's in the way

   A client and a reviewer looking at the same return see the same three facts.
   The words differ (`Review` / `A second CPA is checking it`) but the meaning
   and the underlying record do not, so neither can walk away with a different
   idea of what is happening.
   ========================================================================== */

export const SIDE_META: Record<ActorSide, { label: string; icon: React.ReactNode; tone: Tone }> = {
  client: { label: "the client", icon: <UserRound className="h-3.5 w-3.5" />, tone: "warn" },
  firm: { label: "us", icon: <Building2 className="h-3.5 w-3.5" />, tone: "brand" },
  irs: { label: "the IRS", icon: <Landmark className="h-3.5 w-3.5" />, tone: "neutral" },
};

export function OwnerChip({
  side,
  audience,
  name,
  size = "md",
}: {
  side: ActorSide;
  audience: "client" | "firm";
  name?: string;
  size?: "sm" | "md";
}) {
  const m = SIDE_META[side];
  const label =
    audience === "client"
      ? side === "client"
        ? "You"
        : side === "firm"
          ? "Your accountant"
          : "The IRS"
      : side === "client"
        ? (name ?? "Client")
        : side === "firm"
          ? (name ?? "Us")
          : "The IRS";
  return (
    <Badge tone={m.tone} icon={m.icon} size={size} title={`Next action sits with ${m.label}`}>
      {label}
    </Badge>
  );
}

/* --- The stage track ------------------------------------------------------ */

export function StageTrack({
  stage,
  audience,
  size = "md",
  className,
}: {
  stage: StageId;
  audience: "client" | "firm";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const current = STAGE_BY_ID[stage].index;
  const h = size === "sm" ? 4 : size === "lg" ? 8 : 6;
  return (
    <div className={cx("w-full", className)}>
      <div className="flex w-full items-center gap-[2px]">
        {STAGES.map((s) => {
          const done = s.index < current;
          const here = s.index === current;
          return (
            <Tip
              key={s.id}
              wide
              className="min-w-0 flex-1"
              content={
                <span className="block">
                  <b className="text-ink">{audience === "client" ? s.clientLabel : s.firmLabel}</b>
                  <span className="mt-1 block text-ink2">{s.definition}</span>
                  {audience === "firm" ? (
                    <span className="mt-1.5 block border-t border-line pt-1.5 text-[11px] text-ink3">
                      <b className="font-medium text-ink2">Enters:</b> {s.entry}
                      <br />
                      <b className="font-medium text-ink2">Leaves:</b> {s.exit}
                    </span>
                  ) : null}
                </span>
              }
            >
              <span
                aria-label={`${audience === "client" ? s.clientLabel : s.firmLabel}${here ? " — current" : done ? " — complete" : ""}`}
                className={cx(
                  "block w-full rounded-full transition-colors",
                  done ? "bg-brand" : here ? "bg-brand" : "bg-sunken",
                  here && "ring-2 ring-brand-line",
                )}
                style={{ height: h, opacity: done ? 0.45 : 1 }}
              />
            </Tip>
          );
        })}
      </div>
      {size !== "sm" ? (
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink3">
          <span className="font-medium text-ink2">
            {audience === "client" ? STAGE_BY_ID[stage].clientLabel : STAGE_BY_ID[stage].firmLabel}
          </span>
          <span className="tnum">
            Step {current + 1} of {STAGES.length}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* --- Blockers ------------------------------------------------------------- */

export function BlockerRow({
  blocker,
  audience,
  onOpen,
}: {
  blocker: Blocker;
  audience: "client" | "firm";
  onOpen?: () => void;
}) {
  const copy = BLOCKER_COPY[blocker.kind];
  const tone: Tone = blocker.severity === "high" ? "crit" : blocker.severity === "medium" ? "warn" : "neutral";
  const Cmp = onOpen ? "button" : "div";
  return (
    <Cmp
      {...(onOpen ? { onClick: onOpen, type: "button" as const } : {})}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-md border border-line bg-surface px-2.5 py-2 text-left",
        onOpen && "transition-colors hover:border-line-strong hover:bg-raised",
      )}
    >
      <Dot tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-ink">
          {audience === "client" ? copy.client : copy.firm}
        </span>
        <span className="block text-[11.5px] text-ink3">
          Outstanding {plural(Math.max(0, -daysUntil(blocker.since)), "day")} · with{" "}
          {SIDE_META[blocker.owner].label}
        </span>
      </span>
      {onOpen ? <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink4" /> : null}
    </Cmp>
  );
}

/* --- The composite status block ------------------------------------------- */

export function StatusSummary({
  ret,
  audience,
  ownerName,
  className,
  compact,
}: {
  ret: TaxReturn;
  audience: "client" | "firm";
  ownerName?: string;
  className?: string;
  compact?: boolean;
}) {
  const stage = STAGE_BY_ID[ret.stage];
  const blocked = ret.blockers.length > 0;
  const done = ret.stage === "accepted";
  return (
    <div className={cx("space-y-2.5", className)}>
      <StageTrack stage={ret.stage} audience={audience} size={compact ? "sm" : "md"} />
      <div className="flex flex-wrap items-center gap-1.5">
        {done ? (
          <Badge tone="good" icon={<CircleCheck className="h-3.5 w-3.5" />}>
            Nothing left to do
          </Badge>
        ) : (
          <>
            <span className="text-[12px] text-ink3">Next move:</span>
            <OwnerChip side={ret.owner} audience={audience} name={ownerName} />
          </>
        )}
        {blocked && !done ? (
          <Badge tone={ret.blockers.some((b) => b.severity === "high") ? "crit" : "warn"} icon={<AlertCircle className="h-3.5 w-3.5" />}>
            {plural(ret.blockers.length, "blocker")}
          </Badge>
        ) : null}
      </div>
      {!compact ? (
        <p className="text-[12.5px] leading-relaxed text-ink2">
          {audience === "client" ? stage.definition : stage.definition}
        </p>
      ) : null}
    </div>
  );
}

/** The one-line version used inside dense tables. */
export function StatusInline({
  ret,
  audience,
}: {
  ret: TaxReturn;
  audience: "client" | "firm";
}) {
  const stage = STAGE_BY_ID[ret.stage];
  const tone: Tone =
    ret.stage === "accepted" ? "good" : ret.blockers.some((b) => b.severity === "high") ? "crit" : ret.owner === "firm" ? "brand" : "warn";
  return (
    <Tip
      wide
      content={
        <span className="block">
          <b className="text-ink">{audience === "client" ? stage.clientLabel : stage.firmLabel}</b>
          <span className="mt-1 block text-ink2">{stage.definition}</span>
        </span>
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <Dot tone={tone} />
        <span className="whitespace-nowrap text-[12.5px] text-ink">
          {audience === "client" ? stage.clientLabel : stage.firmLabel}
        </span>
      </span>
    </Tip>
  );
}
