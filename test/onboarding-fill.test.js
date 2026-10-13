import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness } from './helpers.js';
import { run } from '../runbooks/onboarding-fill.js';

const INTAKE = `Hi team, new customer: Northwind Traders LLC, EIN 12-3456789, incorporated in Delaware. They pay biweekly. Admin is Marco Ruiz, marco@northwind.test. 41 employees to start.`;

test('onboarding-fill: intake → two portal pages → CSV tracker row', async () => {
  const h = await harness('onboarding-fill', {
    extract_intake: ({ prompt }) => { assert.ok(prompt.includes('Northwind')); return { company: 'Northwind Traders LLC', ein: '123456789', state: 'DE', frequency: 'Biweekly', admin_name: 'Marco Ruiz', admin_email: 'marco@northwind.test', headcount: '41' }; },
  });
  try {
    const intake = path.join(h.tmp, 'intake.txt'); fs.writeFileSync(intake, INTAKE);
    const csv = path.join(h.tmp, 'onboarding.csv');
    const forms = h.writeConfig('forms.json', {
      name: 'Fixture payroll', nameField: 'company',
      schema: { company: 'Legal name', ein: 'EIN', state: 'State', frequency: 'Pay frequency', admin_name: 'Admin', admin_email: 'Admin email', headcount: 'Headcount' },
      pages: [
        { title: 'Company', url: h.base + '/payroll/new', fields: { company: { label: 'Legal company name' }, ein: { label: 'EIN' }, state: { label: 'State of incorporation' }, frequency: { label: 'Pay frequency' } }, submit: 'Continue', confirm: false },
        { title: 'Admin', fields: { admin_name: { label: 'Admin name' }, admin_email: { label: 'Admin email' }, headcount: { label: 'Headcount' } }, submit: 'Submit application', successText: 'submitted', captureRef: 'PR-\\d+' },
      ],
      tracker: { type: 'csv', path: csv, columns: { date: '$date', customer: 'company', owner: '$owner', reference: '$ref', status: "'Submitted'" } },
    });
    const res = await run(h.ctx, { intake, forms, owner: 'Neel' });
    assert.equal(res.status, 'ok');
    assert.deepEqual(res.refs, ['PR-1001']);
    const st = await h.state();
    assert.equal(st.payroll.length, 1);
    assert.equal(st.payroll[0].company, 'Northwind Traders LLC');
    assert.equal(st.payroll[0].frequency, 'Biweekly');
    assert.equal(st.payroll[0].admin_email, 'marco@northwind.test');
    assert.equal(st.payroll[0].headcount, '41');
    const rows = fs.readFileSync(csv, 'utf8').trim().split('\n');
    assert.equal(rows[0], 'date,customer,owner,reference,status');
    assert.match(rows[1], /"Northwind Traders LLC","Neel","PR-1001","Submitted"/);
  } finally { await h.close(); }
});

test('onboarding-fill: web-form tracker', async () => {
  const h = await harness('onboarding-fill', { extract_intake: () => ({ company: 'Globex', ein: '1', state: 'CA', frequency: 'Monthly', admin_name: 'A', admin_email: 'a@globex.test', headcount: '3' }) });
  try {
    const intake = path.join(h.tmp, 'i.txt'); fs.writeFileSync(intake, 'Globex');
    const forms = h.writeConfig('forms.json', {
      name: 'Fixture payroll', schema: { company: 'x', ein: 'x', state: 'x', frequency: 'x', admin_name: 'x', admin_email: 'x', headcount: 'x' },
      pages: [
        { url: h.base + '/payroll/new', fields: { company: { label: 'Legal company name' }, ein: { label: 'EIN' }, state: { label: 'State of incorporation' }, frequency: { label: 'Pay frequency' } }, submit: 'Continue' },
        { fields: { admin_name: { label: 'Admin name' }, admin_email: { label: 'Admin email' }, headcount: { label: 'Headcount' } }, submit: 'Submit application', successText: 'submitted' },
      ],
      tracker: { type: 'form', url: h.base + '/tracker', fields: { customer: { label: 'Customer' }, owner: { label: 'Owner' }, status: { label: 'Status' } }, submit: 'Add row', columns: { customer: 'company', owner: '$owner', status: "'Submitted'" } },
    });
    const res = await run(h.ctx, { intake, forms, owner: 'Neel' });
    assert.equal(res.status, 'ok');
    const st = await h.state();
    assert.deepEqual(st.tracker.at(-1), { customer: 'Globex', owner: 'Neel', status: 'Submitted' });
  } finally { await h.close(); }
});
