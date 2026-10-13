import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { render } from '../core/web.js';

const exec = promisify(execFile);

export const meta = {
  name: 'inbox-triage',
  description: 'Read your inbox in the browser, pull out every message that asks you for something, and turn each ask into a task (Things, Reminders, Notion, or a Markdown file) after you approve the list.',
  options: {
    inbox: 'Inbox URL (default: Gmail)',
    limit: 'How many rows to look at (default 15)',
    all: 'Include rows that are already read',
    target: 'things | reminders | notion | markdown (default markdown)',
    out: 'Markdown file for target=markdown (default ~/.deskhand/tasks.md)',
  },
};

const ASKS = {
  type: 'object',
  properties: {
    asks: { type: 'array', items: { type: 'object', properties: {
      task: { type: 'string', description: 'The ask as a task I can do, imperative, under 15 words' },
      due: { type: 'string', description: 'Deadline as YYYY-MM-DD if one is stated or clearly implied, else empty' },
      from: { type: 'string', description: 'Name of the person asking' },
    }, required: ['task', 'due', 'from'] } },
  },
  required: ['asks'],
};

export async function run(ctx, opts = {}) {
  const inbox = opts.inbox || ctx.settings.inboxUrl || 'https://mail.google.com/mail/u/0/#inbox';
  const limit = Number(opts.limit) || 15;
  const target = opts.target || ctx.settings.taskTarget || 'markdown';
  const today = new Date().toISOString().slice(0, 10);

  await ctx.web.open(inbox);
  const snap = await ctx.web.snapshot();
  let rows = snap.nodes.filter((n) => n.role === 'row' && n.name && !/^(name|from|subject)\b/i.test(n.name));
  if (!opts.all) { const unread = rows.filter((r) => r.unread); if (unread.length) rows = unread; }
  rows = rows.slice(0, limit);
  if (!rows.length) { ctx.log.finish('empty'); return { status: 'empty', tasks: [] }; }
  ctx.log.step('inbox', { rows: rows.length });

  // 1. One call to skip newsletters and notifications before opening anything.
  const worth = await ctx.model.json({
    name: 'pick_rows', description: 'Pick inbox rows that might contain a request for me to do something.',
    schema: { type: 'object', properties: { ids: { type: 'array', items: { type: ['integer', 'string'] } } }, required: ['ids'] },
    prompt: `Inbox rows (id in brackets, then sender and subject):\n${rows.map((r) => `[${r.id}] ${r.name}`).join('\n')}\n\nReturn the ids of rows that could contain an ask from a real person. Skip newsletters, receipts, and automated notifications.`,
  });
  const keep = new Set((worth.ids || []).map(String));
  const open = rows.filter((r) => keep.has(String(r.id)));
  ctx.log.step('picked', { of: rows.length, open: open.length });

  // 2. Open each one, read it, extract asks.
  const tasks = [];
  for (const row of open) {
    await ctx.web.open(inbox);
    const s = await ctx.web.snapshot();
    const again = s.nodes.find((n) => n.role === 'row' && n.name === row.name) || s.nodes.find((n) => n.role === 'row' && n.name.startsWith(row.name.slice(0, 40)));
    if (!again) { ctx.log.step('row-gone', { name: row.name }); continue; }
    const link = s.nodes.find((n) => n.role === 'link' && n.href && n.depth > again.depth && s.nodes.indexOf(n) > s.nodes.indexOf(again) && s.nodes.indexOf(n) < s.nodes.indexOf(again) + 8);
    await ctx.web.click(link ? link.id : again.id);
    const thread = await ctx.web.snapshot();
    const out = await ctx.model.json({
      name: 'extract_asks', description: 'List the concrete things this email asks me to do.', schema: ASKS,
      prompt: `Today is ${today}. Email thread:\n\n${thread.text.slice(0, 8000)}\n\nList each thing the sender is asking ME to do. Nothing else. If there is no ask, return an empty list.`,
    });
    for (const a of out.asks || []) tasks.push({ ...a, subject: thread.title || row.name.slice(0, 80), url: thread.url });
    ctx.log.step('read', { subject: thread.title, asks: (out.asks || []).length });
  }
  if (!tasks.length) { ctx.log.finish('nothing'); return { status: 'nothing', tasks }; }

  // 3. Gate.
  const { ok } = await ctx.gate({
    title: `Create ${tasks.length} task${tasks.length === 1 ? '' : 's'} in ${target}`,
    lines: tasks.map((t, i) => `${i + 1}. ${t.task}${t.due ? '  (due ' + t.due + ')' : ''}  — ${t.from}, "${t.subject}"`),
    allowEdit: false,
  });
  if (!ok) { ctx.log.finish('declined'); return { status: 'declined', tasks }; }

  // 4. Write.
  const made = [];
  for (const t of tasks) { made.push(await createTask(ctx, target, t, opts)); ctx.log.step('task', { target, task: t.task }); }
  ctx.log.finish('ok', { count: made.length });
  return { status: 'ok', tasks, made };
}

async function createTask(ctx, target, t, opts) {
  const notes = `From ${t.from} · ${t.subject}\n${t.url}`;
  if (target === 'things') {
    const q = new URLSearchParams({ title: t.task, notes, ...(t.due ? { when: t.due } : {}) });
    await ctx.mac.openUrl('things:///add?' + q.toString());
    return { target, title: t.task };
  }
  if (target === 'reminders') {
    const props = [`name:${JSON.stringify(t.task)}`, `body:${JSON.stringify(notes)}`];
    if (t.due) props.push(`due date:(date ${JSON.stringify(t.due + ' 09:00')})`);
    await exec('osascript', ['-e', `tell application "Reminders" to make new reminder with properties {${props.join(', ')}}`]);
    return { target, title: t.task };
  }
  if (target === 'notion') {
    const token = ctx.settings.notionToken || process.env.NOTION_TOKEN, db = ctx.settings.notionDatabase;
    if (!token || !db) throw new Error('target=notion needs notionToken and notionDatabase in ~/.deskhand/config.json');
    const body = { parent: { database_id: db }, properties: { Name: { title: [{ text: { content: t.task } }] }, ...(t.due ? { Due: { date: { start: t.due } } } : {}) }, children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: notes } }] } }] };
    const r = await fetch('https://api.notion.com/v1/pages', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'notion-version': '2022-06-28', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('Notion said ' + r.status + ': ' + (await r.text()).slice(0, 200));
    return { target, title: t.task, id: (await r.json()).id };
  }
  const file = opts.out || ctx.settings.tasksFile || path.join(ctx.home, 'tasks.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `- [ ] ${t.task}${t.due ? ' (due ' + t.due + ')' : ''} — ${t.from}, ${t.subject} <${t.url}>\n`);
  return { target: 'markdown', file, title: t.task };
}
