// Thin wrapper over the Claude API that always returns JSON matching a schema,
// by forcing a single tool call. Runbooks use it for three things only:
// extract (page text → record), draft (record → prose), locate (tree → id).
// Everything else is deterministic so the demo is the same twice in a row.

const DEFAULT_MODEL = process.env.DESKHAND_MODEL || 'claude-sonnet-5-5';

export class Model {
  constructor({ apiKey = process.env.ANTHROPIC_API_KEY, model = DEFAULT_MODEL, maxTokens = 2048 } = {}) {
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Put it in your shell or in ~/.deskhand/config.json as "anthropicKey".');
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.calls = 0;
  }

  async client() {
    if (!this._client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this._client = new Anthropic({ apiKey: this.apiKey });
    }
    return this._client;
  }

  async json({ name, description, schema, system, prompt }) {
    const client = await this.client();
    this.calls++;
    const res = await client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: system || 'You are a careful operations assistant. Answer only by calling the tool. Never invent facts that are not in the input; leave a field empty instead.',
      tools: [{ name, description: description || name, input_schema: schema }],
      tool_choice: { type: 'tool', name },
      messages: [{ role: 'user', content: prompt }],
    });
    const call = res.content.find((c) => c.type === 'tool_use');
    if (!call) throw new Error('Model did not return a tool call.');
    return call.input;
  }

  async text({ system, prompt }) {
    const client = await this.client();
    this.calls++;
    const res = await client.messages.create({ model: this.model, max_tokens: this.maxTokens, system, messages: [{ role: 'user', content: prompt }] });
    return res.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
  }
}

// Tests and dry runs: scripted answers keyed by tool name.
export class StubModel {
  constructor(handlers = {}) { this.handlers = handlers; this.calls = []; }
  async json(req) {
    this.calls.push(req);
    const h = this.handlers[req.name];
    if (!h) throw new Error(`StubModel has no handler for ${req.name}`);
    return typeof h === 'function' ? h(req) : h;
  }
  async text(req) {
    this.calls.push(req);
    const h = this.handlers.text;
    return typeof h === 'function' ? h(req) : (h ?? '');
  }
}

// Shared prompts so every runbook phrases the same jobs the same way.
export const jobs = {
  // Pick the node id that best matches a description. Returns null when unsure.
  async locate(model, snapText, what) {
    const out = await model.json({
      name: 'locate',
      description: 'Pick the UI node that matches the description, or none.',
      schema: { type: 'object', properties: { id: { type: ['integer', 'string', 'null'] }, confidence: { type: 'number' } }, required: ['id', 'confidence'] },
      prompt: `UI tree (one node per line, id in brackets):\n${snapText}\n\nWhich node is: ${what}?\nReturn the id, or null if nothing matches. Confidence 0-1.`,
    });
    return out && out.id !== null && out.confidence >= 0.5 ? out.id : null;
  },
};
