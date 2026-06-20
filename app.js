/* ============================================================
   Wedding Planner app — vanilla JS, no build step.
   Runs in DEMO MODE (localStorage) until config.js has Supabase
   credentials, then switches to live cloud sync automatically.
   ============================================================ */

/* ---------- tiny helpers ---------- */
const $  = (s, r=document) => r.querySelector(s);
const el = (t, props={}, kids=[]) => {
  const n = document.createElement(t);
  for (const k in props){
    if (k === 'class') n.className = props[k];
    else if (k === 'html') n.innerHTML = props[k];
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), props[k]);
    else if (props[k] !== undefined && props[k] !== null) n.setAttribute(k, props[k]);
  }
  (Array.isArray(kids)?kids:[kids]).forEach(c=> c!=null && n.append(c.nodeType?c:document.createTextNode(c)));
  return n;
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id'+Math.random().toString(36).slice(2));
const money = n => '$'+Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
const fmtDate = d => d ? new Date(d+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
const WEDDING = '2027-07-10';
const daysUntil = d => Math.ceil((new Date(d+'T00:00') - new Date(new Date().toDateString()))/86400000);

/* ============================================================
   DATA LAYER
   ============================================================ */
const TABLES = ['settings','tasks','budget_items','guests','vendors',
  'tables_seating','timeline_events','registry','inspiration','documents','payments'];

class DemoStore {
  constructor(){ this.seedIfEmpty(); }
  key(t){ return 'wed_'+t; }
  seedIfEmpty(){
    if (localStorage.getItem('wed_seeded')) return;
    for (const t of TABLES){
      let rows = SEED[t];
      if (t==='settings'){ localStorage.setItem(this.key(t), JSON.stringify(SEED.settings)); continue; }
      rows = (rows||[]).map(r=>({id:uid(),...r}));
      localStorage.setItem(this.key(t), JSON.stringify(rows));
    }
    localStorage.setItem('wed_seeded','1');
  }
  async all(t){ return JSON.parse(localStorage.getItem(this.key(t))||'[]'); }
  async settings(){ return JSON.parse(localStorage.getItem('wed_settings')||JSON.stringify(SEED.settings)); }
  async saveSettings(o){ localStorage.setItem('wed_settings', JSON.stringify(o)); }
  async insert(t,row){ const rows=await this.all(t); const r={id:uid(),...row}; rows.push(r); localStorage.setItem(this.key(t),JSON.stringify(rows)); return r; }
  async update(t,id,patch){ const rows=await this.all(t); const i=rows.findIndex(r=>r.id===id); if(i>-1){rows[i]={...rows[i],...patch}; localStorage.setItem(this.key(t),JSON.stringify(rows));} }
  async remove(t,id){ const rows=(await this.all(t)).filter(r=>r.id!==id); localStorage.setItem(this.key(t),JSON.stringify(rows)); }
  async exportAll(){ const o={}; for(const t of TABLES) o[t]= t==='settings'? await this.settings() : await this.all(t); return o; }
  async importAll(o){ for(const t of TABLES){ if(!o[t])continue; localStorage.setItem(this.key(t), JSON.stringify(o[t])); } localStorage.setItem('wed_seeded','1'); }
}

class SupabaseStore {
  constructor(cfg){
    this.sb = supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:false },
    });
  }
  /* ---- auth (live mode only) ---- */
  async getSession(){ const {data}=await this.sb.auth.getSession(); return data.session; }
  async signIn(email,password){ return this.sb.auth.signInWithPassword({email:email.trim(),password}); }
  async signOut(){ try{ await this.sb.auth.signOut(); }catch(_){} }
  onAuth(cb){ this.sb.auth.onAuthStateChange((_e,s)=>cb(s)); }
  async all(t){ const {data}=await this.sb.from(t).select('*'); return data||[]; }
  async settings(){ const {data}=await this.sb.from('settings').select('*').eq('id',1).single(); return data||SEED.settings; }
  async saveSettings(o){ await this.sb.from('settings').upsert({...o,id:1}); }
  async insert(t,row){ const {data}=await this.sb.from(t).insert(row).select().single(); return data; }
  async update(t,id,patch){ await this.sb.from(t).update(patch).eq('id',id); }
  async remove(t,id){ await this.sb.from(t).delete().eq('id',id); }
  async exportAll(){ const o={}; for(const t of TABLES) o[t]= t==='settings'? await this.settings() : await this.all(t); return o; }
  async importAll(o){ for(const t of TABLES){ if(t==='settings'){await this.saveSettings(o[t]);continue;} if(o[t]?.length) await this.sb.from(t).insert(o[t].map(({id,...r})=>r)); } }
  watch(cb){ TABLES.forEach(t=> this.sb.channel('rt_'+t).on('postgres_changes',{event:'*',schema:'public',table:t},cb).subscribe()); }
}

