import { Browser } from './backends/browser.js';
import { Mac } from './backends/ax.js';
import { Model, StubModel } from './model.js';
import { createGate } from './gate.js';
import { createLog } from './log.js';
import { home, loadJson } from './home.js';
import path from 'node:path';

// One object every runbook receives. Built by the CLI for real runs and by
// tests with fixture servers and a stub model.
export async function createContext(runbook, { yes = false, quiet = false, model, browser, mac, settings } = {}) {
  settings = settings || loadJson(path.join(home(), 'config.json'), {});
  if (settings.anthropicKey && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = settings.anthropicKey;
  const log = createLog(runbook, { quiet });
  const gate = createGate({ yes, log, output: quiet ? { write() {} } : process.stderr });
  const ctx = {
    runbook, settings, log, gate, home: home(),
    web: browser || new Browser(settings.browser || {}),
    mac: mac || new Mac(),
    get model() {
      if (!model) model = process.env.DESKHAND_STUB ? new StubModel() : new Model(settings.model ? { model: settings.model } : {});
      return model;
    },
    async close() { await this.web.close(); },
  };
  return ctx;
}
