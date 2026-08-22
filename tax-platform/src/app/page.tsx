"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Blocks,
  Building2,
  CircleUser,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { DEMO_PERSONAS, FIRM, person } from "@/data/people";
import { ROLE_BY_ID } from "@/data/taxonomy";
import { STATS } from "@/data/store";
import { useSession } from "@/components/session";
import { Avatar, Badge, Button, cx, IconButton } from "@/components/ui";
import { CHALLENGES } from "@/data/challenges";
import type { RoleId } from "@/lib/types";

const HIGHLIGHT: Record<string, string> = {
  "priya-raman": "The main firm-side path. Start here.",
  "james-whitfield": "The main client-side path. Same return, plain language.",
  "ravi-chandra": "Never signed in before. Shows the first-run experience.",
  "dana-okafor": "Works at the firm and files her own return.",
  "tom-ferris": "Deliberately restricted. Shows how permissions are communicated.",
};

export default function FrontDoor() {
  const { switchTo, theme, setTheme } = useSession();
  const router = useRouter();

  const enter = (personId: string, roleId: RoleId) => {
    switchTo(personId, roleId);
    router.push(roleId === "admin" ? "/practice" : "/home");
  };

  const firm = DEMO_PERSONAS.filter((p) => ROLE_BY_ID[p.roleId].audience === "firm");
  const client = DEMO_PERSONAS.filter((p) => ROLE_BY_ID[p.roleId].audience === "client");

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_oklch,var(--canvas)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-3 px-5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-brand-on"
            style={{ background: "linear-gradient(150deg, var(--brand) 10%, oklch(0.44 0.17 282) 100%)" }}
            aria-hidden
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4">
              <path d="M3 12V5.6c0-.5.6-.8 1-.4l3 3.1c.3.3.7.3 1 0l3-3.1c.4-.4 1-.1 1 .4V12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-ink">Meridian</span>
          <span className="hidden text-[12.5px] text-ink3 sm:inline">· {FIRM.name}</span>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/system"
              className="hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink sm:flex"
            >
              <Blocks className="h-3.5 w-3.5" />
              Design decisions
            </Link>
            <IconButton
              label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconButton>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1080px] px-5 pb-24">
        {/* Hero */}
        <section className="py-14 sm:py-20">
          <Badge tone="ai" icon={<Sparkles className="h-3 w-3" />}>
            AI Engineer case study · working prototype
          </Badge>
          <h1 className="mt-4 max-w-3xl text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[46px]">
            A tax platform where every number
            <br className="hidden sm:block" /> can tell you where it came from.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink2">
            Ten challenges were set. They are not ten products — they are ten pressures on the same
            one. Meridian is a single greenfield platform built so that a CPA can defend any figure
            in two clicks, a client always knows the one thing they need to do next, and the AI in
            the middle is legible enough to be trusted rather than re-checked by hand.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {[
              [STATS.returns.toString(), "returns"],
              [STATS.documents.toLocaleString(), "documents"],
              ["6", "roles"],
              ["10", "challenges answered"],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink3">{k}</dt>
                <dd className="tnum mt-0.5 text-[22px] font-semibold leading-none text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Personas */}
        <section aria-labelledby="enter" className="scroll-mt-20" id="enter">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="enter" className="text-[17px] font-semibold tracking-tight text-ink">
                Pick a seat and go in
              </h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink2">
                The same application, seen from eight different places. You can switch at any time
                from the account button without signing out.
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={() => enter("priya-raman", "preparer")} className="hidden shrink-0 sm:inline-flex">
              Start as a CPA
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink3">
            <Building2 className="h-3.5 w-3.5" /> At the firm
          </h3>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {firm.map((p) => (
              <PersonaCard key={`${p.personId}-${p.roleId}`} {...p} onEnter={enter} />
            ))}
          </ul>

          <h3 className="mb-2 mt-6 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink3">
            <CircleUser className="h-3.5 w-3.5" /> As a client
          </h3>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {client.map((p) => (
              <PersonaCard key={`${p.personId}-${p.roleId}`} {...p} onEnter={enter} />
            ))}
          </ul>
        </section>

        {/* Challenge map */}
        <section className="mt-16">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">
            Where each challenge lives
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink2">
            One position per challenge, and the screen that argues for it. Every link opens the real
            prototype, not a mockup.
          </p>

          <ol className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {CHALLENGES.map((c) => (
              <li key={c.n}>
                <Link
                  href={c.href}
                  className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-raised sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-[11.5px] font-semibold text-ink3 group-hover:bg-brand-soft group-hover:text-brand-ink">
                    {c.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink">{c.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink2">
                      {c.position}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-brand-ink">
                    {c.where}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Real vs simulated */}
        <section className="mt-16 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-good-line bg-good-soft p-5">
            <h3 className="text-[13.5px] font-semibold text-good-ink">Genuinely wired up</h3>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-ink2">
              {[
                "The prioritisation engine — a real scoring function over 200+ returns, and it shows its reasons.",
                "Search — one index across returns, lines, documents, conversations and tasks.",
                "The traceability chain — every derivation reconciles; the arithmetic on the flagship return actually foots.",
                "Permissions — one function gates the internal/client boundary, and switching seats really re-filters the data.",
                "Every action mutates state: verify a figure, accept an AI suggestion, answer a question, upload a document.",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-good" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="text-[13.5px] font-semibold text-ink">Simulated, on purpose</h3>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-ink2">
              {[
                "No OCR. Source documents are drawn from structured fixtures, with per-box coordinates so highlighting is real.",
                "No model. AI output is authored JSON — the point was the interaction around it, not the inference.",
                "No backend, no auth. The dataset is generated from a fixed seed at build time.",
                "Edits live in memory for the session, so a reload always returns the scenario to its authored state.",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink4" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-10 text-[12px] leading-relaxed text-ink3">
          Fictional firm, fictional clients, invented figures. Nothing here is tax advice.
        </p>
      </main>
    </div>
  );
}

function PersonaCard({
  personId,
  roleId,
  onEnter,
}: {
  personId: string;
  roleId: RoleId;
  onEnter: (p: string, r: RoleId) => void;
}) {
  const p = person(personId);
  const role = ROLE_BY_ID[roleId];
  const note = HIGHLIGHT[personId];
  return (
    <li>
      <button
        onClick={() => onEnter(personId, roleId)}
        className={cx(
          "group flex h-full w-full flex-col rounded-xl border border-line bg-surface p-3.5 text-left transition-all duration-150",
          "hover:-translate-y-px hover:border-line-strong hover:shadow-e2",
        )}
      >
        <span className="flex items-center gap-2.5">
          <Avatar initials={p.initials} hue={p.hue} size={34} />
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
            <span className="block truncate text-[11.5px] text-ink3">{role.label}</span>
          </span>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-ink4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        </span>
        <span className="mt-2.5 block text-[12px] leading-relaxed text-ink2">{role.summary}</span>
        {note ? (
          <span className="mt-2.5 block rounded-md bg-raised px-2 py-1.5 text-[11.5px] leading-snug text-ink3">
            {note}
          </span>
        ) : null}
      </button>
    </li>
  );
}