const LIVE = !!(window.SUPABASE_CONFIG && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
const store = LIVE ? new SupabaseStore(SUPABASE_CONFIG) : new DemoStore();

/* ============================================================
   MODULE DEFINITIONS (drive generic CRUD pages)
   ============================================================ */
const SELECT = {
  owner:  ['Amin','Partner','Both'],
  status_task: ['todo','doing','done'],
  rsvp:   ['pending','yes','no','maybe'],
  vstatus:['researching','contacted','booked','declined'],
  side:   ['Amin','Partner','Both'],
};

const MODULES = {
  checklist: {
    table:'tasks', icon:'✓', title:'Checklist', sub:'Master timeline to the big day',
    primary:'title', pill:'status', pillMap:'status_task',
    filterBy:'category', sort:(a,b)=>(a.due_date||'').localeCompare(b.due_date||''),
    meta:r=>[r.category, fmtDate(r.due_date), r.owner].filter(Boolean).join(' · '),
    fields:[
      {k:'title',label:'Task',type:'text',req:true},
      {k:'category',label:'Category',type:'text'},
      {k:'due_date',label:'Due',type:'date'},
      {k:'owner',label:'Owner',type:'select',opts:SELECT.owner},
      {k:'status',label:'Status',type:'select',opts:SELECT.status_task},
      {k:'notes',label:'Notes',type:'textarea'},
    ],
  },
  budget: {
    table:'budget_items', icon:'$', title:'Budget', sub:'Estimated vs. actual spend',
    primary:'label', filterBy:'category',
    meta:r=>`${r.category||''} · est ${money(r.estimated)} · actual ${money(r.actual)}${r.paid?' · paid':''}`,
    fields:[
      {k:'label',label:'Item',type:'text',req:true},
      {k:'category',label:'Category',type:'text'},
      {k:'estimated',label:'Estimated $',type:'number'},
      {k:'actual',label:'Actual $',type:'number'},
      {k:'deposit_paid',label:'Deposit paid $',type:'number'},
      {k:'due_date',label:'Payment due',type:'date'},
      {k:'paid',label:'Paid in full',type:'checkbox'},
      {k:'notes',label:'Notes',type:'textarea'},
    ],
  },
  guests: {
    table:'guests', icon:'👤', title:'Guests & RSVP', sub:'Who’s coming, meals, addresses',
    primary:'name', pill:'rsvp', pillMap:'rsvp', filterBy:'rsvp',
    meta:r=>[r.party, r.side, r.rsvp==='yes'?`${r.attending_count} attending`:null, r.meal].filter(Boolean).join(' · '),
    fields:[
      {k:'name',label:'Name',type:'text',req:true},
      {k:'party',label:'Party / household',type:'text'},
      {k:'side',label:'Side',type:'select',opts:SELECT.side},
      {k:'rsvp',label:'RSVP',type:'select',opts:SELECT.rsvp},
      {k:'attending_count',label:'# attending',type:'number'},
      {k:'plus_one',label:'Plus one',type:'checkbox'},
      {k:'meal',label:'Meal choice',type:'text'},
      {k:'dietary',label:'Dietary notes',type:'text'},
      {k:'email',label:'Email',type:'text'},
      {k:'phone',label:'Phone',type:'text'},
      {k:'address',label:'Mailing address',type:'textarea'},
      {k:'invited_welcome',label:'Invited to welcome party',type:'checkbox'},
      {k:'notes',label:'Notes',type:'textarea'},
    ],
  },
  vendors: {
    table:'vendors', icon:'🏷️', title:'Vendors', sub:'Contacts, contracts, costs',
    primary:'name', secondary:'category', pill:'status', pillMap:'vstatus', filterBy:'status',
    meta:r=>[r.category, r.contact_name, r.cost?money(r.cost):null, r.contract_signed?'signed':null].filter(Boolean).join(' · '),
    fields:[
      {k:'name',label:'Vendor name',type:'text'},
      {k:'category',label:'Category',type:'text'},
      {k:'status',label:'Status',type:'select',opts:SELECT.vstatus},
      {k:'contact_name',label:'Contact person',type:'text'},
      {k:'phone',label:'Phone',type:'text'},
      {k:'email',label:'Email',type:'text'},
      {k:'cost',label:'Cost $',type:'number'},
      {k:'contract_signed',label:'Contract signed',type:'checkbox'},
      {k:'notes',label:'Notes',type:'textarea'},
    ],
  },
  timeline: {
    table:'timeline_events', icon:'🕐', title:'Day-of Timeline', sub:'Wedding-day run of show',
    primary:'title', filter:r=>r.event_day!=='welcome',
    sort:(a,b)=>(a.time||'').localeCompare(b.time||''),
    meta:r=>[r.time, r.location, r.responsible].filter(Boolean).join(' · '),
    fields:[
      {k:'time',label:'Time (e.g. 17:00)',type:'text'},
      {k:'title',label:'What happens',type:'text',req:true},
      {k:'location',label:'Location',type:'text'},
      {k:'responsible',label:'Who’s responsible',type:'text'},
      {k:'notes',label:'Notes',type:'textarea'},
      {k:'event_day',label:'Day',type:'hidden',default:'wedding'},
    ],
  },
  welcome: {
    table:'timeline_events', icon:'🌿', title:'Henna & Welcome Party', sub:'Thursday, July 8, 2027 (two nights before the wedding) · venue TBD',
    primary:'title', filter:r=>r.event_day==='welcome',
    sort:(a,b)=>(a.time||'').localeCompare(b.time||''),
    meta:r=>[r.time, r.location, r.responsible].filter(Boolean).join(' · '),
    fields:[
      {k:'time',label:'Time',type:'text'},
      {k:'title',label:'What happens',type:'text',req:true},
      {k:'location',label:'Location',type:'text'},
      {k:'responsible',label:'Who’s responsible',type:'text'},
      {k:'notes',label:'Notes',type:'textarea'},
      {k:'event_day',label:'Day',type:'hidden',default:'welcome'},
    ],
  },
  registry: {
    table:'registry', icon:'🎁', title:'Registry & Gifts', sub:'Items, gifts received, thank-yous',
    primary:'item', pill:r=>r.received?'done':'todo',
    meta:r=>[r.store, r.price?money(r.price):null, r.received?'received':null, r.thank_you_sent?'thanked':null].filter(Boolean).join(' · '),
    fields:[
      {k:'item',label:'Item',type:'text',req:true},
      {k:'store',label:'Store',type:'text'},
      {k:'url',label:'Link',type:'text'},
      {k:'price',label:'Price $',type:'number'},
      {k:'from_guest',label:'Gift from',type:'text'},
      {k:'received',label:'Received',type:'checkbox'},
      {k:'thank_you_sent',label:'Thank-you sent',type:'checkbox'},
    ],
  },
  inspiration: {
    table:'inspiration', icon:'✨', title:'Inspiration', sub:'Ideas, links, and looks you love',
    primary:'title', filterBy:'theme',
    meta:r=>[r.theme, r.url].filter(Boolean).join(' · '),
    fields:[
      {k:'title',label:'Title',type:'text',req:true},
      {k:'theme',label:'Theme (Decor, Attire…)',type:'text'},
      {k:'url',label:'Link',type:'text'},
      {k:'image_url',label:'Image URL',type:'text'},
      {k:'notes',label:'Notes',type:'textarea'},
    ],
  },
  documents: {
    table:'documents', icon:'📄', title:'Documents', sub:'Contracts and important files',
    primary:'title', filterBy:'category',
    meta:r=>[r.category, r.url].filter(Boolean).join(' · '),
    fields:[
      {k:'title',label:'Title',type:'text',req:true},
      {k:'category',label:'Category',type:'text'},
      {k:'url',label:'Link to file',type:'text'},
      {k:'notes',label:'Notes',type:'textarea'},
    ],
  },
  payments: {
    table:'payments', icon:'💳', title:'Payment', sub:'Scheduled payments & deposits',
    primary:'label',
    fields:[
      {k:'payee',label:'Pay to (vendor)',type:'text'},
      {k:'label',label:'Payment',type:'text',req:true},
      {k:'amount',label:'Amount $',type:'number'},
      {k:'due_date',label:'Due date',type:'date'},
      {k:'paid',label:'Paid',type:'checkbox'},
      {k:'paid_date',label:'Date paid',type:'date'},
      {k:'method',label:'Method (card, check…)',type:'text'},
      {k:'notes',label:'Notes',type:'textarea'},
    ],
  },
};

/* navigation order */
const NAV = [
  ['dashboard','🏠','Dashboard'],
  ['checklist','✓','Checklist'],
  ['budget','$','Budget'],
  ['payments','💳','Payments'],
  ['guests','👤','Guests'],
  ['seating','🪑','Seating'],
  ['vendors','🏷️','Vendors'],
  ['timeline','🕐','Day-of'],
  ['welcome','🌿','Henna'],
  ['registry','🎁','Registry'],
  ['inspiration','✨','Inspiration'],
  ['documents','📄','Documents'],
  ['settings','⚙️','Settings'],
];
// 5 primary tabs on the phone bottom bar; everything else lives behind "More".
const MOBILE_NAV = ['dashboard','checklist','budget','payments','guests'];

/* ============================================================
   RENDER
   ============================================================ */
const view = $('#view');
let current = 'dashboard';

function buildNav(){
  const d = $('#navDesktop'); d.innerHTML='';
  NAV.forEach(([k,ic,label])=> d.append(el('a',{href:'#'+k,class:k===current?'active':'','data-k':k},
    [el('span',{class:'ic'},ic), label])));
  const m = $('#navMobile'); m.innerHTML='';
  MOBILE_NAV.forEach(k=>{ const item=NAV.find(n=>n[0]===k);
    m.append(el('a',{href:'#'+k,class:k===current?'active':''},[el('span',{class:'ic'},item[1]), item[2]])); });
  // "More" opens a sheet with every section, so nothing is unreachable on a phone.
  const more = NAV.some(n=>n[0]===current) && !MOBILE_NAV.includes(current);
  m.append(el('a',{href:'#', class:more?'active':'', onclick:e=>{e.preventDefault(); openNavMenu();}},
    [el('span',{class:'ic'},'☰'), 'More']));
}
function openNavMenu(){
  const modal=$('#modal'), bg=$('#modalBg');
  modal.innerHTML='';
  modal.append(el('h3',{},'All sections'),
    el('div',{class:'menu-grid'}, NAV.map(([k,ic,label])=>
      el('a',{href:'#'+k, class:'menu-item'+(k===current?' active':''), onclick:closeModal},
        [el('span',{class:'mic'},ic), label]))));
  bg.classList.add('open');
}

function pageHead(title, sub, actions){
  return el('div',{class:'page-head'},[
    el('div',{},[el('h1',{},title), sub?el('p',{},sub):null]),
    actions||null,
  ]);
}

async function route(){
  current = (location.hash.slice(1) || 'dashboard');
  $('#topTitle').textContent = (NAV.find(n=>n[0]===current)||[])[2]||'';
  buildNav();
  view.innerHTML='';
  window.scrollTo(0,0);
  if (current==='dashboard') return renderDashboard();
  if (current==='seating')   return renderSeating();
  if (current==='payments')  return renderPayments();
  if (current==='settings')  return renderSettings();
  if (MODULES[current])      return renderModule(current);
  renderDashboard();
}

/* ---------- DASHBOARD ---------- */
async function renderDashboard(){
  const [tasks, budget, guests, vendors, payments] = await Promise.all([
    store.all('tasks'), store.all('budget_items'), store.all('guests'), store.all('vendors'), store.all('payments')]);
  const s = await store.settings();
  const dleft = daysUntil(s.wedding_date||WEDDING);
  const doneT = tasks.filter(t=>t.status==='done').length;
  const estTotal = budget.reduce((a,b)=>a+Number(b.estimated||0),0);
  const actTotal = budget.reduce((a,b)=>a+Number(b.actual||0),0);
  const cap = Number(s.total_budget||0);
  const yes = guests.filter(g=>g.rsvp==='yes').reduce((a,g)=>a+Number(g.attending_count||1),0);
  const pending = guests.filter(g=>g.rsvp==='pending'||!g.rsvp).length;
  const booked = vendors.filter(v=>v.status==='booked').length;
  const upcoming = tasks.filter(t=>t.status!=='done' && t.due_date)
    .sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,6);

  // alerts: overdue tasks, overdue payments, and payments coming due in the next 30 days
  const overdueTasks = tasks.filter(t=>t.status!=='done' && t.due_date && daysUntil(t.due_date)<0);
  const overduePays = payments.filter(p=>!p.paid && p.due_date && daysUntil(p.due_date)<0)
    .sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||''));
  const soonPays = payments.filter(p=>!p.paid && p.due_date && daysUntil(p.due_date)>=0 && daysUntil(p.due_date)<=30)
    .sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||''));
  const payLabel = p=>`${p.payee?p.payee+' ':''}${p.label} ${money(p.amount)} — ${fmtDate(p.due_date)}`;
  const alerts=[];
  if(overdueTasks.length) alerts.push(alertRow('⏰',
    `${overdueTasks.length} task${overdueTasks.length>1?'s':''} overdue`,
    overdueTasks.slice(0,3).map(t=>t.title).join(' · '), 'checklist'));
  if(overduePays.length) alerts.push(alertRow('🔴',
    `${overduePays.length} payment${overduePays.length>1?'s':''} overdue`,
    overduePays.slice(0,3).map(payLabel).join(' · '), 'payments'));
  if(soonPays.length) alerts.push(alertRow('💳',
    `${soonPays.length} payment${soonPays.length>1?'s':''} due soon`,
    soonPays.slice(0,3).map(payLabel).join(' · '), 'payments'));

  view.append(
    el('div',{class:'hero'},[
      el('div',{class:'label'},'Counting down to'),
      el('div',{class:'big'}, dleft>0?`${dleft} days`:(dleft===0?'Today! 🎉':'Married 💍')),
      el('div',{class:'sub'}, `${fmtDate(s.wedding_date||WEDDING)} · ${s.venue||''}`),
      s.welcome_date ? el('a',{class:'sub hero-2nd', href:'#welcome'},
        `🌿 Henna & Welcome Party · ${fmtDate(s.welcome_date)}`) : null,
    ]),
    el('div',{class:'grid cards'},[
      statCard('Tasks done', `${doneT}`, `of ${tasks.length}`, tasks.length?doneT/tasks.length:0),
      statCard('Guests confirmed', `${yes}`, `${pending} awaiting reply`, guests.length?yes/(guests.length||1):0),
      statCard('Vendors booked', `${booked}`, `of ${vendors.length} tracked`, vendors.length?booked/vendors.length:0),
      statCard('Budget (actual)', money(actTotal), cap?`of ${money(cap)} set`:`est. ${money(estTotal)}`, cap?actTotal/cap:0),
    ]),
    ...(alerts.length ? [
      el('div',{class:'section-title'},'Needs attention'),
      el('div',{class:'list'}, alerts),
    ] : []),
    el('div',{class:'section-title'},'Coming up next'),
    upcoming.length ? el('div',{class:'list'}, upcoming.map(t=>taskRow(t,()=>renderDashboard())))
      : el('div',{class:'empty'},'No upcoming tasks — nice and clear.'),
  );
}
function statCard(label,big,sub,frac){
  return el('div',{class:'card'},[
    el('div',{class:'label'},label),
    el('div',{class:'stat'},[big,' ',el('small',{},sub||'')]),
    el('div',{class:'bar'}, el('span',{style:`width:${Math.min(100,Math.round((frac||0)*100))}%`})),
  ]);
}
/* ---------- dashboard alert row (taps through to a module) ---------- */
function alertRow(icon,title,sub,goto){
  return el('div',{class:'row alert', onclick:()=>{ location.hash=goto; }},[
    el('div',{class:'alert-ic'}, icon),
    el('div',{class:'grow'},[el('b',{},title), sub?el('div',{class:'meta'},sub):null]),
    el('span',{class:'chev'},'›'),
  ]);
}

