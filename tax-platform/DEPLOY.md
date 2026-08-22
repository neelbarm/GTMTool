# Hosting Meridian

There is nothing to configure. No environment variables, no database, no API
keys, no services to attach. Pick whichever of these is least effort for you.

---

## Netlify — drag and drop, ~20 seconds

Use **`meridian-netlify-drop.zip`**. It is the app already built: 611
pre-rendered pages, root-relative, with `netlify.toml` and `_redirects`
included.

1. Go to <https://app.netlify.com/drop>
2. Drag the zip (or the unzipped folder) onto the page.
3. That's the live URL.

No build runs, no repository is connected, and no account is strictly required
to get a preview link.

The same zip works unchanged on Cloudflare Pages (direct upload), Render
(static site), Surge, S3 + CloudFront, or any static host.

---

## Railway — from the source

Use **`meridian-source-railway.zip`**, which contains a `Dockerfile` and a
`railway.json`. Railway detects the Dockerfile and needs no further settings.
This runs the real Next.js server rather than a static export.

Either:

```bash
unzip meridian-source-railway.zip -d meridian && cd meridian
railway init && railway up
```

or push that folder to a GitHub repository and point a new Railway service at
it. If you deploy from *this* repository rather than the zip, set the service's
**root directory** to `tax-platform`, because the repo also contains an
unrelated project at its top level.

The container listens on `$PORT` and falls back to 3000 locally:

```bash
docker build -t meridian . && docker run -p 3000:3000 meridian
```

---

## Vercel

```bash
cd tax-platform && npx vercel
```

Framework auto-detects. Nothing else to answer.

---

## GitHub Pages

A workflow is already committed at `.github/workflows/pages.yml`. It builds and
uploads correctly today; the deploy step needs one repository setting that a
workflow token is not permitted to turn on by itself:

> **Settings → Pages → Build and deployment → Source: “GitHub Actions”**

Set that, then re-run the workflow (Actions → *Deploy Meridian to GitHub Pages*
→ Run workflow). It publishes to
`https://neelbarm.github.io/ProjectforPrettyGoodAIVoiceTester/`.

---

## Building the artifacts yourself

```bash
cd tax-platform
npm install

npm run dev            # http://localhost:3000
npm run build && npm start
npm run typecheck

npm run build:static   # → out/ , a root-relative static site
BASE_PATH=/my-sub-path npm run build:static   # when serving from a sub-path
```

`STATIC_EXPORT=1` (set by `build:static`) switches Next to export output and
pre-renders every return and conversation via `generateStaticParams`. `BASE_PATH`
exists only for hosts that serve from a sub-directory; leave it unset for
Netlify, Railway, Vercel and friends.
