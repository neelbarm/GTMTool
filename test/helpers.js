import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFixtures } from './fixtures/server.js';
import { Browser } from '../core/backends/browser.js';
import { StubModel } from '../core/model.js';
import { createContext } from '../core/context.js';

// Shared harness: a fixture server, a headless Chromium with a throwaway
// profile, a stub model, and DESKHAND_HOME pointed at a temp dir.
export async function harness(runbook, handlers = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deskhand-'));
  process.env.DESKHAND_HOME = tmp;
  const fx = createFixtures();
  const base = await fx.listen();
  const browser = new Browser({ headless: true, channel: 'chromium', profile: path.join(tmp, 'chrome') });
  const model = new StubModel(handlers);
  const ctx = await createContext(runbook, { yes: true, quiet: true, model, browser, settings: {} });
  const writeConfig = (name, obj) => { const p = path.join(tmp, name); fs.writeFileSync(p, JSON.stringify(obj)); return p; };
  const state = async () => (await fetch(base + '/__state')).json();
  const close = async () => { await ctx.close(); await fx.close(); };
  return { tmp, base, ctx, model, fx, writeConfig, state, close };
}
