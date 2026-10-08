/* Lineup scoring model. Shared by the browser page and the server.
   No dependencies. Works as a CommonJS module and as a plain browser script. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LineupModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
/* ---------- Lexicon: phrases that could sit on any B2B site. weight 1 = empty, .5 = weak ---------- */
const LEX=[
  // platform-speak
  ['all-in-one',1],['all in one',1],['end-to-end',1],['end to end',1],['single source of truth',.9],['one platform',.9],['unified platform',1],['centralized',.7],['holistic',1],['360-degree',1],['360 view',1],['next-generation',1],['next-gen',1],['cutting-edge',1],['state-of-the-art',1],['best-in-class',1],['world-class',1],['industry-leading',1],['leading',.6],['enterprise-grade',.8],['robust',.8],['scalable',.8],['flexible',.7],['powerful',1],['intuitive',.9],['easy to use',.8],['easy-to-use',.8],['user-friendly',.9],['seamless',1],['seamlessly',1],['frictionless',.9],['effortless',.9],['effortlessly',.9],['simple',.5],['smart',.8],['intelligent',.9],['modern',.8],['innovative',1],['revolutionary',1],['game-changing',1],['transformative',1],['disruptive',1],['comprehensive',.9],['complete',.6],['purpose-built',.7],['future-proof',1],['turnkey',.8],['plug-and-play',.8],['out of the box',.7],['out-of-the-box',.7],
  // empty verbs
  ['empower',1],['empowers',1],['empowering',1],['enable',.8],['enables',.8],['unlock',1],['unlocks',1],['streamline',1],['streamlines',1],['streamlining',1],['optimize',.9],['optimizes',.9],['supercharge',1],['supercharges',1],['accelerate',.7],['accelerates',.7],['transform',.9],['transforms',.9],['elevate',1],['elevates',1],['revolutionize',1],['simplify',.7],['simplifies',.7],['automate',.5],['automates',.5],['leverage',1],['leverages',1],['harness',1],['drive growth',1],['drives growth',1],['drive results',1],['drive revenue',.9],['boost productivity',1],['boost efficiency',1],['maximize',.8],['maximizes',.8],['take control',.8],['take your',.7],['to the next level',1],['level up',.9],['do more with less',1],['work smarter',1],['work smarter, not harder',1],['get more done',.9],['save time and money',.9],['save time',.6],['scale your business',.9],['grow your business',.9],['make better decisions',.9],['data-driven decisions',.9],['actionable insights',1],['real-time insights',.8],['insights',.6],['visibility',.6],['stay ahead',.9],['stay ahead of the competition',1],['win more deals',.8],['close more deals',.8],['delight your customers',.9],['customer experience',.6],['digital transformation',1],['operational efficiency',.9],['business outcomes',1],['better outcomes',.9],['peace of mind',.8],['the way you work',.9],['the way teams work',.9],['how work gets done',.9],['teams of all sizes',.9],['businesses of all sizes',.9],['companies of all sizes',.9],['from startups to enterprises',.9],['for everyone',.8],['for every team',.8],['for modern teams',1],['modern teams',1],['growing teams',.8],['high-performing teams',.9],['ambitious teams',.9],['fast-growing companies',.8],['loved by',.5],['trusted by',.3],
  // AI era
  ['ai-powered',.9],['ai powered',.9],['powered by ai',.9],['ai-driven',.9],['ai-native',.8],['ai-first',.8],['generative ai',.6],['machine learning',.5],['intelligent automation',1],['autonomous',.5],['agentic',.7],['copilot for',.6],['your ai',.6],['the ai',.5],['with ai',.6],
  // collaboration / workflow
  ['collaborate',.6],['collaboration',.6],['in one place',.8],['all in one place',1],['workflow',.4],['workflows',.4],['solution',.9],['solutions',.9],['platform',.5],['ecosystem',.8],['experience',.5],['journey',.7],['synergy',1],['best practices',.8],['mission-critical',.8],['at scale',.7],['faster than ever',1],['like never before',1],['at the speed of',.9],['built for the future',1],['built for speed',.8],['made simple',.9],['simplified',.6],['reimagined',1],['redefined',1],['reinvented',1],['rethought',.9],['without the complexity',.8],['without the hassle',.8],['without the headache',.8],['no code',.3],['no-code',.3],['in minutes',.4],['in seconds',.4],['instantly',.5],
  // more
  ['operating system for',.9],['the operating system',.9],['mission control',.9],['command center',.9],['control tower',.9],['single pane of glass',1],['source of truth',.8],['built for scale',1],['without compromise',1],['hassle-free',.9],['lightning fast',1],['lightning-fast',1],['blazing fast',1],['blazing-fast',1],['secure by design',.8],['enterprise-ready',.8],['trusted by thousands',.6],['join thousands',.7],['get started in minutes',.6],['world\'s first',.7],['the only',.5],['the best',.8],['the future of',1],['reimagine',1],['reimagining',1],['unleash',1],['superpowers',1],['superpower',1],['10x',.6],['on autopilot',.8],['autopilot',.7],['end-to-end visibility',1],['across the entire',.8],['from day one',.7],['designed for',.4],['tailored',.8],['bespoke',.8],['personalized',.6],['customer-centric',1],['human-centric',1],['people-first',.9],['say goodbye to',.6],['say hello to',.8],['the new standard',1],['new standard',1],['redefining',1],['built different',1],['think different',1],['smarter way',1],['better way',1],['a new way',.9],['the easiest way',.9],['the fastest way',.8],['the smartest way',1],['without lifting a finger',.9],['in real time',.5],['real-time',.5],['anytime, anywhere',1],['anywhere, anytime',1],['on any device',.8],['connected',.5],['integrated',.5],['automated',.4],['no-brainer',1],['delightful',.9],['beautiful',.7],['beautifully',.8],['elegant',.8],['magical',1],['magic',.9],
].sort((a,b)=>b[0].length-a[0].length);

