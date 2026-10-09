'use strict';
process.env.DATA_DIR = require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'lineup-eval-'));
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { db, addEntry, recordVote, signLineup } = require('../server.js');
const { evaluate, report, spearman } = require('../scripts/eval.js');

const SPECIFIC = ['Payroll for restaurants with 20 to 200 staff. Tips and schedules in one place, 400 restaurants on board.',
  'Chargeback recovery for Shopify stores doing over $1M a year. We win 71% of disputes. 400 stores, $9.2M recovered.'];
const GENERIC = ['The all-in-one platform that empowers modern teams to streamline workflows and unlock actionable insights at scale.',
  'Work smarter, not harder. Our end-to-end solution helps businesses of all sizes optimize operations and drive growth.'];

test('spearman ranks with ties', () => {
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(spearman([1, 2, 3, 4], [40, 30, 20, 10]), -1);
  assert.equal(spearman([1, 2], [1, 2]), null);
});

test('evaluate reports agreement, correlation and disagreements from real votes', () => {
  const ids = [...SPECIFIC, ...GENERIC].map((t) => addEntry(t, true).id);
  assert.equal(ids.length, 4);
  const r0 = evaluate(db);
  assert.equal(r0.votes, 0); assert.equal(r0.agreement, null);
  assert.match(report(r0), /No votes yet/);
  // 12 voters pick the most specific headline, 3 pick a generic one, 1 picks the other specific one.
  for (let i = 0; i < 16; i++) {
    const pick = i < 12 ? ids[1] : i < 15 ? ids[2] : ids[0];
    const out = recordVote({ token: signLineup(ids), pick, voter: 'voter-' + i + '-xxxxxx' }, 'ip');
    assert.ok(!out.error, out.error);
  }
  const r = evaluate(db, { minShows: 10 });
  assert.equal(r.votes, 16);
  assert.ok(r.agreement.lowestWins >= 0.7, 'lowest wins ' + r.agreement.lowestWins);
  assert.ok(r.agreement.lowerHalfWins >= 0.8);
  assert.equal(r.rankedEntries, 4);
  assert.ok(r.spearman < 0, 'score and pick rate should move in opposite directions: ' + r.spearman);
  assert.equal(r.specificButIgnored.length, 1);
  assert.equal(r.specificButIgnored[0].id, ids[0]);
  assert.equal(r.genericButPicked.length, 0);
  const text = report(r);
  assert.match(text, /lowest sameness score in its set \| \d+% \| 25%/);
  assert.match(text, /Specific by the ruler, ignored by the crowd \(1\)/);
});
