import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const AXQ = process.env.DESKHAND_AXQ || path.join(here, '..', '..', 'mac', 'axq');

// macOS backend. Talks to native apps (Mail, Calendar, Notes, Things, any
// Cocoa app) through the Accessibility API via the `axq` helper in mac/.
// Same snapshot shape as the browser backend; ids are AX index paths ("0.3.2").
export class Mac {
  constructor({ bin = AXQ } = {}) { this.bin = bin; this.last = null; }

  available() { return process.platform === 'darwin'; }

  async call(args) {
    if (!this.available()) throw new Error('The macOS backend only runs on a Mac. Browser runbooks work anywhere.');
    try {
      const { stdout } = await run(this.bin, args, { maxBuffer: 64 * 1024 * 1024 });
      return stdout.trim() ? JSON.parse(stdout) : null;
    } catch (e) {
      if (e.code === 'ENOENT') throw new Error(`axq helper not built. Run: npm run build:mac (needs Xcode command line tools).`);
      throw new Error(`axq ${args[0]} failed: ${e.stderr || e.message}`);
    }
  }

  apps() { return this.call(['apps']); }
  front() { return this.call(['front']); }
  async selection() { const r = await this.call(['selection']); return r?.text || ''; }
  async open(app) { await run('open', ['-a', app]); await new Promise((r) => setTimeout(r, 800)); }
  async openUrl(url) { await run('open', [url]); }

  async snapshot(app, { depth = 12 } = {}) {
    const r = await this.call(['tree', '--app', app, '--depth', String(depth)]);
    const nodes = (r?.nodes || []).map((n) => ({
      id: n.id,
      role: roleMap[n.role] || n.role.replace(/^AX/, '').toLowerCase(),
      name: n.title || n.desc || n.help || '',
      value: n.value ?? '',
      href: n.url || '',
      editable: ['AXTextField', 'AXTextArea', 'AXComboBox', 'AXCheckBox', 'AXRadioButton'].includes(n.role),
      depth: n.depth,
    }));
    this.last = { app, url: '', title: r?.title || app, text: nodes.map((n) => [n.name, n.value].filter(Boolean).join(' ')).join('\n'), nodes };
    return this.last;
  }

  async click(id) { await this.call(['act', '--app', this.last.app, '--id', String(id), '--action', 'press']); }
  async type(id, text) { await this.call(['act', '--app', this.last.app, '--id', String(id), '--action', 'setValue', '--value', String(text)]); }
  async focus(id) { await this.call(['act', '--app', this.last.app, '--id', String(id), '--action', 'focus']); }
  async press(key) { await this.call(['key', '--key', key]); }
}

const roleMap = {
  AXButton: 'button', AXLink: 'link', AXTextField: 'textbox', AXTextArea: 'textbox', AXStaticText: 'text', AXCheckBox: 'checkbox',
  AXRadioButton: 'radio', AXComboBox: 'combobox', AXPopUpButton: 'combobox', AXMenuItem: 'menuitem', AXRow: 'row', AXCell: 'cell',
  AXHeading: 'heading', AXImage: 'img', AXTable: 'table', AXOutline: 'table', AXList: 'list', AXGroup: 'group', AXWindow: 'window',
  AXScrollArea: 'group', AXWebArea: 'group', AXToolbar: 'group', AXTab: 'tab', AXMenu: 'menu', AXMenuBar: 'menubar', AXSplitGroup: 'group',
};