/* ---------- generic task row (with checkbox) ---------- */
function taskRow(t, after){
  const done = t.status==='done';
  const box = el('div',{class:'chk'+(done?' on':''), onclick:async(e)=>{
    e.stopPropagation();
    await store.update('tasks',t.id,{status:done?'todo':'done'}); after&&after();
  }}, done?'✓':'');
  return el('div',{class:'row'+(done?' done':''), onclick:()=>openForm('checklist',t,after)},[
    box,
    el('div',{class:'grow'},[el('b',{},t.title), el('div',{class:'meta'}, MODULES.checklist.meta(t))]),
  ]);
}

/* ---------- GENERIC MODULE PAGE ---------- */
async function renderModule(key){
  const m = MODULES[key];
  let rows = await store.all(m.table);
  if (m.filter) rows = rows.filter(m.filter);
  if (m.sort) rows = rows.slice().sort(m.sort);

  const addBtn = el('button',{class:'btn', onclick:()=>openForm(key,null,()=>route())},'+ Add');
  const actions = (key==='timeline'||key==='welcome')
    ? el('div',{class:'btn-row'},[
        el('button',{class:'btn ghost sm', onclick:()=>window.print()},'🖨 Print / PDF'),
        addBtn,
      ])
    : addBtn;
  view.append(pageHead(m.title, m.sub, actions));

  // budget summary strip
  if (key==='budget'){
    const est=rows.reduce((a,b)=>a+Number(b.estimated||0),0);
    const act=rows.reduce((a,b)=>a+Number(b.actual||0),0);
    view.append(el('div',{class:'grid cards',style:'margin-bottom:14px'},[
      statCard('Estimated total', money(est),'',1),
      statCard('Actual so far', money(act), est?`${Math.round(act/est*100)}% of est`:'', est?act/est:0),
      statCard('Remaining (est)', money(est-act),'',0),
    ]));
    view.append(el('p',{class:'meta',style:'margin:-6px 0 14px'},
      ['See ', el('a',{href:'#payments'},'deposits & the payment schedule →')]));
  }

  // filters
  if (m.filterBy){
    const vals = [...new Set(rows.map(r=>r[m.filterBy]).filter(Boolean))];
    const wrap = el('div',{class:'filters'});
    const mk=(label,val)=> el('button',{class:'chip'+((window.__filter?.[key]??'all')===val?' on':''),
      onclick:()=>{ window.__filter=window.__filter||{}; window.__filter[key]=val; route(); }}, label);
    wrap.append(mk('All','all'));
    vals.forEach(v=> wrap.append(mk(v,v)));
    view.append(wrap);
  }
  const f = window.__filter?.[key] ?? 'all';
  const shown = (f==='all') ? rows : rows.filter(r=>r[m.filterBy]===f);

  if (key==='checklist'){
    view.append(shown.length? el('div',{class:'list'}, shown.map(t=>taskRow(t,()=>route())))
      : el('div',{class:'empty'},'Nothing here yet.'));
    return;
  }

  view.append(shown.length ? el('div',{class:'list'}, shown.map(r=>genericRow(key,r)))
    : el('div',{class:'empty'},'Nothing here yet — tap + to add.'));
}

