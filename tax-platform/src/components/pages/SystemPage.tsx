"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Ban, Check, Contrast, Eye, Info, Palette, Ruler, Shapes, Type } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { CHALLENGES } from "@/data/challenges";
import { ROLES } from "@/data/taxonomy";
import { STAGES } from "@/data/taxonomy";
import { STATS } from "@/data/store";
import { AFFORDANCE_ORDER, FIELD_STATE, FieldValue, PROVENANCE, StateChip } from "@/components/affordance";
import { Badge, Button, Card, cx, SectionHeader, Segmented, Tip } from "@/components/ui";
import type { Capability, Provenance } from "@/lib/types";

/* The design system, written down where it can be checked rather than asserted. */

export function SystemPage() {
  return (
    <Page>
      <div className="mx-auto max-w-[900px]">
        <PageHeader
          title="The rules this product is built on"
          lede="Ten challenges, one product. This page is the argument: the interaction language, the status model, the role architecture, and the position taken on each brief — including what was deliberately not built."
        />

        <nav className="mb-8 flex flex-wrap gap-1.5">
          {[
            ["#affordance", "Affordance system"],
            ["#colour", "Colour"],
            ["#status", "Status model"],
            ["#roles", "Roles"],
            ["#type", "Type & density"],
            ["#challenges", "The ten positions"],
            ["#real", "Real vs simulated"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink2 transition-colors hover:border-line-strong hover:bg-raised hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>

        <Affordance />
        <Colour />
        <StatusModel />
        <Roles />
        <TypeAndDensity />
        <Positions />
        <RealVsSimulated />
      </div>
    </Page>
  );
}

/* --- 1 · Affordance ------------------------------------------------------- */

function Affordance() {
  const [mono, setMono] = React.useState(false);

  return (
    <Section
      id="affordance"
      icon={<Shapes className="h-4 w-4" />}
      title="The affordance system"
      lede="Hue encodes provenance — where a value came from. Ornament encodes affordance — what you may do to it. Ornament is the load-bearing one, because it survives greyscale, colour blindness and a bad monitor."
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-raised px-3 py-2.5">
        <Contrast className="h-3.5 w-3.5 shrink-0 text-ink3" />
        <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink2">
          The claim is that none of these states needs colour to be readable. Turn colour off and
          check it.
        </p>
        <Button size="sm" variant={mono ? "primary" : "secondary"} onClick={() => setMono((m) => !m)}>
          <Eye className="h-3.5 w-3.5" />
          {mono ? "Colour on" : "Drain the colour"}
        </Button>
      </div>

      <div className={cx("overflow-hidden rounded-lg border border-line", mono && "grayscale")}>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="hairline-b bg-raised">
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">State</th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">Specimen</th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">Ornament</th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">What it means</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {AFFORDANCE_ORDER.map((s) => (
              <tr key={s}>
                <td className="px-3 py-3 align-top">
                  <StateChip state={s} />
                </td>
                <td className="px-3 py-3 align-top">
                  <FieldValue value={18942.11} state={s} align="left" onActivate={() => {}} />
                </td>
                <td className="px-3 py-3 align-top text-[12px] text-ink2">{ORNAMENT[s]}</td>
                <td className="px-3 py-3 align-top text-[12.5px] leading-relaxed text-ink2">
                  {FIELD_STATE[s].meaning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">
        Every figure in the product renders through one <code className="rounded bg-sunken px-1 font-mono text-[11.5px]">FieldValue</code>{" "}
        component. That is the only reason a system like this survives to a tenth screen — if the
        rule lives in one place, a new screen cannot invent a seventh state by accident.
      </p>

      <SectionHeader
        className="mt-6"
        title="Provenance, shown separately"
        hint="Where a figure came from is a different question from what you may do to it, so it gets its own line rather than another colour."
      />
      <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {(Object.keys(PROVENANCE) as Provenance[]).map((p) => (
          <li key={p} className="flex items-start gap-2 rounded-md border border-line bg-surface px-2.5 py-2">
            <span className="mt-0.5 text-ink4">{PROVENANCE[p].icon}</span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium text-ink">{PROVENANCE[p].label}</span>
              <span className="block text-[12px] text-ink3">{PROVENANCE[p].blurb}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const ORNAMENT: Record<string, string> = {
  verified: "None — it is settled",
  "ai-suggested": "Solid underline",
  "needs-approval": "Solid underline, amber",
  conflict: "Double underline",
  editable: "Dashed underline",
  locked: "None, and the cursor refuses",
};

/* --- 2 · Colour ----------------------------------------------------------- */

const RESERVED: [string, string, string][] = [
  ["--brand", "Navigation and primary action", "brand"],
  ["--ai", "Machine-generated, not yet accepted", "ai"],
  ["--good", "Verified by a named person", "good"],
  ["--warn", "Awaiting a decision", "warn"],
  ["--crit", "Blocked, conflicting or overdue", "crit"],
];

function Colour() {
  return (
    <Section
      id="colour"
      icon={<Palette className="h-4 w-4" />}
      title="Colour is reserved, never decorative"
      lede="Five hues carry meaning and nothing else uses them. Everything else in the interface is a neutral, which is what lets a single violet underline mean something at a glance."
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {RESERVED.map(([token, meaning, tone]) => (
          <li key={token} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
            <span
              className="h-8 w-8 shrink-0 rounded-md"
              style={{ background: `var(${token})` }}
              aria-hidden
            />
            <span className="min-w-0">
              <code className="block font-mono text-[11.5px] text-ink3">{token}</code>
              <span className="block text-[12.5px] font-medium text-ink">{meaning}</span>
            </span>
          </li>
        ))}
      </ul>

      <SectionHeader
        className="mt-6"
        title="Chart colour was computed, not chosen"
        hint="Return stages are ordered, so the pipeline uses a single-hue sequential ramp — encoding an ordered sequence with arbitrary hues makes a chart lie about its own data. Both ramps were run through a colour-vision validator in light and dark."
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-[12px] font-medium text-ink">Sequential — ordered stages</p>
          <div className="mt-2 flex h-8 gap-[2px]">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="flex-1 rounded-[3px]" style={{ background: `var(--seq-${i})` }} />
            ))}
          </div>
          <ul className="mt-2.5 space-y-0.5 text-[11.5px] text-ink3">
            <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-good" />Lightness monotone, gaps ≥ 0.06</li>
            <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-good" />Light end clears the surface at 2.07:1</li>
            <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-good" />Single hue, spread 0°</li>
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-[12px] font-medium text-ink">Categorical — unordered comparison</p>
          <div className="mt-2 flex h-8 gap-[2px]">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="flex-1 rounded-[3px]" style={{ background: `var(--cat-${i})` }} />
            ))}
          </div>
          <ul className="mt-2.5 space-y-0.5 text-[11.5px] text-ink3">
            <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-good" />Worst deuteranopic pair ΔE 15.8</li>
            <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-good" />All four ≥ 3:1 against the surface</li>
            <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-good" />Chroma floor cleared in both themes</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 flex gap-2 rounded-md border border-line bg-raised px-3 py-2 text-[12px] leading-relaxed text-ink2">
        <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink4" />
        Dark mode is a separate set of steps validated against the dark surface, not an automatic
        inversion. Flipping a light palette produces colours that are technically present and
        practically unreadable.
      </p>
    </Section>
  );
}

/* --- 3 · Status ----------------------------------------------------------- */

function StatusModel() {
  return (
    <Section
      id="status"
      icon={<Ruler className="h-4 w-4" />}
      title="Six stages, and the test that keeps it at six"
      lede="If a state has no entry event and no exit event, it is not a stage — it is a blocker. That single test is what disqualifies “Open Items” and “Pending Review”, which is where most status models go wrong."
    >
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="hairline-b bg-raised">
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">Firm sees</th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">Client sees</th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">Enters when</th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">Leaves when</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {STAGES.map((s, i) => (
              <tr key={s.id}>
                <td className="px-3 py-2.5 align-top">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: `var(--seq-${Math.min(5, i + 1)})` }}
                    />
                    <span className="text-[12.5px] font-medium text-ink">{s.firmLabel}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 align-top text-[12.5px] text-ink2">{s.clientLabel}</td>
                <td className="px-3 py-2.5 align-top text-[12px] text-ink3">{s.entry}</td>
                <td className="px-3 py-2.5 align-top text-[12px] text-ink3">{s.exit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">
        Status is never rendered as a bare label. Everywhere it appears it appears as a triple —{" "}
        <b className="font-medium text-ink2">where it is · who acts next · what&rsquo;s in the way</b>{" "}
        — because the label alone is exactly what two audiences expand differently.
      </p>
    </Section>
  );
}

/* --- 4 · Roles ------------------------------------------------------------ */

const CAPS: { id: Capability; label: string }[] = [
  { id: "view.all-returns", label: "See every return" },
  { id: "edit.return-fields", label: "Edit figures" },
  { id: "verify.ai-output", label: "Accept AI output" },
  { id: "approve.return", label: "Approve" },
  { id: "file.return", label: "File" },
  { id: "message.client", label: "Message clients" },
  { id: "view.internal-notes", label: "See internal notes" },
  { id: "manage.staff", label: "Manage staff" },
];

function Roles() {
  return (
    <Section
      id="roles"
      icon={<Shapes className="h-4 w-4" />}
      title="Six roles, one product"
      lede="Roles differ in scope, capability and landing page. They never differ in shell, vocabulary or status model — that constraint is the only thing stopping this becoming six products."
    >
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="hairline-b bg-raised">
              <th className="sticky left-0 bg-raised px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink3">
                Role
              </th>
              {CAPS.map((c) => (
                <th key={c.id} className="px-2 py-2 text-center text-[10.5px] font-medium text-ink3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {ROLES.map((r) => (
              <tr key={r.id}>
                <td className="sticky left-0 bg-surface px-3 py-2.5">
                  <span className="block text-[12.5px] font-medium text-ink">{r.label}</span>
                  <Badge tone={r.audience === "firm" ? "brand" : "neutral"} size="sm">
                    {r.audience}
                  </Badge>
                </td>
                {CAPS.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 text-center">
                    {r.can.includes(c.id) ? (
                      <Check className="mx-auto h-3.5 w-3.5 text-good" strokeWidth={2.5} />
                    ) : (
                      <span className="mx-auto block h-3.5 w-3.5 text-ink4">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex gap-2 rounded-md border border-line bg-raised px-3 py-2 text-[12px] leading-relaxed text-ink2">
        <Ban className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink4" />
        A control a role can&rsquo;t use stays visible, greys out and explains itself on hover.
        A button that vanishes teaches nothing and reads as a bug — try the seasonal-staff seat and
        open a client thread.
      </p>
    </Section>
  );
}

/* --- 5 · Type ------------------------------------------------------------- */

function TypeAndDensity() {
  return (
    <Section
      id="type"
      icon={<Type className="h-4 w-4" />}
      title="Type and density"
      lede="A tax product is read in two modes — scanning a list of two hundred, and staring at one figure. The scale has to serve both without a density toggle."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink3">Scale</p>
          <ul className="mt-2 space-y-1.5">
            {[
              ["19px", "Page title", "text-[19px] font-semibold tracking-[-0.01em]"],
              ["14px", "Body and controls", "text-[14px]"],
              ["13px", "Dense rows", "text-[13px]"],
              ["12px", "Supporting detail", "text-[12px] text-ink2"],
              ["11px", "Labels and meta", "text-[11px] uppercase tracking-[0.05em] text-ink3"],
            ].map(([size, name, cls]) => (
              <li key={size} className="flex items-baseline gap-3">
                <code className="tnum w-10 shrink-0 font-mono text-[11px] text-ink4">{size}</code>
                <span className={cls}>{name}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink3">Two faces, two jobs</p>
          <p className="mt-2 text-[13px] text-ink2">
            Inter for the interface, with tabular figures switched on everywhere a number appears —
            every figure in a tax product is compared against the one above it.
          </p>
          <p className="tnum mt-2 font-medium text-ink">
            210,550.00
            <br />
            18,942.11
            <br />
            6,500.00
          </p>
          <p className="mt-3 text-[13px] text-ink2">
            IBM Plex Mono for anything that represents a source document, so a figure quoted from a
            form is visibly a quotation.
          </p>
          <p className="mt-2 font-mono text-[12.5px] text-ink">Box 1 — Wages, tips  168,400.00</p>
        </Card>
      </div>
    </Section>
  );
}

/* --- 6 · Positions -------------------------------------------------------- */

function Positions() {
  return (
    <Section
      id="challenges"
      icon={<Shapes className="h-4 w-4" />}
      title="The ten positions"
      lede="One position per brief, the argument for it, and the thing deliberately not built."
    >
      <ol className="space-y-3">
        {CHALLENGES.map((c) => (
          <li key={c.n}>
            <Card className="overflow-hidden">
              <div className="flex items-start gap-3 border-b border-line px-4 py-3">
                <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-[11.5px] font-semibold text-ink3">
                  {c.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-ink">{c.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink2">{c.position}</p>
                </div>
                <Link
                  href={c.href}
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand-ink hover:underline"
                >
                  {c.where}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2.5 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-ink2">{c.argument}</p>
                <p className="flex gap-2 rounded-md border border-line bg-raised px-2.5 py-2 text-[12px] leading-relaxed text-ink2">
                  <Ban className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink4" />
                  <span>
                    <b className="font-semibold text-ink">Not built, on purpose.</b> {c.tradeoff}
                  </span>
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* --- 7 · Real vs simulated ------------------------------------------------ */

function RealVsSimulated() {
  return (
    <Section id="real" icon={<Info className="h-4 w-4" />} title="What's real and what isn't">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-good-line bg-good-soft p-4">
          <h3 className="text-[13px] font-semibold text-good-ink">Genuinely wired up</h3>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-ink2">
            {[
              `The prioritisation engine — a real scoring function over ${STATS.returns} returns that exposes its own reasons.`,
              `One search index across ${STATS.returns} returns, ${STATS.documents.toLocaleString()} documents, ${STATS.threads} conversations and ${STATS.tasks} tasks.`,
              "The traceability chain: every derivation on the flagship return reconciles, and the return foots to the balance due.",
              "The internal/client boundary, enforced by one function in the data layer rather than by conditionals on nine screens.",
              "Every action mutates state and every screen re-reads it — verify a figure, accept a suggestion, answer a question, upload a document.",
              "Colour: both chart ramps were run through a colour-vision validator in light and dark before shipping.",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-good" />
                {x}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="text-[13px] font-semibold text-ink">Simulated, on purpose</h3>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-ink2">
            {[
              "No OCR. Source documents are drawn from structured fixtures with per-box coordinates, so highlighting is a real lookup against fake pages.",
              "No model. AI output is authored JSON in a fixed shape — the brief asked for the interaction around AI, not the inference.",
              "No backend and no auth. The dataset is generated from a fixed seed, so it is identical on every machine.",
              "Tax arithmetic is right where it is shown and stops before it would need a real engine — the rate tables are quoted, not implemented.",
              "Edits live in memory for the session. A reload returns every scenario to its authored state, which is what you want when eight people are clicking through the same demo.",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink4" />
                {x}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Section>
  );
}

/* --- Shell ---------------------------------------------------------------- */

function Section({
  id,
  icon,
  title,
  lede,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <div className="mb-3.5 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink3">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
          {lede ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink2">{lede}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
