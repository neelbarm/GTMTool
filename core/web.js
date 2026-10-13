import { field, button, find, render, hasText } from './snapshot.js';
import { jobs } from './model.js';

// Helpers runbooks share for driving a web form through the browser backend.

export function domainOf(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// Keep the URL the user or the search engine gave us (path and port included);
// only add a scheme when it is missing.
export function urlOf(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).href; } catch { return ''; }
}

export function pageSummary(snap, { chars = 6000 } = {}) {
  const heads = snap.nodes.filter((n) => n.role === 'heading').map((n) => n.name).slice(0, 12);
  return `URL: ${snap.url}\nTitle: ${snap.title}\nHeadings: ${heads.join(' | ')}\n\n${snap.text.slice(0, chars)}`;
}

// Find a form control by label, falling back to the model when labels differ.
export async function locateField(ctx, snap, label, what) {
  let n = field(snap, label);
  if (n) return n;
  const id = await jobs.locate(ctx.model, render(snap, { roles: ['textbox', 'combobox', 'checkbox', 'radio', 'label'] }), what || `the input for "${label}"`);
  return id ? snap.nodes.find((x) => String(x.id) === String(id)) : null;
}

export async function locateButton(ctx, snap, name, what) {
  let n = button(snap, name);
  if (n) return n;
  const id = await jobs.locate(ctx.model, render(snap, { roles: ['button', 'link', 'menuitem'] }), what || `the button "${name}"`);
  return id ? snap.nodes.find((x) => String(x.id) === String(id)) : null;
}

// Fill a record into a form described by a field map: { key: { label, what?, type? } }.
// Returns the list of fields it could not find so the gate can say so.
export async function fillForm(ctx, map, record) {
  const missing = [];
  for (const [key, spec] of Object.entries(map)) {
    const value = record[key];
    if (value === undefined || value === null || value === '') continue;
    const snap = await ctx.web.snapshot();
    const n = await locateField(ctx, snap, spec.label, spec.what);
    if (!n) { missing.push(key); ctx.log.step('field-missing', { key, label: spec.label }); continue; }
    if (n.role === 'checkbox') await ctx.web.check(n.id, /^(true|yes|1|checked)$/i.test(String(value)));
    else await ctx.web.type(n.id, Array.isArray(value) ? value.join(', ') : String(value));
    ctx.log.step('fill', { key, id: n.id, label: n.name });
  }
  return missing;
}

export { field, button, find, render, hasText };
