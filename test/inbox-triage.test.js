import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness } from './helpers.js';
import { run } from '../runbooks/inbox-triage.js';

test('inbox-triage: skips the newsletter, reads two threads, writes three tasks', async () => {
  const h = await harness('inbox-triage', {
    pick_rows: ({ prompt }) => ({ ids: prompt.split('\n').filter((l) => /Priya|Marco/.test(l)).map((l) => l.match(/\[(\d+)\]/)[1]) }),
    extract_asks: ({ prompt }) => prompt.includes('redlined') ? { asks: [{ task: 'Send redlined MSA to Priya', due: '', from: 'Priya Shah' }] }
      : prompt.includes('W-9') ? { asks: [{ task: 'Send W-9 to Marco', due: '', from: 'Marco Ruiz' }, { task: 'Add Marco to Slack channel', due: '2026-10-19', from: 'Marco Ruiz' }] } : { asks: [] },
  });
  try {
    const out = path.join(h.tmp, 'tasks.md');
    const res = await run(h.ctx, { inbox: h.base + '/mail', target: 'markdown', out, all: true });
    assert.equal(res.status, 'ok');
    assert.equal(res.tasks.length, 3);
    const md = fs.readFileSync(out, 'utf8');
    assert.match(md, /- \[ \] Send redlined MSA to Priya — Priya Shah, Contract redlines </);
    assert.match(md, /Add Marco to Slack channel \(due 2026-10-19\)/);
    const opened = h.model.calls.filter((c) => c.name === 'extract_asks');
    assert.equal(opened.length, 2, 'only the two picked threads were opened');
    assert.ok(!opened.some((c) => c.prompt.includes('Top stories')), 'newsletter never read');
  } finally { await h.close(); }
});

test('inbox-triage: unread-only by default', async () => {
  const h = await harness('inbox-triage', { pick_rows: ({ prompt }) => { assert.ok(!prompt.includes('Lunch?'), 'read row excluded'); return { ids: [] }; } });
  try {
    const res = await run(h.ctx, { inbox: h.base + '/mail', target: 'markdown', out: path.join(h.tmp, 't.md') });
    assert.equal(res.status, 'nothing');
  } finally { await h.close(); }
});
