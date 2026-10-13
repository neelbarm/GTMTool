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
process.env.DESKHAND_HOME = tmp;
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
  const browser = new Browser({ headless: true, channel: 'chromium', profile: path.join(tmp, 'chrome-' + runbook) });
  const ctx = await createContext(runbook, { quiet: true, model: new StubModel(handlers), browser, settings: {}, ui: { port: 0 } });
  const input = new PassThrough();
  ctx.gate = createGate({ input, output: { write() {} }, ui: ctx.ui, log: ctx.log });
  const done = run(ctx, opts).catch((e) => ({ error: e.message }));
  for (const s of shots) {
    while (!ctx.ui.events.some((e) => e.type === 'gate' && e.gate.title.includes(s.at))) await wait(100);
    await wait(300);
    await shot(ctx.ui.url, s.file, { h: s.h || 800 });
    const g = ctx.ui.events.find((e) => e.type === 'gate' && e.gate.title.includes(s.at)).gate;
    await fetch(ctx.ui.url + '/answer', { method: 'POST', body: JSON.stringify({ id: g.id, decision: 'yes', record: g.after }) });
  }
  const out = await done; console.log(runbook, out.status || out.error);
  await wait(300);
  if (shots.at(-1).done) await shot(ctx.ui.url, shots.at(-1).done, { h: 800 });
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
  [{ at: 'Update Oldco', file: 'panel-gate.png', done: 'panel-done.png' }]);

// 2. The panel on an inbox triage (a list gate).
await runWithPanel('inbox-triage', {
  pick_rows: ({ prompt }) => ({ ids: prompt.split('\n').filter((l) => /Priya|Marco/.test(l)).map((l) => l.match(/\[(\d+)\]/)[1]) }),
  extract_asks: ({ prompt }) => prompt.includes('redlined') ? { asks: [{ task: 'Send redlined MSA to Priya before Thursday', due: '2026-10-15', from: 'Priya Shah' }] } : { asks: [{ task: 'Send W-9 to Marco', due: '', from: 'Marco Ruiz' }, { task: 'Add Marco to the Slack channel', due: '2026-10-19', from: 'Marco Ruiz' }] },
}, { inbox: base + '/mail', target: 'markdown', out: path.join(tmp, 'tasks.md'), all: true }, [{ at: 'Add 3 tasks', file: 'panel-inbox.png', h: 620 }]);

// 4. The terminal gate, with color.
const sink = []; process.env.FORCE_COLOR = '1';
const g = createGate({ input: new PassThrough(), output: { write: (s) => sink.push(s), isTTY: true } });
const p = g({ title: 'Update Oldco in Northstar CRM', lines: ['Source: https://oldco.com', 'Their homepage says something specific.', '• Moved to cloud in 2026', '• Named customers: Globex, Initech'],
  before: { name: 'Oldco', domain: 'oldco.com', one_liner: 'Legacy ERP', industry: 'Software', size: '200', location: 'Boston', note: '' },
  after: { name: 'Oldco', domain: 'oldco.com', one_liner: 'Cloud ERP for mid-size manufacturers', industry: 'Software', size: '250', location: 'Boston', note: 'Met at SaaStr, wants a demo in Nov' } });
