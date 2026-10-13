import fs from 'node:fs';
import path from 'node:path';
import { loadJson, expand } from '../core/home.js';

export const meta = {
  name: 'portfolio-digest',
  description: 'Open each portfolio company dashboard in your logged-in browser, read the one number that matters, screenshot it, and write a Monday digest with week-over-week deltas.',
  options: {
    portfolio: 'Path to a portfolio map (default config/portfolio.example.json)',
    out: 'Directory for digests (default ~/.deskhand/digests)',
  },
};

const METRIC = {
  type: 'object',
  properties: { value: { type: 'string', description: 'The metric exactly as shown, e.g. "$42,300"' }, label: { type: 'string' }, as_of: { type: 'string', description: 'Date or period the number covers, if shown' } },
  required: ['value', 'label', 'as_of'],
};

const num = (s) => { const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function run(ctx, opts = {}) {
  const cfg = loadJson(opts.portfolio || ctx.settings.portfolio || new URL('../config/portfolio.example.json', import.meta.url).pathname);
  const outDir = expand(opts.out || ctx.settings.digests || path.join(ctx.home, 'digests'));
  const date = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.join(outDir, date), { recursive: true });
  const prev = loadJson(path.join(outDir, 'latest.json'), { date: null, rows: {} });

  const rows = [];
  for (const c of cfg.companies) {
    const row = { name: c.name, label: c.metric.label, url: c.url };
    try {
      await ctx.web.open(c.url);
      if (c.waitFor) await ctx.web.page().locator(c.waitFor).first().waitFor({ timeout: 15000 });
      if (c.metric.selector) {
        row.value = (await ctx.web.page().locator(c.metric.selector).first().innerText({ timeout: 10000 })).trim();
      } else {
        const snap = await ctx.web.snapshot();
        const m = await ctx.model.json({ name: 'read_metric', description: 'Read one metric off a dashboard.', schema: METRIC,
          prompt: `Dashboard text:\n${snap.text.slice(0, 6000)}\n\nFind: ${c.metric.describe || c.metric.label}. Return it exactly as displayed.` });
        row.value = m.value; row.as_of = m.as_of;
      }
      row.n = num(row.value);
      const shot = path.join(outDir, date, slug(c.name) + '.png');
      if (c.screenshot !== false) {
        const sel = c.screenshot && typeof c.screenshot === 'string' ? c.screenshot : c.metric.selector;
        if (sel) await ctx.web.page().locator(sel).first().screenshot({ path: shot }); else await ctx.web.screenshot(shot);
        row.shot = path.relative(outDir, shot);
      }
      const last = prev.rows[c.name];
      if (last && last.n != null && row.n != null) { row.prev = last.value; row.delta = row.n - last.n; row.pct = last.n ? Math.round((1000 * row.delta) / last.n) / 10 : null; }
      ctx.log.step('read', { company: c.name, value: row.value });
    } catch (e) {
      row.error = e.message.split('\n')[0];
      ctx.log.step('failed', { company: c.name, error: row.error });
    }
    rows.push(row);
  }

  const fmt = (r) => r.error ? `⚠ ${r.error}` : r.value;
  const chg = (r) => r.delta == null ? (prev.date ? 'n/a' : 'first run') : `${r.delta > 0 ? '+' : ''}${r.delta.toLocaleString()}${r.pct != null ? ` (${r.pct > 0 ? '+' : ''}${r.pct}%)` : ''}`;
  const md = [
    `# Portfolio digest · ${date}`, '',
    prev.date ? `Compared with ${prev.date}.` : 'First run, so no deltas yet.', '',
    '| Company | Metric | Now | Last time | Change |', '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.name} | ${r.label} | ${fmt(r)} | ${r.prev ?? ''} | ${chg(r)} |`),
    '',
    ...rows.filter((r) => r.shot).map((r) => `![${r.name}](${r.shot})`),
    '',
    `_${rows.filter((r) => !r.error).length} of ${rows.length} read. Every number above came off the dashboard page itself; screenshots are the evidence._`,
  ].join('\n');
  const file = path.join(outDir, `${date}.md`);
  fs.writeFileSync(file, md + '\n');
  fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify({ date, rows: Object.fromEntries(rows.map((r) => [r.name, { value: r.value, n: r.n }])) }, null, 2));
  ctx.log.finish('ok', { file });
  return { status: 'ok', file, rows };
}
