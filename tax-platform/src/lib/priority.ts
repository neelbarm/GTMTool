import { TODAY } from "@/data/generate";
import { STAGE_BY_ID } from "@/data/taxonomy";
import type { TaxReturn } from "./types";

/* ============================================================================
   PRIORITISATION  (Challenge 07)

   A dashboard is only worth opening if it can answer "what should I work on
   right now?" better than the person could answer it themselves. That means
   the ranking has to be (a) real, (b) about *actionability*, not just urgency,
   and (c) explainable — a preparer who can't see why something is at the top
   will not trust the list, and will go back to their spreadsheet.

   So every score carries its own reasons, and the UI shows them on demand.
   The one rule that shapes the whole thing: work you cannot start is not
   urgent, it is someone else's. A return leaves the queue and joins the chase
   list only when there is nothing left that this firm can do — being partly
   blocked on a client does not disqualify it, because there is usually still
   our own half to finish.
   ========================================================================== */

export interface ScoreReason {
  label: string;
  points: number;
  detail?: string;
}

export interface ScoredReturn {
  ret: TaxReturn;
  score: number;
  reasons: ScoreReason[];
  bucket: Bucket;
  daysToDue: number;
  /** True when the firm cannot progress it without someone else acting. */
  waiting: boolean;
}

export type Bucket = "now" | "week" | "scheduled" | "waiting" | "done";

export const BUCKET_META: Record<Bucket, { label: string; blurb: string }> = {
  now: { label: "Do now", blurb: "Work you can start today, on a clock." },
  week: { label: "This week", blurb: "Yours to move, and it will bite if it slips." },
  scheduled: { label: "Scheduled", blurb: "On track. No decision needed today." },
  waiting: { label: "Waiting on someone else", blurb: "Nothing here is yours to move. The only useful action is a nudge." },
  done: { label: "Filed", blurb: "Closed out this season." },
};

const DAY = 86_400_000;

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/**
 * The rule that decides whether a return belongs in the queue at all.
 *
 * A return can be waiting on a client AND still have work on our side — the
 * Whitfield return is exactly that: two things outstanding with the client, and
 * a review comment of our own. It only leaves the queue when there is nothing
 * left that this firm can do without someone else moving first.
 */
export function firmCanAct(ret: TaxReturn) {
  if (ret.stage === "filed" || ret.stage === "accepted") return false;
  if (ret.blockers.some((b) => b.owner === "firm")) return true;
  if (ret.blockers.length === 0) return STAGE_BY_ID[ret.stage].typicalOwner === "firm";
  return false;
}

