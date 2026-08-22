import { TODAY } from "@/data/generate";

/* Formatting is centralised so a figure looks identical on every screen — a
   number that changes shape between two views reads as two different numbers. */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (n: number) => USD.format(n);
export const money0 = (n: number) => USD0.format(n);
export const num = (n: number) => NUM.format(n);

export function compactMoney(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "−" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${n < 0 ? "−" : ""}$${Math.round(abs / 1_000)}k`;
  return USD0.format(n);
}

export function bytes(n: number) {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

const DATE = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const DATE_SHORT = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

export const date = (iso: string | Date) => DATE.format(new Date(iso));
export const dateShort = (iso: string | Date) => DATE_SHORT.format(new Date(iso));
export const dateTime = (iso: string | Date) =>
  `${DATE.format(new Date(iso))} at ${TIME.format(new Date(iso))}`;

const DAY = 86_400_000;

/** "3 days ago" — always relative to the pinned demo date, never Date.now(). */
export function ago(iso: string | Date) {
  const d = Math.round((TODAY.getTime() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "last week";
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  if (d < 365) return `${Math.round(d / 30)} months ago`;
  return `${Math.round(d / 365)} years ago`;
}

export function until(iso: string | Date) {
  const d = Math.round((new Date(iso).getTime() - TODAY.getTime()) / DAY);
  if (d < 0) return `${Math.abs(d)} ${Math.abs(d) === 1 ? "day" : "days"} overdue`;
  if (d === 0) return "due today";
  if (d === 1) return "due tomorrow";
  if (d < 14) return `due in ${d} days`;
  return `due ${dateShort(iso)}`;
}

export function daysUntil(iso: string | Date) {
  return Math.round((new Date(iso).getTime() - TODAY.getTime()) / DAY);
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Confidence is shown as a band first, a number second. */
export function confidenceBand(c: number): { label: string; tone: "good" | "warn" | "crit" } {
  if (c >= 0.9) return { label: "High confidence", tone: "good" };
  if (c >= 0.75) return { label: "Likely", tone: "warn" };
  return { label: "Needs a look", tone: "crit" };
}
