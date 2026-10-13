import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { find, field, button, render } from '../core/snapshot.js';
import { renderDiff, changed } from '../core/diff.js';
import { createGate } from '../core/gate.js';
import { domainOf, urlOf } from '../core/web.js';

const snap = { url: 'u', title: 't', text: 'x', nodes: [
  { id: 1, role: 'heading', name: 'Companies', depth: 0 },
  { id: 2, role: 'textbox', name: 'Company name', value: 'Acme', editable: true, depth: 1 },
  { id: 3, role: 'textbox', name: 'Company domain name', value: '', editable: true, depth: 1 },
  { id: 4, role: 'button', name: 'Create company', depth: 1 },
  { id: 5, role: 'link', name: 'Publish', href: 'h', depth: 1 },
] };

test('snapshot lookups prefer exact over prefix over substring', () => {
  assert.equal(find(snap, { name: 'company name' }).id, 2);
  assert.equal(field(snap, 'Company domain').id, 3);
  assert.equal(button(snap, 'create').id, 4);
  assert.equal(find(snap, { name: 'nope' }), null);
  assert.match(render(snap, { roles: ['button'] }), /\[4\] button "Create company"/);
});

test('diff renders changes and lists changed keys', () => {
  const d = renderDiff({ a: 1, b: 'x' }, { a: 1, b: 'y', c: [1, 2] });
  assert.match(d, /- b\s+x/); assert.match(d, /\+ b\s+y/); assert.match(d, /\+ c\s+1, 2/);
  assert.deepEqual(changed({ a: 1, b: 'x' }, { a: 1, b: 'y', c: 1 }), ['b', 'c']);
});

test('gate: y approves, n declines, e edits a field', async () => {
  const run = async (answers) => {
    const input = new PassThrough(); const output = new PassThrough(); let printed = '';
    output.on('data', (c) => (printed += c));
    const gate = createGate({ input, output });
    const p = gate({ title: 'T', after: { name: 'Acme', size: '10' } });
    for (const a of answers) input.write(a + '\n');
    const r = await p; return { ...r, printed };
  };
  assert.equal((await run(['y'])).ok, true);
  assert.equal((await run(['n'])).ok, false);
  assert.equal((await run([''])).ok, false, 'default is no');
  const e = await run(['e', 'size=12', '', 'y']);
  assert.equal(e.ok, true); assert.equal(e.record.size, '12'); assert.equal(e.record.name, 'Acme');
  assert.match(e.printed, /\+ size\s+12/);
});

test('url helpers', () => {
  assert.equal(domainOf('https://www.acme.com/pricing'), 'acme.com');
  assert.equal(domainOf('acme.com'), 'acme.com');
  assert.equal(urlOf('acme.com'), 'https://acme.com/');
  assert.equal(urlOf('http://127.0.0.1:4545/site/x'), 'http://127.0.0.1:4545/site/x');
});
