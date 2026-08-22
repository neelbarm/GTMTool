"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Blocks,
  BookUser,
  ChevronRight,
  CornerUpLeft,
  FileText,
  Gauge,
  HelpCircle,
  Inbox,
  LayoutGrid,
  ListChecks,
  Lock,
  Menu,
  Moon,
  PanelsTopLeft,
  Search,
  Sun,
  Sparkles,
  X,
} from "lucide-react";
import { NAV_BY_ROLE, RETURN_TABS, type NavIcon } from "./nav";
import { CommandPalette } from "./CommandPalette";
import { RoleSwitcher } from "./RoleSwitcher";
import { useSession, useMe, useVisibleReturnIds } from "@/components/session";
import { useActiveReturn, useIsFirstRun, useMyReturns } from "@/components/hooks";
import { Avatar, Badge, cx, IconButton, Kbd, Tip } from "@/components/ui";
import { RETURN_BY_ID, THREAD_BY_ID, visibleThreads } from "@/data/store";
import { ROLE_BY_ID } from "@/data/taxonomy";
import { FIRM } from "@/data/people";
import { StatusInline } from "@/components/status";

const NAV_ICON: Record<NavIcon, React.ReactNode> = {
  today: <Gauge className="h-[15px] w-[15px]" />,
  returns: <LayoutGrid className="h-[15px] w-[15px]" />,
  inbox: <Inbox className="h-[15px] w-[15px]" />,
  tasks: <ListChecks className="h-[15px] w-[15px]" />,
  clients: <BookUser className="h-[15px] w-[15px]" />,
  practice: <PanelsTopLeft className="h-[15px] w-[15px]" />,
  documents: <FileText className="h-[15px] w-[15px]" />,
  questions: <HelpCircle className="h-[15px] w-[15px]" />,
  system: <Blocks className="h-[15px] w-[15px]" />,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "/" && !/input|textarea/i.test((e.target as HTMLElement)?.tagName ?? "")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => setDrawer(false), [pathname]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar
        onOpenSwitcher={() => setSwitcherOpen(true)}
        drawer={drawer}
        onCloseDrawer={() => setDrawer(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSearch={() => setPaletteOpen(true)} onMenu={() => setDrawer(true)} />
        <ResumeBar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <RoleSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}

/* --- Sidebar -------------------------------------------------------------- */

function Sidebar({
  onOpenSwitcher,
  drawer,
  onCloseDrawer,
}: {
  onOpenSwitcher: () => void;
  drawer: boolean;
  onCloseDrawer: () => void;
}) {
  const { roleId, audience, personId } = useSession();
  const me = useMe();
  const role = ROLE_BY_ID[roleId];
  const pathname = usePathname();
  const firstRun = useIsFirstRun();
  const mine = useMyReturns();
  const active = useActiveReturn();

  const items = NAV_BY_ROLE[roleId];
  const threads = React.useMemo(() => visibleThreads(audience), [audience]);
  const inboxCount = React.useMemo(
    () =>
      threads.filter(
        (t) =>
          t.status !== "resolved" &&
          (audience === "client" ? t.nextActionSide === "client" : t.nextActionOwner === personId),
      ).length,
    [threads, audience, personId],
  );

  const resolveHref = (href: string) => {
    if (audience !== "client") return href;
    if (href === "/documents") return active ? `/returns/${active.id}/documents` : "/returns";
    if (href === "/questions") return active ? `/returns/${active.id}/questions` : "/returns";
    if (href === "/returns" && mine.length === 1) return `/returns/${mine[0].id}`;
    return href;
  };

  const body = (
    <>
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Meridian — back to the front door">
          <Logo />
          <span className="flex flex-col leading-none">
            <span className="text-[14px] font-semibold tracking-tight text-ink">Meridian</span>
            <span className="mt-[3px] text-[10.5px] text-ink3">
              {audience === "firm" ? FIRM.name : "Tax filing"}
            </span>
          </span>
        </Link>
        <IconButton label="Close menu" className="ml-auto lg:hidden" onClick={onCloseDrawer}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-2" aria-label="Main">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const href = resolveHref(item.href);
            const hidden = firstRun && item.deferred;
            const on = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) ||
                (item.href === "/returns" && pathname.startsWith("/returns")) ||
                (item.href === "/documents" && pathname.includes("/documents")) ||
                (item.href === "/questions" && pathname.includes("/questions"));
            if (hidden) return null;
            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={cx(
                    "group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-100",
                    on ? "bg-brand-soft text-brand-ink" : "text-ink2 hover:bg-raised hover:text-ink",
                  )}
                >
                  <span className={cx("shrink-0", on ? "text-brand" : "text-ink4 group-hover:text-ink3")}>
                    {NAV_ICON[item.icon]}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.icon === "inbox" && inboxCount > 0 ? (
                    <span className="tnum rounded-full bg-brand px-1.5 text-[10.5px] font-semibold leading-[16px] text-brand-on">
                      {inboxCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        {firstRun ? (
          <p className="mx-2.5 mt-3 flex items-start gap-1.5 rounded-md border border-dashed border-line bg-raised px-2.5 py-2 text-[11.5px] leading-relaxed text-ink3">
            <Lock className="mt-[1px] h-3 w-3 shrink-0" />
            <span>Documents, questions and messages appear here once you&rsquo;ve set up.</span>
          </p>
        ) : null}

        {audience === "client" && mine.length > 1 && !firstRun ? (
          <div className="mt-5">
            <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink4">
              Your returns
            </p>
            <ul className="space-y-0.5">
              {mine.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/returns/${r.id}`}
                    className={cx(
                      "flex h-8 items-center gap-2 rounded-md px-2.5 text-[12.5px] transition-colors",
                      pathname.startsWith(`/returns/${r.id}`)
                        ? "bg-raised text-ink"
                        : "text-ink3 hover:bg-raised hover:text-ink",
                    )}
                  >
                    <span className="truncate">
                      {r.clientName === me.name ? "Personal" : r.clientName}
                    </span>
                    <span className="tnum ml-auto shrink-0 text-[11px] text-ink4">{r.taxYear}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-line p-2.5">
        <Link
          href="/system"
          className={cx(
            "mb-1.5 flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
            pathname === "/system" ? "bg-brand-soft text-brand-ink" : "text-ink3 hover:bg-raised hover:text-ink",
          )}
        >
          <span className="shrink-0 text-ink4">{NAV_ICON.system}</span>
          Design decisions
        </Link>
        <button
          onClick={onOpenSwitcher}
          className="flex w-full items-center gap-2.5 rounded-md border border-line bg-surface px-2 py-1.5 text-left transition-colors hover:border-line-strong hover:bg-raised"
        >
          <Avatar initials={me.initials} hue={me.hue} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold leading-tight text-ink">
              {me.name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-ink3">{role.label}</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink4" />
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[228px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {body}
      </aside>
      {drawer ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="a-fade absolute inset-0 bg-[oklch(0.2_0.02_265_/_0.45)]" onClick={onCloseDrawer} />
          <aside className="a-fade absolute inset-y-0 left-0 flex w-[262px] flex-col border-r border-line bg-surface shadow-e3">
            {body}
          </aside>
        </div>
      ) : null}
    </>
  );
}

function Logo() {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-brand-on"
      style={{ background: "linear-gradient(150deg, var(--brand) 10%, oklch(0.44 0.17 282) 100%)" }}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4">
        <path d="M3 12V5.6c0-.5.6-.8 1-.4l3 3.1c.3.3.7.3 1 0l3-3.1c.4-.4 1-.1 1 .4V12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* --- Top bar -------------------------------------------------------------- */

function TopBar({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const { theme, setTheme, audience } = useSession();
  const crumbs = useBreadcrumbs();
  const ret = useCurrentReturn();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_oklch,var(--canvas)_86%,transparent)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
        <IconButton label="Open menu" className="lg:hidden" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </IconButton>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-1 text-[13px]">
            {crumbs.map((c, i) => (
              <li key={c.href + i} className="flex min-w-0 items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink4" /> : null}
                {i === crumbs.length - 1 ? (
                  <span className="truncate font-semibold text-ink" aria-current="page">
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} className="aff-link truncate text-ink3 hover:text-ink">
                    {c.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <button
          onClick={onSearch}
          className="hidden h-8 items-center gap-2 rounded-md border border-line bg-surface pl-2.5 pr-1.5 text-[12.5px] text-ink4 transition-colors hover:border-line-strong hover:text-ink3 md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="pr-8">Search everything</span>
          <Kbd>⌘K</Kbd>
        </button>
        <IconButton label="Search" className="md:hidden" onClick={onSearch}>
          <Search className="h-4 w-4" />
        </IconButton>

        <IconButton
          label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </IconButton>
      </div>

      {ret ? (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-line px-4 sm:px-5">
          <ReturnTabs returnId={ret.id} />
          <div className="ml-auto hidden shrink-0 items-center gap-2 py-2 pl-4 lg:flex">
            <StatusInline ret={ret} audience={audience} />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function ReturnTabs({ returnId }: { returnId: string }) {
  const pathname = usePathname();
  const { audience } = useSession();
  const base = `/returns/${returnId}`;
  return (
    <nav aria-label="Return sections" className="flex shrink-0 items-center gap-0.5">
      {RETURN_TABS.filter((t) => t.audience === "any" || t.audience === audience).map((t) => {
        const href = t.slug ? `${base}/${t.slug}` : base;
        const on = t.slug ? pathname === href : pathname === base;
        return (
          <Link
            key={t.slug}
            href={href}
            className={cx(
              "relative shrink-0 whitespace-nowrap px-2.5 py-2.5 text-[12.5px] font-medium transition-colors",
              on ? "text-ink" : "text-ink3 hover:text-ink",
            )}
          >
            {t.label}
            <span
              className={cx(
                "absolute inset-x-1.5 bottom-0 h-[2px] rounded-t-full transition-colors",
                on ? "bg-brand" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

/* --- Resume bar (Challenge 04) -------------------------------------------- */

function ResumeBar() {
  const { resume, setResume } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  if (!resume || pathname === resume.href.split("?")[0]) return null;
  return (
    <div className="a-fade flex items-center gap-2 border-b border-brand-line bg-brand-soft px-4 py-1.5 text-[12.5px] sm:px-5">
      <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
      <span className="min-w-0 flex-1 truncate text-brand-ink">
        You stepped away from <b className="font-semibold">{resume.label}</b>
        {resume.note ? <span className="text-ink3"> · {resume.note}</span> : null}
      </span>
      <button
        onClick={() => {
          router.push(resume.href);
          setResume(null);
        }}
        className="shrink-0 rounded-md border border-brand-line bg-surface px-2 py-0.5 text-[12px] font-medium text-brand-ink transition-colors hover:bg-brand hover:text-brand-on"
      >
        Go back
      </button>
      <IconButton label="Dismiss" onClick={() => setResume(null)} className="h-6 w-6 shrink-0">
        <X className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

/* --- Breadcrumbs ---------------------------------------------------------- */

function useCurrentReturn() {
  const pathname = usePathname();
  const m = /^\/returns\/([^/]+)/.exec(pathname);
  return m ? RETURN_BY_ID[m[1]] : undefined;
}

function useBreadcrumbs(): { label: string; href: string }[] {
  const pathname = usePathname();
  const { audience } = useSession();
  const me = useMe();
  const allow = useVisibleReturnIds();

  return React.useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return [{ label: "Meridian", href: "/" }];

    const out: { label: string; href: string }[] = [];
    const root = parts[0];

    const ROOT_LABEL: Record<string, string> = {
      home: audience === "firm" ? "Today" : "Home",
      returns: audience === "client" ? "My returns" : "Returns",
      inbox: audience === "client" ? "Messages" : "Inbox",
      tasks: "My work",
      clients: "Clients",
      practice: "Practice",
      system: "Design decisions",
    };
    out.push({ label: ROOT_LABEL[root] ?? root, href: `/${root}` });

    if (root === "returns" && parts[1]) {
      const r = RETURN_BY_ID[parts[1]];
      if (r) {
        const label =
          audience === "client" && r.clientName === me.name ? `${r.taxYear} return` : `${r.clientName} · ${r.taxYear}`;
        out.push({ label, href: `/returns/${r.id}` });
      }
      if (parts[2]) {
        const tab = RETURN_TABS.find((t) => t.slug === parts[2]);
        out.push({ label: tab?.label ?? parts[2], href: `/returns/${parts[1]}/${parts[2]}` });
      }
    }

    if (root === "inbox" && parts[1]) {
      const t = THREAD_BY_ID[parts[1]];
      if (t && allow.has(t.returnId)) out.push({ label: t.subject, href: `/inbox/${t.id}` });
    }

    return out;
  }, [pathname, audience, me.name, allow]);
}

/* --- Reusable page furniture ---------------------------------------------- */

export function PageHeader({
  title,
  lede,
  actions,
  meta,
  challenge,
}: {
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  challenge?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
          {challenge ? (
            <Tip content="Which brief this screen answers. Visible only in the prototype." wide>
              <Badge tone="ai" size="sm" icon={<Sparkles className="h-3 w-3" />}>
                {challenge}
              </Badge>
            </Tip>
          ) : null}
        </div>
        {lede ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink2">{lede}</p> : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cx("mx-auto w-full px-4 py-5 sm:px-5 sm:py-6", wide ? "max-w-[1480px]" : "max-w-[1180px]")}>
      {children}
    </div>
  );
}
