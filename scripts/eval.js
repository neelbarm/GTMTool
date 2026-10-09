#!/usr/bin/env node
/* Measures the ruler against the crowd.

   Every vote in the index is a human judgment: four headlines were shown, one was picked.
   The sameness score claims that lower is better. If the claim holds, the picked headline
   should tend to have the lowest score in its set of four. This script reports how often
   that is true, the rank correlation between score and pick rate, and the headlines where
   the ruler and the crowd disagree most, so the model can be fixed where it is wrong.

   Usage: node scripts/eval.js [--json] [--min-shows 10]
   Reads the same database as the server (DATA_DIR). */
'use strict';
const { wilson } = require('../lib/model.js');

function spearman(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const rank = (a) => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(n); let i = 0;
    while (i < n) { let j = i; while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; } return r; };
  const rx = rank(xs), ry = rank(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}

function evaluate(db, { minShows = 10 } = {}) {
  const entries = new Map(db.prepare('SELECT id, head, score FROM entries').all().map((e) => [e.id, e]));
  const rows = db.prepare('SELECT vote_id, entry_id, picked FROM showings ORDER BY vote_id').all();
  const sets = new Map();
  for (const r of rows) { if (!sets.has(r.vote_id)) sets.set(r.vote_id, []); sets.get(r.vote_id).push(r); }
  let votes = 0, lowest = 0, lowerHalf = 0, highest = 0;
  for (const set of sets.values()) {
    const scored = set.map((s) => ({ ...s, score: entries.get(s.entry_id)?.score })).filter((s) => s.score !== undefined);
    const pick = scored.find((s) => s.picked);
    if (!pick || scored.length < 2) continue;
    votes++;
    const sorted = scored.map((s) => s.score).sort((a, b) => a - b);
    const min = sorted[0], max = sorted[sorted.length - 1], median = sorted[Math.floor((sorted.length - 1) / 2)];
    if (pick.score === min) lowest++;
    if (pick.score <= median) lowerHalf++;
    if (pick.score === max && max !== min) highest++;
  }
  const stats = db.prepare(`SELECT e.id, e.head, e.score,
      (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id) AS shows,
      (SELECT COUNT(*) FROM showings s WHERE s.entry_id = e.id AND s.picked = 1) AS picks
      FROM entries e WHERE e.hidden = 0`).all().filter((e) => e.shows >= minShows)
    .map((e) => ({ ...e, rate: Math.round((100 * e.picks) / e.shows), lo: wilson(e.picks, e.shows).lo }));
  const rho = stats.length >= 3 ? spearman(stats.map((e) => e.score), stats.map((e) => e.lo)) : null;
  const genericButPicked = stats.filter((e) => e.score >= 60 && e.rate >= 40).sort((a, b) => b.rate - a.rate);
  const specificButIgnored = stats.filter((e) => e.score <= 25 && e.rate <= 15).sort((a, b) => a.rate - b.rate);
  return {
    votes, minShows,
    agreement: votes ? { lowestWins: lowest / votes, lowerHalfWins: lowerHalf / votes, highestWins: highest / votes } : null,
    chance: { lowestWins: 0.25, lowerHalfWins: 0.5, highestWins: 0.25 },
    rankedEntries: stats.length, spearman: rho,
    genericButPicked, specificButIgnored,
  };
}

function report(r) {
  const pct = (x) => (x === null || x === undefined ? 'n/a' : Math.round(100 * x) + '%');
  const out = [];
  out.push('# Lineup eval: the ruler against the crowd', '');
  out.push(`Votes with a scorable set: ${r.votes}. Entries with at least ${r.minShows} showings: ${r.rankedEntries}.`, '');
  if (!r.agreement) { out.push('No votes yet. Judge some lineups and run this again.'); return out.join('\n'); }
  out.push('| Claim | Observed | Chance |', '|---|---|---|');
  out.push(`| The picked headline had the lowest sameness score in its set | ${pct(r.agreement.lowestWins)} | 25% |`);
  out.push(`| The picked headline was in the lower-scoring half of its set | ${pct(r.agreement.lowerHalfWins)} | 50% |`);
  out.push(`| The picked headline had the highest score (the ruler was backwards) | ${pct(r.agreement.highestWins)} | 25% |`);
  out.push('', `Spearman rank correlation between sameness score and pick rate (Wilson lower bound): ${r.spearman === null ? 'n/a, needs 3+ ranked entries' : r.spearman.toFixed(2)}. Negative is what the ruler predicts.`, '');
  const list = (title, xs) => { out.push(`## ${title} (${xs.length})`, ''); if (!xs.length) out.push('None.'); for (const e of xs) out.push(`- ${e.score}/100, picked ${e.rate}% of ${e.shows}: ${e.head}`); out.push(''); };
  list('Generic by the ruler, chosen by the crowd', r.genericButPicked);
  list('Specific by the ruler, ignored by the crowd', r.specificButIgnored);
  out.push('Each disagreement is either a lexicon gap, a detector gap, or a reason the crowd is not the buyer. Decide which, then change the model or the test.');
  return out.join('\n');
}

module.exports = { evaluate, report, spearman };

if (require.main === module) {
  const args = process.argv.slice(2);
  const minShows = Number(args[args.indexOf('--min-shows') + 1]) || 10;
  const { db } = require('../server.js');
  const r = evaluate(db, { minShows });
  process.stdout.write((args.includes('--json') ? JSON.stringify(r, null, 2) : report(r)) + '\n');
  process.exit(0);
}