function pillFor(m,r){
  let v = typeof m.pill==='function'? m.pill(r) : r[m.pill];
  return v ? el('span',{class:'pill '+v}, v) : null;
}
function genericRow(key,r){
  const m=MODULES[key];
  const title = r[m.primary] || (m.secondary?r[m.secondary]:'') || '(untitled)';
  return el('div',{class:'row', onclick:()=>openForm(key,r,()=>route())},[
    el('div',{class:'grow'},[
      el('b',{}, title + (m.secondary&&r[m.primary]?` — ${r[m.secondary]}`:'')),
      el('div',{class:'meta'}, m.meta(r)||''),
    ]),
    m.pill?pillFor(m,r):null,
  ]);
}

/* ---------- SEATING ---------- */
async function renderSeating(){
  const [tablesAll, guests] = await Promise.all([store.all('tables_seating'), store.all('guests')]);
  const tables = tablesAll.slice().sort((a,b)=>(a.sort||0)-(b.sort||0));
  view.append(pageHead('Seating', `${guests.length} guests · ${tables.length} tables`,
    el('div',{class:'btn-row'},[
      el('button',{class:'btn ghost sm', onclick:async()=>{ await store.insert('tables_seating',{name:`Table ${tables.length+1}`,capacity:10,sort:tables.length}); route(); }},'+ Table'),
    ])));
  const unassigned = guests.filter(g=>!g.table_id && g.rsvp!=='no');
  if (unassigned.length) view.append(el('div',{class:'card',style:'margin-bottom:14px'},[
    el('div',{class:'label'},`Unassigned (${unassigned.length})`),
    el('div',{class:'meta',style:'margin-top:6px'}, unassigned.map(g=>g.name).join(', ')),
  ]));
  const grid = el('div',{class:'grid cards'});
  tables.forEach(t=>{
    const seated = guests.filter(g=>g.table_id===t.id);
    const card = el('div',{class:'card'},[
      el('h3',{}, `${t.name} `, el('small',{style:'color:var(--muted);font-weight:400'},`${seated.length}/${t.capacity}`)),
      ...seated.map(g=> el('div',{class:'meta',style:'padding:3px 0'}, '• '+g.name+' ',
        el('a',{href:'#',style:'color:var(--bad)',onclick:async(e)=>{e.preventDefault();await store.update('guests',g.id,{table_id:null});route();}},'×'))),
      el('select',{class:'',style:'margin-top:8px;width:100%;padding:8px;border-radius:9px;border:1px solid var(--line)',
        onchange:async(e)=>{ if(e.target.value){ await store.update('guests',e.target.value,{table_id:t.id}); route(); } }},
        [el('option',{value:''},'+ seat a guest'),
         ...guests.filter(g=>!g.table_id&&g.rsvp!=='no').map(g=>el('option',{value:g.id},g.name))]),
    ]);
    grid.append(card);
  });
  view.append(grid);
}

