# Lineup

**Could a buyer pick you out of a lineup?**

Lineup is a sameness test for B2B homepage copy. Paste a headline and subhead and it tells you how much of it could sit on a competitor's site unchanged, tags every interchangeable phrase as evidence, checks whether the five parts of a real position are present, and helps you rewrite it. Then it puts your headline in front of real people in a running blind test and tells you how often they'd click it.

No AI. A ruler, and a crowd.

## Why

- Bain found only 4% of executives say their company's value proposition is strong and consistently understood.
- Wynter's 2026 differentiation study found 64% of B2B buyers can't tell vendors apart from their websites. In a blind test, buyers matched copy to brand at 1.86 out of 5. Chance is 1.0.
- TrustRadius found "unclear messaging about what they do" is a top-three reason buyers walk.

Everyone complains about pipeline. Sameness is the thing upstream of it that nobody measures. Lineup measures it.

## What it does

| Part | What you get |
|---|---|
| **Sameness index** | 0 to 100. The share of your words carried by interchangeable B2B phrases, weighted by how empty each is, plus a penalty per missing part, minus credit for checkable specifics. |
| **Evidence tags** | Every interchangeable phrase highlighted and numbered in your copy, with a reason. |
| **The five parts** | Who it's for, what it replaces, why you, the outcome, the proof. Present, partial, or missing. |
| **The index** | Add your headline to a shared corpus. Your score comes back as a percentile against everyone before you. |
| **The blind test** | Four real headlines from the index. Visitors pick the one they'd click. Each headline earns a buyer pick rate. |
| **The board** | Most picked and most generic, live. Pick rates are ranked by the lower bound of a Wilson interval, so one lucky showing never tops the board. |
| **Variants** | Submit a second version of your headline. Both compete against the field in the blind test, never against each other in the same lineup, and the page calls a winner once each has ten showings. |
| **Badges** | `/badge/:id.svg` shows a headline's sameness score and pick rate. Put it in a README or on a site. |
| **Open data** | `/api/export.csv` downloads the whole index with scores, parts and pick rates. |
| **The workbench** | Five plain-English slots assemble a specific headline and rescore it live. |

## The coach (optional, needs a Claude API key)

Everything above runs without any AI. If you want help rewriting, install the SDK and set a key, and a "Draft three with Claude" button appears in the workbench.

```sh
npm install          # pulls @anthropic-ai/sdk, the only optional dependency
ANTHROPIC_API_KEY=sk-ant-... npm start
```

The coach reads the ruler's findings (the tagged phrases and the missing parts), writes a three-sentence critique, fills the five slots as far as the copy allows, and drafts three rewrites from three angles: buyer-first, alternative-first, outcome-first. Every draft is scored by the same deterministic model before it is shown, so the ruler stays the judge. It never invents numbers or customers; where the copy has no proof it leaves a bracketed placeholder for you to fill.

| Variable | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | unset | Enables the coach |
| `COACH_MODEL` | `claude-opus-5-5` | Which Claude model drafts |
| `COACH_DAILY_CAP` | `200` | Rounds per day on this instance, so a public deploy has a known ceiling. Ten per hour per IP on top. |

## Run it

Needs Node 22.13 or newer (it uses the built-in SQLite). No npm install needed for the core. The only dependency, the Anthropic SDK, is optional and only for the coach.

```sh
git clone https://github.com/neelbarm/lineup
cd lineup
npm run seed     # 14 fictional composites so the blind test works on day one
npm start        # http://localhost:3000
npm test         # model and API tests
```

Data lives in `./data/lineup.sqlite`. Set `DATA_DIR` to put it elsewhere.

### Deploy

Anything that runs Node and keeps a disk works. The Dockerfile seeds and starts the server; mount a volume at `/data`.

```sh
docker build -t lineup .
docker run -p 3000:3000 -v lineup_data:/data -e ADMIN_TOKEN=change-me lineup
```

