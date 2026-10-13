// Local stand-ins for the apps the runbooks drive: a search engine, a company
// site, a CRM, a webmail inbox, a payroll portal, two dashboards, and a CMS.
// Stateful on purpose so tests can assert what the agent actually wrote, and
// styled like real products because they are what is on screen in a demo.
import http from 'node:http';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
  :root { --bg:#f6f7f9; --panel:#fff; --ink:#15171c; --mute:#687084; --line:#e3e6eb; --accent:#2f5bea; --accent2:#eef2ff; --ok:#1f7a4d; --warn:#9a6700; }
  * { box-sizing:border-box } body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif }
  .top { display:flex; align-items:center; gap:14px; padding:12px 24px; background:var(--panel); border-bottom:1px solid var(--line) }
  .brand { display:flex; align-items:center; gap:9px; font-weight:700; letter-spacing:-.01em } .brand i { width:24px; height:24px; border-radius:7px; background:var(--accent); display:inline-block }
  .top nav { display:flex; gap:18px; margin-left:24px; font-size:14px; color:var(--mute) } .top nav a { color:inherit; text-decoration:none } .top nav a.on { color:var(--ink); font-weight:600 }
  .top .me { margin-left:auto; width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#f7b267,#f4845f) }
  .wrap { max-width:980px; margin:0 auto; padding:28px 24px } .row { display:flex; gap:12px; align-items:center } h1 { font-size:22px; margin:0 0 4px; letter-spacing:-.01em } .sub { color:var(--mute); margin:0 0 20px; font-size:14px }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:22px }
  label { display:block; font-size:13px; font-weight:600; color:var(--mute); margin:14px 0 6px } label:first-of-type { margin-top:0 }
  input, select, textarea { width:100%; font:inherit; padding:9px 11px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink) } textarea { min-height:72px; resize:vertical } input:focus, select:focus, textarea:focus { outline:2px solid var(--accent2); border-color:var(--accent) }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 18px }
  button, .btn { font:inherit; font-weight:600; border-radius:8px; padding:9px 16px; border:1px solid var(--line); background:#fff; color:var(--ink); cursor:pointer; text-decoration:none; display:inline-block } button.primary, .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff }
  .actions { display:flex; gap:10px; margin-top:22px; align-items:center }
  table { width:100%; border-collapse:collapse; font-size:14px } th { text-align:left; font-size:12px; letter-spacing:.05em; text-transform:uppercase; color:var(--mute); padding:10px 12px; border-bottom:1px solid var(--line) } td { padding:12px; border-bottom:1px solid var(--line) } tr:last-child td { border-bottom:0 } td a { color:var(--accent); text-decoration:none; font-weight:500 }
  .pill { font-size:12px; font-weight:600; padding:2px 9px; border-radius:999px; background:var(--accent2); color:var(--accent) } .pill.ok { background:#e6f4ec; color:var(--ok) }
  .toast { background:#e6f4ec; color:var(--ok); border:1px solid #bfe3cd; border-radius:10px; padding:12px 16px; font-weight:500; margin-bottom:18px }
  .search { display:flex; gap:8px; margin-bottom:18px } .search input { max-width:340px }
  .steps { display:flex; gap:8px; margin-bottom:22px; font-size:13px } .steps span { padding:5px 12px; border-radius:999px; background:var(--panel); border:1px solid var(--line); color:var(--mute) } .steps span.on { background:var(--accent); border-color:var(--accent); color:#fff }
  .kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:22px } .kpi { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px 20px } .kpi .l { font-size:13px; color:var(--mute); font-weight:600 } .kpi .big { font-size:30px; font-weight:700; letter-spacing:-.02em; margin:4px 0 } .kpi .d { font-size:13px; color:var(--ok) }
  .chart { height:160px; display:flex; align-items:flex-end; gap:6px; padding:0 4px } .chart i { flex:1; background:var(--accent2); border-radius:4px 4px 0 0; border-top:3px solid var(--accent) }
  .mail tr[data-unread] td { font-weight:700 } .mail td.from { width:220px } .mail td.when { width:70px; color:var(--mute); text-align:right; font-weight:400 } .mail a { color:inherit; text-decoration:none }
  .side { float:left; width:180px; margin-right:24px } .side a { display:block; padding:7px 12px; border-radius:8px; color:var(--mute); text-decoration:none; font-size:14px } .side a.on { background:var(--accent2); color:var(--accent); font-weight:600 }
  .main { overflow:hidden } .thread { white-space:pre-wrap; line-height:1.7 }
  .site { font-family:Georgia,serif } .site .hero { padding:80px 24px 60px; text-align:center } .site h1 { font-size:44px; line-height:1.1; margin:0 auto 16px; max-width:720px } .site p { font-size:18px; color:var(--mute); max-width:600px; margin:0 auto 24px } .site .logos { display:flex; justify-content:center; gap:28px; color:var(--mute); font-weight:700; letter-spacing:.08em; font-size:13px }
  .serp li { list-style:none; margin:0 0 18px } .serp a { font-size:18px; color:#1a0dab; text-decoration:none } .serp small { display:block; color:#006621; font-size:13px } .serp p { margin:3px 0 0; color:#4d5156; font-size:14px }
`;

const page = (title, body, { brand = 'App', nav = [], on = '' } = {}) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body>
<div class="top"><div class="brand"><i></i>${esc(brand)}</div><nav>${nav.map((n) => `<a href="${n[1]}" class="${n[0] === on ? 'on' : ''}">${esc(n[0])}</a>`).join('')}</nav><div class="me"></div></div>
<div class="wrap">${body}</div></body></html>`;

export function createFixtures() {
  const state = {
    crm: [{ id: 1, name: 'Oldco', domain: 'oldco.com', one_liner: 'Legacy ERP', industry: 'Software', size: '200', location: 'Boston', note: '' },
      { id: 2, name: 'Globex', domain: 'globex.test', one_liner: 'Industrial IoT sensors', industry: 'Other', size: '80', location: 'Austin', note: '' },
      { id: 3, name: 'Initech', domain: 'initech.test', one_liner: 'TPS report automation', industry: 'Software', size: '45', location: 'Dallas', note: '' },
      { id: 4, name: 'Vandelay Industries', domain: 'vandelay.test', one_liner: 'Import and export logistics', industry: 'Other', size: '310', location: 'New York', note: '' },
      { id: 5, name: 'Hooli Pay', domain: 'hoolipay.test', one_liner: 'Embedded payments for marketplaces', industry: 'Fintech', size: '140', location: 'San Francisco', note: '' }],
    payroll: [], tracker: [{ customer: 'Globex', owner: 'Dana', status: 'Live' }], tasks: [], cms: { hero: 'The all-in-one platform for modern teams', subhead: 'Scale faster.', published: false, draftSaved: 0 }, publishClicks: 0,
    dash: { 'acme-analytics': { mrr: 42300, customers: 118, churn: '1.4%' }, northwind: { mrr: 9870, customers: 41, churn: '2.9%' } },
  };
  const mail = [
    { id: 't1', from: 'Priya Shah', email: 'priya@acme.test', subject: 'Contract redlines', when: '9:12 AM', unread: true, body: 'Hi Neel,\n\nCan you send over the redlined MSA by Thursday? Legal needs it before the board meeting.\n\nThanks,\nPriya' },
    { id: 't2', from: 'SaaS Weekly', email: 'news@saasweekly.test', subject: 'This week in SaaS', when: '8:40 AM', unread: true, body: 'Top stories this week. Read more on our site.' },
    { id: 't3', from: 'Marco Ruiz', email: 'marco@northwind.test', subject: 'Re: onboarding call', when: 'Yesterday', unread: true, body: 'Great call. Two asks:\n1) send the W-9 form\n2) add me to the Slack channel by Monday\n\nMarco' },
    { id: 't4', from: 'Dana', email: 'dana@oldco.test', subject: 'Lunch?', when: 'Mon', unread: false, body: 'Lunch next week?' },
    { id: 't5', from: 'Stripe', email: 'receipts@stripe.test', subject: 'Your receipt from Northstar CRM', when: 'Mon', unread: false, body: 'Amount paid $240.00. Thanks for your business.' },
    { id: 't6', from: 'Kayan Mishra', email: 'kayan@mudita.test', subject: 'Board deck v3', when: 'Sun', unread: false, body: 'Attached the latest. Comments by Wednesday would be great.' },
    { id: 't7', from: 'GitHub', email: 'noreply@github.test', subject: '[GTMTool] CI passed on main', when: 'Sat', unread: false, body: 'All checks have passed.' },
  ];
  const CRM = { brand: 'Northstar CRM', nav: [['Companies', '/crm'], ['Contacts', '#'], ['Deals', '#'], ['Reports', '#']], on: 'Companies' };
  const MAIL = { brand: 'Mail', nav: [['Inbox', '/mail'], ['Sent', '#'], ['Drafts', '#']], on: 'Inbox' };
  const PAY = { brand: 'PayDeck', nav: [['Customers', '/payroll/new'], ['Runs', '#'], ['Filings', '#']], on: 'Customers' };
  const CMS = { brand: 'Site CMS', nav: [['Pages', '/cms/home'], ['Media', '#'], ['Settings', '#']], on: 'Pages' };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    const send = (html, code = 200) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); };
    const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    const form = async () => { let b = ''; for await (const c of req) b += c; return Object.fromEntries(new URLSearchParams(b)); };
    const base = `http://${req.headers.host}`;

    if (p === '/__state') return json(state);

    // --- search engine
    if (p === '/search') {
      const q = url.searchParams.get('q') || '';
      return send(page('Search', `<div class="search"><input value="${esc(q)}"><button>Search</button></div><ul class="serp" style="padding:0">
        <li><a href="http://wikipedia.org/wiki/Acme">Acme - Wikipedia</a><small>wikipedia.org › wiki › Acme</small><p>Acme may refer to several companies.</p></li>
        <li><a href="${base}/site/acme">Acme Analytics: Revenue analytics for SaaS finance teams</a><small>acme.test</small><p>Connects to Stripe and your GL and closes the books in a day.</p></li>
        <li><a href="http://linkedin.com/company/acme">Acme | LinkedIn</a><small>linkedin.com › company › acme</small><p>Acme Analytics | 118 followers.</p></li></ul>`, { brand: 'Search' }));
    }

    // --- company sites
    if (p === '/site/acme') return send(page('Acme Analytics', `<div class="site"><div class="hero"><h1>Revenue analytics for SaaS finance teams</h1>
      <p>Acme Analytics connects to Stripe and your GL and closes the books in a day, not a week. Trusted by Northwind, Globex and 400 other SaaS companies.</p>
      <a class="btn primary" href="#">Book a demo</a></div><div class="logos"><span>NORTHWIND</span><span>GLOBEX</span><span>INITECH</span><span>VANDELAY</span></div>
      <h2 style="text-align:center;margin-top:60px">Backed by Sequoia. Series B, $40M, March 2026.</h2>
      <p style="text-align:center">We are hiring in Boston and remote. Contact: hello@acme.test</p><footer style="text-align:center;color:#999;padding:40px">© Acme Analytics Inc, Boston MA</footer></div>`, { brand: 'Acme Analytics', nav: [['Product', '#'], ['Pricing', '#'], ['Customers', '#']] }));
    if (p === '/site/oldco') return send(page('Oldco', `<div class="site"><div class="hero"><h1>ERP for manufacturers, now in the cloud</h1><p>Oldco has run plants since 1998. 250 people in Boston. Contact sales@oldco.test</p></div></div>`, { brand: 'Oldco' }));

    // --- CRM
    if (p === '/crm' && req.method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const rows = state.crm.filter((r) => !q || r.name.toLowerCase().includes(q) || r.domain.includes(q));
      return send(page('Companies · Northstar CRM', `<div class="row" style="justify-content:space-between"><div><h1>Companies</h1><p class="sub">${state.crm.length} records</p></div><a class="btn primary" href="/crm/new">New company</a></div>
        <form method="get" class="search"><input name="q" placeholder="Search companies" value="${esc(q)}"><button>Search</button></form>
        <div class="card" style="padding:0"><table><tr><th>Name</th><th>Domain</th><th>Industry</th><th>Location</th><th></th></tr>${rows.map((r) => `<tr><td><a href="/crm/${r.id}">${esc(r.name)}</a></td><td>${esc(r.domain)}</td><td>${esc(r.industry)}</td><td>${esc(r.location)}</td><td><span class="pill">Prospect</span></td></tr>`).join('') || '<tr><td colspan="5" style="color:var(--mute)">No companies match.</td></tr>'}</table></div>`, CRM));
    }
    const crmForm = (r, action, btn, toast = '') => `${toast}<h1>${r.id ? 'Edit ' + esc(r.name) : 'New company'}</h1><p class="sub">${r.id ? 'Record #' + r.id : 'Add a company to the pipeline'}</p><div class="card"><form method="post" action="${action}">
      <div class="grid2"><div><label for="f-name">Company name</label><input id="f-name" name="name" value="${esc(r.name)}"></div><div><label for="f-domain">Website</label><input id="f-domain" name="domain" value="${esc(r.domain)}"></div></div>
      <label for="f-desc">Description</label><textarea id="f-desc" name="one_liner">${esc(r.one_liner)}</textarea>
      <div class="grid2"><div><label for="f-ind">Industry</label><select id="f-ind" name="industry">${['Software', 'Fintech', 'Analytics', 'Other'].map((o) => `<option ${o === r.industry ? 'selected' : ''}>${o}</option>`).join('')}</select></div><div><label for="f-size">Employees</label><input id="f-size" name="size" value="${esc(r.size)}"></div></div>
      <label for="f-loc">Location</label><input id="f-loc" name="location" value="${esc(r.location)}">
      <label for="f-note">Notes</label><textarea id="f-note" name="note">${esc(r.note)}</textarea>
      <div class="actions"><button type="submit" class="primary">${btn}</button><a class="btn" href="/crm">Cancel</a></div></form></div>`;
    if (p === '/crm/new' && req.method === 'GET') return send(page('New company · Northstar CRM', crmForm({}, '/crm/new', 'Create company'), CRM));
    if (p === '/crm/new' && req.method === 'POST') { const r = await form(); r.id = state.crm.length + 1; state.crm.push(r); return send(page('Saved · Northstar CRM', crmForm(r, `/crm/${r.id}`, 'Save', '<div class="toast">Company saved.</div>'), CRM)); }
    let m;
    if ((m = p.match(/^\/crm\/(\d+)$/)) && req.method === 'GET') { const r = state.crm.find((x) => x.id === +m[1]); return r ? send(page(r.name + ' · Northstar CRM', crmForm(r, `/crm/${r.id}`, 'Save'), CRM)) : send('nope', 404); }
    if ((m = p.match(/^\/crm\/(\d+)$/)) && req.method === 'POST') { const r = state.crm.find((x) => x.id === +m[1]); Object.assign(r, await form(), { id: r.id }); return send(page('Saved · Northstar CRM', crmForm(r, `/crm/${r.id}`, 'Save', '<div class="toast">Company saved.</div>'), CRM)); }

    // --- webmail
    const side = `<div class="side"><a class="on" href="/mail">Inbox <span class="pill" style="float:right">${mail.filter((t) => t.unread).length}</span></a><a href="#">Starred</a><a href="#">Sent</a><a href="#">Drafts</a></div>`;
    if (p === '/mail') return send(page('Inbox', `${side}<div class="main card mail" style="padding:0"><table role="grid">${mail.map((t) => `<tr role="row" ${t.unread ? 'data-unread' : ''} aria-label="${esc((t.unread ? 'unread, ' : '') + t.from + ', ' + t.subject)}"><td class="from"><a href="/mail/${t.id}">${esc(t.from)}</a></td><td><a href="/mail/${t.id}">${esc(t.subject)}</a> <span style="color:var(--mute);font-weight:400"> — ${esc((t.body.split('\n').find((l) => l.length > 12) || t.body).slice(0, 70))}</span></td><td class="when">${esc(t.when)}</td></tr>`).join('')}</table></div>`, MAIL));
    if ((m = p.match(/^\/mail\/(\w+)$/))) { const t = mail.find((x) => x.id === m[1]); t.unread = false; return send(page(t.subject, `${side}<div class="main"><a href="/mail" style="color:var(--mute);text-decoration:none;font-size:14px">← Inbox</a><h1 style="margin-top:8px">${esc(t.subject)}</h1><p class="sub"><b style="color:var(--ink)">${esc(t.from)}</b> &lt;${esc(t.email)}&gt; · ${esc(t.when)}</p><div class="card thread">${esc(t.body)}</div></div>`, MAIL)); }

    // --- payroll portal: two pages, then a review page
    const steps = (n) => `<div class="steps">${['Company', 'Admin', 'Review'].map((s, i) => `<span class="${i + 1 === n ? 'on' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
    if (p === '/payroll/new' && req.method === 'GET') return send(page('New customer · PayDeck', `<h1>New customer</h1><p class="sub">Set up a company to run payroll</p>${steps(1)}<div class="card"><form method="post" action="/payroll/new">
      <label for="co">Legal company name</label><input id="co" name="company">
      <div class="grid2"><div><label for="ein">EIN</label><input id="ein" name="ein" placeholder="12-3456789"></div><div><label for="st">State of incorporation</label><input id="st" name="state" placeholder="DE"></div></div>
      <label for="pf">Pay frequency</label><select id="pf" name="frequency"><option>Weekly</option><option>Biweekly</option><option>Semimonthly</option><option>Monthly</option></select>
      <div class="actions"><button type="submit" class="primary">Continue</button></div></form></div>`, PAY));
    if (p === '/payroll/new' && req.method === 'POST') { state.payroll.push(await form()); return send(page('Primary admin · PayDeck', `<h1>Primary admin</h1><p class="sub">Who runs payroll at ${esc(state.payroll.at(-1).company)}?</p>${steps(2)}<div class="card"><form method="post" action="/payroll/admin">
      <div class="grid2"><div><label for="an">Admin name</label><input id="an" name="admin_name"></div><div><label for="ae">Admin email</label><input id="ae" name="admin_email"></div></div>
      <label for="hc">Headcount</label><input id="hc" name="headcount">
      <div class="actions"><button type="submit" class="primary">Submit application</button></div></form></div>`, PAY)); }
    if (p === '/payroll/admin' && req.method === 'POST') { Object.assign(state.payroll[state.payroll.length - 1], await form()); return send(page('Submitted · PayDeck', `<h1>Application submitted</h1><p class="sub">We will email the admin when the account is live.</p>${steps(3)}<div class="card"><p style="margin:0">Reference <b>PR-${1000 + state.payroll.length}</b> <span class="pill ok">Submitted</span></p></div>`, PAY)); }

    // --- internal tracker (a web form)
    if (p === '/tracker' && req.method === 'GET') return send(page('Onboarding tracker', `<h1>Onboarding tracker</h1><p class="sub">One row per customer</p><div class="card" style="margin-bottom:18px"><form method="post"><div class="grid2" style="grid-template-columns:1fr 1fr 1fr"><div><label for="tc">Customer</label><input id="tc" name="customer"></div><div><label for="to">Owner</label><input id="to" name="owner"></div><div><label for="ts">Status</label><input id="ts" name="status"></div></div><div class="actions"><button class="primary">Add row</button></div></form></div>
      <div class="card" style="padding:0"><table><tr><th>Customer</th><th>Owner</th><th>Status</th></tr>${state.tracker.map((r) => `<tr><td>${esc(r.customer)}</td><td>${esc(r.owner)}</td><td><span class="pill ok">${esc(r.status)}</span></td></tr>`).join('')}</table></div>`, { brand: 'Ops Tracker', nav: [['Onboarding', '/tracker'], ['Renewals', '#']], on: 'Onboarding' }));
    if (p === '/tracker' && req.method === 'POST') { state.tracker.push(await form()); res.writeHead(303, { location: '/tracker' }); return res.end(); }

    // --- dashboards
    if ((m = p.match(/^\/dash\/([\w-]+)$/))) {
      const d = state.dash[m[1]]; if (!d) return send(page('404', '<h1>No such dashboard</h1>'), 404);
      const name = m[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const bars = [38, 42, 40, 47, 52, 50, 58, 61, 66, 64, 72, 80].map((h) => `<i style="height:${h}%"></i>`).join('');
      return send(page(`${name} · Metrics`, `<h1>${esc(name)}</h1><p class="sub">Updated today · last 30 days</p>
        <div class="kpis"><div class="kpi"><div class="l">MRR</div><div class="big" id="mrr">$${d.mrr.toLocaleString()}</div><div class="d">▲ 5.8% vs last month</div></div>
        <div class="kpi"><div class="l">Active customers</div><div class="big">${d.customers}</div><div class="d">▲ 4 new</div></div>
        <div class="kpi"><div class="l">Churn</div><div class="big">${d.churn}</div><div class="d" style="color:var(--mute)">flat</div></div></div>
        <div class="card"><div class="l" style="font-size:13px;color:var(--mute);font-weight:600;margin-bottom:10px">MRR, monthly</div><div class="chart">${bars}</div></div>`, { brand: name, nav: [['Overview', '#'], ['Revenue', '#'], ['Customers', '#']], on: 'Overview' }));
    }

    // --- CMS editor
    if (p === '/cms/home' && req.method === 'GET') return send(page('Home page · Site CMS', `<div class="row" style="justify-content:space-between"><div><h1>Home page</h1><p class="sub">${state.cms.published ? '<span class="pill ok">Published</span>' : '<span class="pill">Draft</span>'} · ${state.cms.draftSaved} draft save${state.cms.draftSaved === 1 ? '' : 's'}</p></div></div>
      <div class="card"><form method="post" action="/cms/home">
      <label for="hero">Hero headline</label><input id="hero" name="hero" value="${esc(state.cms.hero)}" style="font-size:18px;font-weight:600">
      <label for="sub">Subheadline</label><input id="sub" name="subhead" value="${esc(state.cms.subhead)}">
      <label>Preview</label><div style="border:1px dashed var(--line);border-radius:10px;padding:34px 24px;text-align:center"><div style="font-size:30px;font-weight:700;letter-spacing:-.02em">${esc(state.cms.hero)}</div><div style="color:var(--mute);margin-top:8px">${esc(state.cms.subhead)}</div></div>
      <div class="actions"><button type="submit" name="op" value="draft">Save draft</button><button type="submit" name="op" value="publish" class="primary">Publish</button></div></form></div>`, CMS));
    if (p === '/cms/home' && req.method === 'POST') { const f = await form(); state.cms.hero = f.hero; state.cms.subhead = f.subhead; if (f.op === 'publish') { state.cms.published = true; state.publishClicks++; } else state.cms.draftSaved++; res.writeHead(303, { location: '/cms/home' }); return res.end(); }

    send(page('404', '<h1>Not found</h1>'), 404);
  });

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