/* ---------- Specificity signals ---------- */
/* A buyer is named when "for", "built for", "helps" (and friends) is followed by a noun phrase
   that could not describe every company on earth. Specific = a proper noun, a number, an industry,
   a role, or a plural noun that is not on the generic list. */
const GENERIC_BUYERS=new Set(['everyone','anyone','everybody','you','your','yours','us','them','people','users','customers','clients','teams','team','businesses','business','companies','company','organizations','organisations','orgs','enterprises','enterprise','startups','startup','smbs','professionals','leaders','humans','workers','employees','founders','brands','modern','growing','ambitious','fast-growing','high-performing','high-growth','small','medium','large','every','all','sizes','size','any','the','a','an','of','and','today','tomorrow','future','work','world','life','needs','success','growth','scale','results','revenue','productivity','efficiency','collaboration','innovation','impact','change','good']);
const INDUSTRIES=new Set(['hospitality','healthcare','construction','logistics','manufacturing','insurance','fintech','legal','education','retail','ecommerce','e-commerce','saas','government','dental','pharma','biotech','agriculture','automotive','energy','telecom','media','gaming','nonprofit','nonprofits','banking','finance','hr','ops','revops','devops','security','compliance','procurement','payroll','accounting','recruiting','marketing','sales','support','engineering','design','product','legaltech','proptech','edtech','healthtech','martech','adtech','cleantech','mortgage','lending','trucking','freight','shipping','warehousing','restaurants','hotels','clinics','schools','universities','churches','gyms','salons','spas','dentists','vets','pharmacies','labs','agencies','studios','firms','contractors','landlords','realtors','brokers','dealers','distributors','wholesalers','franchises','franchisees']);
const ROLES=new Set(['ceo','ceos','cfo','cfos','cto','ctos','cmo','cmos','cro','cros','coo','coos','ciso','cisos','cpo','cpos','vp','vps','founder','founders','controller','controllers','accountant','accountants','bookkeeper','bookkeepers','recruiter','recruiters','engineer','engineers','developer','developers','designer','designers','marketer','marketers','seller','sellers','rep','reps','sdr','sdrs','ae','aes','csm','csms','pm','pms','manager','managers','admin','admins','owner','owners','operator','operators','clinician','clinicians','nurse','nurses','doctor','doctors','dentist','dentists','lawyer','lawyers','attorney','attorneys','paralegal','paralegals','agent','agents','broker','brokers','landlord','landlords','contractor','contractors','electrician','electricians','plumber','plumbers','roofer','roofers','groomer','groomers','teacher','teachers','principal','principals','pastor','pastors','coach','coaches','trainer','trainers','therapist','therapists','pharmacist','pharmacists','driver','drivers','dispatcher','dispatchers','buyer','buyers','merchandiser','merchandisers','planner','planners','analyst','analysts','scientist','scientists','researcher','researchers','editor','editors','writer','writers','creator','creators','freelancer','freelancers','consultant','consultants','advisor','advisors','treasurer','treasurers']);
const BUYER_LEAD=/\b(?:built|made|designed|created|tailored)\s+for\b|\bfor\b|\bhelps?\b|\bhelping\b|\bserving\b|\bserves\b/gi;
function namedBuyer(text){
  const re=new RegExp(BUYER_LEAD.source,'gi');let m;
  while((m=re.exec(text))){
    const rest=text.slice(m.index+m[0].length).replace(/^\s+/,'');
    const phrase=rest.split(/[.,;:!?()]|\b(?:who|that|which|so|and|to|with|by|without|instead|unlike)\b/i)[0].trim();
    const words=phrase.split(/\s+/).filter(Boolean).slice(0,6);
    if(!words.length) continue;
    let specific=false;
    for(let i=0;i<words.length;i++){
      const raw=words[i].replace(/[^A-Za-z0-9$%'’-]/g,''), w=raw.toLowerCase();
      if(!w) continue;
      if(GENERIC_BUYERS.has(w)) continue;
      if(/^[A-Z][a-zA-Z]+$/.test(raw)&&!(i===0&&m.index===0)) {specific=true;break}   // proper noun
      if(/\d/.test(w)) {specific=true;break}                                        // "5 to 50 units", "200-person"
      if(INDUSTRIES.has(w)||ROLES.has(w)) {specific=true;break}
      if(/s$/.test(w)&&w.length>4&&!/(ness|less|ous|ss)$/.test(w)) {specific=true;break} // a plural noun: groomers, clinics, stores
      if(/ing$/.test(w)&&w.length>6) {specific=true;break}                                 // a trade: landscaping, roofing, staffing
    }
    if(specific) return phrase.slice(0,80);
  }
  return null;
}
const BUYER={test:t=>namedBuyer(t)!==null};
const ALT=/\b(unlike|instead of|replaces?|replacing|without|rather than|vs\.?|versus|alternative to|no more|stop using|ditch|swap|move off|migrate from|tired of|goodbye to|not another|isn't another|is not another|beyond)\b/i;
const NUMBER=/(\$\s?\d[\d,.]*\s?[kmb]?|\d[\d,.]*\s?(%|percent|x|×|hours?|hrs|minutes?|mins?|days?|weeks?|months?|seconds?|customers?|companies|teams|users|countries|integrations|years?)|\b\d{2,}[\d,]*\b)/i;
const PROOF=/\b(customers?|companies|teams|users|stores?|clinics?|firms?|recovered|processed|saved|won|g2|gartner|forrester|soc ?2|iso ?27001|hipaa|gdpr|case study|rated|reviews?|stars?|nps|yc|y combinator|series [abc]|backed by|used by|trusted by|chosen by|named|award|certified|guaranteed|guarantee|refund|sla|uptime)\b/i;
const OUTCOME=/\b(so (?:you|your team|they) (?:can|never|don'?t|stop)|win|wins|cut|cuts|reduce|reduces|save|saves|recover|recovers|collect|collects|close|closes|ship|ships|book|books|fill|fills|hire|hires|catch|catches|prevent|prevents|get paid|paid faster|in under|within|from \d|to \d|by \d|per (?:week|month|day|rep|store|seat))\b/i;
const CONCRETE=/\b(invoices?|receipts?|orders?|payouts?|fees|bookkeeping|penalties|disputes?|contracts?|pos?s|purchase orders?|tickets?|shifts?|schedules?|payroll|refunds?|chargebacks?|returns?|inventory|skus?|warehouses?|shipments?|routes?|leads?|demos?|meetings?|quotes?|proposals?|renewals?|churn|trials?|signups?|onboarding|pull requests?|deploys?|incidents?|alerts?|logs?|spreadsheets?|emails?|calls?|voicemails?|texts?|sms|forms?|pdfs?|claims?|prescriptions?|patients?|appointments?|no-shows?|listings?|tenants?|leases?|loans?|wires?|ach|cards?|subscriptions?|carts?|checkout|coupons?|reviews?|ads?|campaigns?|keywords?|backlinks?|resumes?|candidates?|interviews?|offers?|timesheets?|expenses?|budgets?|forecasts?|audits?|taxes|vat|1099s?|w-?2s?|sow|rfps?|tenders?|bids?|permits?|inspections?|work orders?|jobs?|crews?|trucks?|drivers?|pallets?|containers?)\b/i;

/* ---------- Composites (fictional) ---------- */

/* ---------- Analysis ---------- */
function tokenize(t){return (t.match(/[A-Za-z0-9$%'’-]+/g)||[])}
function analyze(text){
  const t=text.trim();
  const words=tokenize(t);
  const n=words.length;
  if(n<3) return {n, score:null, marks:[], parts:null, covered:0};
  // find lexicon matches, longest first, non-overlapping
  const lower=t.toLowerCase();
  const taken=new Array(t.length).fill(false);
  const marks=[];
  for(const [ph,w] of LEX){
    let i=0;
    while((i=lower.indexOf(ph,i))!==-1){
      const end=i+ph.length;
      const before=i===0||!/[a-z0-9]/.test(lower[i-1]), after=end>=lower.length||!/[a-z0-9]/.test(lower[end]);
      if(before&&after&&!taken.slice(i,end).some(Boolean)){for(let k=i;k<end;k++)taken[k]=true;marks.push({i,end,ph:t.slice(i,end),w})}
      i=end;
    }
  }
  marks.sort((a,b)=>a.i-b.i);
  const coveredWords=marks.reduce((a,m)=>a+tokenize(m.ph).length*m.w,0);
  // specifics
  const parts={
    who:{t:'Who',q:'Names a buyer',hit:BUYER.test(t)},
    alt:{t:'Instead of',q:'Names what it replaces',hit:ALT.test(t)},
    how:{t:'Because',q:'A concrete thing it does',hit:CONCRETE.test(t)},
    get:{t:'So that',q:'An outcome with a number',hit:OUTCOME.test(t)&&NUMBER.test(t), part:OUTCOME.test(t)||NUMBER.test(t)},
    proof:{t:'Proof',q:'Evidence a buyer could check',hit:PROOF.test(t)&&NUMBER.test(t), part:PROOF.test(t)},
  };
  const nums=(t.match(NUMBER)||[]).length?(t.match(new RegExp(NUMBER.source,'gi'))||[]).length:0;
  const concrete=(t.match(new RegExp(CONCRETE.source,'gi'))||[]).length;
  const proper=(t.match(/(?<=[^.!?]\s)[A-Z][a-zA-Z]{2,}/g)||[]).filter(w=>!/^(The|A|An|And|For|With|Your|Our|We|You|It|Its|AI|B2B|SaaS|CRM|ERP|HR|IT)$/.test(w)).length;
  // score: how much of the claim is carried by interchangeable language,
  // plus a penalty for each missing part, minus credit for checkable specifics.
  const emptiness=coveredWords/n;
  let score=60*Math.pow(emptiness,.6);
  ['who','alt','how','get','proof'].forEach(k=>{if(!parts[k].hit)score+=parts[k].part?4:10});
  // Specifics earn credit, but only numbers make a claim checkable: without any number
  // the credit is capped and a small penalty applies (nothing a buyer could verify).
  score-=nums>0?Math.min(15,nums*4+Math.min(6,concrete*2+proper*2)):Math.min(4,concrete+proper);
  if(nums===0) score+=6;
  if(n>70) score+=3;
  score=Math.max(0,Math.min(100,Math.round(score)));
  return {n, score, marks, parts, covered:Math.round(100*marks.reduce((a,m)=>a+tokenize(m.ph).length,0)/n), nums, concrete, proper, buyer:namedBuyer(t)};
}

/* Wilson score interval for a pick rate. Rank by `lo`, never by the raw rate. */
function wilson(picks,shows,z){
  z=z||1.96; if(!shows) return {p:null,lo:0,hi:1,n:0};
  const p=picks/shows,d=1+z*z/shows,c=p+z*z/(2*shows),m=z*Math.sqrt((p*(1-p)+z*z/(4*shows))/shows);
  return {p,lo:Math.max(0,(c-m)/d),hi:Math.min(1,(c+m)/d),n:shows};
}
const headlineOf=t=>{const m=t.trim().match(/^[^.!?]+[.!?]?/);return (m?m[0]:t).slice(0,160)};
return { analyze, tokenize, headlineOf, wilson, namedBuyer, LEX, BUYER, ALT, NUMBER, PROOF, OUTCOME, CONCRETE };
});
