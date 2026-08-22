import { Suspense } from "react";
import { RETURNS } from "@/data/store";
import { ReturnOverviewRoute } from "@/components/routes";

/** Pre-renders every return, so the whole product can ship as static HTML. */
export function generateStaticParams() {
  return RETURNS.map((r) => ({ id: r.id }));
}

export default function Page() {
  return (
    <Suspense>
      <ReturnOverviewRoute />
    </Suspense>
  );
}
