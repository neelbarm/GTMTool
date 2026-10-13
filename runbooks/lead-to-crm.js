import { pageSummary, domainOf, urlOf, fillForm, locateButton, hasText, find } from '../core/web.js';
import { loadJson } from '../core/home.js';

export const meta = {
  name: 'lead-to-crm',
  description: 'Take a company name or URL (or the text you have highlighted on a Mac), read its homepage, draft a CRM record, show you the diff, and create or update it in your CRM.',
  options: {
    company: 'Company name to look up (searches the web for its site)',
    url: 'Company website, if you already know it',
    'from-selection': 'Mac only: use whatever text is highlighted in the front app',
    linkedin: 'Also read the LinkedIn company page in your logged-in browser (slug or URL)',
    crm: 'Path to a CRM form map (default config/crm.example.json)',
    note: 'A note to put on the record (where you met them, why they matter)',
  },
};

const RECORD = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Company name as they write it' },
    domain: { type: 'string' },
    one_liner: { type: 'string', description: 'What they sell, in their words, under 20 words' },
    industry: { type: 'string' },
    size: { type: 'string', description: 'Employee count or range if stated, else empty' },
    location: { type: 'string', description: 'HQ city/country if stated, else empty' },
    emails: { type: 'array', items: { type: 'string' }, description: 'Contact emails that appear on the page' },
    signals: { type: 'array', items: { type: 'string' }, description: 'Up to 4 facts a salesperson would use: funding, customers named, hiring, launches' },
    generic_copy: { type: 'boolean', description: 'True if the homepage headline could belong to any competitor' },
  },
  required: ['name', 'domain', 'one_liner', 'industry', 'size', 'location', 'emails', 'signals', 'generic_copy'],
};

export async function run(ctx, opts = {}) {
  const crm = loadJson(opts.crm || ctx.settings.crm || new URL('../config/crm.example.json', import.meta.url).pathname);
  let query = opts.company || '';
  if (opts['from-selection']) { query = await ctx.mac.selection(); ctx.log.step('selection', { text: query }); }
  let site = urlOf(opts.url || '');
  if (!site && !query) throw new Error('Give me --company "Name", --url site.com, or --from-selection.');

  // 1. Find the site if we only have a name.
  if (!site) {
    const searchUrl = (crm.searchWeb || ctx.settings.searchWeb || 'https://html.duckduckgo.com/html/?q={q}').replace('{q}', encodeURIComponent(query + ' official site'));
    await ctx.web.open(searchUrl);
    const snap = await ctx.web.snapshot();
    const skip = /duckduckgo|google\.|bing\.|wikipedia|linkedin|crunchbase|facebook|twitter|x\.com|youtube/i;
    const hit = snap.nodes.find((n) => n.role === 'link' && /^https?:\/\//.test(n.href) && !skip.test(n.href) && n.name.length > 3);
    if (!hit) throw new Error(`Could not find a website for "${query}". Pass --url instead.`);
    site = urlOf(hit.href);
    ctx.log.step('search', { query, site });
  }

  // 2. Read the homepage.
  await ctx.web.open(site);
  const homeSnap = await ctx.web.snapshot();
  const h1 = find(homeSnap, { role: 'heading' })?.name || '';
  let evidence = pageSummary(homeSnap);
  ctx.log.step('read-homepage', { url: homeSnap.url, title: homeSnap.title, h1 });

  // 3. Optionally read LinkedIn in the logged-in browser (read only).
  if (opts.linkedin) {
    const li = /^https?:/.test(opts.linkedin) ? opts.linkedin : `https://www.linkedin.com/company/${opts.linkedin}/about/`;
    await ctx.web.open(li);
    const liSnap = await ctx.web.snapshot();
    evidence += `\n\n--- LinkedIn about page ---\n${liSnap.text.slice(0, 4000)}`;
    ctx.log.step('read-linkedin', { url: liSnap.url });
  }

  // 4. Draft the record.
  const draft = await ctx.model.json({
    name: 'extract_company', description: 'Pull a CRM company record out of homepage text.', schema: RECORD,
    prompt: `Homepage headline: ${h1}\n\n${evidence}\n\nDomain hint: ${domainOf(site)}`,
  });
  draft.domain = draft.domain || domainOf(site);
  if (opts.note) draft.note = opts.note;
  draft.source = site;
  ctx.log.step('drafted', { draft });

  // 5. Check the CRM for an existing record.
  let existing = null;
  if (crm.searchUrl) {
    await ctx.web.open(crm.searchUrl.replace('{q}', encodeURIComponent(draft.domain || draft.name)));
    const s = await ctx.web.snapshot();
    const matches = (n) => n.name.toLowerCase().includes(draft.domain.toLowerCase()) || n.name.toLowerCase() === draft.name.toLowerCase();
    let row = s.nodes.find((n) => n.role === 'link' && n.href && matches(n));
    if (!row) {
      const r = s.nodes.find((n) => ['row', 'listitem', 'cell'].includes(n.role) && matches(n));
      if (r) { const i = s.nodes.indexOf(r); row = s.nodes.slice(i + 1, i + 10).find((n) => n.role === 'link' && n.href && n.depth > r.depth) || r; }
    }
    if (row) {
      existing = { name: draft.name, domain: draft.domain };
      if (row.href) {
        await ctx.web.open(row.href);
        const rs = await ctx.web.snapshot();
        for (const [key, spec] of Object.entries(crm.fields)) {
          const f = find(rs, { name: spec.label, editable: true });
          if (f) existing[key] = f.value;
        }
        existing._url = row.href;
      }
      ctx.log.step('found-existing', { existing });
    }
  }

  // 6. Gate.
  const toCrm = {};
  for (const key of Object.keys(crm.fields)) if (draft[key] !== undefined) toCrm[key] = draft[key];
  const { ok, record } = await ctx.gate({
    title: existing ? `Update ${draft.name} in ${crm.name}` : `Create ${draft.name} in ${crm.name}`,
    lines: [`Source: ${site}`, draft.generic_copy ? 'Their homepage copy is generic. Lineup would score it low.' : 'Their homepage says something specific.', ...(draft.signals || []).map((s) => '• ' + s)],
    before: existing ? Object.fromEntries(Object.keys(toCrm).map((k) => [k, existing[k]])) : null,
    after: toCrm,
  });
  if (!ok) { ctx.log.finish('declined'); return { status: 'declined', draft }; }

  // 7. Write.
  await ctx.web.open(existing?._url || crm.createUrl);
  if (!existing && crm.openCreate) {
    const s0 = await ctx.web.snapshot();
    const b = await locateButton(ctx, s0, crm.openCreate);
    if (!b) throw new Error(`Could not find the "${crm.openCreate}" button.`);
    await ctx.web.click(b.id);
  }
  const missing = await fillForm(ctx, crm.fields, record);
  const snap = await ctx.web.snapshot();
  const submit = await locateButton(ctx, snap, existing ? (crm.updateButton || crm.submitButton) : crm.submitButton);
  if (!submit) throw new Error(`Could not find the "${crm.submitButton}" button on ${await ctx.web.url()}.`);
  await ctx.web.click(submit.id);
  const after = await ctx.web.snapshot();
  const verified = crm.successText ? hasText(after, crm.successText) : after.url !== snap.url;
  ctx.log.step('saved', { url: after.url, verified, missing });
  ctx.log.finish(verified ? 'ok' : 'unverified');
  return { status: verified ? 'ok' : 'unverified', record, missing, url: after.url, existing: !!existing };
}
