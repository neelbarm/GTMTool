'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze, headlineOf } = require('../lib/model.js');

test('generic platform copy scores high', () => {
  const r = analyze('The all-in-one platform that empowers modern teams to streamline workflows and unlock actionable insights.');
  assert.ok(r.score >= 80, `expected >= 80, got ${r.score}`);
  assert.ok(r.marks.length >= 5);
  assert.equal(r.parts.who.hit, false);
});

test('specific, proven copy scores near zero', () => {
  const r = analyze('Chargeback recovery for Shopify stores doing over $1M a year. We win 71% of disputes. 1,400 stores, $38M recovered.');
  assert.ok(r.score <= 10, `expected <= 10, got ${r.score}`);
  assert.equal(r.parts.who.hit, true);
  assert.equal(r.parts.get.hit, true);
  assert.equal(r.parts.proof.hit, true);
});

test('half-specific copy lands in the middle', () => {
  const r = analyze('Payroll for restaurants. Run payroll, tips, and schedules in one place. Simple, powerful, built for hospitality.');
  assert.ok(r.score > 25 && r.score < 65, `expected 25..65, got ${r.score}`);
  assert.equal(r.parts.who.hit, true);
  assert.equal(r.parts.proof.hit, false);
});

test('too little text has no score', () => {
  assert.equal(analyze('Hello').score, null);
  assert.equal(analyze('').score, null);
});

test('score is bounded and monotone in emptiness', () => {
  const a = analyze('Seamless, powerful, intuitive, all-in-one, next-generation, best-in-class, world-class, innovative platform.');
  const b = analyze('Permit tracking for electrical contractors. 220 contractors, zero lapsed permits last quarter.');
  assert.ok(a.score >= 0 && a.score <= 100);
  assert.ok(b.score >= 0 && b.score <= 100);
  assert.ok(a.score > b.score);
});

test('marks never overlap and are ordered', () => {
  const r = analyze('All in one place, in one place, all-in-one. Empower, empowers, empowering teams of all sizes.');
  for (let i = 1; i < r.marks.length; i++) assert.ok(r.marks[i].i >= r.marks[i - 1].end);
});

test('headline is the first sentence', () => {
  assert.equal(headlineOf('Payroll for restaurants. Run payroll in one place.'), 'Payroll for restaurants.');
  assert.equal(headlineOf('No punctuation here at all'), 'No punctuation here at all');
});
