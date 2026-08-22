import type { RoleId } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Shown only once the client has finished setting up. */
  deferred?: boolean;
  exact?: boolean;
}

export type NavIcon =
  | "today"
  | "returns"
  | "inbox"
  | "tasks"
  | "clients"
  | "practice"
  | "documents"
  | "questions"
  | "system";

/* ============================================================================
   NAVIGATION BY ROLE  (Challenge 05)

   Same shell, same chrome, same ordering logic. What changes is the set — and
   it changes by *scope*, not by feature. A preparer and a reviewer see the same
   five destinations because they do the same job at different altitudes; an
   administrator swaps the work queue for the practice view because they never
   touch a return; a client gets four plainly-named places instead of five
   professional ones.

   Nothing is renamed between roles for its own sake. "Returns" is "Returns"
   everywhere, because a firm employee who also files personally has to move
   between both sides without relearning the map.
   ========================================================================== */

const FIRM_CORE: NavItem[] = [
  { href: "/home", label: "Today", icon: "today", exact: true },
  { href: "/returns", label: "Returns", icon: "returns" },
  { href: "/inbox", label: "Inbox", icon: "inbox" },
  { href: "/tasks", label: "My work", icon: "tasks" },
  { href: "/clients", label: "Clients", icon: "clients" },
];

export const NAV_BY_ROLE: Record<RoleId, NavItem[]> = {
  preparer: FIRM_CORE,
  reviewer: FIRM_CORE,
  seasonal: [
    { href: "/home", label: "Today", icon: "today", exact: true },
    { href: "/returns", label: "Returns", icon: "returns" },
    { href: "/tasks", label: "My work", icon: "tasks" },
  ],
  admin: [
    { href: "/practice", label: "Practice", icon: "practice", exact: true },
    { href: "/returns", label: "Returns", icon: "returns" },
    { href: "/clients", label: "Clients", icon: "clients" },
  ],
  individual: [
    { href: "/home", label: "Home", icon: "today", exact: true },
    { href: "/returns", label: "My return", icon: "returns", deferred: true },
    { href: "/documents", label: "Documents", icon: "documents", deferred: true },
    { href: "/questions", label: "Questions", icon: "questions", deferred: true },
    { href: "/inbox", label: "Messages", icon: "inbox", deferred: true },
  ],
  business: [
    { href: "/home", label: "Home", icon: "today", exact: true },
    { href: "/returns", label: "My returns", icon: "returns", deferred: true },
    { href: "/documents", label: "Documents", icon: "documents", deferred: true },
    { href: "/questions", label: "Questions", icon: "questions", deferred: true },
    { href: "/inbox", label: "Messages", icon: "inbox", deferred: true },
  ],
};

/* The contextual tabs inside a single return. Firm and client see different
   sets of the same object, never a different object. */

export interface TabItem {
  slug: string;
  label: string;
  audience: "any" | "firm";
  capability?: string;
}

export const RETURN_TABS: TabItem[] = [
  { slug: "", label: "Overview", audience: "any" },
  { slug: "review", label: "Review", audience: "firm" },
  { slug: "documents", label: "Documents", audience: "any" },
  { slug: "questions", label: "Questions", audience: "any" },
  { slug: "ai", label: "AI activity", audience: "any" },
  { slug: "tasks", label: "Tasks", audience: "any" },
  { slug: "activity", label: "History", audience: "any" },
];
