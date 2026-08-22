import { Suspense } from "react";
import { THREADS } from "@/data/store";
import { ThreadRoute } from "@/components/routes";

export function generateStaticParams() {
  return THREADS.map((t) => ({ id: t.id }));
}

export default function Page() {
  return (
    <Suspense>
      <ThreadRoute />
    </Suspense>
  );
}
