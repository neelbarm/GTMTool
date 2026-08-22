"use client";

import * as React from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* --- Surfaces ------------------------------------------------------------- */

export function Card({
  className,
  children,
  as: As = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <As
      className={cx("rounded-lg border border-line bg-surface shadow-e1", className)}
      {...rest}
    >
      {children}
    </As>
  );
}

export function SectionHeader({
  title,
  hint,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-ink">
          {icon ? <span className="text-ink3">{icon}</span> : null}
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-[12px] leading-relaxed text-ink3">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* --- Buttons -------------------------------------------------------------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex select-none items-center justify-center gap-1.5 rounded-md font-medium transition-[background-color,color,border-color,box-shadow] duration-100 disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-brand text-brand-on hover:bg-brand-hover shadow-e1",
  secondary: "border border-line bg-surface text-ink hover:bg-raised hover:border-line-strong",
  ghost: "text-ink2 hover:bg-raised hover:text-ink",
  danger: "border border-crit-line bg-crit-soft text-crit-ink hover:bg-crit hover:text-white hover:border-crit",
  ai: "border border-ai-line bg-ai-soft text-ai-ink hover:bg-ai hover:text-white hover:border-ai",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-7 px-2.5 text-[12px]",
  md: "h-8 px-3 text-[13px]",
  lg: "h-10 px-4 text-[14px]",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }
>(function Button({ variant = "secondary", size = "md", className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
      {...rest}
    />
  );
});

export function IconButton({
  label,
  className,
  active,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-100",
        active ? "bg-raised text-ink" : "text-ink3 hover:bg-raised hover:text-ink",
        className,
      )}
      {...rest}
    />
  );
}

/* --- Badges & chips ------------------------------------------------------- */

export type Tone = "neutral" | "brand" | "ai" | "good" | "warn" | "crit";

const TONE_SOFT: Record<Tone, string> = {
  neutral: "border-line bg-raised text-ink2",
  brand: "border-brand-line bg-brand-soft text-brand-ink",
  ai: "border-ai-line bg-ai-soft text-ai-ink",
  good: "border-good-line bg-good-soft text-good-ink",
  warn: "border-warn-line bg-warn-soft text-warn-ink",
  crit: "border-crit-line bg-crit-soft text-crit-ink",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-ink4",
  brand: "bg-brand",
  ai: "bg-ai",
  good: "bg-good",
  warn: "bg-warn",
  crit: "bg-crit",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  size = "md",
  title,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "h-[18px] px-1.5 text-[10.5px]" : "h-[22px] px-2 text-[11.5px]",
        TONE_SOFT[tone],
        className,
      )}
    >
      {icon ? <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Dot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  return <span className={cx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone], className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-raised px-1 font-sans text-[10.5px] font-medium text-ink3">
      {children}
    </kbd>
  );
}

/* --- Avatar --------------------------------------------------------------- */

export function Avatar({
  initials,
  hue,
  size = 24,
  ring,
  title,
}: {
  initials: string;
  hue: number;
  size?: number;
  ring?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        ring && "ring-2 ring-surface",
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.4),
        background: `oklch(0.92 0.045 ${hue})`,
        color: `oklch(0.38 0.115 ${hue})`,
      }}
    >
      {initials}
    </span>
  );
}

/* --- Tooltip (CSS-driven, no portal, works inside scroll panes) ----------- */

export function Tip({
  content,
  children,
  side = "top",
  className,
  wide,
  style,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "right";
  className?: string;
  wide?: boolean;
  style?: React.CSSProperties;
}) {
  const pos =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-1.5"
      : side === "bottom"
        ? "top-full left-1/2 -translate-x-1/2 mt-1.5"
        : "left-full top-1/2 -translate-y-1/2 ml-1.5";
  return (
    <span className={cx("group/tip relative inline-flex", className)} style={style}>
      {children}
      <span
        role="tooltip"
        className={cx(
          "pointer-events-none absolute z-50 hidden rounded-md border border-line bg-overlay px-2 py-1.5 text-[11.5px] leading-snug text-ink shadow-e2 group-hover/tip:block group-focus-within/tip:block",
          wide ? "w-64" : "w-max max-w-64",
          pos,
        )}
      >
        {content}
      </span>
    </span>
  );
}

