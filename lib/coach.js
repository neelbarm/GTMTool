/* Lineup coach: an optional layer that asks Claude for a critique, the five slots, and three rewrites.
   The ruler stays the judge: every rewrite Claude returns is scored by lib/model.js before it is shown.
   Enabled only when ANTHROPIC_API_KEY (or another SDK credential) is set and @anthropic-ai/sdk is installed. */
'use strict';
const model = require('./model.js');

const MODEL = process.env.COACH_MODEL || 'claude-opus-5-5';

let sdk = null;
function loadSdk() {
  if (sdk !== null) return sdk;
  try { sdk = require('@anthropic-ai/sdk'); } catch (e) { sdk = false; }
  return sdk;
}
function isEnabled() {
  if (!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) return false;
  return !!loadSdk();
}

const SYSTEM = `You are a positioning editor for B2B homepage copy. You work from the Lineup sameness test, which has already analyzed the copy and found which phrases are interchangeable and which of the five parts of a position are missing. The five parts: who it is for (a buyer you could name in a room), instead of (what they use today), because (the concrete thing the product does), so that (the outcome, with a number), proof (something a buyer could check).

Rules for rewrites:
- Keep every fact the original states. Never invent customers, numbers, awards, or outcomes. Where the original has no number, leave a bracketed placeholder like [number] so the author fills it in.
- Name the buyer specifically. Never "teams", "businesses", "companies of all sizes".
- Replace every tagged interchangeable phrase with the concrete thing the product does.
- A headline is one sentence under 14 words. A subhead is one or two sentences.
- Three rewrites, each taking a different angle: one leads with the buyer, one with the alternative it replaces, one with the outcome.
- Plain words. No em dashes, no exclamation marks, no rhetorical questions.

The critique is three sentences at most, written to the author, naming the one change that would matter most.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['critique', 'slots', 'rewrites'],
  properties: {
    critique: { type: 'string' },
    slots: {
      type: 'object', additionalProperties: false,
      required: ['who', 'alt', 'how', 'get', 'proof'],
      properties: {
        who: { type: 'string' }, alt: { type: 'string' }, how: { type: 'string' }, get: { type: 'string' }, proof: { type: 'string' },
      },
    },
    rewrites: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['angle', 'headline', 'subhead'],
        properties: { angle: { type: 'string' }, headline: { type: 'string' }, subhead: { type: 'string' } },
      },
    },
  },
};

function describe(analysis) {
  const parts = Object.values(analysis.parts).map((p) => `${p.t}: ${p.hit ? 'present' : p.part ? 'partial' : 'MISSING'}`).join('; ');
  const marks = analysis.marks.map((m) => `"${m.ph}"`).join(', ') || 'none';
  return `Sameness score ${analysis.score}/100 (${analysis.covered}% of words interchangeable).\nParts: ${parts}.\nTagged phrases: ${marks}.${analysis.buyer ? `\nBuyer detected: "${analysis.buyer}".` : ''}`;
}

/* client is injectable for tests. Returns {critique, slots, rewrites:[{angle, headline, subhead, text, score, parts}]} */
async function coach(text, client) {
  const analysis = model.analyze(text);
  if (analysis.score === null) throw Object.assign(new Error('Needs at least three words.'), { status: 400 });
  if (!client) {
    const Anthropic = loadSdk();
    if (!Anthropic) throw Object.assign(new Error('The coach is not enabled on this instance.'), { status: 503 });
    client = new Anthropic({ maxRetries: 2, timeout: 60000 });
  }
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Copy under test:\n"""${text}"""\n\nLineup analysis:\n${describe(analysis)}\n\nReturn the critique, the five slots as you can best infer them from the copy (empty string where the copy gives nothing), and three rewrites.` }],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('The coach declined this one.'), { status: 422 });
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw Object.assign(new Error('The coach returned nothing usable.'), { status: 502 });
  let out;
  try { out = JSON.parse(textBlock.text); } catch (e) { throw Object.assign(new Error('The coach returned malformed output.'), { status: 502 }); }
  const rewrites = (out.rewrites || []).slice(0, 3).map((r) => {
    const t = `${String(r.headline || '').trim()} ${String(r.subhead || '').trim()}`.trim();
    const a = model.analyze(t);
    const parts = {}; if (a.parts) for (const k of Object.keys(a.parts)) parts[k] = a.parts[k].hit ? 2 : a.parts[k].part ? 1 : 0;
    return { angle: String(r.angle || ''), headline: String(r.headline || ''), subhead: String(r.subhead || ''), text: t, score: a.score, parts };
  });
  return { critique: String(out.critique || ''), slots: out.slots || {}, rewrites, model: response.model || MODEL, before: analysis.score };
}

module.exports = { coach, isEnabled, SYSTEM, SCHEMA, MODEL };
