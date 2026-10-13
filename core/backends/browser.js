import fs from 'node:fs';
import path from 'node:path';
import { home } from '../home.js';

// Browser backend. Drives Chrome through Playwright with a persistent profile
// under ~/.deskhand/chrome, so you log in to your tools once and the agent
// reuses those sessions. Produces the same snapshot shape as the macOS backend.

const WALK = () => {
  const roleOf = (el) => {
    const r = el.getAttribute('role');
    if (r) return r;
    const t = el.tagName.toLowerCase();
    if (t === 'a' && el.hasAttribute('href')) return 'link';
    if (t === 'button' || (t === 'input' && ['button', 'submit', 'reset'].includes(el.type))) return 'button';
    if (t === 'input') return el.type === 'checkbox' ? 'checkbox' : el.type === 'radio' ? 'radio' : 'textbox';
    if (t === 'textarea') return 'textbox';
    if (t === 'select') return 'combobox';
    if (el.isContentEditable) return 'textbox';
    if (/^h[1-6]$/.test(t)) return 'heading';
    if (t === 'tr') return 'row';
    if (t === 'td' || t === 'th') return 'cell';
    if (t === 'li') return 'listitem';
    if (t === 'img') return 'img';
    if (t === 'label') return 'label';
    if (['p', 'span', 'div', 'dd', 'dt', 'strong', 'em', 'small', 'b', 'i', 'code', 'pre', 'blockquote', 'time', 'address'].includes(t)) return 'text';
    return null;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (el.type === 'hidden') return false;
    return el.getClientRects().length > 0;
  };
  const ownText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  const nameOf = (el, role) => {
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    const by = el.getAttribute('aria-labelledby');
    if (by) { const t = by.split(/\s+/).map((id) => document.getElementById(id)?.innerText || '').join(' ').trim(); if (t) return t; }
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l.innerText.trim(); }
    const wrap = el.closest('label'); if (wrap && wrap !== el) { const t = wrap.innerText.replace(el.value || '', '').trim(); if (t) return t; }
    if (el.placeholder) return el.placeholder.trim();
    if (el.getAttribute('title')) return el.getAttribute('title').trim();
    if (el.alt) return el.alt.trim();
    if (el.name && ['textbox', 'checkbox', 'radio', 'combobox'].includes(role)) return el.name;
    if (['button', 'link', 'heading', 'label', 'listitem', 'cell', 'row', 'menuitem', 'tab', 'option', 'text'].includes(role)) {
      if (role === 'row') return (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const t = (role === 'text' || role === 'listitem' || role === 'cell') ? ownText(el) : (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      return t;
    }
    return '';
  };
  const valueOf = (el, role) => {
    if (role === 'combobox' && el.tagName === 'SELECT') return el.options[el.selectedIndex]?.text || '';
    if (role === 'checkbox' || role === 'radio') return el.checked ? 'checked' : '';
    if (role === 'textbox') return el.isContentEditable ? (el.innerText || '').trim().slice(0, 500) : (el.value || '');
    return '';
  };
  const nodes = [];
  let id = 0;
  const walk = (el, depth) => {
    if (!(el instanceof Element)) return;
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'template', 'head'].includes(tag)) return;
    if (!visible(el)) return;
    const role = roleOf(el);
    let took = false;
    if (role) {
      const name = nameOf(el, role);
      const value = valueOf(el, role);
      const editable = role === 'textbox' || role === 'combobox' || role === 'checkbox' || role === 'radio';
      if (name || value || editable || ['button', 'link'].includes(role)) {
        if (!(role === 'text' && !name)) {
          id += 1;
          el.setAttribute('data-dh', String(id));
          const node = { id, role, name: name.slice(0, 200), value: String(value).slice(0, 500), href: el.href ? String(el.href) : '', editable, depth, tag };
          if (role === 'row') { const w = parseInt(getComputedStyle(el.querySelector('td,div,span') || el).fontWeight, 10); if (w >= 600 || /unread/i.test(el.getAttribute('aria-label') || '')) node.unread = true; }
          nodes.push(node);
          took = true;
        }
      }
    }
    for (const c of el.children) walk(c, depth + (took ? 1 : 0));
  };
  walk(document.body, 0);
  return { url: location.href, title: document.title, text: (document.body.innerText || '').slice(0, 30000), nodes };
};

