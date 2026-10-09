'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../lib/model.js');
const golden = require('./golden.json');

const score = (t) => analyze(t).score;
const band = (k) => golden[k].map((t) => ({ t, s: score(t) }));

test('every generic headline scores above every specific one', () => {
  const minGeneric = Math.min(...band('generic').map((x) => x.s));
  const maxSpecific = Math.max(...band('specific').map((x) => x.s));
  assert.ok(minGeneric > maxSpecific, `generic floor ${minGeneric} must exceed specific ceiling ${maxSpecific}`);
});

test('generic headlines score 60 or more', () => {
  for (const { t, s } of band('generic')) assert.ok(s >= 60, `${s}: ${t}`);
});

test('specific headlines score 20 or less', () => {
  for (const { t, s } of band('specific')) assert.ok(s <= 20, `${s}: ${t}`);
});

test('half-specific headlines land between 20 and 70', () => {
  for (const { t, s } of band('half')) assert.ok(s >= 20 && s <= 70, `${s}: ${t}`);
});

test('every specific headline names a buyer', () => {
  for (const { t } of band('specific')) assert.ok(analyze(t).parts.who.hit, `no buyer found: ${t}`);
});

test('band means are ordered', () => {
  const mean = (k) => band(k).reduce((a, x) => a + x.s, 0) / golden[k].length;
  assert.ok(mean('generic') > mean('half') && mean('half') > mean('specific'));
});
