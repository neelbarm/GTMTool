'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractCopy, scoreRow, summarize, toCsv, decode } = require('../scripts/batch.js');

const PAGE = `<!doctype html><html><head><title>Acme &mdash; The all-in-one platform</title>
<meta name="description" content="Acme helps modern teams streamline workflows.">
<meta property="og:description" content="The all-in-one platform for modern teams &amp; growing companies.">
<style>h1{color:red}</style><script>var h1='<h1>fake</h1>';</script></head>
<body><nav><a href="/login">Login</a></nav>
<h1>Payroll for <em>restaurants</em>&nbsp;with tips</h1>
<p>Run payroll, tips, and schedules in one place, so managers spend less time on admin. Trusted by 400 restaurants.</p>
<h2>Features</h2></body></html>`;

test('extractCopy reads the h1 and the paragraph after it, ignoring scripts and entities', () => {
  const c = extractCopy(PAGE);
  assert.equal(c.head, 'Payroll for restaurants with tips');
  assert.match(c.sub, /^Run payroll, tips, and schedules/);
  assert.equal(c.source, 'h1');
  assert.ok(c.text.startsWith(c.head));
});

test('extractCopy falls back to og:description, then meta description, then title', () => {
  assert.equal(extractCopy('<html><head><meta property="og:description" content="Ship faster with Acme."></head><body><p>x</p></body></html>').source, 'og:description');
  assert.equal(extractCopy('<html><head><meta name="description" content="Ship faster with Acme."></head><body></body></html>').source, 'meta description');
  const t = extractCopy('<html><head><title>Acme &amp; Co</title></head><body></body></html>');
  assert.equal(t.source, 'title'); assert.equal(t.head, 'Acme & Co');
});

test('decode handles named, decimal and hex entities', () => {
  assert.equal(decode('a &amp; b &#8212; c &#x2019;s'), 'a & b — c ’s');
});

test('scoreRow and summarize produce a score distribution and a phrase table', () => {
  const generic = '<html><body><h1>The all-in-one platform that empowers modern teams</h1><p>Streamline workflows and unlock actionable insights at scale with seamless collaboration.</p></body></html>';
  const specific = '<html><body><h1>Chargeback recovery for Shopify stores doing over $1M a year</h1><p>We fight every dispute with order evidence and win 71% of them. 400 stores, $9.2M recovered since 2023.</p></body></html>';
  const rows = [scoreRow('https://www.generic.com', generic), scoreRow('https://specific.io/', specific), { url: 'https://down.com', domain: 'down.com', error: 'timeout', score: null }];
  assert.equal(rows[0].domain, 'generic.com');
  assert.equal(rows[1].domain, 'specific.io');
  assert.ok(rows[0].score > 60 && rows[1].score < 25, `scores ${rows[0].score} ${rows[1].score}`);
  const s = summarize(rows);
  assert.equal(s.sites, 3); assert.equal(s.scored, 2); assert.equal(s.failed, 1);
  assert.ok(s.phrases.some((p) => p.phrase === 'all-in-one' && p.sites === 1));
  assert.equal(s.couldBeAnyone, 50); assert.equal(s.identified, 50);
  const csv = toCsv(rows);
  assert.equal(csv.split('\n').length, 4);
  assert.match(csv.split('\n')[1], /^generic\.com,\d+,/);
  assert.match(csv.split('\n')[3], /timeout/);
});