/* ---------- PAYMENTS (schedule & deposits) ---------- */
async function renderPayments(){
  const rows = (await store.all('payments')).slice()
    .sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||''));
  const total     = rows.reduce((s,p)=>s+Number(p.amount||0),0);
  const paid      = rows.filter(p=>p.paid).reduce((s,p)=>s+Number(p.amount||0),0);
  const remaining = total - paid;
  const unpaid    = rows.filter(p=>!p.paid);
  const overdue   = unpaid.filter(p=>p.due_date && daysUntil(p.due_date)<0)
    .sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||''));
  const upcoming  = unpaid.filter(p=>!(p.due_date && daysUntil(p.due_date)<0))
    .sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||''));
  const paidRows  = rows.filter(p=>p.paid)
    .sort((a,b)=>(b.paid_date||b.due_date||'').localeCompare(a.paid_date||a.due_date||''));
  const next      = upcoming.find(p=>p.due_date);  // soonest dated upcoming payment

  view.append(pageHead('Payments', 'Deposits & payment schedule',
    el('button',{class:'btn', onclick:()=>openForm('payments',null,()=>route())},'+ Add')));

  view.append(el('div',{class:'grid cards',style:'margin-bottom:6px'},[
    statCard('Scheduled total', money(total), `${rows.length} payment${rows.length===1?'':'s'}`, 1),
    statCard('Paid so far', money(paid), total?`${Math.round(paid/total*100)}% complete`:'', total?paid/total:0),
    statCard('Remaining', money(remaining), next?`next due ${fmtDate(next.due_date)}`:'all paid 🎉', total?remaining/total:0),
  ]));

  const section=(title,list)=>{ if(!list.length) return;
    view.append(el('div',{class:'section-title'}, title));
    view.append(el('div',{class:'list'}, list.map(p=>paymentRow(p))));
  };
  section('Overdue', overdue);
  section('Upcoming', upcoming);
  section('Paid', paidRows);
  if(!rows.length) view.append(el('div',{class:'empty'},'No payments scheduled yet — tap + to add one.'));
}
function paymentRow(p){
  const od = !p.paid && p.due_date && daysUntil(p.due_date)<0;
  const box = el('div',{class:'chk'+(p.paid?' on':''), onclick:async(e)=>{
    e.stopPropagation();
    await store.update('payments',p.id, p.paid
      ? {paid:false, paid_date:null}
      : {paid:true, paid_date: p.paid_date || new Date().toISOString().slice(0,10)});
    route();
  }}, p.paid?'✓':'');
  const meta = p.paid
    ? ['Paid'+(p.paid_date?` ${fmtDate(p.paid_date)}`:''), p.method].filter(Boolean).join(' · ')
    : [p.due_date?`Due ${fmtDate(p.due_date)}`:'No due date',
       p.due_date ? (od?`${Math.abs(daysUntil(p.due_date))} days overdue`
         :(daysUntil(p.due_date)===0?'due today':`in ${daysUntil(p.due_date)} days`)) : null
      ].filter(Boolean).join(' · ');
  return el('div',{class:'row'+(p.paid?' done':'')+(od?' alert':''), onclick:()=>openForm('payments',p,()=>route())},[
    box,
    el('div',{class:'grow'},[
      el('b',{}, (p.payee?p.payee+' — ':'')+(p.label||'Payment')),
      el('div',{class:'meta'}, meta),
    ]),
    el('div',{class:'pay-amt'}, money(p.amount)),
  ]);
}

