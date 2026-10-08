'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { coach, SCHEMA } = require('../lib/coach.js');

/* A fake Anthropic client that records the request and returns a canned structured response. */
function fakeClient(reply, stopReason = 'end_turn') {
  const calls = [];
  return {
    calls,
    beta: { messages: { create: async (req) => { calls.push(req); return { model: 'claude-opus-5-5', stop_reason: stopReason, content: [{ type: 'text', text: JSON.stringify(reply) }] }; } } },
  };
}

const reply = {
  critique: 'Name the buyer and give one number.',
  slots: { who: 'restaurants with 20 to 200 staff', alt: 'spreadsheets', how: 'we split tips by hours and role', get: 'payroll closes in [number] minutes', proof: '' },
  rewrites: [
    { angle: 'buyer', headline: 'Tip pooling for restaurants with 20 to 200 staff.', subhead: 'Splits by hours and role, instead of the manager’s memory. 2,800 restaurants.' },
    { angle: 'alternative', headline: 'Replace the tip spreadsheet.', subhead: 'Restaurants with 20 to 200 staff split tips by hours and role. 2,800 restaurants.' },
    { angle: 'outcome', headline: 'Close tips in 4 minutes, not an hour.', subhead: 'For restaurants with 20 to 200 staff. Splits by hours and role. 2,800 restaurants.' },
  ],
};

test('coach sends the analysis and scores every rewrite with the ruler', async () => {
  const client = fakeClient(reply);
  const out = await coach('The all-in-one platform that empowers modern teams to streamline workflows.', client);
  assert.equal(client.calls.length, 1);
  const req = client.calls[0];
  assert.equal(req.model, 'claude-opus-5-5');
  assert.equal(req.fallbacks, 'default');
  assert.deepEqual(req.output_config.format, { type: 'json_schema', schema: SCHEMA });
  assert.match(req.messages[0].content, /Tagged phrases: "all-in-one"/);
  assert.match(req.messages[0].content, /Who: MISSING/);
  assert.ok(out.before >= 80);
  assert.equal(out.rewrites.length, 3);
  for (const r of out.rewrites) { assert.equal(typeof r.score, 'number'); assert.ok(r.score < out.before, `${r.score} should beat ${out.before}`); assert.equal(r.parts.who, 2); }
  assert.equal(out.slots.who, 'restaurants with 20 to 200 staff');
});

test('coach surfaces a refusal as a 422', async () => {
  const client = fakeClient(reply, 'refusal');
  await assert.rejects(() => coach('The all-in-one platform for modern teams.', client), (e) => e.status === 422);
});

test('coach rejects copy too short to score', async () => {
  await assert.rejects(() => coach('Hi', fakeClient(reply)), (e) => e.status === 400);
});