A `render.yaml` blueprint is included for Render (New, Blueprint, point it at the repo), and a `fly.toml` for Fly.io (`fly launch --copy-config`, create a volume named `lineup_data`, `fly deploy`). Railway and Render work the same way with a persistent disk.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `DATA_DIR` | `./data` | Where the SQLite file lives |
| `ADMIN_TOKEN` | unset | Enables `DELETE /api/entries/:id` with `Authorization: Bearer <token>` to hide spam |
| `TRUST_PROXY` | `0` | Set to `1` behind a reverse proxy so rate limits key on `X-Forwarded-For` |
| `LINEUP_SECRET` | generated | Signs lineup tokens. Generated once and stored in the database if unset. |

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/entries?limit=1000` | The index without full text. Each entry: `id, head, score, covered, parts, shows, picks, rate`. |
| `POST` | `/api/entries` | `{text, variantOf?}`. 12 to 400 characters. `variantOf` is an indexed entry id; the new entry joins its group. Returns `201` with the entry, or `200` with `duplicate: true`. 20 per hour per IP. |
| `GET` | `/api/entries/:id` | One entry with full text, stats, and its `variants` (every entry in its group). |
| `DELETE` | `/api/entries/:id` | Admin only. Hides the entry. |
| `GET` | `/api/lineup?exclude=id&seen=id,id` | Four random entries from four different groups, preferring ones the caller hasn't seen, plus a signed single-use `token` good for an hour. `exclude` removes that entry's whole group. |
| `POST` | `/api/votes` | `{token, pick, voter}`. The token must come from `/api/lineup`, so a vote can only be cast on a lineup the server served, once. One vote per voter per set of four. 300 per hour per IP. |
| `GET` | `/badge/:id.svg` | Badge. Green under 45, yellow to 69, red from 70. |
| `GET` | `/e/:id` | Share page with Open Graph tags (score and pick rate in the title), redirects to the app. Paste this link on LinkedIn. |
| `GET` | `/api/export.csv` | Everything, for analysis. |
| `POST` | `/api/coach` | `{text}`. Returns a critique, the five slots, and three scored rewrites. `503` when no key is configured. |
| `GET` | `/api/health` | `{ok, coach, entries, votes}` |

## How the score works

The model is one file, `lib/model.js`, used by both the page and the server so the number you see in the browser is the number that goes in the index.

1. **Lexicon match.** About 180 phrases that could sit on any B2B site, each weighted 0.3 to 1.0 by how empty it is. Longest match first, no overlaps.
2. **Emptiness.** Weighted matched words over total words, raised to 0.6 and scaled to 60 points, so the first few empty phrases cost more than the last few.
3. **Missing parts.** Ten points for each of the five parts that is missing, four if partial. A buyer counts as named when "for", "built for" or "helps" is followed by a phrase that could not describe every company: a proper noun, a number, an industry, a role, a trade, or a plural noun that is not on the generic list ("modern teams" and "businesses of all sizes" are not buyers). The other parts are detected by pattern: a named alternative, a concrete noun, an outcome with a number, proof with a number.
4. **Specifics credit.** Up to 15 points back for numbers, concrete nouns and proper nouns. Without a single number the credit is capped at 4 and 6 points are added, because a claim with no number is one a buyer cannot check.
5. Clamped to 0 to 100.

It cannot tell whether a claim is true. It rewards a specific lie. Treat it as a linter, not a judge.

## Contributing

The most valuable contributions are to the lexicon and the part detectors in `lib/model.js`. If you've seen a phrase on four different homepages, it belongs in the lexicon. If a real, specific headline scores badly, open an issue with the text and the score. Tests run with `npm test` and on every push through GitHub Actions. `test/golden.json` is a labelled set of forty fictional headlines; the model must keep every generic one above every specific one and each band inside its range. Change the model and the golden tests tell you what moved.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. The index data on the public instance is published under the same terms: download it, analyze it, cite it, link back.
