"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Ban, Check, CircleUser, Briefcase, Info } from "lucide-react";
import { DEMO_PERSONAS, person } from "@/data/people";
import { CAPABILITY_COPY, ROLE_BY_ID } from "@/data/taxonomy";
import { useSession } from "@/components/session";
import { Avatar, Badge, Button, cx, Modal } from "@/components/ui";
import type { RoleId } from "@/lib/types";

/**
 * Identity switching (Challenge 05).
 *
 * The list is grouped by which side of the desk a seat sits on, because that is
 * the distinction that actually changes the product. Dana Okafor appears in
 * both groups — one account, two seats — and switching between them keeps her
 * signed in, which is the whole point: an employee who also files personally
 * should never have to log out to look at their own return.
 */
export function RoleSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { personId, roleId, switchTo } = useSession();
  const router = useRouter();

  const seats = React.useMemo(() => {
    const rows: { personId: string; roleId: RoleId }[] = [];
    for (const p of DEMO_PERSONAS) {
      const per = person(p.personId);
      for (const r of per.roles) {
        if (!rows.some((x) => x.personId === p.personId && x.roleId === r)) {
          rows.push({ personId: p.personId, roleId: r });
        }
      }
    }
    return rows;
  }, []);

  const firm = seats.filter((s) => ROLE_BY_ID[s.roleId].audience === "firm");
  const client = seats.filter((s) => ROLE_BY_ID[s.roleId].audience === "client");

  const choose = (p: string, r: RoleId) => {
    switchTo(p, r);
    onClose();
    router.push(ROLE_BY_ID[r].id === "admin" ? "/practice" : "/home");
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="rs-title" className="max-w-[740px]">
      <div className="border-b border-line px-5 py-4">
        <h2 id="rs-title" className="text-[15px] font-semibold tracking-tight text-ink">
          Switch seat
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink3">
          One product, six roles. The shell, the status model and the interaction language never
          change — only what you can see and what you may do. Nothing below is a separate login.
        </p>
      </div>

      <div className="max-h-[62vh] overflow-y-auto p-4">
        <Group icon={<Briefcase className="h-3.5 w-3.5" />} label="At the firm">
          {firm.map((s) => (
            <SeatCard
              key={`${s.personId}-${s.roleId}`}
              personId={s.personId}
              roleId={s.roleId}
              active={s.personId === personId && s.roleId === roleId}
              onChoose={choose}
            />
          ))}
        </Group>
        <Group icon={<CircleUser className="h-3.5 w-3.5" />} label="As a client" className="mt-5">
          {client.map((s) => (
            <SeatCard
              key={`${s.personId}-${s.roleId}`}
              personId={s.personId}
              roleId={s.roleId}
              active={s.personId === personId && s.roleId === roleId}
              onChoose={choose}
            />
          ))}
        </Group>

        <div className="mt-5 flex gap-2.5 rounded-lg border border-brand-line bg-brand-soft p-3">
          <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
          <p className="text-[12.5px] leading-relaxed text-brand-ink">
            <b className="font-semibold">Dana Okafor appears twice.</b> She prepares returns at
            Harbor Lane and files her own 1040 through the same platform. Switching her seat keeps
            her signed in and swaps the whole experience — including hiding her own return from the
            firm-side queue she works in.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function Group({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink3">
        {icon}
        {label}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function SeatCard({
  personId,
  roleId,
  active,
  onChoose,
}: {
  personId: string;
  roleId: RoleId;
  active: boolean;
  onChoose: (p: string, r: RoleId) => void;
}) {
  const p = person(personId);
  const role = ROLE_BY_ID[roleId];
  const dual = p.roles.length > 1;
  return (
    <button
      onClick={() => onChoose(personId, roleId)}
      className={cx(
        "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-brand bg-brand-soft ring-1 ring-brand"
          : "border-line bg-surface hover:border-line-strong hover:bg-raised",
      )}
    >
      <Avatar initials={p.initials} hue={p.hue} size={32} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{p.name}</span>
          {active ? <Check className="h-3.5 w-3.5 shrink-0 text-brand" /> : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1">
          <Badge tone={role.audience === "firm" ? "brand" : "neutral"} size="sm">
            {role.label}
          </Badge>
          {dual ? (
            <Badge tone="ai" size="sm" title="This person holds more than one seat">
              dual seat
            </Badge>
          ) : null}
        </span>
        <span className="mt-1.5 block text-[11.5px] leading-relaxed text-ink3">{role.summary}</span>
      </span>
    </button>
  );
}

/**
 * Permissions are communicated where they bite, not in a settings page.
 * When a role can't do something, the control stays visible and says why —
 * a missing button teaches nothing and reads as a bug.
 */
export function PermissionGate({
  capability,
  children,
  label,
}: {
  capability: string;
  children: React.ReactNode;
  label?: string;
}) {
  const { can } = useSession();
  if (can(capability as never)) return <>{children}</>;
  const why = CAPABILITY_COPY[capability] ?? "Your role doesn't allow this.";
  return (
    <span className="group/pg relative inline-flex">
      <span className="pointer-events-none opacity-45 grayscale">{children}</span>
      <span className="absolute inset-0 cursor-not-allowed" aria-label={why} title={why} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-56 -translate-x-1/2 rounded-md border border-line bg-overlay px-2 py-1.5 text-[11.5px] leading-snug text-ink shadow-e2 group-hover/pg:block">
        <Ban className="mr-1 inline h-3 w-3 text-ink4" />
        {label ?? why}
      </span>
    </span>
  );
}

export function PermissionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 rounded-md border border-line bg-raised px-2.5 py-2 text-[12px] leading-relaxed text-ink2">
      <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink4" />
      <span>{children}</span>
    </p>
  );
}

export function useRoleSwitcher() {
  const [open, setOpen] = React.useState(false);
  return { open, setOpen };
}

export { Button };
