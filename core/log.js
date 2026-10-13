import fs from 'node:fs';
import path from 'node:path';
import { home } from './home.js';

// Every run writes one JSONL file: a line per step with what the agent saw,
// what it decided, and what the gate said. `deskhand log` prints the last one.
export function createLog(runbook, { quiet = false } = {}) {
  const dir = path.join(home(), 'runs');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${runbook}-${stamp}.jsonl`);
  const t0 = Date.now();
  const write = (rec) => fs.appendFileSync(file, JSON.stringify({ t: Date.now() - t0, ...rec }) + '\n');
  write({ step: 'start', runbook, at: new Date().toISOString() });
  return {
    file,
    step(name, data = {}) {
      write({ step: name, ...data });
      if (!quiet) process.stderr.write(`· ${name}${data.note ? ' — ' + data.note : ''}\n`);
    },
    finish(status, data = {}) { write({ step: 'finish', status, ...data }); },
  };
}

export function lastRun() {
  const dir = path.join(home(), 'runs');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  if (!files.length) return null;
  const file = path.join(dir, files[files.length - 1]);
  return { file, lines: fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) };
}