/* ---------- SETTINGS ---------- */
async function renderSettings(){
  const s = await store.settings();
  view.append(pageHead('Settings', LIVE?'Connected to live cloud sync ✓':'Demo mode — data saved in this browser',
    LIVE ? el('button',{class:'btn ghost', onclick:async()=>{ await store.signOut(); location.reload(); }},'Sign out') : null));
  const f = (k,label,type='text')=> el('div',{class:'field'},[
    el('label',{},label),
    el('input',{type,value:s[k]??'','data-k':k})]);
  const form = el('div',{class:'card'},[
    el('div',{class:'form-grid'},[
      f('partner_a','Partner A'), f('partner_b','Partner B'),
      f('wedding_date','Wedding date','date'), f('total_budget','Total budget $','number'),
      f('venue','Venue'), f('ceremony_room','Ceremony room'),
      f('cocktail_room','Cocktail room'), f('welcome_date','Welcome party date','date'),
      f('welcome_venue','Welcome party venue'),
    ]),
    el('button',{class:'btn', onclick:async(e)=>{
      const patch={}; form.querySelectorAll('[data-k]').forEach(i=>patch[i.dataset.k]=i.value);
      await store.saveSettings({...s,...patch}); e.target.textContent='Saved ✓';
      setTimeout(()=>e.target.textContent='Save',1200);
    }},'Save'),
  ]);
  view.append(form);

  view.append(el('div',{class:'section-title'},'Backup & data'));
  view.append(el('div',{class:'card'},[
    el('p',{class:'meta',style:'margin-top:0'},'Export a full backup (also lets Claude read your data). Import restores from a backup file.'),
    el('div',{class:'btn-row'},[
      el('button',{class:'btn ghost', onclick:async()=>{
        const data=await store.exportAll();
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        const a=el('a',{href:URL.createObjectURL(blob),download:'wedding-data.json'}); a.click();
      }},'⬇ Export JSON'),
      el('label',{class:'btn ghost'},['⬆ Import JSON',
        el('input',{type:'file',accept:'.json',style:'display:none',onchange:async(e)=>{
          const file=e.target.files[0]; if(!file)return;
          const o=JSON.parse(await file.text()); await store.importAll(o); location.reload();
        }})]),
      el('button',{class:'btn danger', onclick:()=>{ if(confirm('Reset demo data to the seeded starting point?')){ TABLES.forEach(t=>localStorage.removeItem('wed_'+t)); localStorage.removeItem('wed_seeded'); location.reload(); } }},'Reset demo'),
    ]),
  ]));
}

