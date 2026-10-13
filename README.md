# deskhand

**A Mac agent that does one workflow at a time, and shows you a diff before it touches anything.**

Apple has not shipped a personal agent that drives your apps for you. The open-source ones that exist on the Mac are general "do anything" assistants, and they fail on step five of a ten-step task with your email open. deskhand goes the other way: five narrow workflows I actually do by hand, each one reading the screen through the browser DOM or the macOS Accessibility tree, each one stopping at a **gate** that prints exactly what it is about to write and waits for `y`.

```
━━ Create Acme Analytics in HubSpot
  Source: https://acme.test
  Their homepage says something specific.
  • Series B, $40M, March 2026
  • Customers: Northwind, Globex
  name           Acme Analytics
  domain         acme.test
  one_liner      Revenue analytics for SaaS finance teams
  industry       Analytics
  location       Boston
  note           Met at SaaStr
  Proceed? [y/N/e]
```

`y` writes it. `n` stops. `e` lets you fix a field first. Every run leaves a log of what the agent saw, what it decided, and what you said.

## The five runbooks

| Runbook | Reads | Writes | Gate |
|---|---|---|---|
| `lead-to-crm` | A company name, URL, or the text you highlighted in any Mac app → web search → their homepage (→ LinkedIn, if you ask) | A company record in your CRM, created or updated | The record, as a diff against what the CRM already has |
| `inbox-triage` | Your inbox in the browser; opens only the threads that look like a real person asking for something | One task per ask, into Things, Apple Reminders, Notion, or a Markdown file | The task list |
| `onboarding-fill` | An intake email → a customer record | The vendor portal, page by page, then a row in your tracker (CSV or web form) | The record once, then every submit button |
| `portfolio-digest` | Each portfolio company's dashboard in your logged-in browser | A Markdown digest with week-over-week deltas and a screenshot per number | None needed: it only writes a local file |
| `lineup-to-site` | The winning headline from a [Lineup](https://github.com/neelbarm/GTMTool) blind test | Your CMS hero headline, as a **draft** | The before/after. It refuses to press anything called Publish |

```sh
deskhand run lead-to-crm --company "Acme Analytics" --note "Met at SaaStr"
deskhand run lead-to-crm --from-selection            # Mac: whatever you have highlighted
deskhand run inbox-triage --target things --limit 20
deskhand run onboarding-fill --intake ~/Desktop/northwind.txt --owner Neel
deskhand run portfolio-digest
deskhand run lineup-to-site --entry Xk3p9Qa          # a Lineup entry id
```

## Try it in two minutes, no accounts

Every runbook has a **demo** mode that runs it against built-in stand-ins for a CRM, a webmail inbox, a payroll portal, two dashboards, and a CMS, in a visible browser, so you can watch the whole thing happen on your machine.

```sh
git clone https://github.com/neelbarm/deskhand && cd deskhand
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npx deskhand doctor
npx deskhand demo lead-to-crm
```

`demo lineup-to-site` needs no key at all. The others use Claude for three things only: pulling a record out of page text, reading an ask out of an email, and finding a field when a label does not match. Everything else is deterministic, so the demo looks the same twice in a row.

## Pointing it at your real tools

1. `npx deskhand chrome` opens the agent's own Chrome profile (under `~/.deskhand/chrome`). Log in to your CRM, Gmail, dashboards, CMS. Close the window. The agent reuses those sessions from now on and never sees your main browser profile.
2. Copy `config/config.example.json` to `~/.deskhand/config.json` and fill in what you use.
3. Each runbook takes a **map** that says where the form lives and which label each field goes into. The examples in `config/` are the ones the demos use; `config/crm.hubspot.json` is a starting point for HubSpot.

A map for a CRM looks like this. Labels are matched against the accessible name of each control (label text, aria-label, placeholder), and when nothing matches the agent asks Claude to pick the field from the form's tree and logs what it chose.

```json
{
  "name": "HubSpot",
  "createUrl": "https://app.hubspot.com/contacts/PORTAL/objects/0-2/views/all/list",
  "searchUrl":  "https://app.hubspot.com/contacts/PORTAL/objects/0-2/views/all/list?query={q}",
  "openCreate": "Create company",
  "fields": { "domain": { "label": "Company domain name" }, "name": { "label": "Name" }, "industry": { "label": "Industry" } },
  "submitButton": "Create"
}
```

## How it works

```
runbook  ──►  snapshot()  ──►  [{ id, role, name, value, editable }, …]   the same shape from both backends
   │                                   │
   │          Claude, only for:        │  extract (page text → record)
   │                                   │  locate  (tree → which node)
   ▼                                   │  draft   (record → prose)
 gate()  ──►  diff + y/N/e  ──►  act(id)  ──►  verify  ──►  log
```

- **Two backends, one snapshot shape.** `core/backends/browser.js` drives Chrome through Playwright and flattens the DOM into a list of named nodes. `core/backends/ax.js` does the same for native apps through `mac/axq`, a 200-line Swift command over the Accessibility API. Runbooks never touch either API directly; they look nodes up by role and name and hand an id back.
- **The model is on a short leash.** It is called with a forced tool schema and never decides what to click next on its own. The runbooks are scripts; Claude fills in the parts that need reading.
- **Nothing is written without the gate.** `core/gate.js` is one function and every write path goes through it. `--yes` exists for workflows you have watched enough times, and that choice is logged too.
- **Every run is a JSONL log** under `~/.deskhand/runs/`. `deskhand log` prints the last one: what was on screen, what was extracted, which node was chosen, what you answered.

## Honest limits

- Built and tested on Linux against the fixture apps with a headless Chromium. The macOS helper (`mac/axq.swift`) is written against the documented API but has not been compiled on a Mac yet. See `mac/README.md`.
- The HubSpot map has not been run against a live portal. Gmail's DOM is hostile; `inbox-triage` reads rows by their accessible text and opens each thread, which works on Gmail's standard view but will need adjusting if Google moves things.
- Screen-driven agents are brittle by nature. That is why each runbook does one thing, verifies after every write, and leaves a log you can read when it goes wrong.

## Project layout

```
bin/deskhand.js        CLI: list · run · demo · log · doctor · fixtures · chrome
core/                  snapshot shape, gate, model wrapper, logging, two backends
runbooks/              the five workflows
config/                example maps for the CRM, forms, portfolio, CMS, and ~/.deskhand/config.json
mac/axq.swift          Accessibility helper (build with npm run build:mac)
test/fixtures/         the stand-in apps (also what `deskhand demo` and `deskhand fixtures` serve)
test/*.test.js         15 end-to-end tests that drive a real browser against the fixtures
```

```sh
npm test               # node --test, real Chromium, stub model
```

## Why

I built [Lineup](https://github.com/neelbarm/GTMTool) to score how generic B2B homepage copy is. The natural next question was whether the tool could also *change* the copy, which meant an agent that drives a CMS. Once that worked, the same four pieces (snapshot, locate, gate, log) covered the rest of the manual work I had been doing by hand: moving leads into a CRM, turning emails into tasks, filling onboarding portals, and compiling a Monday digest for portfolio companies. The gate is the product. The rest is plumbing.

MIT.
