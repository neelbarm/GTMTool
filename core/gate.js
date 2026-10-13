import readline from 'node:readline';
import { renderDiff, renderRecord } from './diff.js';

// The gate is the whole product. Nothing that writes to another app runs
// without passing through here. `--yes` auto-approves (for tests and for
// workflows you have watched enough times), and that choice is logged too.
// With a UI attached, the same gate shows up in the approval panel and the
// first answer (terminal or page) wins.

const color = (output) => {
  const on = process.env.FORCE_COLOR ? true : process.env.NO_COLOR ? false : !!output.isTTY;
  const w = (c) => (s) => (on ? `\x1b[${c}m${s}\x1b[0m` : s);
  return { bold: w('1'), dim: w('2'), green: w('32'), red: w('31'), blue: w('34'), yellow: w('33') };
};

export function createGate({ yes = false, input = process.stdin, output = process.stderr, log, ui } = {}) {
  const c = color(output);
  const ask = (q) => {
    const rl = readline.createInterface({ input, output, terminal: false });
    const promise = new Promise((resolve) => rl.question(q, (a) => { rl.close(); resolve(a.trim()); }));
    return { promise, cancel: () => rl.close() };
  };
  const paint = (s) => s.split('\n').map((l) => (l.startsWith('  + ') ? c.green(l) : l.startsWith('  - ') ? c.red(l) : l)).join('\n');

  return async function gate({ title, before, after, lines = [], items, allowEdit = true }) {
    output.write(`\n${c.blue('━━')} ${c.bold(title)}\n`);
    for (const l of lines) output.write(c.dim(`  ${l}`) + '\n');
    if (after && before) output.write(paint(renderDiff(before, after)) + '\n');
    else if (after) output.write(renderRecord(after) + '\n');
    let record = after ? { ...after } : null;

    if (yes) {
      output.write(c.yellow('  → auto-approved (--yes)') + '\n');
      log?.step('gate', { title, decision: 'yes', auto: true });
      ui?.emit('gate-auto', { title });
      return { ok: true, record };
    }
    const remote = ui ? ui.ask({ title, lines: items ? [] : lines, items, before, after, allowEdit }) : null;
    const done = (decision, rec, via) => {
      log?.step('gate', { title, decision, via });
      remote && ui.settle(remote.id, decision, rec);
      output.write(decision === 'yes' ? c.green(`  ✓ approved${via === 'ui' ? ' in the panel' : ''}`) + '\n' : c.red(`  ✗ declined${via === 'ui' ? ' in the panel' : ''}`) + '\n');
      return { ok: decision === 'yes', record: rec };
    };
    for (;;) {
      const q = ask(`  Proceed? [y/N${allowEdit && record ? '/e' : ''}]${ui ? c.dim(' (or use the panel)') : ''} `);
      const a = await (remote ? Promise.race([q.promise.then((v) => ({ term: v })), remote.answer.then((v) => ({ ui: v }))]) : q.promise.then((v) => ({ term: v })));
      if (a.ui) { q.cancel(); return done(a.ui.decision === 'yes' ? 'yes' : 'no', a.ui.record || record, 'ui'); }
      const t = a.term.toLowerCase();
      if (t === 'y' || t === 'yes') return done('yes', record, 'terminal');
      if (t === 'e' && allowEdit && record) {
        output.write(c.dim('  Enter field=value lines. Blank line to finish.') + '\n');
        for (;;) {
          const line = await ask('  > ').promise;
          if (!line) break;
          const i = line.indexOf('=');
          if (i < 0) { output.write('  (need field=value)\n'); continue; }
          record[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
        output.write(paint(renderDiff(after, record)) + '\n');
        continue;
      }
      return done('no', record, 'terminal');
    }
  };
}
