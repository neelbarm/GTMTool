import type { Person } from "@/lib/types";

/* ============================================================================
   The demo personas. Five of these are switchable from the role menu.

   `dana-okafor` is the interesting one: she is a preparer at the firm AND has
   her own 1040 in the same system. That is the case Challenge 05 singles out,
   and it is why the shell separates "who you are" from "which side of the desk
   you are sitting on" rather than treating role as a property of the account.
   ========================================================================== */

export const PEOPLE: Person[] = [
  {
    id: "priya-raman",
    name: "Priya Raman",
    initials: "PR",
    email: "p.raman@harborlane.cpa",
    title: "Senior Tax Preparer",
    roles: ["preparer"],
    hue: 262,
    isDemoPersona: true,
  },
  {
    id: "marcus-webb",
    name: "Marcus Webb",
    initials: "MW",
    email: "m.webb@harborlane.cpa",
    title: "Review Partner, CPA",
    roles: ["reviewer"],
    hue: 195,
    isDemoPersona: true,
  },
  {
    id: "dana-okafor",
    name: "Dana Okafor",
    initials: "DO",
    email: "d.okafor@harborlane.cpa",
    title: "Tax Preparer",
    roles: ["preparer", "individual"],
    personalReturnId: "RTN-2025-0442",
    hue: 302,
    isDemoPersona: true,
  },
  {
    id: "elena-brandt",
    name: "Elena Brandt",
    initials: "EB",
    email: "e.brandt@harborlane.cpa",
    title: "Firm Administrator",
    roles: ["admin"],
    hue: 68,
    isDemoPersona: true,
  },
  {
    id: "tom-ferris",
    name: "Tom Ferris",
    initials: "TF",
    email: "t.ferris@harborlane.cpa",
    title: "Seasonal Preparer",
    roles: ["seasonal"],
    hue: 30,
    isDemoPersona: true,
  },
  {
    id: "james-whitfield",
    name: "James Whitfield",
    initials: "JW",
    email: "james@whitfieldco.com",
    title: "Client · Individual",
    roles: ["individual"],
    hue: 155,
    isDemoPersona: true,
  },
  {
    id: "nadia-solomon",
    name: "Nadia Solomon",
    initials: "NS",
    email: "nadia@sablecreek.io",
    title: "Client · Owner, Sable Creek Studio",
    roles: ["business", "individual"],
    hue: 12,
    isDemoPersona: true,
  },
  {
    id: "ravi-chandra",
    name: "Ravi Chandra",
    initials: "RC",
    email: "ravi.chandra@fastmail.com",
    title: "Client · New this year",
    roles: ["individual"],
    hue: 200,
    isDemoPersona: true,
  },
  /* Supporting cast — appear in threads and assignments, not switchable. */
  { id: "anna-liu", name: "Anna Liu", initials: "AL", email: "a.liu@harborlane.cpa", title: "Tax Preparer", roles: ["preparer"], hue: 220 },
  { id: "raj-mehta", name: "Raj Mehta", initials: "RM", email: "r.mehta@harborlane.cpa", title: "Tax Preparer", roles: ["preparer"], hue: 88 },
  { id: "sofia-alvarez", name: "Sofia Alvarez", initials: "SA", email: "s.alvarez@harborlane.cpa", title: "Senior Preparer", roles: ["preparer"], hue: 340 },
  { id: "ben-carter", name: "Ben Carter", initials: "BC", email: "b.carter@harborlane.cpa", title: "Reviewer, CPA", roles: ["reviewer"], hue: 170 },
  { id: "grace-kim", name: "Grace Kim", initials: "GK", email: "g.kim@harborlane.cpa", title: "Seasonal Preparer", roles: ["seasonal"], hue: 285 },
  { id: "system", name: "Meridian", initials: "M", email: "—", title: "System", roles: [], hue: 302 },
];

export const PERSON_BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p])) as Record<
  string,
  Person
>;

export function person(id: string): Person {
  return (
    PERSON_BY_ID[id] ?? {
      id,
      name: id,
      initials: id.slice(0, 2).toUpperCase(),
      email: "—",
      title: "—",
      roles: [],
      hue: 240,
    }
  );
}

export const FIRM = {
  name: "Harbor Lane CPA",
  product: "Meridian",
  staffCount: 38,
  seasonalCount: 11,
};

/** The five personas offered on the front door, in the order they're presented. */
export const DEMO_PERSONAS = [
  { personId: "priya-raman", roleId: "preparer" as const },
  { personId: "marcus-webb", roleId: "reviewer" as const },
  { personId: "james-whitfield", roleId: "individual" as const },
  { personId: "nadia-solomon", roleId: "business" as const },
  { personId: "elena-brandt", roleId: "admin" as const },
  { personId: "tom-ferris", roleId: "seasonal" as const },
  { personId: "dana-okafor", roleId: "preparer" as const },
  { personId: "ravi-chandra", roleId: "individual" as const },
];
