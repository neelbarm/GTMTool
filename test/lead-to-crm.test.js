import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './helpers.js';
import { run } from '../runbooks/lead-to-crm.js';

const extract = ({ prompt }) => ({
  name: 'Acme Analytics', domain: '', one_liner: 'Revenue analytics for SaaS finance teams', industry: 'Analytics', size: '', location: 'Boston',
  emails: ['hello@acme.test'], signals: ['Series B, $40M, March 2026', 'Customers: Northwind, Globex'], generic_copy: false,
  _saw: prompt.includes('closes the books'),
});

test('lead-to-crm: name → search → homepage → new CRM record', async () => {
  const h = await harness('lead-to-crm', { extract_company: extract });
  try {
    const crm = h.writeConfig('crm.json', { name: 'Fixture CRM', createUrl: h.base + '/crm/new', searchUrl: h.base + '/crm?q={q}', searchWeb: h.base + '/search?q={q}',
      fields: { name: { label: 'Company name' }, domain: { label: 'Website' }, one_liner: { label: 'Description' }, industry: { label: 'Industry' }, size: { label: 'Employees' }, location: { label: 'Location' }, note: { label: 'Notes' } },
      submitButton: 'Create company', updateButton: 'Save', successText: 'Company saved' });
    const out = await run(h.ctx, { company: 'Acme', crm, note: 'Met at SaaStr' });
    assert.equal(out.status, 'ok');
    assert.deepEqual(out.missing, []);
    const st = await h.state();
    const rec = st.crm.find((r) => r.name === 'Acme Analytics');
    assert.ok(rec, 'record created');
    assert.equal(rec.domain, '127.0.0.1');
    assert.equal(rec.industry, 'Analytics');
    assert.equal(rec.location, 'Boston');
    assert.equal(rec.note, 'Met at SaaStr');
    assert.equal(h.model.calls.length, 1, 'one model call: the extraction');
    assert.ok(h.model.calls[0].prompt.includes('closes the books'), 'homepage text reached the model');
  } finally { await h.close(); }
});

test('lead-to-crm: existing record → update path with a diff', async () => {
  const h = await harness('lead-to-crm', { extract_company: () => ({ name: 'Oldco', domain: 'oldco.com', one_liner: 'Legacy ERP, now cloud', industry: 'Software', size: '250', location: 'Boston', emails: [], signals: [], generic_copy: true }), locate: ({ prompt }) => { throw new Error('unexpected locate: ' + prompt.slice(0, 400)); } });
  try {
    const crm = h.writeConfig('crm.json', { name: 'Fixture CRM', createUrl: h.base + '/crm/new', searchUrl: h.base + '/crm?q={q}',
      fields: { name: { label: 'Company name' }, domain: { label: 'Website' }, one_liner: { label: 'Description' }, size: { label: 'Employees' } }, submitButton: 'Create company', updateButton: 'Save', successText: 'Company saved' });
    const out = await run(h.ctx, { url: h.base + '/site/oldco', crm });
    assert.equal(out.status, 'ok');
    assert.equal(out.existing, true, 'took the update path');
    const st = await h.state();
    const rec = st.crm.find((r) => r.domain === 'oldco.com');
    assert.equal(rec.size, '250');
    assert.equal(rec.one_liner, 'Legacy ERP, now cloud');
    assert.equal(st.crm.filter((r) => r.domain === 'oldco.com').length, 1, 'no duplicate created');
  } finally { await h.close(); }
});
