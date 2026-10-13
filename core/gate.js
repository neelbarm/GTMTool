import readline from 'node:readline';
import { renderDiff, renderRecord } from './diff.js';

// The gate is the whole product. Nothing that writes to another app runs
// without passing through here. `--yes` auto-approves (for tests and for
// workflows you have watched enough times), and that choice is logged too.
export function createGate({ yes = false, input = process.stdin, output = process.stderr, log } = {}) {
  const ask = (q) => new Promise((resolve) => {
    const rl = readline.createInterface({ input, output, terminal: false });
    rl.question(q, (a) => { rl.close(); resolve(a.trim()); });
  });

  return async function gate({ title, before, after, lines = [], allowEdit = true }) {
    output.write(`\n━━ ${title}\n`);
    for (const l of lines) output.write(`  ${l}\n`);
    if (after && before) output.write(renderDiff(before, after) + '\n');
    else if (after) output.write(renderRecord(after) + '\n');
    let record = after ? { ...after } : null;

    if (yes) {
      output.write('  → auto-approved (--yes)\n');
      log?.step('gate', { title, decision: 'yes', auto: true });
      return { ok: true, record };
    }
    for (;;) {
      const a = (await ask(`  Proceed? [y/N${allowEdit && record ? '/e' : ''}] `)).toLowerCase();
      if (a === 'y' || a === 'yes') { log?.step('gate', { title, decision: 'yes' }); return { ok: true, record }; }
      if (a === 'e' && allowEdit && record) {
        output.write('  Enter field=value lines. Blank line to finish.\n');
        for (;;) {
          const line = await ask('  > ');
          if (!line) break;
          const i = line.indexOf('=');
          if (i < 0) { output.write('  (need field=value)\n'); continue; }
          record[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
        output.write(renderDiff(after, record) + '\n');
        continue;
      }
      log?.step('gate', { title, decision: 'no' });
      return { ok: false, record };
    }
  };
}
