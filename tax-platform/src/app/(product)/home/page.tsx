"use client";

import { useSession } from "@/components/session";
import { FirmToday } from "@/components/pages/FirmToday";
import { ClientHome } from "@/components/pages/ClientHome";

/**
 * One route, two products.
 *
 * The landing page is the clearest expression of the role architecture: the
 * URL, the shell, the search and the status vocabulary are identical for a CPA
 * and a client. What differs is the question the page answers — "what should I
 * work on?" against "what do you need from me?".
 */
export default function HomePage() {
  const { audience } = useSession();
  return audience === "firm" ? <FirmToday /> : <ClientHome />;
}
