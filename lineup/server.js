#!/usr/bin/env node
/* Lineup server. Zero dependencies: Node 22.13+ (built-in SQLite).
   Serves the page, the scoring model, and the index API. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const model = require('./lib/model.js');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'lineup.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY, hash TEXT UNIQUE NOT NULL, text TEXT NOT NULL, head TEXT NOT NULL,
    score INTEGER NOT NULL, covered INTEGER NOT NULL, parts TEXT NOT NULL,
    created INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0, seed INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, voter TEXT NOT NULL, setkey TEXT NOT NULL,
    pick TEXT NOT NULL, created INTEGER NOT NULL, iphash TEXT NOT NULL,
    UNIQUE (voter, setkey)
  );
  CREATE TABLE IF NOT EXISTS showings (
    vote_id INTEGER NOT NULL, entry_id TEXT NOT NULL, picked INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS showings_entry ON showings (entry_id);
`);
if (!db.prepare("SELECT 1 FROM pragma_table_info('entries') WHERE name = 'grp'").get()) db.exec('ALTER TABLE entries ADD COLUMN grp TEXT');
db.exec('CREATE INDEX IF NOT EXISTS entries_grp ON entries (grp)');
db.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS used_tokens (nonce TEXT PRIMARY KEY, created INTEGER NOT NULL)`);
/* Lineups are signed so a vote can only be cast on a lineup the server actually served, once. */
let SECRET = process.env.LINEUP_SECRET || (db.prepare("SELECT v FROM meta WHERE k = 'secret'").get() || {}).v;
if (!SECRET) { SECRET = crypto.randomBytes(32).toString('hex'); db.prepare("INSERT INTO meta (k, v) VALUES ('secret', ?)").run(SECRET); }
setInterval(() => db.prepare('DELETE FROM used_tokens WHERE created < ?').run(Date.now() - 7200000), 600000).unref();