/* ============================================================
   MODAL FORM (add / edit / delete)
   ============================================================ */
function openForm(key, record, after){
  const m = MODULES[key];
  const modal = $('#modal'); const bg=$('#modalBg');
  const data = record ? {...record} : {};
  m.fields.forEach(fl=>{ if(fl.default!==undefined && data[fl.k]===undefined) data[fl.k]=fl.default; });

  const fieldEls = m.fields.filter(f=>f.type!=='hidden').map(fl=>{
    if (fl.type==='checkbox'){
      const cb=el('input',{type:'checkbox','data-k':fl.k}); cb.checked=!!data[fl.k];
      return el('div',{class:'field'},[el('label',{style:'display:flex;gap:8px;align-items:center;flex-direction:row'},[cb,fl.label])]);
    }
    let input;
    if (fl.type==='select'){
      input=el('select',{'data-k':fl.k}, fl.opts.map(o=>{
        const op=el('option',{value:o},o); if(String(data[fl.k])===String(o))op.selected=true; return op; }));
    } else if (fl.type==='textarea'){
      input=el('textarea',{'data-k':fl.k}, data[fl.k]||'');
    } else {
      input=el('input',{type:fl.type==='number'?'number':(fl.type==='date'?'date':'text'),'data-k':fl.k,value:data[fl.k]??''});
    }
    return el('div',{class:'field'},[el('label',{},fl.label+(fl.req?' *':'')), input]);
  });

  modal.innerHTML='';
  modal.append(
    el('h3',{}, (record?'Edit ':'Add ')+m.title.replace(/s$/,'').replace('Day-of Timeline','timeline item')),
    el('div',{class:m.fields.length>5?'form-grid':''}, fieldEls),
    el('div',{class:'btn-row',style:'margin-top:8px'},[
      el('button',{class:'btn', onclick:async()=>{
        const patch={};
        m.fields.forEach(fl=>{
          if(fl.type==='hidden'){ patch[fl.k]=data[fl.k]; return; }
          const node=modal.querySelector(`[data-k="${fl.k}"]`); if(!node)return;
          if(fl.type==='checkbox') patch[fl.k]=node.checked;
          else if(fl.type==='number') patch[fl.k]=node.value===''?0:Number(node.value);
          else if(fl.type==='date') patch[fl.k]=node.value===''?null:node.value; // '' is invalid for a Postgres date
          else patch[fl.k]=node.value;
        });
        const req=m.fields.find(f=>f.req);
        if(req && !patch[req.k]){ alert(req.label+' is required'); return; }
        if(record) await store.update(m.table,record.id,patch);
        else await store.insert(m.table,patch);
        closeModal(); after&&after();
      }}, record?'Save':'Add'),
      el('button',{class:'btn ghost', onclick:closeModal},'Cancel'),
      record? el('button',{class:'btn danger',style:'margin-left:auto', onclick:async()=>{
        if(confirm('Delete this?')){ await store.remove(m.table,record.id); closeModal(); after&&after(); }
      }},'Delete') : null,
    ]),
  );
  bg.classList.add('open');
}
function closeModal(){ $('#modalBg').classList.remove('open'); }
$('#modalBg').addEventListener('click', e=>{ if(e.target.id==='modalBg') closeModal(); });

