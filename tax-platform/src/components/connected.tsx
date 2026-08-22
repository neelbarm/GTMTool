"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Hash, Link2, ListChecks, MessageSquare, Sparkles, LayoutGrid } from "lucide-react";
import type { LinkedObject } from "@/data/store";
import { useSession } from "./session";
import { Card, cx, SectionHeader } from "./ui";

/* ============================================================================
   THE CONNECTED RAIL  (Challenge 04)

   Relationships are declared once in the data layer and rendered identically
   wherever you are. A document shows the return lines it feeds, the
   conversations about it and the tasks that reference it; a return line shows
   the documents behind it and the thread arguing about it.

   Following any of these links leaves a resume point, so the shell can offer a
   one-click way back to the workflow you stepped out of — even four hops later.
   ========================================================================== */

const ICON: Record<LinkedObject["type"], React.ReactNode> = {
  document: <FileText className="h-3.5 w-3.5" />,
  field: <Hash className="h-3.5 w-3.5" />,
  thread: <MessageSquare className="h-3.5 w-3.5" />,
  task: <ListChecks className="h-3.5 w-3.5" />,
  questionnaire: <ListChecks className="h-3.5 w-3.5" />,
  insight: <Sparkles className="h-3.5 w-3.5" />,
  return: <LayoutGrid className="h-3.5 w-3.5" />,
};

export function ConnectedRail({
  links,
  title = "Connected",
  resumeLabel,
  className,
  flat,
}: {
  links: LinkedObject[];
  title?: string;
  resumeLabel?: string;
  className?: string;
  flat?: boolean;
}) {
  const { setResume } = useSession();
  const pathname = usePathname();

  if (links.length === 0) return null;

  const body = (
    <>
      <SectionHeader
        icon={<Link2 className="h-3.5 w-3.5" />}
        title={title}
        hint="Everything attached to this object. Following one leaves a way back."
      />
      <ul className="mt-2.5 space-y-1">
        {links.map((l) => (
          <li key={`${l.type}-${l.id}`}>
            <Link
              href={l.href}
              onClick={() =>
                resumeLabel
                  ? setResume({ label: resumeLabel, href: pathname, note: "Pick up where you were" })
                  : undefined
              }
              className="group flex items-start gap-2.5 rounded-md border border-line bg-surface px-2.5 py-1.5 transition-colors hover:border-line-strong hover:bg-raised"
            >
              <span
                className={cx(
                  "mt-0.5 shrink-0",
                  l.type === "insight" ? "text-ai" : l.type === "thread" ? "text-brand" : "text-ink4",
                )}
              >
                {ICON[l.type]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink group-hover:text-brand-ink">
                  {l.label}
                </span>
                {l.sublabel ? (
                  <span className="block truncate text-[11px] text-ink3">{l.sublabel}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );

  if (flat) return <div className={className}>{body}</div>;
  return <Card className={cx("p-3.5", className)}>{body}</Card>;
}