const q = {
  insertEntry: db.prepare('INSERT INTO entries (id,hash,text,head,score,covered,parts,created,seed,grp) VALUES (?,?,?,?,?,?,?,?,?,?)'),
  groupOf: db.prepare('SELECT id, grp FROM entries WHERE id = ? AND hidden = 0'),
  variants: db.prepare(`SELECT e.id, e.head, e.score, e.created,
                     (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id) AS shows,
                     (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id AND s.picked = 1) AS picks
                     FROM entries e WHERE e.grp = ? AND e.hidden = 0 ORDER BY e.created`),
  byHash: db.prepare('SELECT id FROM entries WHERE hash = ?'),
  entry: db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id) AS shows,
                     (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id AND s.picked = 1) AS picks
                     FROM entries e WHERE e.id = ? AND e.hidden = 0`),
  entries: db.prepare(`SELECT e.id, e.head, e.score, e.covered, e.parts, e.created, e.seed, e.grp,
                     (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id) AS shows,
                     (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id AND s.picked = 1) AS picks
                     FROM entries e WHERE e.hidden = 0 ORDER BY e.created DESC LIMIT ?`),
  exportRows: db.prepare(`SELECT e.id, e.text, e.score, e.covered, e.parts, e.created,
                     (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id) AS shows,
                     (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id AND s.picked = 1) AS picks
                     FROM entries e WHERE e.hidden = 0 ORDER BY e.created`),
  exists: db.prepare('SELECT id FROM entries WHERE id = ? AND hidden = 0'),
  insertVote: db.prepare('INSERT INTO votes (voter,setkey,pick,created,iphash) VALUES (?,?,?,?,?)'),
  insertShowing: db.prepare('INSERT INTO showings (vote_id,entry_id,picked) VALUES (?,?,?)'),
  hide: db.prepare('UPDATE entries SET hidden = 1 WHERE id = ?'),
  counts: db.prepare('SELECT (SELECT COUNT(*) FROM entries WHERE hidden = 0) AS entries, (SELECT COUNT(*) FROM votes) AS votes'),
};

/* ---------- helpers ---------- */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newId = () => crypto.randomBytes(6).toString('base64url');
const normalize = (t) => t.replace(/\s+/g, ' ').trim();
const TOKEN_TTL = 3600000;
function signLineup(ids) {
  const body = Buffer.from(JSON.stringify({ ids, exp: Date.now() + TOKEN_TTL, n: crypto.randomBytes(8).toString('base64url') })).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
}
function verifyLineup(token) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const d = JSON.parse(Buffer.from(body, 'base64url').toString()); return d.exp > Date.now() && Array.isArray(d.ids) ? d : null; } catch (e) { return null; }
}
const ipOf = (req) => (TRUST_PROXY && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress || '');
const limits = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const arr = (limits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { limits.set(key, arr); return true; }
  arr.push(now); limits.set(key, arr); return false;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of limits) if (!v.some((t) => now - t < 3600000)) limits.delete(k); }, 600000).unref();

function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', ...extra });
  res.end(data);
}
function readJson(req, max = 8192) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; if (buf.length > max) { reject(new Error('too_large')); req.destroy(); } });
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}
function shape(row) {
  const shows = row.shows || 0, picks = row.picks || 0;
  return { id: row.id, head: row.head, text: row.text, score: row.score, covered: row.covered,
    parts: JSON.parse(row.parts), created: row.created, seed: !!row.seed, group: row.grp || row.id,
    shows, picks, rate: shows ? Math.round((100 * picks) / shows) : null };
}
function addEntry(text, seed = false, variantOf = '') {
  const t = normalize(text);
  const r = model.analyze(t);
  if (r.score === null) return { error: 'Needs at least three words.' };
  if (t.length < 12) return { error: 'Too short to score.' };
  if (t.length > 400) return { error: 'Keep it under 400 characters. A headline and a subhead is enough.' };
  if (/https?:\/\/|www\.|[\w.-]+@[\w-]+\.[a-z]{2,}/i.test(t)) return { error: 'No links or email addresses. Just the words a buyer would read.' };
  if (/[A-Z]{12,}/.test(t)) return { error: 'Easy on the caps lock.' };
  const hash = sha(t.toLowerCase());
  const dup = q.byHash.get(hash);
  if (dup) return { id: dup.id, duplicate: true };
  const parts = {}; for (const k of Object.keys(r.parts)) parts[k] = r.parts[k].hit ? 2 : r.parts[k].part ? 1 : 0;
  const id = newId();
  let grp = id;
  if (variantOf) { const base = q.groupOf.get(String(variantOf)); if (!base) return { error: 'The headline this is a variant of is not in the index.' }; grp = base.grp || base.id; }
  q.insertEntry.run(id, hash, t, model.headlineOf(t), r.score, r.covered, JSON.stringify(parts), Date.now(), seed ? 1 : 0, grp);
  return { id, duplicate: false };
}
function recordVote({ token, pick, voter }, iphash) {
  const t = verifyLineup(token);
  if (!t) return { error: 'This lineup has expired. Load a new one.' };
  const ids = t.ids;
  if (!Array.isArray(ids) || ids.length !== 4 || new Set(ids).size !== 4) return { error: 'A lineup has four distinct headlines.' };
  if (!ids.includes(pick)) return { error: 'Pick one of the four.' };
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(voter || ''))) return { error: 'Missing voter id.' };
  for (const id of ids) { if (!/^[A-Za-z0-9_-]{4,24}$/.test(id) || !q.exists.get(id)) return { error: 'Unknown headline in lineup.' }; }
  const setkey = ids.slice().sort().join('|');
  try { db.prepare('INSERT INTO used_tokens (nonce, created) VALUES (?, ?)').run(t.n, Date.now()); }
  catch (e) { return { duplicate: true }; }
  let voteId;
  try { voteId = Number(q.insertVote.run(voter, setkey, pick, Date.now(), iphash).lastInsertRowid); }
  catch (e) { return { duplicate: true }; }
  for (const id of ids) q.insertShowing.run(voteId, id, id === pick ? 1 : 0);
  return { ok: true };
}
function pickLineup(exclude, seen) {
  const ex = exclude ? q.groupOf.get(exclude) : null; const exGrp = ex ? (ex.grp || ex.id) : null;
  const rows = q.entries.all(2000).filter((r) => r.id !== exclude && (r.grp || r.id) !== exGrp);
  if (rows.length < 4) return null;
  const fresh = rows.filter((r) => !seen.has(r.id));
  const pool = (fresh.length >= 4 ? fresh : rows).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const out = [], groups = new Set();
  for (const r of pool) { const g = r.grp || r.id; if (groups.has(g)) continue; groups.add(g); out.push(r); if (out.length === 4) break; }
  return out.length === 4 ? out.map(shape) : null;
}
function badge(entry) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const left = 'LINEUP', mid = `sameness ${entry.score}`, right = entry.rate === null ? 'unjudged' : `picked ${entry.rate}%`;
  const w = (s) => Math.round(s.length * 7.2) + 16;
  const w1 = w(left), w2 = w(mid), w3 = w(right), W = w1 + w2 + w3;
  const tone = entry.score >= 70 ? '#D7261E' : entry.score >= 45 ? '#F5C400' : '#1C7A4C';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="22" role="img" aria-label="${esc(left)}: ${esc(mid)}, ${esc(right)}">
<rect width="${w1}" height="22" fill="#141618"/><rect x="${w1}" width="${w2}" height="22" fill="${tone}"/><rect x="${w1 + w2}" width="${w3}" height="22" fill="#E4E7EA"/>
<g font-family="ui-monospace,Menlo,monospace" font-size="11" font-weight="600">
<text x="8" y="15" fill="#F5C400">${esc(left)}</text><text x="${w1 + 8}" y="15" fill="${entry.score >= 45 && entry.score < 70 ? '#141618' : '#fff'}">${esc(mid)}</text><text x="${w1 + w2 + 8}" y="15" fill="#141618">${esc(right)}</text>
</g></svg>`;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };
function serveFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream', { 'cache-control': 'public, max-age=300' });
  });
}