/* --- Progress ------------------------------------------------------------- */

export function Meter({
  value,
  tone = "brand",
  className,
  height = 6,
  label,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  height?: number;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx("w-full overflow-hidden rounded-full bg-sunken", className)}
      style={{ height }}
    >
      <div
        className={cx("h-full rounded-full transition-[width] duration-500", TONE_DOT[tone])}
        style={{ width: `${v * 100}%` }}
      />
    </div>
  );
}

/* --- Segmented control ---------------------------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: React.ReactNode; count?: number; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx(
        "inline-flex items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-[6px] font-medium transition-colors duration-100",
              size === "sm" ? "h-6 px-2 text-[11.5px]" : "h-7 px-2.5 text-[12.5px]",
              on ? "bg-surface text-ink shadow-e1" : "text-ink3 hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span
                className={cx(
                  "tnum rounded-full px-1 text-[10.5px] font-semibold",
                  on ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink3",
                )}
              >
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* --- Disclosure ----------------------------------------------------------- */

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
}) {
  return (
    <details className={cx("group/disc", className)} open={defaultOpen}>
      <summary
        className={cx(
          "flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium text-ink2 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden",
          summaryClassName,
        )}
      >
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 shrink-0 text-ink4 transition-transform duration-150 group-open/disc:rotate-90"
          aria-hidden
        >
          <path d="M4 2.5 8 6l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {summary}
      </summary>
      <div className="a-fade-up">{children}</div>
    </details>
  );
}

/* --- Empty state ---------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-raised text-ink4">
          {icon}
        </div>
      ) : null}
      <p className="text-[13.5px] font-medium text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink3">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* --- Search input --------------------------------------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <div className={cx("relative flex items-center", className)}>
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink4" aria-hidden>
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-line bg-surface pl-8 pr-7 text-[13px] text-ink placeholder:text-ink4 focus:border-brand focus:outline-none"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded text-ink4 hover:bg-raised hover:text-ink"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/* --- Modal / sheet -------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className,
  align = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  className?: string;
  align?: "center" | "top";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className={cx(
        "fixed inset-0 z-[70] flex justify-center px-4",
        align === "center" ? "items-center py-10" : "items-start pt-[10vh] pb-10",
      )}
    >
      <div
        className="a-fade absolute inset-0 bg-[oklch(0.2_0.02_265_/_0.4)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx(
          "a-scale-in relative z-10 max-h-full w-full overflow-hidden rounded-xl border border-line bg-overlay shadow-e3",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* --- Misc ----------------------------------------------------------------- */

export function Hairline({ className }: { className?: string }) {
  return <div className={cx("h-px w-full bg-line", className)} />;
}

export function Stat({
  label,
  value,
  hint,
  tone,
  icon,
  onClick,
  active,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        {tone ? <Dot tone={tone} /> : null}
        <span className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-ink3">{label}</span>
        {icon ? <span className="ml-auto text-ink4">{icon}</span> : null}
      </div>
      <div className="tnum mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-ink">{value}</div>
      {hint ? <div className="mt-1.5 text-[12px] leading-snug text-ink3">{hint}</div> : null}
    </>
  );
  const cls = cx(
    "rounded-lg border bg-surface p-3.5 text-left transition-colors duration-100",
    active ? "border-brand ring-1 ring-brand" : "border-line",
    onClick && "hover:border-line-strong hover:bg-raised cursor-pointer",
  );
  return onClick ? (
    <button className={cls} onClick={onClick} aria-pressed={active}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
