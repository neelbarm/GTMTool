import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness } from './helpers.js';
import { run } from '../runbooks/portfolio-digest.js';

test('portfolio-digest: selector + model metrics, screenshots, and deltas on the second run', async () => {
  const h = await harness('portfolio-digest', { read_metric: ({ prompt }) => ({ value: prompt.match(/\$[\d,]+/)[0], label: 'MRR', as_of: 'today' }) });
  try {
    const out = path.join(h.tmp, 'digests');
    const portfolio = h.writeConfig('portfolio.json', { companies: [
      { name: 'Acme Analytics', url: h.base + '/dash/acme-analytics', metric: { label: 'MRR', selector: '#mrr' }, screenshot: '.kpi' },
      { name: 'Northwind', url: h.base + '/dash/northwind', metric: { label: 'MRR', describe: 'monthly recurring revenue' } },
      { name: 'Broken Co', url: h.base + '/dash/nope', metric: { label: 'MRR', selector: '#mrr' }, waitFor: '#mrr' },
    ] });
    const r1 = await run(h.ctx, { portfolio, out });
    assert.equal(r1.rows[0].value, '$42,300'); assert.equal(r1.rows[0].n, 42300);
    assert.equal(r1.rows[1].value, '$9,870');
    assert.ok(r1.rows[2].error, 'a dead dashboard is reported, not fatal');
    assert.ok(fs.existsSync(path.join(out, r1.rows[0].shot)));
    const md1 = fs.readFileSync(r1.file, 'utf8');
    assert.match(md1, /\| Acme Analytics \| MRR \| \$42,300 \|  \| first run \|/);
    assert.match(md1, /2 of 3 read/);

    // Second run with a changed number.
    fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify({ date: '2026-10-06', rows: { 'Acme Analytics': { value: '$40,000', n: 40000 }, Northwind: { value: '$10,000', n: 10000 } } }));
    const r2 = await run(h.ctx, { portfolio, out });
    assert.equal(r2.rows[0].delta, 2300); assert.equal(r2.rows[0].pct, 5.8);
    assert.equal(r2.rows[1].delta, -130);
    assert.match(fs.readFileSync(r2.file, 'utf8'), /\| \$42,300 \| \$40,000 \| \+2,300 \(\+5.8%\) \|/);
  } finally { await h.close(); }
});
