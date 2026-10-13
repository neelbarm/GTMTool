import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The approval panel. A tiny local server that streams the run's steps to a
// page and lets you answer each gate (approve / edit / decline) with a click.
// The terminal keeps working too; whichever answers first wins.
const PAGE = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'ui.html'), 'utf8');

export function createUI({ port = Number(process.env.DESKHAND_UI_PORT) || 4747, runbook = '', info = {} } = {}) {
  const clients = new Set();
  const events = [];
  const pending = new Map(); // gate id → resolve
  let seq = 0;
  const state = { runbook, status: 'running', started: Date.now(), info, calls: 0 };

  const emit = (type, data = {}) => {
    const ev = { id: ++seq, t: Date.now() - state.started, type, ...data };
    events.push(ev);
    const line = `data: ${JSON.stringify(ev)}\n\n`;
    for (const res of clients) res.write(line);
    return ev;
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
    if (url.pathname === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'hello', state, events })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url.pathname === '/answer' && req.method === 'POST') {
      let body = ''; for await (const c of req) body += c;
      const { id, decision, record } = JSON.parse(body || '{}');
      const r = pending.get(id);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: !!r }));
      if (r) { pending.delete(id); r({ decision, record }); }
      return;
    }
    res.writeHead(404); res.end();
  });

  return {
    state, events, emit,
    get url() { return `http://localhost:${server.address().port}`; },
    async listen() { await new Promise((r, j) => { server.once('error', j); server.listen(port, '127.0.0.1', r); }); return this.url; },
    step(name, data) { emit('step', { name, data, calls: state.calls }); },
    setCalls(n) { state.calls = n; },
    // Ask the page. Resolves with { decision: 'yes'|'no', record }.
    ask(gate) {
      const id = 'g' + (++seq);
      emit('gate', { gate: { id, ...gate } });
      return { id, answer: new Promise((resolve) => pending.set(id, resolve)) };
    },
    settle(id, decision, record) { pending.delete(id); emit('gate-done', { id, decision, record }); },
    finish(status, data) { state.status = status; emit('finish', { status, data }); },
    async close() { for (const c of clients) c.end(); await new Promise((r) => server.close(r)); },
  };
}
