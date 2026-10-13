// Takes the screenshots in docs/. Runs real runbooks against the fixtures
// with a stub model, pauses at the gate, and photographs the panel and the apps.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { chromium } from 'playwright';
import { createFixtures } from '../test/fixtures/server.js';
import { Browser } from '../core/backends/browser.js';
import { StubModel } from '../core/model.js';
import { createContext } from '../core/context.js';
import { createGate } from '../core/gate.js';

const OUT = path.resolve('docs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-shoot-'));
process.env.HOME = tmp; process.env.DESKHAND_HOME = path.join(tmp, '.deskhand');
const fx = createFixtures(); const base = await fx.listen();
const cam = await chromium.launch({ headless: true });
const shot = async (url, file, { w = 1280, h = 800, full = false, pre } = {}) => {
  const pg = await cam.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await pg.goto(url); await pg.waitForTimeout(500); if (pre) await pre(pg);
  await pg.screenshot({ path: path.join(OUT, file), fullPage: full }); await pg.close(); console.log('shot', file);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cfg = (name, o) => { const p = path.join(tmp, name); fs.writeFileSync(p, JSON.stringify(o)); return p; };
const crmMap = { name: 'Northstar CRM', createUrl: base + '/crm/new', searchUrl: base + '/crm?q={q}', searchWeb: base + '/search?q={q}',
  fields: { name: { label: 'Company name' }, domain: { label: 'Website' }, one_liner: { label: 'Description' }, industry: { label: 'Industry' }, size: { label: 'Employees' }, location: { label: 'Location' }, note: { label: 'Notes' } },
  submitButton: 'Create company', updateButton: 'Save', successText: 'Company saved' };

async function runWithPanel(runbook, handlers, opts, shots) {
  const { run } = await import(`../runbooks/${runbook}.js`);
  const browser = new Browser({ headless: true, channel: 'chromium', profile: path.join(tmp, '.deskhand', 'chrome') });
  const ctx = await createContext(runbook, { quiet: true, model: new StubModel(handlers), browser, settings: {}, ui: { port: 0 } });
  const input = new PassThrough();
  ctx.gate = createGate({ input, output: { write() {} }, ui: ctx.ui, log: ctx.log });
  const done = run(ctx, opts).catch((e) => ({ error: e.message }));
  for (const s of shots) {
    while (!ctx.ui.events.some((e) => e.type === 'gate' && e.gate.title.includes(s.at))) await wait(100);
    await wait(300);
    await shot(ctx.ui.url, s.file, { w: 1180, h: s.h || 740 });
    const g = ctx.ui.events.find((e) => e.type === 'gate' && e.gate.title.includes(s.at)).gate;
    await fetch(ctx.ui.url + '/answer', { method: 'POST', body: JSON.stringify({ id: g.id, decision: 'yes', record: g.after }) });
  }
  const out = await done; console.log(runbook, out.status || out.error);
  await wait(300);
  if (shots.at(-1).done) await shot(ctx.ui.url, shots.at(-1).done, { w: 1180, h: 740 });
  await ctx.close();
}

// 3. The apps as they look on screen.
await shot(base + '/crm', 'app-crm.png', { h: 720 });
await shot(base + '/mail', 'app-mail.png', { h: 720 });
await shot(base + '/payroll/new', 'app-payroll.png', { h: 720 });
await shot(base + '/dash/acme-analytics', 'app-dashboard.png', { h: 720 });
await shot(base + '/cms/home', 'app-cms.png', { h: 720 });

// 1. The panel, mid-run, on an update with a real diff.
await runWithPanel('lead-to-crm', { extract_company: () => ({ name: 'Oldco', domain: 'oldco.com', one_liner: 'Cloud ERP for mid-size manufacturers', industry: 'Software', size: '250', location: 'Boston', emails: ['sales@oldco.test'], signals: ['Moved to cloud in 2026', 'Named customers: Globex, Initech'], generic_copy: false }) },
  { url: base + '/site/oldco', crm: cfg('crm.json', crmMap), note: 'Met at SaaStr, wants a demo in Nov' },
  [{ at: 'Update Oldco', file: 'panel-gate.png', h: 600, done: 'panel-done.png' }]);

// 2. The panel on an inbox triage (a list gate).
await runWithPanel('inbox-triage', {
  pick_rows: ({ prompt }) => ({ ids: prompt.split('\n').filter((l) => /Priya|Marco/.test(l)).map((l) => l.match(/\[(\d+)\]/)[1]) }),
  extract_asks: ({ prompt }) => prompt.includes('redlined') ? { asks: [{ task: 'Send redlined MSA to Priya before Thursday', due: '2026-10-15', from: 'Priya Shah' }] } : { asks: [{ task: 'Send W-9 to Marco', due: '', from: 'Marco Ruiz' }, { task: 'Add Marco to the Slack channel', due: '2026-10-19', from: 'Marco Ruiz' }] },
}, { inbox: base + '/mail', target: 'markdown', out: path.join(tmp, 'tasks.md'), all: true }, [{ at: 'Add 3 tasks', file: 'panel-inbox.png', h: 460 }]);

// 4. The terminal gate, with color.
const sink = []; process.env.FORCE_COLOR = '1';
const g = createGate({ input: new PassThrough(), output: { write: (s) => sink.push(s), isTTY: true } });
const p = g({ title: 'Update Oldco in Northstar CRM', lines: ['Source: https://oldco.com', 'Their homepage says something specific.', '• Moved to cloud in 2026', '• Named customers: Globex, Initech'],
  before: { name: 'Oldco', domain: 'oldco.com', one_liner: 'Legacy ERP', industry: 'Software', size: '200', location: 'Boston', note: '' },
  after: { name: 'Oldco', domain: 'oldco.com', one_liner: 'Cloud ERP for mid-size manufacturers', industry: 'Software', size: '250', location: 'Boston', note: 'Met at SaaStr, wants a demo in Nov' } });
await wait(100);
const ansi = sink.join('') + 'y\n  \x1b[32m✓ approved\x1b[0m\n\x1b[2m· gate\n· fill\n· fill\n· fill\n· saved — http://app.northstar.test/crm/1\x1b[0m\n';
const html = ansi.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\x1b\[1m/g, '<b>').replace(/\x1b\[2m/g, '<span class="dim">').replace(/\x1b\[32m/g, '<span class="g">').replace(/\x1b\[31m/g, '<span class="r">').replace(/\x1b\[34m/g, '<span class="b">').replace(/\x1b\[33m/g, '<span class="y">').replace(/\x1b\[0m/g, '</span></b>'.repeat(1));
fs.writeFileSync(path.join(tmp, 'term.html'), `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"><style>body{margin:0;background:#e8e8ec;display:grid;place-items:start center;padding:28px 0;min-height:100vh;box-sizing:border-box}
.win{width:880px;background:#1e1e1e;border-radius:10px;box-shadow:0 22px 60px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.25);overflow:hidden}.bar{height:28px;background:#2b2b2b;display:flex;align-items:center;gap:8px;padding:0 12px;position:relative}.bar i{width:12px;height:12px;border-radius:50%;display:inline-block}.bar span{position:absolute;left:0;right:0;text-align:center;color:#9a9a9a;font:12px -apple-system,"Inter",sans-serif}
pre{margin:0;padding:14px 16px;color:#e6e6e6;font:12.5px/1.5 "SF Mono",Menlo,"JetBrains Mono",monospace;white-space:pre-wrap}.dim{color:#8e8e8e}.g{color:#3fb950}.r{color:#f85149}.b{color:#58a6ff}.y{color:#d29922}b{color:#fff;font-weight:700}</style>
<div class="win"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>neel — deskhand — 110×32</span></div><pre>~/deskhand $ deskhand run lead-to-crm --url oldco.com --note "Met at SaaStr, wants a demo in Nov"
<span class="dim">· read-homepage — ERP for manufacturers, now in the cloud
· drafted
· found-existing</span>${html}~/deskhand $ </pre></div>`);
await shot('file://' + path.join(tmp, 'term.html'), 'terminal.png', { w: 1000, h: 700 });

// 5. Cover / social preview, 1280x640.
const b64 = fs.readFileSync(path.join(OUT, 'panel-gate.png')).toString('base64');
fs.writeFileSync(path.join(tmp, 'cover.html'), `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>body{margin:0;width:1280px;height:640px;overflow:hidden;position:relative;color:#1d1d1f;font-family:-apple-system,"Inter",sans-serif;background:#e9e9ed}
.h{position:absolute;left:72px;top:60px;width:1100px}.wm{font:700 22px/1 Inter;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}.wm i{width:22px;height:22px;border-radius:6px;background:#1d1d1f;display:inline-block}
h1{font:600 34px/1.2 Inter;letter-spacing:-.02em;margin:20px 0 8px;width:1000px}p{font:400 16px/1.5 Inter;color:#515154;margin:0;width:1000px}
.shot{position:absolute;left:72px;top:218px;width:1136px;border-radius:10px;box-shadow:0 30px 80px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.18)}
</style><div class="h"><div class="wm"><i></i>deskhand</div><h1>A Mac agent that shows you the diff before it touches anything.</h1><p>Five narrow workflows, one approval gate in front of every write, a log of everything it saw. Open source.</p></div>
<img class="shot" src="data:image/png;base64,${b64}">`);
await shot('file://' + path.join(tmp, 'cover.html'), 'cover.png', { w: 1280, h: 640 });

await cam.close(); await fx.close();
