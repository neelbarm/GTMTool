import { loadJson } from '../core/home.js';
import { locateField, locateButton } from '../core/web.js';

export const meta = {
  name: 'lineup-to-site',
  description: 'Take the winning headline from a Lineup blind test, open your CMS, find the hero headline field, show the before/after, and stage the change as a draft. It will not press Publish.',
  options: {
    entry: 'Lineup entry id (the agent picks the variant the crowd picked most)',
    text: 'Or pass the new headline directly',
    lineup: 'Lineup base URL (default https://lineupgtm.vercel.app)',
    cms: 'Path to a CMS map (default config/cms.example.json)',
  },
};

const FORBIDDEN = /publish|go live|deploy|make live|release/i;

export async function pickWinner(entry) {
  const pool = [{ id: entry.id, head: entry.head, score: entry.score, shows: entry.shows, picks: entry.picks, rate: entry.rate }, ...(entry.variants || [])];
  const judged = pool.filter((v) => v.shows >= 5 && v.rate != null);
  if (judged.length) return judged.sort((a, b) => b.rate - a.rate)[0];
  return pool.sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0]; // lower Lineup score = less generic
}

export async function run(ctx, opts = {}) {
  const cfg = loadJson(opts.cms || ctx.settings.cms || new URL('../config/cms.example.json', import.meta.url).pathname);
  let headline = opts.text || '';
  let why = 'passed on the command line';
  if (!headline) {
    if (!opts.entry) throw new Error('Give me --entry <lineup id> or --text "New headline".');
    const base = (opts.lineup || ctx.settings.lineupUrl || 'https://lineupgtm.vercel.app').replace(/\/$/, '');
    const r = await fetch(`${base}/api/entries/${encodeURIComponent(opts.entry)}`);
    if (!r.ok) throw new Error(`Lineup returned ${r.status} for entry ${opts.entry}.`);
    const entry = await r.json();
    const w = await pickWinner(entry);
    headline = w.head;
    why = w.shows >= 5 ? `picked ${w.rate}% of the time across ${w.shows} lineups` : `best sameness score (${w.score}) among ${1 + (entry.variants || []).length} versions; not enough votes yet`;
    ctx.log.step('winner', { id: w.id, head: w.head, why });
  }

  await ctx.web.open(cfg.url);
  const snap = await ctx.web.snapshot();
  const f = await locateField(ctx, snap, cfg.field.label, cfg.field.what || 'the hero headline field for the home page');
  if (!f) throw new Error(`Could not find the "${cfg.field.label}" field on ${cfg.url}.`);
  const before = f.value || '';
  if (before.trim() === headline.trim()) { ctx.log.finish('unchanged'); return { status: 'unchanged', headline }; }

  const { ok } = await ctx.gate({
    title: `Stage new hero headline in ${cfg.name}`,
    lines: [`Why this one: ${why}`, cfg.saveButton ? `Will press "${cfg.saveButton}". Will not press Publish.` : 'Will type it in and stop. Nothing is saved until you do it.'],
    before: { hero: before }, after: { hero: headline }, allowEdit: false,
  });
  if (!ok) { ctx.log.finish('declined'); return { status: 'declined', before, headline }; }

  await ctx.web.type(f.id, headline);
  let saved = false;
  if (cfg.saveButton) {
    if (FORBIDDEN.test(cfg.saveButton)) throw new Error(`Refusing: the save button "${cfg.saveButton}" looks like a publish action. This runbook only stages drafts.`);
    const s2 = await ctx.web.snapshot();
    const b = await locateButton(ctx, s2, cfg.saveButton);
    if (!b) throw new Error(`Could not find the "${cfg.saveButton}" button.`);
    if (FORBIDDEN.test(b.name)) throw new Error(`Refusing to press "${b.name}". This runbook only stages drafts.`);
    await ctx.web.click(b.id);
    const s3 = await ctx.web.snapshot();
    const again = await locateField(ctx, s3, cfg.field.label);
    saved = !!again && (again.value || '').trim() === headline.trim();
    ctx.log.step('saved', { saved, url: s3.url });
  }
  ctx.log.finish('ok', { saved });
  return { status: 'ok', before, headline, saved };
}
