import fs from 'node:fs';
import path from 'node:path';
import { fillForm, locateButton, hasText } from '../core/web.js';
import { loadJson, expand } from '../core/home.js';

export const meta = {
  name: 'onboarding-fill',
  description: 'Take a customer intake email, pull out the record, fill the vendor portal and your internal tracker page by page, and stop at every submit button until you say go.',
  options: {
    intake: 'Path to the intake email or notes (text file), or - for stdin',
    forms: 'Path to a forms map (default config/forms.example.json)',
    owner: 'Who owns this onboarding (goes on the tracker row)',
  },
};

export async function run(ctx, opts = {}) {
  const cfg = loadJson(opts.forms || ctx.settings.forms || new URL('../config/forms.example.json', import.meta.url).pathname);
  if (!opts.intake) throw new Error('Give me --intake path/to/email.txt (or - for stdin).');
  const text = opts.intake === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(expand(opts.intake), 'utf8');

  // 1. Extract a record whose shape is whatever the forms need.
  const props = Object.fromEntries(Object.entries(cfg.schema).map(([k, d]) => [k, { type: 'string', description: typeof d === 'string' ? d : d.description }]));
  const record = await ctx.model.json({
    name: 'extract_intake', description: 'Pull the onboarding fields out of an intake email. Leave a field empty rather than guessing.',
    schema: { type: 'object', properties: props, required: Object.keys(props) },
    prompt: `Intake text:\n\n${text.slice(0, 12000)}`,
  });
  const empty = Object.keys(props).filter((k) => !record[k]);
  ctx.log.step('extracted', { record, empty });

  // 2. Gate the record once, with edit so you can fill what the email lacked.
  const g = await ctx.gate({
    title: `Onboard ${record[cfg.nameField || 'company'] || 'customer'} via ${cfg.name}`,
    lines: empty.length ? [`Not in the email (press e to fill): ${empty.join(', ')}`] : [],
    after: record,
  });
  if (!g.ok) { ctx.log.finish('declined'); return { status: 'declined', record }; }
  const rec = g.record;

  // 3. Page by page. Each submit is its own gate.
  const refs = [];
  for (const [i, pg] of cfg.pages.entries()) {
    if (pg.url) await ctx.web.open(pg.url);
    const missing = await fillForm(ctx, pg.fields, rec);
    const snap = await ctx.web.snapshot();
    const btn = await locateButton(ctx, snap, pg.submit);
    if (!btn) throw new Error(`Page ${i + 1}: could not find the "${pg.submit}" button.`);
    if (pg.confirm !== false) {
      const ok = (await ctx.gate({ title: `Page ${i + 1} of ${cfg.pages.length}: press "${pg.submit}" on ${pg.title || snap.title}`, lines: missing.length ? [`Could not find fields for: ${missing.join(', ')}`] : ['All fields filled.'], allowEdit: false })).ok;
      if (!ok) { ctx.log.finish('stopped', { page: i + 1 }); return { status: 'stopped', page: i + 1, record: rec }; }
    }
    await ctx.web.click(btn.id);
    const after = await ctx.web.snapshot();
    if (pg.successText && !hasText(after, pg.successText)) throw new Error(`Page ${i + 1}: expected to see "${pg.successText}" after submit, saw: ${after.title}`);
    if (pg.captureRef) { const m = after.text.match(new RegExp(pg.captureRef)); if (m) refs.push(m[1] || m[0]); }
    ctx.log.step('submitted', { page: i + 1, url: after.url, missing });
  }

  // 4. Internal tracker.
  if (cfg.tracker) {
    const row = {};
    for (const [col, src] of Object.entries(cfg.tracker.columns)) {
      row[col] = src === '$owner' ? (opts.owner || ctx.settings.owner || '') : src === '$ref' ? refs.join(' ') : src === '$date' ? new Date().toISOString().slice(0, 10) : src.startsWith("'") ? src.slice(1, -1) : (rec[src] ?? '');
    }
    if (cfg.tracker.type === 'csv') {
      const f = expand(cfg.tracker.path);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      if (!fs.existsSync(f)) fs.writeFileSync(f, Object.keys(row).join(',') + '\n');
      fs.appendFileSync(f, Object.values(row).map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n');
    } else {
      await ctx.web.open(cfg.tracker.url);
      await fillForm(ctx, cfg.tracker.fields, row);
      const s = await ctx.web.snapshot();
      const b = await locateButton(ctx, s, cfg.tracker.submit);
      if (!b) throw new Error('Tracker: could not find the submit button.');
      await ctx.web.click(b.id);
    }
    ctx.log.step('tracker', { row });
  }
  ctx.log.finish('ok', { refs });
  return { status: 'ok', record: rec, refs };
}
