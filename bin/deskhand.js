#!/usr/bin/env node
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext } from '../core/context.js';
import { lastRun } from '../core/log.js';
import { home, loadJson } from '../core/home.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNBOOKS = ['lead-to-crm', 'inbox-triage', 'onboarding-fill', 'portfolio-digest', 'lineup-to-site'];

function parse(argv) {
  const pos = [], opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split(/=(.*)/s);
      if (inline !== undefined) opts[k] = inline;
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) opts[k] = argv[++i];
      else opts[k] = true;
    } else pos.push(a);
  }
  return { pos, opts };
}

async function load(name) {
  if (!RUNBOOKS.includes(name)) throw new Error(`No runbook "${name}". Try: ${RUNBOOKS.join(', ')}`);
  return import(`../runbooks/${name}.js`);
}

const usage = () => `deskhand — one workflow at a time, with a diff before every write.

  deskhand list                      the runbooks and their options
  deskhand run <runbook> [--opt v]   run one (--ui opens the approval panel, --yes skips the gates, --headless hides the browser)
  deskhand demo <runbook>            run it against the built-in fixture apps so you can watch it work
  deskhand log                       what the last run saw and decided
  deskhand doctor                    check the key, the browser, and (on a Mac) the accessibility helper
  deskhand fixtures                  start the fixture apps on http://localhost:4545
  deskhand chrome                    open the agent's Chrome profile so you can log in to your tools once
`;

async function main() {
  const { pos, opts } = parse(process.argv.slice(2));
  const cmd = pos[0];
  if (!cmd || opts.help) return console.log(usage());

  if (cmd === 'list') {
    for (const n of RUNBOOKS) {
      const { meta } = await load(n);
      console.log(`\n${meta.name}\n  ${meta.description}`);
      for (const [k, v] of Object.entries(meta.options)) console.log(`    --${k.padEnd(16)} ${v}`);
    }
    return;
  }

  if (cmd === 'log') {
    const r = lastRun();
    if (!r) return console.log('No runs yet.');
    console.log(r.file);
    for (const l of r.lines) { const { t, step, ...rest } = l; console.log(`${String(t).padStart(7)}ms  ${step.padEnd(14)} ${JSON.stringify(rest).slice(0, 300)}`); }
    return;
  }

  if (cmd === 'fixtures') {
    const { createFixtures } = await import('../test/fixtures/server.js');
    const u = await createFixtures().listen(Number(opts.port) || 4545);
    console.log(`fixture apps at ${u} — crm: ${u}/crm · mail: ${u}/mail · payroll: ${u}/payroll/new · dash: ${u}/dash/acme-analytics · cms: ${u}/cms/home`);
    return new Promise(() => {});
  }

  if (cmd === 'chrome') {
    const ctx = await createContext('chrome', { quiet: true, settings: loadJson(path.join(home(), 'config.json'), {}) });
    await ctx.web.open('https://mail.google.com');
    console.log('Log in to the tools you want the agent to use, then close the window. Sessions persist in ' + ctx.web.profile);
    await new Promise((r) => ctx.web.context.on('close', r));
    return;
  }

  if (cmd === 'doctor') return doctor();

  if (cmd === 'run' || cmd === 'demo') {
    const name = pos[1];
    if (!name) throw new Error('Which runbook? ' + RUNBOOKS.join(', '));
    const { run } = await load(name);
    if (opts.headless) process.env.DESKHAND_HEADLESS = '1';
    let fx = null, runOpts = { ...opts };
    if (cmd === 'demo') {
      const { createFixtures } = await import('../test/fixtures/server.js');
      fx = createFixtures(); const u = await fx.listen(0);
      runOpts = { ...demoOptions(name, u), ...opts };
      console.error(`demo: fixture apps at ${u}`);
    }
    const ctx = await createContext(name, { yes: !!opts.yes, ui: !!opts.ui && { port: Number(opts['ui-port']) || undefined } });
    if (ctx.ui) {
      console.error(`panel: ${ctx.ui.url}`);
      if (process.platform === 'darwin' && !opts['no-open']) spawn('open', [ctx.ui.url], { stdio: 'ignore', detached: true }).unref();
    }
    try {
      const out = await run(ctx, runOpts);
      console.log(JSON.stringify(out, null, 2));
      console.error(`\nlog: ${ctx.log.file}`);
      if (ctx.ui && !opts.yes) { console.error('panel stays up until you press Enter.'); await new Promise((r) => process.stdin.once('data', r)); }
    } finally { await ctx.close(); await fx?.close(); }
    return;
  }
  throw new Error(usage());
}

