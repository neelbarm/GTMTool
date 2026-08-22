"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import type { TaxReturn } from "@/lib/types";
import { RETURN_BY_ID } from "@/data/store";
import { useVisibleReturnIds } from "@/components/session";
import { Card, EmptyState } from "@/components/ui";
import { Page } from "@/components/shell/AppShell";

/**
 * Scope is enforced once, here, rather than in seven page components.
 *
 * A return outside your scope does not 404 — it says plainly that it exists and
 * that this seat can't see it, because a silent "not found" is how people end
 * up believing data has been lost.
 */
export function WithReturn({ children }: { children: (ret: TaxReturn) => React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const allow = useVisibleReturnIds();
  const ret = RETURN_BY_ID[params.id];

  if (!ret) {
    return (
      <Page>
        <Card>
          <EmptyState
            title="No such return"
            body={`Nothing in this workspace has the id ${params.id}.`}
            action={<Link href="/returns" className="text-[13px] font-medium text-brand-ink hover:underline">Back to returns</Link>}
          />
        </Card>
      </Page>
    );
  }

  if (!allow.has(ret.id)) {
    return (
      <Page>
        <Card className="border-warn-line bg-warn-soft">
          <EmptyState
            icon={<ShieldAlert className="h-4 w-4" />}
            title="This return exists, but not for this seat"
            body={`${ret.clientName}'s ${ret.taxYear} return is assigned to someone else. Switch seat to a reviewer to see every return in the practice.`}
            action={<Link href="/returns" className="text-[13px] font-medium text-brand-ink hover:underline">Back to what you can see</Link>}
          />
        </Card>
      </Page>
    );
  }

  return <>{children(ret)}</>;
}