await wait(100);
const ansi = sink.join('') + 'y\n  \x1b[32m✓ approved\x1b[0m\n\x1b[2m· gate\n· fill\n· fill\n· fill\n· saved — http://app.northstar.test/crm/1\x1b[0m\n';
const html = ansi.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\x1b\[1m/g, '<b>').replace(/\x1b\[2m/g, '<span class="dim">').replace(/\x1b\[32m/g, '<span class="g">').replace(/\x1b\[31m/g, '<span class="r">').replace(/\x1b\[34m/g, '<span class="b">').replace(/\x1b\[33m/g, '<span class="y">').replace(/\x1b\[0m/g, '</span></b>'.repeat(1));
fs.writeFileSync(path.join(tmp, 'term.html'), `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"><style>body{margin:0;background:#f2eee4;display:grid;place-items:start center;padding:28px 0;min-height:100vh;box-sizing:border-box}
.win{width:860px;background:#1b1a17;border:2px solid #16140f;box-shadow:6px 6px 0 #16140f;overflow:hidden}.bar{height:38px;background:#2a2824;border-bottom:1px solid #3a3731;display:flex;align-items:center;gap:8px;padding:0 14px}.bar i{width:12px;height:12px;border-radius:50%;display:inline-block}
pre{margin:0;padding:22px 26px;color:#e8e3d6;font:14.5px/1.55 "IBM Plex Mono",Menlo,Consolas,monospace;white-space:pre-wrap}.dim{color:#7c8290}.g{color:#8fd19a}.r{color:#f08c7c}.b{color:#e8e3d6}.y{color:#e6c35c}b{color:#fff}.dim{color:#8a8477}</style>
<div class="win"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span style="color:#8a8477;font:12px 'IBM Plex Mono',Menlo,monospace;margin-left:10px">deskhand run lead-to-crm --url oldco.com</span></div><pre>$ deskhand run lead-to-crm --url oldco.com --note "Met at SaaStr, wants a demo in Nov"
<span class="dim">· read-homepage — ERP for manufacturers, now in the cloud
· drafted
· found-existing</span>${html}</pre></div>`);
await shot('file://' + path.join(tmp, 'term.html'), 'terminal.png', { w: 1000, h: 740 });

// 5. Cover / social preview, 1280x640.
const b64 = fs.readFileSync(path.join(OUT, 'panel-gate.png')).toString('base64');
fs.writeFileSync(path.join(tmp, 'cover.html'), `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>body{margin:0;width:1280px;height:640px;overflow:hidden;position:relative;color:#16140f;font-family:"IBM Plex Sans",sans-serif;background:#f2eee4}
.rule{position:absolute;left:64px;right:64px;top:84px;border-top:2px solid #16140f}
.wm{position:absolute;left:64px;top:40px;font:italic 30px/1 "Instrument Serif"}.wm b{font-style:normal;font-weight:400}
.no{position:absolute;right:64px;top:48px;font:500 12px "IBM Plex Mono";letter-spacing:.14em;text-transform:uppercase;color:#4a463d}
h1{position:absolute;left:64px;top:130px;width:560px;font:400 66px/1 "Instrument Serif";letter-spacing:-.015em;margin:0}h1 i{color:#b5321f}
p{position:absolute;left:64px;top:402px;width:470px;font:400 17px/1.55 "IBM Plex Sans";color:#4a463d;margin:0}
.chips{position:absolute;left:64px;bottom:56px;display:flex;flex-wrap:wrap;gap:8px;width:560px}.chips span{font:500 12px "IBM Plex Mono";letter-spacing:.04em;padding:6px 10px;border:1px solid #16140f}
.shot{position:absolute;left:690px;top:110px;width:780px;border:2px solid #16140f;box-shadow:10px 10px 0 #16140f}
.stamp{position:absolute;left:600px;top:330px;font:400 54px/1 "Instrument Serif";text-transform:uppercase;letter-spacing:.12em;color:#b5321f;padding:12px 22px 10px;border:3px double #b5321f;transform:rotate(-10deg);mix-blend-mode:multiply;opacity:.9;z-index:2}
.stamp small{display:block;font:500 11px "IBM Plex Mono";letter-spacing:.2em;text-align:center;margin-top:6px}
</style><div class="wm"><b>desk</b>hand</div><div class="no">Form 01 · the gate</div><div class="rule"></div>
<h1>An agent for your Mac that shows you the <i>diff</i> before it touches anything.</h1>
<p>Five narrow workflows. One gate in front of every write. A log of what it saw and what you said.</p>
<div class="chips"><span>lead-to-crm</span><span>inbox-triage</span><span>onboarding-fill</span><span>portfolio-digest</span><span>lineup-to-site</span></div>
<img class="shot" src="data:image/png;base64,${b64}"><div class="stamp">Approved<small>2026-10-13 · 21:40</small></div>`);
await shot('file://' + path.join(tmp, 'cover.html'), 'cover.png', { w: 1280, h: 640 });

await cam.close(); await fx.close();
