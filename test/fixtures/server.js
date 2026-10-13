// Local stand-ins for the apps the runbooks drive: a search engine, a company
// site, a CRM, a webmail inbox, a payroll portal, two dashboards, and a CMS.
// Stateful on purpose so tests can assert what the agent actually wrote.
import http from 'node:http';

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:sans-serif;max-width:800px;margin:2rem auto">${body}</body></html>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createFixtures() {
  const state = {
    crm: [{ id: 1, name: 'Oldco', domain: 'oldco.com', one_liner: 'Legacy ERP', industry: 'Software', size: '200', location: 'Boston', note: '' }],
    payroll: [], tracker: [], tasks: [], cms: { hero: 'The all-in-one platform for modern teams', subhead: 'Scale faster.', published: false, draftSaved: 0 }, publishClicks: 0,
    dash: { 'acme-analytics': { mrr: 42300, customers: 118 }, 'northwind': { mrr: 9870, customers: 41 } },
  };
  const mail = [
    { id: 't1', from: 'Priya Shah <priya@acme.test>', subject: 'Contract redlines', unread: true, body: 'Hi Neel, can you send over the redlined MSA by Thursday? Legal needs it before the board meeting. Thanks, Priya' },
    { id: 't2', from: 'Newsletter <news@saasweekly.test>', subject: 'This week in SaaS', unread: true, body: 'Top stories this week. Read more on our site.' },
    { id: 't3', from: 'Marco Ruiz <marco@northwind.test>', subject: 'Re: onboarding call', unread: true, body: 'Great call. Two asks: 1) send the W-9 form, 2) add me to the Slack channel by Monday. Marco' },
    { id: 't4', from: 'Dana <dana@oldco.test>', subject: 'Lunch?', unread: false, body: 'Lunch next week?' },
  ];

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    const send = (html, code = 200) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); };
    const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    const form = async () => { let b = ''; for await (const c of req) b += c; return Object.fromEntries(new URLSearchParams(b)); };

    // --- state for tests
    if (p === '/__state') return json(state);

    // --- search engine
    if (p === '/search') {
      const q = url.searchParams.get('q') || '';
      return send(page('Search', `<h1>Results for ${esc(q)}</h1><ul>
        <li><a href="http://wikipedia.org/wiki/Acme">Acme - Wikipedia</a></li>
        <li><a href="${base(req)}/site/acme">Acme Analytics: Revenue analytics for SaaS finance teams</a></li>
        <li><a href="http://linkedin.com/company/acme">Acme | LinkedIn</a></li></ul>`));
    }

    // --- company site
    if (p === '/site/acme') return send(page('Acme Analytics', `<nav><a href="/site/acme">Home</a> <a href="/site/acme/pricing">Pricing</a></nav>
      <h1>Revenue analytics for SaaS finance teams</h1>
      <p>Acme Analytics connects to Stripe and your GL and closes the books in a day, not a week. Trusted by Northwind, Globex and 400 other SaaS companies.</p>
      <h2>Backed by Sequoia. Series B, $40M, March 2026.</h2>
      <p>We are hiring in Boston and remote. Contact: hello@acme.test</p><footer>© Acme Analytics Inc, Boston MA</footer>`));

    if (p === '/site/oldco') return send(page('Oldco', `<h1>ERP for manufacturers, now in the cloud</h1><p>Oldco has run plants since 1998. 250 people in Boston. Contact sales@oldco.test</p>`));

    // --- CRM
    if (p === '/crm' && req.method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const rows = state.crm.filter((r) => !q || r.name.toLowerCase().includes(q) || r.domain.includes(q));
      return send(page('CRM · Companies', `<h1>Companies</h1><form method="get"><input name="q" placeholder="Search companies" value="${esc(q)}"><button>Search</button></form>
        <a href="/crm/new">New company</a>
        <table><tr><th>Name</th><th>Domain</th></tr>${rows.map((r) => `<tr><td><a href="/crm/${r.id}">${esc(r.name)}</a></td><td>${esc(r.domain)}</td></tr>`).join('')}</table>`));
    }
    const crmForm = (r, action, btn) => `<h1>${r.id ? 'Edit' : 'New'} company</h1><form method="post" action="${action}">
      <label>Company name <input name="name" value="${esc(r.name)}"></label><br>
      <label>Website <input name="domain" value="${esc(r.domain)}"></label><br>
      <label>Description <textarea name="one_liner">${esc(r.one_liner)}</textarea></label><br>
      <label>Industry <select name="industry"><option>Software</option><option>Fintech</option><option>Analytics</option><option>Other</option></select></label><br>
      <label>Employees <input name="size" value="${esc(r.size)}"></label><br>
      <label>Location <input name="location" value="${esc(r.location)}"></label><br>
      <label>Notes <textarea name="note">${esc(r.note)}</textarea></label><br>
      <button type="submit">${btn}</button></form>`;
    if (p === '/crm/new' && req.method === 'GET') return send(page('CRM · New', crmForm({}, '/crm/new', 'Create company')));
    if (p === '/crm/new' && req.method === 'POST') { const r = await form(); r.id = state.crm.length + 1; state.crm.push(r); return send(page('CRM · Saved', `<p>Company saved.</p><a href="/crm/${r.id}">${esc(r.name)}</a>`)); }
    let m;
    if ((m = p.match(/^\/crm\/(\d+)$/)) && req.method === 'GET') { const r = state.crm.find((x) => x.id === +m[1]); return r ? send(page('CRM · ' + r.name, crmForm(r, `/crm/${r.id}`, 'Save'))) : send('nope', 404); }
    if ((m = p.match(/^\/crm\/(\d+)$/)) && req.method === 'POST') { const r = state.crm.find((x) => x.id === +m[1]); Object.assign(r, await form(), { id: r.id }); return send(page('CRM · Saved', `<p>Company saved.</p>`)); }

    // --- webmail
    if (p === '/mail') return send(page('Inbox', `<h1>Inbox</h1><table role="grid">${mail.map((t) => `<tr role="row" aria-label="${esc((t.unread ? 'unread, ' : '') + t.from + ', ' + t.subject)}"><td><a href="/mail/${t.id}">${esc(t.subject)}</a></td><td>${esc(t.from)}</td></tr>`).join('')}</table>`));
    if ((m = p.match(/^\/mail\/(\w+)$/))) { const t = mail.find((x) => x.id === m[1]); t.unread = false; return send(page(t.subject, `<a href="/mail">← Inbox</a><h1>${esc(t.subject)}</h1><p>From: ${esc(t.from)}</p><div>${esc(t.body)}</div>`)); }

    // --- payroll portal: two pages, then a review page
    if (p === '/payroll/new' && req.method === 'GET') return send(page('Payroll · New customer', `<h1>New customer</h1><form method="post" action="/payroll/new">
      <label for="co">Legal company name</label><input id="co" name="company"><br>
      <label for="ein">EIN</label><input id="ein" name="ein"><br>
      <label for="st">State of incorporation</label><input id="st" name="state"><br>
      <label for="pf">Pay frequency</label><select id="pf" name="frequency"><option>Weekly</option><option>Biweekly</option><option>Semimonthly</option><option>Monthly</option></select><br>
      <button type="submit">Continue</button></form>`));
    if (p === '/payroll/new' && req.method === 'POST') { state.payroll.push(await form()); return send(page('Payroll · Admin', `<h1>Primary admin</h1><form method="post" action="/payroll/admin">
      <label for="an">Admin name</label><input id="an" name="admin_name"><br>
      <label for="ae">Admin email</label><input id="ae" name="admin_email"><br>
      <label for="hc">Headcount</label><input id="hc" name="headcount"><br>
      <button type="submit">Submit application</button></form>`)); }
    if (p === '/payroll/admin' && req.method === 'POST') { Object.assign(state.payroll[state.payroll.length - 1], await form()); return send(page('Payroll · Done', `<h1>Application submitted</h1><p>Reference PR-${1000 + state.payroll.length}</p>`)); }

    // --- internal tracker (a web form)
    if (p === '/tracker' && req.method === 'GET') return send(page('Tracker', `<h1>Onboarding tracker</h1><form method="post"><label>Customer <input name="customer"></label><label>Owner <input name="owner"></label><label>Status <input name="status"></label><button>Add row</button></form>
      <ul>${state.tracker.map((r) => `<li>${esc(r.customer)} · ${esc(r.owner)} · ${esc(r.status)}</li>`).join('')}</ul>`));
    if (p === '/tracker' && req.method === 'POST') { state.tracker.push(await form()); res.writeHead(303, { location: '/tracker' }); return res.end(); }

    // --- dashboards
    if ((m = p.match(/^\/dash\/([\w-]+)$/))) { const d = state.dash[m[1]]; if (!d) return send(page('404', '<h1>No such dashboard</h1>'), 404); return send(page(`${m[1]} dashboard`, `<h1>${m[1]}</h1><div class="kpi"><div>MRR</div><div class="big" id="mrr">$${d.mrr.toLocaleString()}</div></div><div class="kpi"><div>Active customers</div><div class="big">${d.customers}</div></div><p>Updated today</p>`)); }

    // --- CMS editor
    if (p === '/cms/home' && req.method === 'GET') return send(page('CMS · Home page', `<h1>Edit: Home page</h1><form method="post" action="/cms/home">
      <label for="hero">Hero headline</label><input id="hero" name="hero" value="${esc(state.cms.hero)}"><br>
      <label for="sub">Subheadline</label><input id="sub" name="subhead" value="${esc(state.cms.subhead)}"><br>
      <button type="submit" name="op" value="draft">Save draft</button> <button type="submit" name="op" value="publish">Publish</button></form>
      <p>${state.cms.published ? 'Published' : 'Draft'} · saves: ${state.cms.draftSaved}</p>`));
    if (p === '/cms/home' && req.method === 'POST') { const f = await form(); state.cms.hero = f.hero; state.cms.subhead = f.subhead; if (f.op === 'publish') { state.cms.published = true; state.publishClicks++; } else state.cms.draftSaved++; res.writeHead(303, { location: '/cms/home' }); return res.end(); }

    send(page('404', '<h1>Not found</h1>'), 404);
  });
  const base = (req) => `http://${req.headers.host}`;

  return {
    state, server,
    async listen(port = 0) { await new Promise((r) => server.listen(port, '127.0.0.1', r)); this.url = `http://127.0.0.1:${server.address().port}`; return this.url; },
    async close() { await new Promise((r) => server.close(r)); },
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const f = createFixtures();
  f.listen(Number(process.env.PORT) || 4545).then((u) => console.log(`fixtures at ${u}  (crm: ${u}/crm · mail: ${u}/mail · payroll: ${u}/payroll/new · dash: ${u}/dash/acme-analytics · cms: ${u}/cms/home)`));
}
