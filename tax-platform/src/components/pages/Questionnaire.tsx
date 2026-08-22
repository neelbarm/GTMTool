"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Check, CircleCheck, HelpCircle, History, PartyPopper } from "lucide-react";
import type { QuestionnaireItem, TaxReturn } from "@/lib/types";
import { Page, PageHeader } from "@/components/shell/AppShell";
import { useSession } from "@/components/session";
import { useQuestions } from "@/components/hooks";
import { Badge, Button, Card, cx, EmptyState, Meter, SectionHeader, Tip } from "@/components/ui";
import { plural } from "@/lib/format";

/* ============================================================================
   THE QUESTIONNAIRE  (Challenges 03 and 08)

   Two rules:

   1. Every question says why it is being asked, in the client's own interest.
      "Did you move states?" is an interrogation; "a move usually means two
      state returns instead of one, and we'd rather find that out now than in
      April" is a reason to answer.

   2. Questions reveal questions. Nothing that depends on an answer is visible
      before that answer exists — the form gets longer as you go, rather than
      opening as a wall.
   ========================================================================== */

export function Questionnaire({ ret }: { ret: TaxReturn }) {
  const questions = useQuestions(ret.id);
  const { audience } = useSession();

  const visible = React.useMemo(
    () =>
      questions.filter((q) => {
        if (!q.hiddenUnless) return true;
        const dep = questions.find((x) => x.id === q.hiddenUnless!.id);
        return dep?.answer === q.hiddenUnless.equals;
      }),
    [questions],
  );

  const answered = visible.filter((q) => q.status === "answered").length;
  const flagged = visible.filter((q) => q.status === "flagged");
  const sections = React.useMemo(() => {
    const m = new Map<string, QuestionnaireItem[]>();
    for (const q of visible) m.set(q.section, [...(m.get(q.section) ?? []), q]);
    return [...m.entries()];
  }, [visible]);

  if (questions.length === 0) {
    return (
      <Page>
        <Card>
          <EmptyState icon={<HelpCircle className="h-4 w-4" />} title="No questions on this return" />
        </Card>
      </Page>
    );
  }

  const done = answered === visible.length;

  return (
    <Page>
      <div className="mx-auto max-w-[760px]">
        <PageHeader
          challenge={audience === "client" ? "Challenge 03" : undefined}
          title={audience === "client" ? "A few questions about your year" : "Client questionnaire"}
          lede={
            audience === "client"
              ? "Each one says why we're asking. Answers save as you go — you can stop and come back."
              : "What the client was asked, why, and how they answered. Flagged answers are the ones that disagree with a document."
          }
        />

        <Card className="mb-5 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink">
              {done ? "All answered" : `${answered} of ${visible.length} answered`}
            </span>
            <span className="tnum text-[12px] text-ink3">
              {Math.round((answered / visible.length) * 100)}%
            </span>
          </div>
          <Meter className="mt-2" value={answered / visible.length} tone={done ? "good" : "brand"} />
          {flagged.length > 0 ? (
            <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-warn-ink">
              <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
              {plural(flagged.length, "answer")} {flagged.length === 1 ? "doesn't" : "don't"} match a
              document we hold. That&rsquo;s not a mistake — it just means we need to settle it before
              filing.
            </p>
          ) : null}
        </Card>

        {done && audience === "client" ? (
          <Card className="mb-5 flex items-start gap-3 border-good-line bg-good-soft p-4">
            <PartyPopper className="mt-0.5 h-4 w-4 shrink-0 text-good-ink" />
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-good-ink">That&rsquo;s everything.</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink2">
                Your accountant has been notified. You don&rsquo;t need to do anything else until
                they come back to you.
              </p>
              <Link
                href="/home"
                className="mt-2 inline-block text-[12.5px] font-medium text-brand-ink hover:underline"
              >
                Back to home
              </Link>
            </div>
          </Card>
        ) : null}

        <div className="space-y-5">
          {sections.map(([section, items]) => (
            <div key={section}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink3">
                {section}
              </h2>
              <div className="space-y-2.5">
                {items.map((q) => (
                  <QuestionCard key={q.id} q={q} readOnly={audience === "firm"} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function QuestionCard({ q, readOnly }: { q: QuestionnaireItem; readOnly: boolean }) {
  const { answer } = useSession();
  const [draft, setDraft] = React.useState(q.answer ?? "");

  React.useEffect(() => setDraft(q.answer ?? ""), [q.answer]);

  const answered = q.status === "answered";
  const flagged = q.status === "flagged";

  return (
    <Card
      className={cx(
        "a-fade-up p-4 transition-colors",
        flagged ? "border-warn-line" : answered ? "border-line" : "border-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-medium leading-snug text-ink">{q.question}</p>
        {answered ? (
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" />
        ) : flagged ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        ) : null}
      </div>

      <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-ink3">
        <HelpCircle className="mt-[2px] h-3.5 w-3.5 shrink-0" />
        <span>{q.why}</span>
      </p>

      {q.prefill ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-raised px-2 py-1 text-[11.5px] text-ink3">
          <History className="h-3 w-3" />
          Pre-filled from {q.prefill.from}. Change it if it&rsquo;s wrong.
        </p>
      ) : null}

      <div className="mt-3">
        {readOnly ? (
          <div className="flex items-center gap-2">
            <span
              className={cx(
                "rounded-md border px-2.5 py-1 text-[13px] font-medium",
                q.answer
                  ? flagged
                    ? "border-warn-line bg-warn-soft text-warn-ink"
                    : "border-line bg-raised text-ink"
                  : "border-dashed border-line text-ink4",
              )}
            >
              {q.answer ?? "Not answered yet"}
            </span>
            {flagged ? (
              <Tip wide content="The client's answer and the document on file give different figures. See the conflict on Schedule A line 11.">
                <Badge tone="warn" size="sm">
                  disagrees with a document
                </Badge>
              </Tip>
            ) : null}
          </div>
        ) : q.type === "yes-no" ? (
          <div className="flex gap-2">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => answer(q.id, opt)}
                className={cx(
                  "h-9 min-w-[76px] rounded-md border px-3 text-[13px] font-medium transition-colors",
                  q.answer === opt
                    ? "border-brand bg-brand text-brand-on"
                    : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised",
                )}
              >
                {q.answer === opt ? <Check className="mr-1 inline h-3.5 w-3.5" strokeWidth={3} /> : null}
                {opt}
              </button>
            ))}
          </div>
        ) : q.type === "choice" ? (
          <div className="flex flex-wrap gap-2">
            {(q.choices ?? []).map((opt) => (
              <button
                key={opt}
                onClick={() => answer(q.id, opt)}
                className={cx(
                  "h-9 rounded-md border px-3 text-[13px] font-medium transition-colors",
                  q.answer === opt
                    ? "border-brand bg-brand text-brand-on"
                    : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => draft && answer(q.id, draft)}
              placeholder={q.type === "money" ? "$0.00" : "Type your answer"}
              className="tnum h-9 w-48 rounded-md border border-line bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink4 focus:border-brand focus:outline-none aff-editable"
            />
            <Button size="sm" onClick={() => draft && answer(q.id, draft)}>
              Save
            </Button>
          </div>
        )}
      </div>

      {q.revealsIds && q.answer === "Yes" ? (
        <p className="mt-2.5 text-[11.5px] text-ink4">Answering yes added a follow-up question below.</p>
      ) : null}
    </Card>
  );
}