function demoOptions(name, u) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deskhand-demo-'));
  const w = (f, o) => { const p = path.join(tmp, f); fs.writeFileSync(p, JSON.stringify(o)); return p; };
  const rewrite = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, 'config', file), 'utf8').replaceAll('http://localhost:4545', u));
  switch (name) {
    case 'lead-to-crm': return { company: 'Acme', note: 'Demo lead', crm: w('crm.json', { ...rewrite('crm.example.json'), searchWeb: u + '/search?q={q}' }) };
    case 'inbox-triage': return { inbox: u + '/mail', target: 'markdown', out: path.join(tmp, 'tasks.md'), all: true };
    case 'onboarding-fill': { const i = path.join(tmp, 'intake.txt'); fs.writeFileSync(i, 'Hi team, new customer: Northwind Traders LLC, EIN 12-3456789, incorporated in Delaware. They pay biweekly. Admin is Marco Ruiz, marco@northwind.test. 41 employees to start.'); const f = rewrite('forms.example.json'); f.tracker.path = path.join(tmp, 'onboarding.csv'); return { intake: i, owner: os.userInfo().username, forms: w('forms.json', f) }; }
    case 'portfolio-digest': return { portfolio: w('portfolio.json', rewrite('portfolio.example.json')), out: path.join(tmp, 'digests') };
    case 'lineup-to-site': return { text: 'Close the books in a day, not a week', cms: w('cms.json', rewrite('cms.example.json')) };
  }
  return {};
}

async function doctor() {
  const ok = (m) => console.log('  ✓ ' + m), bad = (m) => console.log('  ✗ ' + m);
  console.log(`deskhand doctor (${process.platform}, node ${process.version})`);
  const settings = loadJson(path.join(home(), 'config.json'), {});
  (process.env.ANTHROPIC_API_KEY || settings.anthropicKey) ? ok('Anthropic key found') : bad('No ANTHROPIC_API_KEY (export it, or put "anthropicKey" in ~/.deskhand/config.json). Runbooks that need extraction will fail.');
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch({ channel: 'chrome', headless: true }); await b.close(); ok('Google Chrome found (the agent drives it with its own profile under ~/.deskhand/chrome)');
  } catch {
    try { const { chromium } = await import('playwright'); const b = await chromium.launch({ headless: true }); await b.close(); ok("Playwright's Chromium found (no Google Chrome; that is fine)"); }
    catch { bad('No browser. Install Google Chrome, or run: npx playwright install chromium'); }
  }
  if (process.platform === 'darwin') {
    const bin = path.join(ROOT, 'mac', 'axq');
    if (!fs.existsSync(bin)) bad('mac/axq not built. Run: npm run build:mac (needs Xcode command line tools). Browser runbooks work without it.');
    else {
      const { Mac } = await import('../core/backends/ax.js');
      try { const t = await new Mac({ bin }).call(['trusted']); t?.trusted ? ok('Accessibility permission granted') : bad('Accessibility not granted. System Settings → Privacy & Security → Accessibility → add your terminal app.'); }
      catch (e) { bad('axq failed: ' + e.message); }
    }
  } else ok('Not a Mac: the macOS backend is off, browser runbooks still work');
  ok(`runs are logged under ${path.join(home(), 'runs')}`);
}

main().catch((e) => { console.error('\n' + (e.message || e)); process.exit(1); });
