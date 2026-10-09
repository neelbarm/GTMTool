#!/usr/bin/env node
/* Seeds the index with fictional composites so the blind test works from the first visit.
   Safe to run more than once: duplicates are skipped. */
'use strict';
process.env.DATA_DIR = process.env.DATA_DIR || require('node:path').join(__dirname, '..', 'data');
const { addEntry, db } = require('../server.js');
const seeds = require('./seeds.json');
let added = 0;
for (const text of seeds) { const r = addEntry(text, true); if (!r.error && !r.duplicate) added++; }
const n = db.prepare('SELECT COUNT(*) AS n FROM entries WHERE hidden = 0').get().n;
console.log(`Seeded ${added} new composites. ${n} entries in the index.`);
