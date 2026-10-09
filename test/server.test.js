'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lineup-test-'));
process.env.ADMIN_TOKEN = 'secret';
const { server, addEntry, signLineup, verifyLineup } = require('../server.js');

let base;
test.before(async () => { await new Promise((r) => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => { server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('serves the page and the model', async () => {
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Could a buyer/);
  const m = await fetch(base + '/model.js');
  assert.match(await m.text(), /LineupModel/);
});

test('adds entries, dedupes, rejects junk', async () => {
  const a = await post('/api/entries', { text: 'Invoice collection for freelance designers. Clients paid 11 days sooner on average.' });
  assert.equal(a.status, 201);
  const ja = await a.json();
  assert.ok(ja.id && ja.entry.score >= 0);
  const b = await post('/api/entries', { text: 'invoice collection for freelance designers.  clients paid 11 days sooner on average.' });
  assert.equal(b.status, 200);
  assert.equal((await b.json()).duplicate, true);
  const c = await post('/api/entries', { text: 'hi' });
  assert.equal(c.status, 400);
  const d = await post('/api/entries', { text: 'x '.repeat(300) });
  assert.equal(d.status, 400);
});

test('lineup needs four entries, then votes count', async () => {
  let r = await (await fetch(base + '/api/lineup')).json();
  assert.equal(r.lineup, null);
  for (const t of ['Payroll for restaurants. Tips and schedules in one place.', 'The all-in-one platform for modern teams.', 'Permit tracking for electrical contractors. 220 contractors.', 'Lease renewals for landlords with 5 to 50 units.']) addEntry(t);
  r = await (await fetch(base + '/api/lineup')).json();
  assert.equal(r.lineup.length, 4);
  const ids = r.lineup.map((e) => e.id);
  const v = await post('/api/votes', { token: r.token, pick: ids[1], voter: 'voter-abc-12345' });
  assert.equal(v.status, 200);
  const again = await post('/api/votes', { token: r.token, pick: ids[2], voter: 'voter-abc-12345' });
  assert.equal((await again.json()).duplicate, true, 'a served lineup is voted on once');
  const bad = await post('/api/votes', { token: r.token, pick: 'nope', voter: 'voter-abc-12345' });
  assert.equal(bad.status, 400);
  const forged = await post('/api/votes', { token: r.token.slice(0, -4) + 'AAAA', pick: ids[1], voter: 'voter-xyz-12345' });
  assert.equal(forged.status, 400, 'a tampered token is refused');
  const noToken = await post('/api/votes', { ids, pick: ids[1], voter: 'voter-xyz-12345' });
  assert.equal(noToken.status, 400, 'votes without a served lineup are refused');
  const e = await (await fetch(base + '/api/entries/' + ids[1])).json();
  assert.equal(e.shows, 1); assert.equal(e.picks, 1); assert.equal(e.rate, 100);
  const list = await (await fetch(base + '/api/entries')).json();
  assert.equal(list.votes, 1);
  assert.ok(list.entries.every((x) => x.text === ''), 'list omits full text');
});

test('variants share a group, never share a lineup, and report together', async () => {
  const a = await (await post('/api/entries', { text: 'Scheduling for dental clinics. Fill no-shows from a live waitlist by text.' })).json();
  const b = await (await post('/api/entries', { text: 'Dental clinics recover 14 empty slots a week. Waitlist by text, no receptionist calls.', variantOf: a.id })).json();
  assert.equal(b.entry.group, a.id);
  const bad = await post('/api/entries', { text: 'Some other headline for a different thing entirely.', variantOf: 'nope-nope' });
  assert.equal(bad.status, 400);
  for (let i = 0; i < 20; i++) {
    const r = await (await fetch(base + '/api/lineup')).json();
    const groups = r.lineup.map((e) => e.group);
    assert.equal(new Set(groups).size, 4, 'four distinct groups per lineup');
  }
  const ex = await (await fetch(base + '/api/lineup?exclude=' + b.id)).json();
  assert.ok(!ex.lineup.some((e) => e.id === a.id || e.id === b.id), 'excluding one variant excludes its siblings');
  const detail = await (await fetch(base + '/api/entries/' + a.id)).json();
  assert.equal(detail.variants.length, 2);
  assert.deepEqual(detail.variants.map((v) => v.id), [a.id, b.id]);
});

test('lineup tokens expire and verify', () => {
  const t = signLineup(['a', 'b', 'c', 'd']);
  assert.deepEqual(verifyLineup(t).ids, ['a', 'b', 'c', 'd']);
  assert.equal(verifyLineup('garbage'), null);
  assert.equal(verifyLineup(t + 'x'), null);
});

test('badge, export, and admin hide', async () => {
  const list = await (await fetch(base + '/api/entries')).json();
  const id = list.entries[0].id;
  const b = await fetch(base + `/badge/${id}.svg`);
  assert.equal(b.headers.get('content-type'), 'image/svg+xml');
  assert.match(await b.text(), /sameness \d+/);
  const csv = await (await fetch(base + '/api/export.csv')).text();
  assert.match(csv.split('\n')[0], /^id,created,score/);
  const noauth = await fetch(base + '/api/entries/' + id, { method: 'DELETE' });
  assert.equal(noauth.status, 403);
  const ok = await fetch(base + '/api/entries/' + id, { method: 'DELETE', headers: { authorization: 'Bearer secret' } });
  assert.equal(ok.status, 200);
  assert.equal((await fetch(base + '/api/entries/' + id)).status, 404);
});
