import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { harness } from './helpers.js';
import { run, pickWinner } from '../runbooks/lineup-to-site.js';

test('pickWinner: crowd rate wins when there are votes, else lowest sameness score', async () => {
  const e = { id: 'a', head: 'A', score: 70, shows: 10, picks: 2, rate: 20, variants: [{ id: 'b', head: 'B', score: 30, shows: 12, picks: 6, rate: 50 }, { id: 'c', head: 'C', score: 10, shows: 1, picks: 1, rate: 100 }] };
  assert.equal((await pickWinner(e)).id, 'b');
  const cold = { id: 'a', head: 'A', score: 70, shows: 0, picks: 0, rate: null, variants: [{ id: 'c', head: 'C', score: 10, shows: 0, picks: 0, rate: null }] };
  assert.equal((await pickWinner(cold)).id, 'c');
});

test('lineup-to-site: fetches the entry, stages the winner as a draft, never publishes', async () => {
  const h = await harness('lineup-to-site');
  const lineup = http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ id: 'x1', head: 'The all-in-one platform for modern teams', score: 88, shows: 20, picks: 2, rate: 10, variants: [{ id: 'x2', head: 'Close the books in a day, not a week', score: 22, shows: 20, picks: 12, rate: 60 }] })); });
  await new Promise((r) => lineup.listen(0, '127.0.0.1', r));
  try {
    const cms = h.writeConfig('cms.json', { name: 'Fixture CMS', url: h.base + '/cms/home', field: { label: 'Hero headline' }, saveButton: 'Save draft' });
    const res = await run(h.ctx, { entry: 'x1', lineup: `http://127.0.0.1:${lineup.address().port}`, cms });
    assert.equal(res.status, 'ok');
    assert.equal(res.before, 'The all-in-one platform for modern teams');
    assert.equal(res.headline, 'Close the books in a day, not a week');
    assert.equal(res.saved, true);
    const st = await h.state();
    assert.equal(st.cms.hero, 'Close the books in a day, not a week');
    assert.equal(st.cms.draftSaved, 1);
    assert.equal(st.cms.published, false);
    assert.equal(st.publishClicks, 0);
    assert.equal(h.model.calls.length, 0, 'no model call needed when the label matches');
  } finally { lineup.close(); await h.close(); }
});

test('lineup-to-site: refuses a save button that is really Publish', async () => {
  const h = await harness('lineup-to-site');
  try {
    const cms = h.writeConfig('cms.json', { name: 'Fixture CMS', url: h.base + '/cms/home', field: { label: 'Hero headline' }, saveButton: 'Publish' });
    await assert.rejects(run(h.ctx, { text: 'Something new', cms }), /Refusing/);
    assert.equal((await h.state()).publishClicks, 0);
  } finally { await h.close(); }
});

test('lineup-to-site: falls back to the model to find the field', async () => {
  const h = await harness('lineup-to-site', { locate: ({ prompt }) => ({ id: prompt.match(/\[(\d+)\] textbox "Hero headline"/)[1], confidence: 0.9 }) });
  try {
    const cms = h.writeConfig('cms.json', { name: 'Fixture CMS', url: h.base + '/cms/home', field: { label: 'Main title', what: 'the hero headline input' } });
    const res = await run(h.ctx, { text: 'Typed but not saved', cms });
    assert.equal(res.status, 'ok'); assert.equal(res.saved, false);
    assert.equal((await h.state()).cms.hero, 'The all-in-one platform for modern teams', 'nothing saved without a save button');
    assert.equal(h.model.calls.length, 1);
  } finally { await h.close(); }
});
