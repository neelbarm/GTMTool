import Link from "next/link";

/* A static host answers an unknown URL itself, so this page has to stand on its
   own outside the product shell — and it should still look like the product. */

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-md text-center">
        <span
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-[10px] text-brand-on"
          style={{ background: "linear-gradient(150deg, var(--brand) 10%, oklch(0.44 0.17 282) 100%)" }}
          aria-hidden
        >
          <svg viewBox="0 0 16 16" className="h-5 w-5">
            <path
              d="M3 12V5.6c0-.5.6-.8 1-.4l3 3.1c.3.3.7.3 1 0l3-3.1c.4-.4 1-.1 1 .4V12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.01em] text-ink">
          Nothing lives at this address
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">
          The link may be mistyped, or it may point at a return that this
          prototype doesn&rsquo;t carry. Every return and conversation in the demo
          is reachable from the front door.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-[13.5px] font-medium text-brand-on shadow-e1 transition-colors hover:bg-brand-hover"
          >
            Back to the front door
          </Link>
          <Link
            href="/home"
            className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-4 text-[13.5px] font-medium text-ink transition-colors hover:bg-raised"
          >
            Go to the app
          </Link>
        </div>
      </div>
    </main>
  );
}