export function scoreReturn(ret: TaxReturn, now: Date = TODAY): ScoredReturn {
  const reasons: ScoreReason[] = [];
  const daysToDue = daysBetween(now, new Date(ret.dueDate));

  if (ret.stage === "accepted" || ret.stage === "filed") {
    return { ret, score: 0, reasons: [], bucket: "done", daysToDue, waiting: false };
  }

  /* 1 — Deadline pressure. Deliberately non-linear: the last fortnight is
         worth more than the six weeks before it put together. */
  const deadline =
    daysToDue <= 3 ? 34
    : daysToDue <= 7 ? 28
    : daysToDue <= 14 ? 22
    : daysToDue <= 21 ? 16
    : daysToDue <= 35 ? 10
    : daysToDue <= 60 ? 5
    : 2;
  reasons.push({
    label: daysToDue < 0 ? `${Math.abs(daysToDue)} days past due` : `${daysToDue} days to deadline`,
    points: deadline,
    detail: ret.extended ? "Extended to 15 October" : "Statutory deadline 15 April 2026",
  });

  /* 2 — Can this person actually move it? */
  const actionable = firmCanAct(ret);
  if (actionable) {
    reasons.push({
      label: ret.owner === "firm" ? "The ball is with us" : "There is work here on our side",
      points: 18,
      detail:
        ret.owner === "firm"
          ? "Nothing external is blocking it."
          : "Waiting on someone else for part of it, but not all of it.",
    });
  }
  if (ret.owner === "client") {
    const oldest = ret.blockers
      .filter((b) => b.owner === "client")
      .map((b) => daysBetween(new Date(b.since), now))
      .sort((a, b) => b - a)[0];
    if (oldest !== undefined && oldest >= 7) {
      reasons.push({
        label: `Client has been sitting on this ${oldest} days`,
        points: 12,
        detail: "Needs a chase, not preparation time.",
      });
    }
  }

  /* 3 — Stage. Nearly-finished work is cheap to finish and expensive to drop. */
  const stagePts: Record<string, number> = { signoff: 12, review: 10, prepare: 8, intake: 4 };
  reasons.push({
    label: `In ${ret.stage}`,
    points: stagePts[ret.stage] ?? 0,
    detail:
      ret.stage === "signoff"
        ? "One signature from filed."
        : ret.stage === "review"
          ? "Late-stage work; a reviewer is already holding time for it."
          : undefined,
  });

  /* 4 — Effort against time remaining. Complex returns must start early. */
  if (ret.complexity >= 4 && daysToDue <= 30) {
    reasons.push({
      label: `Complexity ${ret.complexity}/5 with ${daysToDue} days left`,
      points: ret.complexity * 3,
      detail: "Too big to leave to the last week.",
    });
  }

  /* 5 — Severity of what's blocking it. */
  const high = ret.blockers.filter((b) => b.severity === "high").length;
  if (high > 0) {
    reasons.push({ label: `${high} high-severity blocker${high > 1 ? "s" : ""}`, points: high * 7 });
  }

  /* 6 — Escalations that outrank the schedule. */
  if (ret.flags.includes("irs-notice")) {
    reasons.push({ label: "Open IRS notice", points: 16, detail: "Statutory response windows are short." });
  }
  if (ret.flags.includes("vip")) {
    reasons.push({ label: "Key client", points: 6 });
  }
  if (ret.flags.includes("new-client")) {
    reasons.push({ label: "First year with us", points: 5, detail: "First impressions; no prior-year data to lean on." });
  }

  /* 7 — Staleness. Nothing rots faster than a return nobody has touched. */
  const idle = daysBetween(new Date(ret.lastActivity), now);
  if (idle >= 14) reasons.push({ label: `Untouched for ${idle} days`, points: 10 });
  else if (idle >= 7) reasons.push({ label: `Untouched for ${idle} days`, points: 5 });

  /* 8 — Unsettled AI findings. Cheap to clear, and they block review. */
  if (ret.unresolvedInsights > 0) {
    reasons.push({
      label: `${ret.unresolvedInsights} unsettled AI finding${ret.unresolvedInsights > 1 ? "s" : ""}`,
      points: Math.min(8, ret.unresolvedInsights * 2),
      detail: "A return can't be approved with these open.",
    });
  }

  /* 9 — Revenue at risk, capped so it can never outrank a deadline. */
  const feePts = Math.min(6, Math.round(ret.fee / 1200));
  if (feePts > 0) reasons.push({ label: `$${ret.fee.toLocaleString()} engagement`, points: feePts });

  const score = reasons.reduce((a, x) => a + x.points, 0);
  reasons.sort((a, b) => b.points - a.points);

  const waiting = !actionable;
  let bucket: Bucket;
  if (waiting) bucket = "waiting";
  else if (score >= 50 || daysToDue <= 7) bucket = "now";
  else if (score >= 36) bucket = "week";
  else bucket = "scheduled";

  return { ret, score, reasons, bucket, daysToDue, waiting };
}

/**
 * "At risk" needs its own definition because a shared statutory deadline makes
 * days-remaining useless on its own — every 1040 is due 15 April, so a naive
 * "due within a fortnight" filter reads zero all season and then everything at
 * once. What actually predicts trouble is a return still sitting early in the
 * process with the deadline in sight, plus anything carrying an IRS notice.
 */
export function isAtRisk(s: ScoredReturn) {
  if (s.bucket === "done") return false;
  if (s.ret.flags.includes("irs-notice")) return true;
  const early = s.ret.stage === "intake" || s.ret.stage === "prepare";
  return early && s.daysToDue <= 35;
}

export function rank(returns: TaxReturn[], now: Date = TODAY): ScoredReturn[] {
  return returns
    .map((r) => scoreReturn(r, now))
    .sort((a, b) => b.score - a.score || a.daysToDue - b.daysToDue);
}

export function bucketise(scored: ScoredReturn[]) {
  const out: Record<Bucket, ScoredReturn[]> = { now: [], week: [], scheduled: [], waiting: [], done: [] };
  for (const s of scored) out[s.bucket].push(s);
  return out;
}
