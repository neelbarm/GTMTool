import type { NextConfig } from "next";

/* ============================================================================
   One codebase, two deployment shapes.

   By default this builds as a normal Next.js app (server-rendered dynamic
   routes, `next start`, Vercel). Setting STATIC_EXPORT=1 switches it to a fully
   pre-rendered static site so it can be served from GitHub Pages, which has no
   server — every return and every conversation is emitted as HTML at build
   time via `generateStaticParams`.

   BASE_PATH exists because Pages serves a project site from a sub-path
   (/<repo>/) rather than the domain root.
   ========================================================================== */

const isExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  ...(isExport
    ? {
        output: "export" as const,
        /* Pages resolves /foo/ to /foo/index.html; without this, deep links 404. */
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