export class Browser {
  constructor({ headless = !!process.env.DESKHAND_HEADLESS, profile, channel = process.env.DESKHAND_BROWSER || 'chrome', cdp = process.env.DESKHAND_CDP, slow = 0 } = {}) {
    this.headless = headless;
    this.profile = profile || path.join(home(), 'chrome');
    this.channel = channel;
    this.cdp = cdp;
    this.slow = slow;
    this.last = null;
  }

  async start() {
    if (this.context) return this;
    const { chromium } = await import('playwright');
    if (this.cdp) {
      // Attach to a Chrome you started yourself with --remote-debugging-port=9222.
      this.browser = await chromium.connectOverCDP(this.cdp);
      this.context = this.browser.contexts()[0] || (await this.browser.newContext());
    } else {
      fs.mkdirSync(this.profile, { recursive: true });
      const opts = { headless: this.headless, viewport: { width: 1280, height: 900 }, slowMo: this.slow, args: ['--disable-blink-features=AutomationControlled'] };
      if (this.channel && this.channel !== 'chromium') opts.channel = this.channel;
      try { this.context = await chromium.launchPersistentContext(this.profile, opts); }
      catch (e) {
        if (this.channel === 'chromium') throw e;
        // No Google Chrome installed: fall back to Playwright's Chromium.
        delete opts.channel;
        this.context = await chromium.launchPersistentContext(this.profile, opts);
      }
    }
    return this;
  }

  page() {
    if (this._page && !this._page.isClosed()) return this._page;
    const pages = this.context.pages();
    this._page = pages.find((p) => !p.isClosed());
    return this._page;
  }

  async newPage() { this._page = await this.context.newPage(); return this._page; }

  async open(url, { wait = 'domcontentloaded' } = {}) {
    await this.start();
    const page = this.page() || (await this.newPage());
    const resp = await page.goto(url, { waitUntil: wait, timeout: 45000 });
    if (resp && resp.status() >= 400) throw new Error(`HTTP ${resp.status()} for ${url}`);
    await this.settle();
    return page;
  }

  async settle(ms = 400) {
    const page = this.page();
    try { await page.waitForLoadState('domcontentloaded', { timeout: 5000 }); } catch {}
    await page.waitForTimeout(ms);
  }

  async snapshot() {
    const page = this.page();
    const snap = await page.evaluate(WALK);
    this.last = snap;
    return snap;
  }

  loc(id) { return this.page().locator(`[data-dh="${id}"]`).first(); }

  async click(id) { await this.loc(id).click({ timeout: 10000 }); await this.settle(); }

  async type(id, text, { clear = true } = {}) {
    const l = this.loc(id);
    const tag = await l.evaluate((el) => el.tagName.toLowerCase() + (el.isContentEditable ? ':ce' : ''));
    if (tag === 'select') { await l.selectOption({ label: String(text) }).catch(() => l.selectOption(String(text))); return; }
    await l.click({ timeout: 10000 });
    if (clear) { await l.press('Meta+A').catch(() => {}); await l.press('Control+A').catch(() => {}); await l.press('Backspace').catch(() => {}); }
    if (tag.endsWith(':ce')) await l.pressSequentially(String(text), { delay: 5 });
    else await l.fill(String(text));
  }

  async check(id, on = true) { const l = this.loc(id); if (on) await l.check(); else await l.uncheck(); }
  async press(key) { await this.page().keyboard.press(key); await this.settle(); }
  async text() { return this.page().evaluate(() => document.body.innerText); }
  async url() { return this.page().url(); }
  async screenshot(file, { id } = {}) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (id) await this.loc(id).screenshot({ path: file }); else await this.page().screenshot({ path: file, fullPage: false });
    return file;
  }
  async close() { try { await this.context?.close(); } catch {} try { await this.browser?.close(); } catch {} this.context = null; }
}