/* ---------- routes ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const ip = ipOf(req), iphash = sha('ip:' + ip).slice(0, 16);
  res.setHeader('x-content-type-options', 'nosniff');
  try {
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
    if (req.method === 'GET' && p === '/model.js') return serveFile(res, path.join(__dirname, 'lib', 'model.js'));
    if (req.method === 'GET' && p === '/api/health') return send(res, 200, { ok: true, ...q.counts.get() });
    if (req.method === 'GET' && p === '/api/stats') return send(res, 200, q.counts.get());
    if (req.method === 'GET' && p === '/api/entries') {
      const limit = Math.min(2000, Math.max(1, Number(url.searchParams.get('limit')) || 1000));
      const c = q.counts.get();
      return send(res, 200, { entries: q.entries.all(limit).map((r) => shape({ ...r, text: '' })), total: c.entries, votes: c.votes });
    }
    if (req.method === 'POST' && p === '/api/entries') {
      if (rateLimited('e:' + iphash, 20, 3600000)) return send(res, 429, { error: 'Slow down. Twenty headlines an hour is plenty.' });
      const body = await readJson(req);
      const out = addEntry(String(body.text || ''), false, body.variantOf ? String(body.variantOf) : '');
      if (out.error) return send(res, 400, out);
      return send(res, out.duplicate ? 200 : 201, { ...out, entry: shape(q.entry.get(out.id)) });
    }
    let m;
    if (req.method === 'GET' && (m = p.match(/^\/api\/entries\/([A-Za-z0-9_-]+)$/))) {
      const row = q.entry.get(m[1]);
      if (!row) return send(res, 404, { error: 'Not in the index.' });
      const e = shape(row);
      e.variants = q.variants.all(e.group).map((v) => ({ id: v.id, head: v.head, score: v.score, shows: v.shows, picks: v.picks, rate: v.shows ? Math.round((100 * v.picks) / v.shows) : null }));
      return send(res, 200, e);
    }
    if (req.method === 'DELETE' && (m = p.match(/^\/api\/entries\/([A-Za-z0-9_-]+)$/))) {
      if (!ADMIN_TOKEN || req.headers.authorization !== 'Bearer ' + ADMIN_TOKEN) return send(res, 403, { error: 'Admin token required.' });
      q.hide.run(m[1]); return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && p === '/api/lineup') {
      const seen = new Set(String(url.searchParams.get('seen') || '').split(',').filter(Boolean));
      if (rateLimited('l:' + iphash, 600, 3600000)) return send(res, 429, { error: 'Too many lineups. Take a break.' });
      const four = pickLineup(url.searchParams.get('exclude') || '', seen);
      return four ? send(res, 200, { lineup: four, token: signLineup(four.map((e) => e.id)) }) : send(res, 200, { lineup: null, need: 4 - q.counts.get().entries });
    }
    if (req.method === 'POST' && p === '/api/votes') {
      if (rateLimited('v:' + iphash, 300, 3600000)) return send(res, 429, { error: 'That is a lot of judging. Take a break.' });
      const body = await readJson(req);
      const out = recordVote(body, iphash);
      if (out.error) return send(res, 400, out);
      return send(res, 200, out);
    }
    if (req.method === 'GET' && (m = p.match(/^\/e\/([A-Za-z0-9_-]+)$/))) {
      const row = q.entry.get(m[1]);
      if (!row) return send(res, 404, 'Not found', 'text/plain');
      const e = shape(row);
      const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const title = `Sameness ${e.score}/100` + (e.rate === null ? '' : ` · picked by ${e.rate}% of buyers`);
      const origin = SITE_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)} · Lineup</title>
<meta property="og:type" content="website"><meta property="og:site_name" content="Lineup"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(e.head)}  —  Could a buyer pick you out of a lineup? Test your own homepage."><meta property="og:url" content="${esc(origin)}/e/${e.id}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(e.head)}">
<meta http-equiv="refresh" content="0; url=/#e=${e.id}"></head><body><p>${esc(e.head)}</p><p>${esc(title)}</p><p><a href="/#e=${e.id}">Open in Lineup</a></p></body></html>`;
      return send(res, 200, html, 'text/html; charset=utf-8', { 'cache-control': 'public, max-age=300' });
    }
    if (req.method === 'GET' && (m = p.match(/^\/badge\/([A-Za-z0-9_-]+)\.svg$/))) {
      const row = q.entry.get(m[1]);
      if (!row) return send(res, 404, 'Not found', 'text/plain');
      return send(res, 200, badge(shape(row)), 'image/svg+xml', { 'cache-control': 'public, max-age=600' });
    }
    if (req.method === 'GET' && p === '/api/export.csv') {
      const csv = ['id,created,score,covered_pct,who,alt,how,get,proof,shows,picks,pick_rate,text'];
      for (const r of q.exportRows.all()) {
        const e = shape(r);
        csv.push([e.id, new Date(e.created).toISOString(), e.score, e.covered, e.parts.who, e.parts.alt, e.parts.how, e.parts.get, e.parts.proof, e.shows, e.picks, e.rate === null ? '' : e.rate, '"' + e.text.replace(/"/g, '""') + '"'].join(','));
      }
      return send(res, 200, csv.join('\n'), 'text/csv; charset=utf-8', { 'content-disposition': 'attachment; filename="lineup-index.csv"' });
    }
    if (req.method === 'GET' && !p.includes('..')) {
      const file = path.join(PUBLIC_DIR, p);
      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) return serveFile(res, file);
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, e.message === 'too_large' || e.message === 'bad_json' ? 400 : 500, { error: e.message === 'bad_json' ? 'Bad JSON.' : e.message === 'too_large' ? 'Body too large.' : 'Server error.' });
  }
});

module.exports = { server, db, addEntry, recordVote, pickLineup, shape, badge, signLineup, verifyLineup };
if (require.main === module) {
  server.listen(PORT, () => console.log(`Lineup listening on http://localhost:${PORT}  (data: ${DATA_DIR})`));
}
