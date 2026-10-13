import { Browser } from './backends/browser.js';
import { Mac } from './backends/ax.js';
import { Model, StubModel } from './model.js';
import { createGate } from './gate.js';
import { createLog } from './log.js';
import { createUI } from './ui.js';
import { home, loadJson } from './home.js';
import path from 'node:path';

// One object every runbook receives. Built by the CLI for real runs and by
// tests with fixture servers and a stub model.
export async function createContext(runbook, { yes = false, quiet = false, ui: wantUI = false, model, browser, mac, settings } = {}) {
  settings = settings || loadJson(path.join(home(), 'config.json'), {});
  if (settings.anthropicKey && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = settings.anthropicKey;
  const log = createLog(runbook, { quiet });
  let ui = null;
  if (wantUI) {
    ui = createUI({ runbook, ...(typeof wantUI === 'object' ? wantUI : {}) });
    await ui.listen();
    const step = log.step.bind(log), finish = log.finish.bind(log);
    log.step = (n, d) => { step(n, d); ui.step(n, d); };
    log.finish = (s, d) => { finish(s, d); ui.finish(s, d); };
  }
  const gate = createGate({ yes, log, ui, output: quiet ? { write() {} } : process.stderr });
  const ctx = {
    runbook, settings, log, gate, ui, home: home(),
    web: browser || new Browser(settings.browser || {}),
    mac: mac || new Mac(),
    get model() {
      if (!model) model = process.env.DESKHAND_STUB ? new StubModel() : new Model(settings.model ? { model: settings.model } : {});
      return model;
    },
    async close() { await this.web.close(); await ui?.close(); },
  };
  return ctx;
}
