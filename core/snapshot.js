// A snapshot is the one shape every backend produces: a flat list of UI nodes.
// { url, title, text, nodes: [{ id, role, name, value, href, editable, depth }] }
// Runbooks never touch DOM or AX APIs directly. They look things up here, then
// hand an id back to the backend to act on.

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

export function find(snap, { role, name, exact = false, editable } = {}) {
  const want = norm(name);
  const roles = role ? (Array.isArray(role) ? role : [role]) : null;
  let best = null;
  for (const n of snap.nodes) {
    if (roles && !roles.includes(n.role)) continue;
    if (editable !== undefined && !!n.editable !== editable) continue;
    if (!want) return n;
    const have = norm(n.name);
    let score = 0;
    if (have === want) score = 3;
    else if (!exact && have.startsWith(want)) score = 2;
    else if (!exact && have.includes(want)) score = 1;
    if (score && (!best || score > best.score)) best = { n, score };
    if (score === 3) break;
  }
  return best ? best.n : null;
}

export function findAll(snap, { role, name } = {}) {
  const want = norm(name);
  return snap.nodes.filter((n) => (!role || n.role === role) && (!want || norm(n.name).includes(want)));
}

// Field lookup: an editable control whose accessible name matches the label.
export function field(snap, label) {
  return find(snap, { name: label, editable: true }) || find(snap, { name: label, role: ['textbox', 'combobox', 'checkbox', 'radio'] });
}

export function button(snap, name) {
  return find(snap, { name, role: ['button', 'link', 'menuitem'] });
}

// Compact text rendering for the model. One line per node, capped.
export function render(snap, { max = 400, roles } = {}) {
  const lines = [];
  for (const n of snap.nodes) {
    if (roles && !roles.includes(n.role)) continue;
    const bits = [`[${n.id}]`, n.role];
    if (n.name) bits.push(JSON.stringify(n.name.slice(0, 120)));
    if (n.value) bits.push('=' + JSON.stringify(String(n.value).slice(0, 80)));
    if (n.href) bits.push('→ ' + n.href.slice(0, 100));
    lines.push('  '.repeat(Math.min(n.depth || 0, 6)) + bits.join(' '));
    if (lines.length >= max) { lines.push(`… ${snap.nodes.length - max} more nodes`); break; }
  }
  return [`URL: ${snap.url || ''}`, `Title: ${snap.title || ''}`, ...lines].join('\n');
}

export function hasText(snap, s) {
  return norm(snap.text).includes(norm(s));
}

export const util = { norm };
