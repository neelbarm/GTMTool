#!/usr/bin/env node
/* Scores a batch of real homepages.

   Fetches each URL, pulls the headline (first <h1>) and the subhead that follows it,
   runs the sameness model on the pair, and writes a CSV plus a summary: the score
   distribution and the phrases that appear on the most sites.

   Usage: node scripts/batch.js [sites.txt] [--out data/batch.csv] [--concurrency 6] [--json]
   One URL per line; lines starting with # are ignored. Defaults to scripts/sites.txt. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { analyze } = require('../lib/model.js');

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', copy: '©', reg: '®', trade: '™' };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, c) => {
    if (c[0] === '#') { const n = c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[c.toLowerCase()] ?? m;
  });
}
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const meta = (html, re) => { const m = html.match(re); return m ? decode(m[1]).replace(/\s+/g, ' ').trim() : ''; };

/* Returns {head, sub, text, source} from a page's HTML. Pure, so it can be tested without a network. */
function extractCopy(html) {
  const clean = html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const h1 = clean.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let head = h1 ? text(h1[1]) : '';
  let sub = '';
  if (h1) {
    const after = clean.slice(h1.index + h1[0].length, h1.index + h1[0].length + 4000);
    const p = after.match(/<(p|h2|div)[^>]*>([\s\S]*?)<\/\1>/i);
    if (p) { const t = text(p[2]); if (t.length >= 20 && t.length <= 400 && !/^(skip|menu|login|sign)/i.test(t)) sub = t; }
  }
  const og = meta(clean, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) || meta(clean, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  const desc = meta(clean, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || meta(clean, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const title = meta(clean, /<title[^>]*>([\s\S]*?)<\/title>/i);
  let source = 'h1';
  if (!head || head.length < 8 || head.length > 200) { head = og || desc || title; source = og ? 'og:description' : desc ? 'meta description' : 'title'; sub = ''; }
  if (!sub && source === 'h1') sub = og || desc || '';
  const full = [head, sub].filter(Boolean).join(' ').slice(0, 400);
  return { head, sub, text: full, source };
}

async function fetchPage(url, timeoutMs = 15000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; Lineup/1.0; +https://github.com/neelbarm/GTMTool)', accept: 'text/html,*/*' } });
    if (!r.ok) return { error: 'HTTP ' + r.status };
    return { html: (await r.text()).slice(0, 2_000_000), finalUrl: r.url };
  } catch (e) { return { error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message) }; }
  finally { clearTimeout(t); }
}

function scoreRow(url, html) {
  const c = extractCopy(html);
  const r = analyze(c.text);
  return { url, domain: url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''), source: c.source, head: c.head, text: c.text,
    score: r.score, covered: r.covered, parts: Object.fromEntries(Object.entries(r.parts).map(([k, v]) => [k, v.hit ? 'present' : v.part ? 'partial' : 'missing'])),
    phrases: [...new Set(r.marks.map((m) => m.ph.toLowerCase()))] };
}

function summarize(rows) {
  const ok = rows.filter((r) => r.score !== null && r.score !== undefined);
  const scores = ok.map((r) => r.score).sort((a, b) => a - b);
  const median = scores.length ? scores[Math.floor(scores.length / 2)] : null;
  const share = (f) => (scores.length ? Math.round((100 * scores.filter(f).length) / scores.length) : 0);
  const freq = new Map();
  for (const r of ok) for (const p of r.phrases) freq.set(p, (freq.get(p) || 0) + 1);
  const phrases = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 25).map(([phrase, sites]) => ({ phrase, sites }));
  const missing = {};
  for (const k of ['who', 'alt', 'how', 'get', 'proof']) missing[k] = ok.length ? Math.round((100 * ok.filter((r) => r.parts[k] === 'missing').length) / ok.length) : 0;
  return { sites: rows.length, scored: ok.length, failed: rows.length - ok.length, median, couldBeAnyone: share((s) => s >= 70), halfAPosition: share((s) => s >= 45 && s < 70), identified: share((s) => s < 25), missingParts: missing, phrases };
}

function toCsv(rows) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = ['domain,score,covered_pct,who,alt,how,get,proof,source,headline,text,url'];
  for (const r of rows) lines.push([r.domain, r.score ?? '', r.covered ?? '', r.parts?.who ?? '', r.parts?.alt ?? '', r.parts?.how ?? '', r.parts?.get ?? '', r.parts?.proof ?? '', r.source ?? r.error ?? '', esc(r.head), esc(r.text), r.url].join(','));
  return lines.join('\n');
}

function reportText(s) {
  const out = [`Scored ${s.scored} of ${s.sites} homepages (${s.failed} unreachable).`, '',
    `Median sameness: ${s.median}/100.`,
    `${s.couldBeAnyone}% score 70 or more (could be anyone). ${s.halfAPosition}% are half a position. ${s.identified}% score under 25 (identified).`, '',
    `Missing parts: who ${s.missingParts.who}%, instead-of ${s.missingParts.alt}%, because ${s.missingParts.how}%, so-that ${s.missingParts.get}%, proof ${s.missingParts.proof}%.`, '',
    'Phrases found on the most sites:'];
  for (const p of s.phrases) out.push(`  ${String(p.sites).padStart(3)}  ${p.phrase}`);
  return out.join('\n');
}

module.exports = { extractCopy, scoreRow, summarize, toCsv, reportText, decode };

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a) && !args[args.indexOf(a) - 1]?.startsWith('--')) || path.join(__dirname, 'sites.txt');
  const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'batch.csv');
  const concurrency = Number(args[args.indexOf('--concurrency') + 1]) || 6;
  const urls = fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((u) => (/^https?:\/\//.test(u) ? u : 'https://' + u));
  const rows = new Array(urls.length);
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const k = i++; const url = urls[k];
      const page = await fetchPage(url);
      rows[k] = page.error ? { url, domain: url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''), error: page.error, score: null } : scoreRow(url, page.html);
      process.stderr.write(`${String(k + 1).padStart(3)}/${urls.length}  ${rows[k].score === null ? 'skip ' + rows[k].error : String(rows[k].score).padStart(3) + '  ' + rows[k].head.slice(0, 70)}\n`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, toCsv(rows));
  const s = summarize(rows);
  process.stdout.write((args.includes('--json') ? JSON.stringify({ summary: s, rows }, null, 2) : reportText(s) + `\n\nCSV written to ${out}`) + '\n');
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
