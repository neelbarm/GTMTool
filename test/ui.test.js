import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createUI } from '../core/ui.js';
import { createGate } from '../core/gate.js';

test('panel: a gate shows up on the event stream and a click answers it with edits', async () => {
  const ui = createUI({ port: 0, runbook: 'lead-to-crm' });
  const url = await ui.listen();
  const input = new PassThrough();
  const gate = createGate({ input, output: { write() {} }, ui });
  const p = gate({ title: 'Create Acme', before: { name: 'Acme', size: '10' }, after: { name: 'Acme Analytics', size: '10' } });
  // What the page would receive:
  const seen = ui.events.find((e) => e.type === 'gate');
  assert.equal(seen.gate.title, 'Create Acme');
  assert.deepEqual(seen.gate.after, { name: 'Acme Analytics', size: '10' });
  const r = await fetch(url + '/answer', { method: 'POST', body: JSON.stringify({ id: seen.gate.id, decision: 'yes', record: { name: 'Acme Analytics', size: '12' } }) });
  assert.equal((await r.json()).ok, true);
  const out = await p;
  assert.equal(out.ok, true); assert.equal(out.record.size, '12');
  assert.equal(ui.events.at(-1).type, 'gate-done');
  const page = await (await fetch(url + '/')).text();
  assert.match(page, /<title>deskhand<\/title>/);
  await ui.close();
});

test('panel: terminal answer still wins when it comes first', async () => {
  const ui = createUI({ port: 0 }); await ui.listen();
  const input = new PassThrough();
  const gate = createGate({ input, output: { write() {} }, ui });
  const p = gate({ title: 'T', after: { a: 1 } });
  input.write('n\n');
  const out = await p;
  assert.equal(out.ok, false);
  assert.equal(ui.events.at(-1).decision, 'no');
  await ui.close();
});