/* FAB: context-aware add */
$('#fab').addEventListener('click', ()=>{
  if (current==='dashboard') return location.hash='checklist';
  if (current==='seating') return location.hash='guests';
  if (current==='settings') return;
  if (MODULES[current]) openForm(current,null,()=>route());
});

/* ============================================================
   LOGIN  (live mode only — demo mode opens straight in)
   ============================================================ */
function startApp(){
  const bg=$('#loginBg'); if(bg) bg.remove();
  const app=$('.app'); if(app) app.style.display='';
  if (LIVE && store.watch) store.watch(scheduleRefresh);
  route();
}
function renderLogin(msg){
  const app=$('.app'); if(app) app.style.display='none';
  let bg=$('#loginBg');
  if(!bg){ bg=el('div',{id:'loginBg',class:'modal-bg open'}); document.body.append(bg); }
  bg.innerHTML='';
  const email=el('input',{type:'email',placeholder:'you@email.com',autocomplete:'username'});
  const pass =el('input',{type:'password',placeholder:'Password',autocomplete:'current-password'});
  const err =el('div',{class:'meta',style:'color:var(--bad);min-height:18px;margin:2px 0 6px'}, msg||'');
  const btn =el('button',{class:'btn',style:'width:100%'},'Sign in');
  const go=async()=>{
    err.textContent=''; btn.textContent='Signing in…'; btn.disabled=true;
    const {error}=await store.signIn(email.value, pass.value);
    if(error){ err.textContent=error.message||'Could not sign in.'; btn.textContent='Sign in'; btn.disabled=false; return; }
    startApp();
  };
  btn.addEventListener('click', go);
  pass.addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
  bg.append(el('div',{class:'modal',style:'max-width:380px;border-radius:20px'},[
    el('div',{style:'text-align:center;margin-bottom:6px'},[el('div',{style:'font-size:30px'},'💍'),
      el('h3',{},'Our Wedding'), el('p',{class:'meta',style:'margin-top:2px'},'Sign in to your shared planner')]),
    el('div',{class:'field'},[el('label',{},'Email'),email]),
    el('div',{class:'field'},[el('label',{},'Password'),pass]),
    err, btn,
    el('p',{class:'meta',style:'margin-top:12px;font-size:12px'},'Only the two of you have accounts. Forgot your password? Reset it from the Supabase dashboard.'),
  ]));
  email.focus();
}

/* ---------- realtime: debounced, never clobbers an open edit ---------- */
let _refreshT;
function scheduleRefresh(){
  clearTimeout(_refreshT);
  _refreshT=setTimeout(()=>{ if(!$('#modalBg').classList.contains('open')) route(); }, 250);
}

/* ---------- boot ---------- */
async function boot(){
  window.addEventListener('hashchange', route);
  if (!LIVE){ route(); return; }                 // demo mode: open straight in
  store.onAuth(s=>{ if(!s) renderLogin(); });
  let session=null;
  try{ session=await store.getSession(); }
  catch(e){ return renderLogin('Could not reach the database — check your connection.'); }
  if (session) startApp(); else renderLogin();
}
boot();
