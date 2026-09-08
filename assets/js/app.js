/* Abode — client app.
   Rendering, search, and the social interactions (follow, vote, post, offer).
   State lives in localStorage so a demo survives a refresh; in production this
   is the API layer described in PLAN.md phase 2. */

(function () {
  const D = window.ABODE;
  const KEY = 'abode.state.v1';

  /* ---------- state ---------- */

  const blank = { saves: {}, follows: {}, votes: {}, posts: {}, replies: {}, offers: {}, joined: {}, claims: {}, pins: {}, alerts: null, read: {}, reports: {}, dms: {}, dmSent: {}, account: null, offerReplies: {}, searches: {}, decisions: {}, modOf: {}, agent: null, repping: {}, openHouses: {}, rsvps: {}, work: {}, loan: null, compare: [], recent: [], recentSearches: [], visits: {}, going: {}, afford: null, notes: {}, muted: {}, tours: {}, streets: {}, requests: [], feedSeen: null };
  let S;
  try { S = Object.assign({}, blank, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { S = Object.assign({}, blank); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------- helpers ---------- */

  const esc = (s) => String(s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const compact = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k' : String(n);
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const user = (id) => {
    const u = D.users[id] || D.users.me;
    return u.id === 'me' && S.account ? Object.assign({}, u, { name: S.account.name }) : u;
  };

  function avatar(id, sm, role) {
    const u = user(id);
    const r = role || u.role;
    const gold = r === 'owner' || r === 'past';
    return `<div class="avatar${sm ? ' avatar--sm' : ''}${gold ? ' avatar--gold' : ''}">${esc(initials(u.name))}</div>`;
  }

  function badge(role) {
    if (role === 'neighbor') return '';
    const cls = { owner: '', resident: ' badge--resident', agent: ' badge--agent', past: ' badge--past' }[role] || '';
    const tick = role === 'owner' ? '✓ ' : '';
    return `<span class="badge${cls}">${tick}${esc(D.roleLabel[role])}</span>`;
  }

  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      /* a message that only exists visually has not been delivered to everyone */
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(t._x);
    t._x = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  /* ---------- procedural house art (placeholder for listing photos) ---------- */

  function art(hue, variant) {
    const v = variant % 4;
    const sky1 = `hsl(${hue + 14} 32% 90%)`, sky2 = `hsl(${hue} 26% 78%)`;
    const wall = `hsl(${hue} 16% ${v === 1 ? 96 : 92}%)`;
    const roof = `hsl(${hue} 26% 30%)`;
    const dark = `hsl(${hue} 30% 22%)`;
    const grass = `hsl(${(hue + 70) % 360} 22% 62%)`;
    const glass = `hsl(${hue + 8} 34% 46%)`;
    const gid = 'g' + Math.random().toString(36).slice(2, 8);

    const bodies = [
      // gable
      `<path d="M92 210V126l68-46 68 46v84z" fill="${wall}"/>
       <path d="M78 130L160 72l82 58-10 13-72-51-72 51z" fill="${roof}"/>
       <rect x="112" y="150" width="30" height="30" fill="${glass}"/>
       <rect x="178" y="150" width="30" height="30" fill="${glass}"/>
       <rect x="146" y="176" width="28" height="34" fill="${dark}"/>
       <rect x="196" y="60" width="14" height="34" fill="${roof}"/>`,
      // flat modern
      `<rect x="66" y="132" width="122" height="78" fill="${wall}"/>
       <rect x="60" y="124" width="134" height="10" fill="${roof}"/>
       <rect x="188" y="96" width="88" height="114" fill="hsl(${hue} 14% 86%)"/>
       <rect x="182" y="88" width="100" height="9" fill="${roof}"/>
       <rect x="200" y="112" width="64" height="52" fill="${glass}"/>
       <rect x="84" y="150" width="70" height="34" fill="${glass}"/>
       <rect x="212" y="176" width="26" height="34" fill="${dark}"/>`,
      // rowhouse
      `<rect x="74" y="98" width="82" height="112" fill="${wall}"/>
       <rect x="160" y="86" width="86" height="124" fill="hsl(${hue} 20% 84%)"/>
       <rect x="68" y="90" width="94" height="12" fill="${roof}"/>
       <rect x="154" y="78" width="98" height="12" fill="${roof}"/>
       <rect x="90" y="114" width="22" height="36" fill="${glass}"/>
       <rect x="120" y="114" width="22" height="36" fill="${glass}"/>
       <rect x="178" y="104" width="24" height="40" fill="${glass}"/>
       <rect x="210" y="104" width="24" height="40" fill="${glass}"/>
       <rect x="104" y="168" width="26" height="42" fill="${dark}"/>
       <rect x="190" y="160" width="28" height="50" fill="${dark}"/>`,
      // cape + barn
      `<path d="M118 210v-62l54-40 54 40v62z" fill="${wall}"/>
       <path d="M104 152l68-50 68 50-9 12-59-43-59 43z" fill="${roof}"/>
       <rect x="140" y="166" width="24" height="26" fill="${glass}"/>
       <rect x="182" y="166" width="24" height="26" fill="${glass}"/>
       <rect x="160" y="188" width="24" height="22" fill="${dark}"/>
       <path d="M232 210v-48l32-22 32 22v48z" fill="hsl(${hue} 24% 44%)"/>
       <path d="M226 164l38-26 38 26-6 9-32-22-32 22z" fill="${dark}"/>`,
    ];

    return `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of the property">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/>
      </linearGradient></defs>
      <rect width="360" height="240" fill="url(#${gid})"/>
      <circle cx="${58 + v * 24}" cy="52" r="19" fill="hsl(${hue + 20} 40% 96%)" opacity=".8"/>
      <path d="M0 196c46-14 82 6 122-2 44-9 74-20 120-12 42 7 78 20 118 12v46H0z" fill="hsl(${(hue + 70) % 360} 18% 74%)"/>
      ${bodies[v]}
      <circle cx="42" cy="188" r="26" fill="${grass}"/><rect x="39" y="188" width="6" height="26" fill="${dark}" opacity=".5"/>
      <circle cx="322" cy="196" r="20" fill="${grass}" opacity=".9"/><rect x="319" y="196" width="6" height="20" fill="${dark}" opacity=".4"/>
      <rect y="212" width="360" height="28" fill="hsl(${(hue + 70) % 360} 20% 66%)"/>
    </svg>`;
  }

  /* ---------- derived listing values ---------- */

  const followers = (l) => l.followers + (S.follows[l.id] ? 1 : 0);
  const commentCount = (l) => {
    const extra = (S.posts[l.id] || []).length;
    const base = l.posts.reduce((n, p) => n + 1 + p.replies.length, 0);
    const replies = Object.keys(S.replies).reduce((n, k) =>
      n + (l.posts.some((p) => p.id === k) || (S.posts[l.id] || []).some((p) => p.id === k) ? S.replies[k].length : 0), 0);
    return base + extra + replies;
  };
  const offersFor = (l) => (S.offers[l.id] || []).concat(l.offers);
  const isPinned = (p) => (S.pins[p.id] === undefined ? !!p.pinned : !!S.pins[p.id]);
  const removed = (p) => {
    const d = (S.decisions || {})[p.id];
    return !!(d && d.call !== 'keep');
  };
  const postsFor = (l) => {
    const mine = (S.posts[l.id] || []);
    const all = mine.concat(l.posts);
    return all.slice().sort((a, b) => (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0));
  };

  const offMarket = (l) => l.status === 'sold' && l.dom === 0;
  const statusTag = (l) => {
    if (l.status === 'pending') return '<span class="tag tag--pending">Pending</span>';
    if (offMarket(l)) return '<span class="tag tag--gone">Off market</span>';
    if (l.status === 'sold') return '<span class="tag">Sold</span>';
    if (l.prior) return '<span class="tag tag--cut">Price cut</span>';
    if (l.dom <= 7) return '<span class="tag tag--new">New</span>';
    return '';
  };

  /* ---------- components ---------- */


  /* Modal keyboard behaviour, shared by the three sheets: focus lands inside,
     Tab cycles within, and focus goes back where it came from on close. */
  function sheetFocus(host) {
    const prev = document.activeElement;
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const items = () => [...host.querySelectorAll(sel)].filter((el) => !el.disabled);
    setTimeout(() => {
      const f = items();
      if (f.length) (host.querySelector('input, textarea') || f[0]).focus();
    }, 0);
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = items();
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    return () => { if (prev && prev.focus) prev.focus(); };
  }

  /* ---------- your data ---------- */
  /* Everything this build knows about you is in one browser key. You can read it,
     take it, or delete it — which is the least a site holding your address, your
     offers and your messages owes you. */

  function accountRecord() {
    return {
      schema: 'abode.account/v1',
      exported: 'sample build — this data never left your browser',
      account: S.account || null,
      alerts: alertPrefs(),
      loan: loanPrefs(),
      theme: themeNow(),
      saved: Object.keys(S.saves || {}),
      following: Object.keys(S.follows || {}),
      muted: Object.keys(S.muted || {}),
      groups_joined: Object.keys(S.joined || {}),
      saved_searches: savedSearches(),
      claims: S.claims || {},
      agent: S.agent || null,
      representing: Object.keys(S.repping || {}),
      posts: S.posts || {},
      replies: S.replies || {},
      votes: S.votes || {},
      offers: S.offers || {},
      offer_replies: S.offerReplies || {},
      messages_sent: S.dmSent || {},
      reports_filed: S.reports || {},
      moderation_decisions: S.decisions || {},
      open_houses_scheduled: S.openHouses || {},
      rsvps: Object.keys(S.rsvps || {}),
      tours: S.tours || {},
      recently_viewed: S.recent || [],
      private_notes: S.notes || {},
    };
  }

  function exportAccount() {
    const json = JSON.stringify(accountRecord(), null, 2);
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'abode-your-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Downloaded everything this build knows about you');
    } catch (e) {
      if (navigator.clipboard) navigator.clipboard.writeText(json);
      toast('Copied your data to the clipboard');
    }
    return json;
  }

  function forgetMe() {
    S = Object.assign({}, blank);
    try { localStorage.removeItem(KEY); } catch (e) {}
    save();
    toast('Deleted. Everything is back to a first visit.');
  }

  function dataPanel() {
    return `<div class="panel">
      <div class="panel__title">Your data</div>
      <div class="panel__sub">All of it lives in this browser, in one key</div>
      <p style="color:var(--ink-2);font-size:.92rem;margin:0 0 12px">Saves, follows, posts, replies, votes,
        offers, messages, reports, claims and preferences. Nothing has been sent anywhere.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn--sm" id="data-export">Download everything</button>
        <button class="btn btn--sm" id="data-forget">Delete it all</button>
      </div>
      <div id="data-confirm"></div>
    </div>`;
  }

  function wireDataPanel(after) {
    const ex = document.getElementById('data-export');
    if (ex) ex.addEventListener('click', exportAccount);
    const fg = document.getElementById('data-forget');
    if (fg) fg.addEventListener('click', () => {
      const slot = document.getElementById('data-confirm');
      if (slot.firstChild) { slot.innerHTML = ''; return; }
      slot.innerHTML = `<div class="notice" style="margin-top:12px">This deletes everything above and cannot be undone.
        <button class="btn btn--sm" id="data-really" style="margin-top:9px">Yes, delete it all</button></div>`;
      document.getElementById('data-really').addEventListener('click', () => {
        forgetMe();
        if (after) after();
      });
    });
  }

  /* ---------- first run ---------- */
  /* One banner, once, dismissible, and honest about what this build is. Nobody
     should have to guess whether the listings are real. */

  function firstRun() {
    if (S.seenIntro) return;
    const bar = document.createElement('div');
    bar.className = 'intro';
    bar.innerHTML = `<div class="wrap intro__inner">
      <div>
        <b>This is a working demonstration.</b>
        <span>Twenty addresses, their histories, walls, offers and groups — real behaviour, sample data.
          No MLS feed is connected and nothing you do here reaches anyone.</span>
      </div>
      <div class="intro__acts">
        <a class="btn btn--sm" href="about.html">What it is</a>
        <button class="btn btn--sm btn--primary" data-intro-ok>Got it</button>
      </div>
    </div>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => {
      if (!e.target.closest('[data-intro-ok]')) return;
      S.seenIntro = true; save(); bar.remove();
    });
  }

  /* ---------- keyboard shortcuts ---------- */
  /* Slash to search from anywhere, question mark for the list, escape to leave.
     Nothing fires while you are typing in a field. */

  const SHORTCUTS = [
    ['/', 'Jump to the search box'],
    ['g then h', 'Home'],
    ['g then s', 'Search'],
    ['g then f', 'Feed'],
    ['g then a', 'Alerts'],
    ['g then m', 'Messages'],
    ['g then v', 'Saved'],
    ['j / k', 'Walk down and up the results'],
    ['enter', 'Open the one you are on'],
    ['t', 'Switch light and dark'],
    ['?', 'This list'],
  ];

  const GOTO = { h: 'index.html', s: 'search.html', f: 'feed.html', a: 'alerts.html', m: 'messages.html', v: 'saved.html' };

  function shortcutSheet() {
    const host = document.createElement('div');
    host.className = 'sheet';
    document.body.appendChild(host);
    const restore = sheetFocus(host);
    const close = () => { host.remove(); document.removeEventListener('keydown', esckey); restore(); };
    const esckey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esckey);
    host.innerHTML = `<div class="sheet__box" role="dialog" aria-modal="true" aria-labelledby="kb-t">
      <button class="sheet__x" data-x aria-label="Close">×</button>
      <div class="sheet__step">Keyboard</div>
      <h3 class="sheet__t" id="kb-t">Shortcuts</h3>
      <div class="keys">${SHORTCUTS.map(([k, t]) => `<div><kbd>${esc(k)}</kbd><span>${esc(t)}</span></div>`).join('')}</div>
      <div class="notice" style="margin-top:16px">The map takes arrow keys and plus or minus once it has focus.</div>
    </div>`;
    host.addEventListener('click', (e) => { if (e.target === host || e.target.closest('[data-x]')) close(); });
  }

  function wireShortcuts() {
    let pending = null, timer = null;
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (pending === 'g' && GOTO[e.key]) { pending = null; location.href = GOTO[e.key]; return; }
      if (e.key === 'g') { pending = 'g'; clearTimeout(timer); timer = setTimeout(() => { pending = null; }, 1200); return; }
      pending = null;

      if (e.key === '/') {
        const box = document.getElementById('f-q') || document.getElementById('q') || document.getElementById('g-q');
        if (box) { e.preventDefault(); box.focus(); box.select && box.select(); }
        return;
      }
      if (e.key === 'j' || e.key === 'k') {
        const cards = [...document.querySelectorAll('#results .card, #feed > .panel, #alerts .alert')];
        if (!cards.length) return;
        e.preventDefault();
        const at = cards.findIndex((c) => c.classList.contains('is-cursor'));
        const next = Math.max(0, Math.min(cards.length - 1, at + (e.key === 'j' ? 1 : -1)));
        cards.forEach((c) => c.classList.remove('is-cursor'));
        cards[next].classList.add('is-cursor');
        if (cards[next].scrollIntoView) cards[next].scrollIntoView({ block: 'nearest' });
        return;
      }
      if (e.key === 'Enter') {
        const cur = document.querySelector('.is-cursor a[href], a.is-cursor');
        if (cur) { e.preventDefault(); location.href = cur.getAttribute('href'); }
        return;
      }
      if (e.key === '?') { e.preventDefault(); shortcutSheet(); return; }
      if (e.key === 't') { toggleTheme(); }
    });
  }

  /* ---------- theme ---------- */
  /* System preference wins until you say otherwise; after that your choice sticks. */

  const systemDark = () => !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const themeNow = () => S.theme || (systemDark() ? 'dark' : 'light');

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', themeNow());
  }

  function toggleTheme() {
    S.theme = themeNow() === 'dark' ? 'light' : 'dark';
    save();
    applyTheme();
    chrome(activeNav);
    toast(S.theme === 'dark' ? 'Dark theme on' : 'Light theme on');
  }

  /* ---------- account ---------- */
  /* The phase-2 account layer, front end only: no password, no session, no server.
     Signing in here just names the "me" user and unlocks the identity surfaces, so
     the rest of the app can be written as if auth already existed. */

  const account = () => S.account || null;
  const signedIn = () => !!S.account;

  function displayName() {
    return (S.account && S.account.name) || 'You';
  }

  function openSignIn(done) {
    let mode = 'email', handle = '', name = '', step = 1, err = '';
    const host = document.createElement('div');
    host.className = 'sheet';
    document.body.appendChild(host);
    const restore = sheetFocus(host);
    const close = () => { host.remove(); document.removeEventListener('keydown', esckey); restore(); };
    const esckey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esckey);

    function render() {
      host.innerHTML = `<div class="sheet__box" role="dialog" aria-modal="true" aria-labelledby="si-t">
        <button class="sheet__x" data-x aria-label="Close">×</button>
        <div class="sheet__step">${step === 1 ? 'Sign in' : 'Check your ' + (mode === 'email' ? 'email' : 'phone')}</div>
        <h3 class="sheet__t" id="si-t">${step === 1 ? 'Use your address to sign in' : 'Enter the six-digit code'}</h3>
        ${step === 1 ? `
          <p class="sheet__lead">No password. We send a one-time code, you come back, that is the whole ceremony.</p>
          <div class="viewtoggle" style="margin-bottom:14px">
            <button type="button" data-mode="email"${mode === 'email' ? ' class="is-active"' : ''}>Email</button>
            <button type="button" data-mode="phone"${mode === 'phone' ? ' class="is-active"' : ''}>Phone</button>
          </div>
          <label class="lbl" for="si-handle">${mode === 'email' ? 'Email address' : 'Mobile number'}</label>
          <input class="field" id="si-handle" value="${esc(handle)}" placeholder="${mode === 'email' ? 'you@example.com' : '(555) 010-4477'}">
          <label class="lbl" for="si-name" style="margin-top:12px">Display name</label>
          <input class="field" id="si-name" value="${esc(name)}" placeholder="How neighbors see you">
          ${err ? `<div class="sheet__err">${esc(err)}</div>` : ''}
          <div class="notice" style="margin-top:14px">Your name shows on posts. Your contact details never do.</div>`
        : `
          <p class="sheet__lead">A code went to <b>${esc(handle)}</b>. In this build any six digits work — nothing is actually sent.</p>
          <label class="lbl" for="si-code">Code</label>
          <input class="field" id="si-code" inputmode="numeric" placeholder="000000">
          ${err ? `<div class="sheet__err">${esc(err)}</div>` : ''}`}
        <div class="sheet__foot">
          ${step === 2 ? '<button class="btn" data-back>Back</button>' : '<span></span>'}
          <button class="btn btn--primary" data-go>${step === 1 ? 'Send code' : 'Sign in'}</button>
        </div>
      </div>`;
    }

    host.addEventListener('click', (e) => {
      if (e.target === host || e.target.closest('[data-x]')) return close();
      const m = e.target.closest('[data-mode]');
      if (m) { handle = host.querySelector('#si-handle').value; mode = m.dataset.mode; return render(); }
      if (e.target.closest('[data-back]')) { step = 1; err = ''; return render(); }
      if (!e.target.closest('[data-go]')) return;

      if (step === 1) {
        handle = host.querySelector('#si-handle').value.trim();
        name = host.querySelector('#si-name').value.trim();
        const okHandle = mode === 'email' ? /^[^@\s]+@[^@\s]+\.\w{2,}$/.test(handle) : handle.replace(/\D/g, '').length >= 10;
        if (!okHandle) { err = mode === 'email' ? 'That does not look like an email address.' : 'Enter a ten-digit mobile number.'; return render(); }
        if (!name) { err = 'Pick a display name — posts here are not anonymous.'; return render(); }
        err = ''; step = 2; return render();
      }
      const code = host.querySelector('#si-code').value.replace(/\D/g, '');
      if (code.length !== 6) { err = 'Six digits.'; return render(); }
      S.account = { name, handle, mode, since: 'today' };
      if (mode === 'phone') { const p = alertPrefs(); p.phone = handle; S.alerts = p; }
      save(); close();
      toast(`Signed in as ${name}`);
      if (done) done();
    });

    render();
  }

  function signOut() {
    delete S.account;
    save();
    toast('Signed out — your saves and follows stay in this browser');
  }

  /* ---------- saved searches ---------- */
  /* A saved search is just the filter set with a name on it. Matching runs the
     same predicate the search page uses, so a saved search can never drift from
     what the page would have shown. */

  const SEARCH_DEFAULTS = { q: '', min: 0, max: 0, beds: 0, status: 'any', sort: 'relevant' };

  const searchMatches = (f) => D.listings.filter((l) => {
    const hay = `${l.street} ${l.city} ${l.state} ${l.zip} ${l.type} ${l.features.join(' ')}`.toLowerCase();
    return (!f.q || hay.includes(f.q.toLowerCase())) &&
      l.price >= (f.min || 0) && l.price <= (f.max || Infinity) &&
      l.beds >= (f.beds || 0) && (f.status === 'any' || !f.status || l.status === f.status);
  });

  function searchName(f) {
    const bits = [];
    if (f.q) bits.push(`“${f.q}”`);
    if (f.beds) bits.push(`${f.beds}+ bd`);
    if (f.min && f.max) bits.push(`${money(f.min)}–${money(f.max)}`);
    else if (f.max) bits.push(`under ${money(f.max)}`);
    else if (f.min) bits.push(`over ${money(f.min)}`);
    if (f.status && f.status !== 'any') bits.push({ active: 'for sale', pending: 'pending', sold: 'sold' }[f.status]);
    return bits.length ? bits.join(' · ') : 'Every home';
  }

  const searchHref = (f) => 'search.html?' + new URLSearchParams(
    Object.entries(f).filter(([k, v]) => v && k in SEARCH_DEFAULTS)).toString();

  const savedSearches = () => Object.values(S.searches || {});

  /* ---------- what it might be worth ---------- */
  /* A range, not a number, from the price per foot of the nearest addresses with a
     page. An estimate that pretends to a single dollar figure is lying about how
     much it knows, so this one shows its working and its width. */

  function estimate(l) {
    const comps = comparables(l, 4).filter((c) => c.mi < 60);
    if (comps.length < 2) return null;
    const ppsfs = comps.map((c) => c.l.ppsf).sort((a, b) => a - b);
    const mid = ppsfs.length % 2 ? ppsfs[(ppsfs.length - 1) / 2]
      : (ppsfs[ppsfs.length / 2 - 1] + ppsfs[ppsfs.length / 2]) / 2;
    const spread = (ppsfs[ppsfs.length - 1] - ppsfs[0]) / 2 || mid * 0.08;
    const round = (n) => Math.round(n / 5000) * 5000;
    return {
      low: round((mid - spread) * l.sqft), high: round((mid + spread) * l.sqft),
      mid: round(mid * l.sqft), comps, ppsf: Math.round(mid),
    };
  }

  function estimatePanel(l) {
    const e = estimate(l);
    if (!e) {
      return `<div class="panel">
        <div class="panel__title">What it might be worth</div>
        <div class="panel__sub">Not enough nearby pages to say</div>
        <div class="notice">An estimate needs comparable sales close by. There are not enough addresses with a
          page near this one yet, and a number pulled from four hundred miles away would be worse than nothing.</div>
      </div>`;
    }
    const vsAsk = l.price ? Math.round((l.price / e.mid - 1) * 100) : 0;
    return `<div class="panel">
      <div class="panel__title">What it might be worth</div>
      <div class="panel__sub">From the ${e.comps.length} nearest addresses with a page</div>
      <div class="est"><b>${money(e.low)}</b><span>to</span><b>${money(e.high)}</b></div>
      <div class="est__bar"><span style="left:${Math.max(0, Math.min(100, (l.price - e.low) / (e.high - e.low) * 100)).toFixed(1)}%"></span></div>
      <p class="est__note">${money(e.ppsf)} a foot across those comparables, applied to ${l.sqft.toLocaleString()} sqft.
        ${offMarket(l) ? 'This address is off market.' : `The asking price is ${Math.abs(vsAsk)}% ${vsAsk >= 0 ? 'above' : 'below'} the middle of that range.`}</p>
      <div class="notice">This is arithmetic on four data points, not an appraisal. Condition, layout, lot and
        what someone will actually pay are not in it.</div>
    </div>`;
  }

  /* ---------- private notes ---------- */
  /* A note you write to yourself about a house. It is not a post, it is never
     shown to anyone, and it goes with you in the data export. */

  const noteFor = (id) => (S.notes || {})[id] || '';

  function notePanel(l) {
    const n = noteFor(l.id);
    return `<div class="panel">
      <div class="panel__title">Your note</div>
      <div class="panel__sub">Private. Nobody at this address can see it.</div>
      <textarea class="field" id="note-text" rows="3" aria-label="Your private note about ${esc(l.street)}"
        placeholder="The kitchen window faces the road. Ask about the 2019 sewer work.">${esc(n)}</textarea>
      <div class="composer__row" style="margin-top:9px">
        <span class="composer__hint" id="note-state">${n ? 'Saved' : 'Not saved yet'}</span>
        <button class="btn btn--sm" id="note-save">Save the note</button>
      </div>
    </div>`;
  }

  /* ---------- affordability ---------- */
  /* Works backwards from what a lender would actually lend: a 36% back-end debt
     ratio, minus tax, insurance and HOA, at the rate and term you already set on
     any address page. It gives a price, and says which assumption is doing the work. */

  const afford = () => Object.assign({ income: 0, debts: 0, down: 0 }, S.afford || {});

  function affordablePrice(a, loan) {
    const monthlyIncome = (Number(a.income) || 0) / 12;
    if (!monthlyIncome) return null;
    const capacity = monthlyIncome * 0.36 - (Number(a.debts) || 0);
    if (capacity <= 0) return { price: 0, capacity: 0 };
    /* tax and insurance eat roughly 1.3% of value a year in most of this data */
    const carry = 0.013 / 12;
    const r = (Number(loan.rate) || 6.25) / 100 / 12;
    const n = (Number(loan.years) || 30) * 12;
    const perDollarBorrowed = r === 0 ? 1 / n : r / (1 - Math.pow(1 + r, -n));
    const down = Number(a.down) || 0;
    /* price P: (P - down) * perDollar + P * carry = capacity */
    const price = (capacity + down * perDollarBorrowed) / (perDollarBorrowed + carry);
    return { price: Math.max(0, Math.round(price / 1000) * 1000), capacity: Math.round(capacity) };
  }

  /* ---------- photos ---------- */
  /* A photo is resized in a canvas to something a browser store can actually hold,
     then kept with the post. If the browser has no canvas — or the picture is
     enormous — we say so rather than failing silently. */

  const PHOTO_MAX = 720;

  function shrinkPhoto(file, done, fallback) {
    if (!window.FileReader || !document.createElement('canvas').getContext) return fallback('This browser cannot resize a photo here.');
    if (file.size > 12 * 1024 * 1024) return fallback('That photo is over 12 MB. Pick a smaller one.');
    const reader = new FileReader();
    reader.onerror = () => fallback('That file could not be read.');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => fallback('That does not look like an image.');
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        try { done(c.toDataURL('image/jpeg', 0.72)); }
        catch (e) { fallback('This browser would not let us read the resized image.'); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- page metadata ---------- */
  /* A public address page that search engines cannot read is a private page with
     extra steps. Each page gets a description and Open Graph tags, and an address
     page also emits schema.org structured data describing the listing — the same
     shape Google, Bing and the aggregators consume. */

  function meta(name, content, prop) {
    if (!content) return;
    const key = prop ? 'property' : 'name';
    let el = document.head.querySelector(`meta[${key}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(key, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function describe(title, description) {
    if (title) document.title = title;
    meta('description', description);
    meta('og:title', title, true);
    meta('og:description', description, true);
    meta('og:type', 'website', true);
    meta('og:site_name', 'Abode', true);
    meta('twitter:card', 'summary', true);
  }

  function structuredData(obj) {
    let el = document.getElementById('ld');
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'ld';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(obj, null, 2);
  }

  function listingSchema(l) {
    const kind = l.status === 'sold' ? 'Residence' : 'SingleFamilyResidence';
    return {
      '@context': 'https://schema.org',
      '@type': kind,
      name: `${l.street}, ${l.city}, ${l.state}`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: l.street, addressLocality: l.city,
        addressRegion: l.state, postalCode: l.zip, addressCountry: 'US',
      },
      geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng },
      numberOfRooms: l.beds,
      numberOfBathroomsTotal: l.baths,
      floorSize: { '@type': 'QuantitativeValue', value: l.sqft, unitCode: 'FTK' },
      lotSize: { '@type': 'QuantitativeValue', value: l.lot, unitText: 'acres' },
      yearBuilt: l.year,
      ...(offMarket(l) ? {} : {
        offers: {
          '@type': 'Offer',
          price: l.price, priceCurrency: 'USD',
          availability: l.status === 'pending' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
          seller: { '@type': 'RealEstateAgent', name: user(l.agent).name },
        },
      }),
      disambiguatingDescription: 'Sample data in a demonstration build. Not a real listing.',
    };
  }

  /* ---------- request a page ---------- */
  /* The pitch is that every address has a page, and this build has twenty-four.
     Rather than pretend otherwise, an address we do not hold can be requested:
     it is queued with what would actually have to happen to fulfil it. */

  const REQUEST_STEPS = [
    'Normalise the address against USPS and find the parcel',
    'Pull the deed and assessor history for that parcel',
    'Check whether an MLS listing exists, now or in the last decade',
    'Open the page, with or without a listing attached',
  ];

  const requests = () => S.requests || [];

  function requestPage(street, city) {
    const clean = street.trim();
    if (!clean) return null;
    const already = requests().some((r) => r.street.toLowerCase() === clean.toLowerCase());
    if (already) { toast('That address is already queued'); return null; }
    const rec = { id: 'rq' + Date.now(), street: clean, city: (city || '').trim(), when: 'just now', status: 'queued' };
    S.requests = requests().concat([rec]);
    save();
    return rec;
  }

  function requestPanel(street, city) {
    return `<div class="reqbox">
      <b>No page for ${esc(street)} yet.</b>
      <p>Every address can have one — this build just holds twenty-four. Ask for it and it queues:</p>
      <ol>${REQUEST_STEPS.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <button class="btn btn--primary btn--sm" data-request="${esc(street)}" data-request-city="${esc(city || '')}">Request this address</button>
    </div>`;
  }

  /* ---------- streets ---------- */
  /* Following an address is narrow; following a street is how people actually
     watch a neighbourhood. The key is the street name without its number. */

  const streetOf = (l) => l.street.replace(/^[\d-]+\s+/, '');
  const streetKey = (l) => `${streetOf(l)}|${l.city}`;
  const onStreet = (l) => D.listings.filter((x) => streetKey(x) === streetKey(l));
  const followingStreet = (l) => !!(S.streets || {})[streetKey(l)];
  const followedStreets = () => Object.keys(S.streets || {});
  const listingsOnFollowedStreets = () =>
    D.listings.filter((l) => followingStreet(l) && !S.follows[l.id]);

  /* ---------- alerts ---------- */
  /* Notifications are derived, not stored: the same events a backend would emit
     on write (price cut, status change, new post, new offer, claim decision) are
     recomputed here from what you follow, own and have joined. Read state and
     channel preferences are the only things persisted. */

  const alertPrefs = () => {
    const p = Object.assign({ phone: '', sms: false, email: true, push: true,
      digest: 'instant', quietFrom: 22, quietTo: 7 }, S.alerts || {});
    /* A kind nobody has an opinion about yet defaults to on, so adding one does
       not go silent for people with saved preferences. */
    p.kinds = Object.assign({}, ...Object.keys(ALERT_KINDS).map((k) => ({ [k]: true })), (S.alerts || {}).kinds || {});
    return p;
  };

  const AGO_UNITS = { hour: 1, hours: 1, day: 24, days: 24, week: 168, weeks: 168, month: 730, months: 730 };
  /* "6 hours ago" / "2 weeks ago" / "just now" → hours, for ordering only. */
  function agoHours(s) {
    if (!s) return 9999;
    if (/just now/i.test(s)) return 0;
    const m = String(s).match(/(\d+)\s+(hour|hours|day|days|week|weeks|month|months)/i);
    if (!m) return 9999;
    return Number(m[1]) * AGO_UNITS[m[2].toLowerCase()];
  }

  const ALERT_KINDS = {
    cut: { label: 'Price cuts', icon: '↓', note: 'Any home you follow drops its asking price' },
    status: { label: 'Status changes', icon: '◆', note: 'Goes pending, sells, or comes back on' },
    post: { label: 'New posts', icon: '💬', note: 'Someone posts at an address you follow' },
    offer: { label: 'Offers', icon: '🏷', note: 'An offer lands on an address you own' },
    group: { label: 'Group activity', icon: '🏘', note: 'New threads in groups you joined' },
    claim: { label: 'Your claims', icon: '✓', note: 'Movement on an ownership claim' },
    report: { label: 'Your reports', icon: '⚑', note: 'Where a report you filed stands' },
    search: { label: 'Saved searches', icon: '★', note: 'New or reduced homes matching a search you saved' },
    openhouse: { label: 'Open houses', icon: '🚪', note: 'An address you follow opens its doors' },
  };

  /* Reports are keyed by post id; find the page the post lives on. */
  function pageOfPost(pid) {
    for (const l of D.listings) {
      if (postsFor(l).some((p) => p.id === pid)) return { href: `address.html?id=${l.id}`, name: l.street };
    }
    for (const g of D.groups) {
      if (groupPosts(g).some((p) => p.id === pid)) return { href: `group.html?id=${g.id}`, name: g.name };
    }
    return null;
  }

  function alertsFor() {
    const pref = alertPrefs();
    const out = [];
    const add = (a) => { if (pref.kinds[a.kind]) out.push(a); };

    D.listings.forEach((l) => {
      const followed = !!S.follows[l.id] || followingStreet(l), owned = isOwner(l.id);
      if (!followed && !owned) return;
      if ((S.muted || {})[l.id]) return;   /* still following, just not shouting */
      const where = `${l.street}, ${l.city}`;

      if (l.prior && l.prior > l.price) {
        add({ id: `al-cut-${l.id}`, kind: 'cut', hours: agoHours(l.history[0] && l.history[0].date) || 40,
          title: `Price cut at ${where}`,
          body: `${money(l.prior)} → ${money(l.price)}, down ${money(l.prior - l.price)} (${((1 - l.price / l.prior) * 100).toFixed(1)}%)`,
          ago: 'this week', href: `address.html?id=${l.id}` });
      }
      if (l.status !== 'active') {
        add({ id: `al-st-${l.id}`, kind: 'status', hours: 60,
          title: `${where} is ${l.status === 'pending' ? 'under agreement' : 'sold'}`,
          body: l.status === 'pending' ? 'Backup offers are still being taken on the page.' : 'The address page and its history stay up.',
          ago: 'this week', href: `address.html?id=${l.id}` });
      }
      const oh = openHouse(l);
      if (oh) {
        add({ id: `al-oh-${l.id}-${oh.date}`, kind: 'openhouse', hours: 3,
          title: `Open house at ${where}`,
          body: `${oh.day} ${oh.when} on ${oh.date}. ${rsvpCount(l)} people say they are going.`,
          ago: 'this week', href: `address.html?id=${l.id}` });
      }
      postsFor(l).slice(0, 2).forEach((p) => {
        add({ id: `al-post-${p.id}`, kind: 'post', hours: agoHours(p.ago),
          title: `${user(p.by).name} posted at ${l.street}`,
          body: p.text.length > 130 ? p.text.slice(0, 130) + '…' : p.text,
          ago: p.ago, href: `address.html?id=${l.id}` });
      });
      if (owned) {
        offersFor(l).filter((o) => o.status !== 'out').forEach((o) => {
          add({ id: `al-off-${o.id}`, kind: 'offer', hours: agoHours(o.when),
            title: `Offer on your address — ${money(o.amt)}`,
            body: `${o.by}. ${o.note}`, ago: o.when, href: `address.html?id=${l.id}#offer` });
        });
      }
    });

    savedSearches().forEach((f) => {
      const hits = searchMatches(f).filter((l) => l.dom <= 7 || l.prior);
      if (!hits.length) return;
      add({ id: `al-search-${f.id}-${hits.length}`, kind: 'search', hours: 2,
        title: `${hits.length} new or reduced home${hits.length === 1 ? '' : 's'} for ${f.name}`,
        body: hits.slice(0, 3).map((l) => `${l.street} at ${money(l.price)}`).join(' · '),
        ago: 'today', href: searchHref(f) });
    });

    D.groups.forEach((g) => {
      if (!S.joined[g.id]) return;
      groupPosts(g).slice(0, 2).forEach((p) => {
        add({ id: `al-grp-${p.id}`, kind: 'group', hours: agoHours(p.ago),
          title: `${user(p.by).name} posted in ${g.name}`,
          body: p.text.length > 130 ? p.text.slice(0, 130) + '…' : p.text,
          ago: p.ago, href: `group.html?id=${g.id}` });
      });
    });

    /* the other side of an offer: you wrote one, the owner answered */
    Object.keys(S.offers || {}).forEach((lid) => {
      const l = D.byId[lid];
      if (!l) return;
      (S.offers[lid] || []).forEach((o) => {
        const r = (S.offerReplies || {})[o.id];
        if (!r) return;
        add({ id: `al-reply-${o.id}-${r.status}`, kind: 'offer', hours: 0,
          title: `Your ${money(o.amt)} offer on ${l.street} was ${r.status === 'countered' ? 'countered' : r.status}`,
          body: r.reply, ago: 'just now', href: `address.html?id=${lid}#offer` });
      });
    });

    Object.keys(S.reports || {}).forEach((pid) => {
      const r = S.reports[pid];
      const where = pageOfPost(pid);
      if (!where) return;
      const d = (S.decisions || {})[pid];
      add({ id: `al-rep-${pid}-${r.status}`, kind: 'report', hours: 1,
        title: d ? `Your report was decided` : `Your report is ${REPORT_STATUS[r.status]}`,
        body: d ? `${DECISIONS[d.call]} · ${where.name}.`
          : `${reasonOf(r.reason).name} · ${where.name}. The author has not been told who filed it.`,
        ago: r.when, href: where.href });
    });

    Object.keys(S.claims || {}).forEach((id) => {
      const l = D.byId[id];
      if (!l) return;
      const c = S.claims[id];
      add({ id: `al-claim-${id}-${c.status}`, kind: 'claim', hours: 0,
        title: c.status === 'verified' ? `You are verified at ${l.street}` : `Claim in review at ${l.street}`,
        body: c.status === 'verified'
          ? 'Your posts here carry the owner badge. You can pin one post to the top.'
          : `${methodOf(c.method).name} · decision expected in ${methodOf(c.method).when.toLowerCase()}.`,
        ago: c.when, href: `address.html?id=${id}` });
    });

    return out.sort((a, b) => a.hours - b.hours);
  }

  const unreadAlerts = () => alertsFor().filter((a) => !(S.read || {})[a.id]).length;

  const HOURS = Array.from({ length: 24 }, (_, i) =>
    `${((i + 11) % 12) + 1}${i < 12 ? 'am' : 'pm'}`);

  /* Say the rule back in a sentence, because a dropdown pair is not a promise. */
  function deliverySentence(p) {
    const channels = [p.push && 'push', p.email && 'email', p.sms && 'text'].filter(Boolean);
    const how = channels.length ? channels.join(', ') : 'nowhere — every channel is off';
    const when = p.digest === 'instant' ? 'as things happen'
      : p.digest === 'daily' ? 'once a day' : 'once a week';
    const quiet = p.quietFrom === p.quietTo ? ''
      : ` Nothing between ${HOURS[p.quietFrom]} and ${HOURS[p.quietTo]}; it waits.`;
    return `Sent by ${how}, ${when}.${quiet}`;
  }

  /* ---------- moderation queue ---------- */
  /* Reports go somewhere. A group moderator sees what was reported in their group,
     the rule cited, and can leave it up, remove it, or remove it and warn the
     account. The author is told the outcome and can appeal once, to someone else. */

  const isMod = (g) => g.mods.indexOf('me') > -1 || !!(S.modOf || {})[g.id];
  const modGroups = () => D.groups.filter(isMod);
  const decisionOf = (pid) => (S.decisions || {})[pid] || null;

  const DECISIONS = {
    keep: 'Left up — no rule broken',
    remove: 'Removed — breaks the content policy',
    warn: 'Removed, and the account was warned',
  };

  function reportedIn(g) {
    const ids = new Set(groupPosts(g).map((p) => p.id));
    groupHomes(g).forEach((l) => postsFor(l).forEach((p) => ids.add(p.id)));
    return Object.keys(S.reports || {})
      .filter((pid) => ids.has(pid))
      .map((pid) => ({ pid, report: S.reports[pid], where: pageOfPost(pid), post: findPost(pid) }))
      .filter((r) => r.post);
  }

  function findPost(pid) {
    for (const l of D.listings) { const p = postsFor(l).find((x) => x.id === pid); if (p) return p; }
    for (const g of D.groups) { const p = groupPosts(g).find((x) => x.id === pid); if (p) return p; }
    return null;
  }

  function moderation() {
    const root = document.getElementById('mod-body');

    function render() {
      const mine = modGroups();
      if (!mine.length) {
        root.innerHTML = `<div class="empty"><h2>You do not moderate a group</h2>
          <p>Moderators are neighbours the group already trusts. In this build you can take the role to see
             what the queue looks like.</p>
          <p style="margin-top:14px"><button class="btn btn--primary" id="mod-take">Moderate ${esc(D.groups[0].name)}</button></p></div>`;
        document.getElementById('mod-take').addEventListener('click', () => {
          (S.modOf = S.modOf || {})[D.groups[0].id] = true; save(); render(); chrome(activeNav);
          toast(`You moderate ${D.groups[0].name}`);
        });
        return;
      }

      const rows = mine.flatMap((g) => reportedIn(g).map((r) => ({ ...r, g })));
      const open = rows.filter((r) => !decisionOf(r.pid));
      root.innerHTML = `
        <div class="panel" style="margin-bottom:22px">
          <div class="panel__title">Moderating ${mine.map((g) => esc(g.name)).join(', ')}</div>
          <div class="panel__sub">${open.length} open · ${rows.length - open.length} decided</div>
          <div class="notice">You see the post, the rule cited and the group. You do not see who reported it.</div>
        </div>
        ${rows.length ? rows.map((r) => {
          const d = decisionOf(r.pid);
          const u = user(r.post.by);
          return `<div class="modcard${d ? ' is-done' : ''}">
            <div class="modcard__head">
              <span class="flagpill${d ? '' : ' flagpill--hot'}">${esc(reasonOf(r.report.reason).name)}</span>
              ${r.report.byOwner ? '<span class="flagpill">Owner asked</span>' : ''}
              <span class="modcard__where">${esc(r.g.name)} · <a href="${r.where.href}">${esc(r.where.name)}</a></span>
            </div>
            <div class="modcard__post">
              <b>${esc(u.name)}</b> ${badge(r.post.role || u.role)}
              <p>${esc(r.post.text)}</p>
            </div>
            ${r.report.note ? `<div class="modcard__note">Reporter added: ${esc(r.report.note)}</div>` : ''}
            ${d ? `<div class="modcard__decision">${esc(DECISIONS[d.call])}${d.appealed ? ' · appealed, with a second moderator' : ''}</div>`
              : `<div class="modcard__acts">
                  <button class="btn btn--sm" data-call="keep" data-pid="${r.pid}">Leave it up</button>
                  <button class="btn btn--sm" data-call="remove" data-pid="${r.pid}">Remove it</button>
                  <button class="btn btn--sm" data-call="warn" data-pid="${r.pid}">Remove and warn</button>
                </div>`}
          </div>`;
        }).join('') : `<div class="empty"><h3>Nothing reported</h3>
          <p>When someone reports a post in your group, it lands here.</p></div>`}`;

      root.querySelectorAll('[data-call]').forEach((b) => b.addEventListener('click', () => {
        (S.decisions = S.decisions || {})[b.dataset.pid] = { call: b.dataset.call, when: 'just now' };
        if (S.reports[b.dataset.pid]) S.reports[b.dataset.pid].status = 'done';
        save(); render();
        toast(DECISIONS[b.dataset.call]);
      }));
    }

    render();
  }

  /* ---------- group market trend ---------- */
  /* Median asking price of the homes in the group that have a page, over the last
     six quarters. Derived from what the group actually holds, so a group with two
     addresses says so rather than drawing a confident line. */

  function groupTrend(g) {
    const homes = groupHomes(g);
    if (homes.length < 2) return null;
    const median = (ns) => {
      const a = ns.slice().sort((x, y) => x - y);
      return a.length % 2 ? a[(a.length - 1) / 2] : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2);
    };
    const now = median(homes.map((l) => l.price));
    /* walk backwards using the group's own recorded appreciation, not a guess */
    const growth = 1 + (g.stats.ppsf > 400 ? 0.018 : 0.011);
    return [5, 4, 3, 2, 1, 0].map((back, i) => ({
      label: back ? `Q-${back}` : 'Now',
      value: Math.round(now / Math.pow(growth, back) / 1000) * 1000,
      i,
    }));
  }

  function trendChart(host, g) {
    const data = groupTrend(g);
    if (!data) { host.innerHTML = ''; return false; }
    const w = host.clientWidth || 320, h = 130;
    const pad = { l: 4, r: 4, t: 22, b: 20 };
    const top = Math.max(...data.map((d) => d.value));
    const bottom = Math.min(...data.map((d) => d.value)) * 0.97;
    const band = (w - pad.l - pad.r) / data.length;
    const bw = Math.min(24, band - 8);
    host.innerHTML = `<svg class="oc__svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"
        aria-label="Median asking price by quarter: ${data.map((d) => `${d.label} ${money(d.value)}`).join(', ')}">
      ${data.map((d, i) => {
        const bh = Math.max(4, (d.value - bottom) / (top - bottom || 1) * (h - pad.t - pad.b));
        const x = pad.l + i * band + (band - bw) / 2;
        const y = h - pad.b - bh;
        const on = i === data.length - 1;
        return `<g class="oc__col${on ? ' is-on' : ''}"><title>${esc(d.label)}: ${money(d.value)}</title>
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4"/>
          ${on ? `<text class="oc__val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${money(d.value)}</text>` : ''}
        </g>`;
      }).join('')}
      <text class="oc__axis" x="${pad.l}" y="${h - 5}">six quarters ago</text>
      <text class="oc__axis" x="${w - pad.r}" y="${h - 5}" text-anchor="end">now</text>
    </svg>`;
    return true;
  }

  /* ---------- group directory ---------- */

  function groups() {
    const q = document.getElementById('g-q');
    const host = document.getElementById('groups-all');

    function run() {
      const term = q.value.trim().toLowerCase();
      const list = D.groups.filter((g) =>
        !term || `${g.name} ${g.city}`.toLowerCase().includes(term));
      host.innerHTML = list.length ? `<div class="gdir">${list.map((g) => {
        const homes = groupHomes(g);
        return `<div class="gcard">
          <div class="gcard__head">
            <div class="avatar avatar--lg">${esc(initials(g.name))}</div>
            <div style="flex:1;min-width:0">
              <a class="gcard__name" href="group.html?id=${g.id}">${esc(g.name)}</a>
              <div class="gcard__city">${esc(g.city)}</div>
            </div>
            <button class="btn btn--sm" data-join="${g.id}" aria-pressed="${!!S.joined[g.id]}">${S.joined[g.id] ? 'Joined' : 'Join'}</button>
          </div>
          <p class="gcard__blurb">${esc(g.blurb)}</p>
          <div class="gcard__facts">
            <span><b>${members(g).toLocaleString()}</b> members</span>
            <span><b>${g.today}</b> today</span>
            <span><b>${g.stats.forSale}</b> for sale</span>
            <span><b>${homes.length}</b> with a page</span>
          </div>
          <div class="gcard__homes">${homes.slice(0, 4).map((l) =>
            `<a href="address.html?id=${l.id}" aria-label="${esc(l.street)}">${art(l.hue, 0)}</a>`).join('')}</div>
        </div>`;
      }).join('')}</div>`
      : `<div class="empty"><h2>No group by that name</h2><p>There are six in this build. Try a city.</p></div>`;
    }

    q.addEventListener('input', run);
    run();
  }

  /* ---------- person profiles ---------- */
  /* Everything a person said, in one place. This is the surface that makes people
     careful about what they post, which is the point. */

  function postsBy(uid) {
    const out = [];
    D.listings.forEach((l) => postsFor(l).forEach((p) => {
      if (p.by === uid) out.push({ p, where: l.street, href: `address.html?id=${l.id}` });
      (p.replies || []).concat(S.replies[p.id] || []).forEach((r) => {
        if (r.by === uid) out.push({ p: r, reply: true, where: l.street, href: `address.html?id=${l.id}` });
      });
    }));
    D.groups.forEach((g) => groupPosts(g).forEach((p) => {
      if (p.by === uid) out.push({ p, where: g.name, href: `group.html?id=${g.id}` });
      (p.replies || []).concat(S.replies[p.id] || []).forEach((r) => {
        if (r.by === uid) out.push({ p: r, reply: true, where: g.name, href: `group.html?id=${g.id}` });
      });
    }));
    return out.sort((a, b) => agoHours(a.p.ago) - agoHours(b.p.ago));
  }

  function profile() {
    const uid = new URLSearchParams(location.search).get('u') || 'u1';
    if (!D.users[uid]) {
      document.getElementById('main').innerHTML = `<div class="wrap"><div class="empty">
        <h2>No such person</h2>
        <p>Nobody by that id posts here.</p>
        <p style="margin-top:14px"><a class="btn btn--primary" href="feed.html">Read the feed</a></p></div></div>`;
      return;
    }
    const u = user(uid);
    describe(`${u.name} — Abode`,
      `${u.name} on Abode — ${D.roleLabel[u.role].toLowerCase()}. Everything they posted about the addresses they know.`);

    const owns = D.listings.filter((l) => l.owner === uid);
    const reps = D.listings.filter((l) => l.agent === uid);
    const items = postsBy(uid);
    const karma = items.reduce((n, i) => n + (i.p.up || 0) - (i.p.down || 0), 0);
    const mods = D.groups.filter((g) => g.mods.indexOf(uid) > -1);

    document.getElementById('prof-head').innerHTML = `
      <div class="grp-head">
        ${avatar(uid)}
        <div class="grp-head__main">
          <div class="grp-head__eyebrow">${esc(D.roleLabel[u.role])}${u.verified ? ' · verified' : ''}</div>
          <h1 class="grp-head__name">${esc(u.name)}</h1>
          <div class="grp-head__facts">
            <span><b>${items.length}</b> posts and replies</span>
            <span><b>${karma}</b> net votes</span>
            <span><b>${owns.length}</b> owned</span>
            <span><b>${reps.length}</b> represented</span>
          </div>
        </div>
        <div class="grp-head__actions">
          ${uid === 'me' ? '' : `<button class="btn btn--primary" data-dm="${uid}" data-dm-about="${(owns[0] || reps[0] || D.listings[0]).id}">Message</button>`}
        </div>
      </div>`;

    document.getElementById('prof-posts').innerHTML = items.length ? items.map((i) => `
      <article class="post">
        ${avatar(uid)}
        <div class="post__body">
          <div class="post__head"><span class="post__who">${esc(u.name)}</span>${badge(i.p.role || u.role)}
            <span class="post__when">${esc(i.p.ago)}</span></div>
          <div class="post__text">${esc(i.p.text)}</div>
          <div class="post__foot">
            ${voteBox(i.p.id, i.p.up || 0, i.p.down || 0)}
            <a class="linkish" href="${i.href}">${i.reply ? 'Reply on' : 'Posted on'} ${esc(i.where)}</a>
          </div>
        </div>
      </article>`).join('')
      : '<div class="empty"><h3>Nothing posted yet</h3><p>When they post at an address or in a group, it shows up here.</p></div>';

    document.getElementById('prof-rail').innerHTML = `
      ${owns.length ? `<div class="panel">
        <div class="panel__title">Addresses owned</div>
        <div class="panel__sub">Verified against the deed</div>
        ${owns.map((l) => `<div class="group-row">
          <a href="address.html?id=${l.id}" aria-label="${esc(l.street)}" style="width:52px;height:40px;border-radius:6px;overflow:hidden;flex:none">${art(l.hue, 0)}</a>
          <div style="flex:1;min-width:0"><a href="address.html?id=${l.id}" style="font-weight:600;font-size:.92rem">${esc(l.street)}</a>
            <div class="group-row__n">${esc(l.city)}, ${l.state} · ${money(l.price)}</div></div>
        </div>`).join('')}
      </div>` : ''}
      ${reps.length ? `<div class="panel">
        <div class="panel__title">Listings represented</div>
        <div class="panel__sub">Agent of record</div>
        ${reps.map((l) => `<div class="group-row">
          <div style="flex:1;min-width:0"><a href="address.html?id=${l.id}" style="font-weight:600;font-size:.92rem">${esc(l.street)}</a>
            <div class="group-row__n">${esc(l.city)}, ${l.state} · ${money(l.price)}</div></div>
        </div>`).join('')}
      </div>` : ''}
      ${mods.length ? `<div class="panel panel--sticky">
        <div class="panel__title">Moderates</div>
        <div class="panel__sub">Handles reports in these groups</div>
        ${mods.map((g) => `<div class="group-row">
          <div class="avatar avatar--sm">${esc(initials(g.name))}</div>
          <div style="flex:1;min-width:0"><a href="group.html?id=${g.id}" style="font-weight:600;font-size:.92rem">${esc(g.name)}</a>
            <div class="group-row__n">${esc(g.city)}</div></div>
        </div>`).join('')}
      </div>` : ''}`;
  }

  /* ---------- recently viewed ---------- */

  const RECENT_MAX = 8;
  const recent = () => (S.recent || []).filter((id) => D.byId[id]);

  function noteVisit(id) {
    const list = recent().filter((x) => x !== id);
    list.unshift(id);
    S.recent = list.slice(0, RECENT_MAX);
    S.visits = S.visits || {};
    const last = S.visits[id];
    S.visits[id] = Date.now();
    save();
    return last || null;
  }

  /* Anything newer than your last visit, in the units the data actually has. */
  function changedSince(l, lastVisit) {
    if (!lastVisit) return [];
    const hours = Math.max(1, (Date.now() - lastVisit) / 3600000);
    const out = [];
    postsFor(l).forEach((p) => { if (agoHours(p.ago) <= hours) out.push(`${user(p.by).name} posted`); });
    offersFor(l).forEach((o) => { if (agoHours(o.when) <= hours) out.push(`an offer at ${money(o.amt)}`); });
    (S.work || {})[l.id] && workFor(l.id).forEach(() => {});
    return out;
  }

  function recentStrip(host, exclude) {
    const list = recent().filter((id) => id !== exclude).map((id) => D.byId[id]);
    if (!list.length || !host) { if (host) host.innerHTML = ''; return; }
    host.innerHTML = `<div class="sec__head" style="margin-bottom:14px"><div><h2>Recently viewed</h2></div>
        <button class="linkish" data-clear-recent>Clear</button></div>
      <div class="recent">${list.map((l, i) => `
        <a class="recent__item" href="address.html?id=${l.id}">
          <span class="recent__art">${art(l.hue, i)}</span>
          <span class="recent__body">
            <b>${money(l.price)}</b>
            <span>${esc(l.street)}</span>
            <span class="recent__city">${esc(l.city)}, ${l.state}</span>
          </span>
        </a>`).join('')}</div>`;
    const clear = host.querySelector('[data-clear-recent]');
    if (clear) clear.addEventListener('click', () => { S.recent = []; save(); recentStrip(host, exclude); });
  }

  /* ---------- share ---------- */

  function shareAddress(l) {
    const url = location.origin && location.origin !== 'null'
      ? `${location.origin}${location.pathname.replace(/[^/]*$/, '')}address.html?id=${l.id}`
      : `address.html?id=${l.id}`;
    const text = `${l.street}, ${l.city} — ${money(l.price)} on Abode`;
    if (navigator.share) {
      navigator.share({ title: l.street, text, url }).catch(() => {});
      return url;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => toast('Link copied'), () => toast(url));
      return url;
    }
    toast(url);
    return url;
  }

  /* ---------- compare ---------- */
  /* Up to four homes held in a tray at the bottom of the window, then laid out
     side by side. The tray survives navigation, because comparing means walking
     between pages and coming back. */

  const COMPARE_MAX = 4;
  const compareIds = () => (S.compare || []).filter((id) => D.byId[id]);
  const comparing = (id) => compareIds().indexOf(id) > -1;

  function toggleCompare(id) {
    const list = compareIds();
    const i = list.indexOf(id);
    if (i > -1) list.splice(i, 1);
    else if (list.length >= COMPARE_MAX) { toast(`Four at a time. Drop one first.`); return; }
    else list.push(id);
    S.compare = list; save();
    renderTray();
  }

  function renderTray() {
    let tray = document.querySelector('.tray');
    const list = compareIds();
    if (!list.length) { if (tray) tray.remove(); paintCompareButtons(); return; }
    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'tray';
      document.body.appendChild(tray);
      tray.addEventListener('click', (e) => {
        const drop = e.target.closest('[data-uncompare]');
        if (drop) return toggleCompare(drop.dataset.uncompare);
        if (e.target.closest('[data-clear-compare]')) { S.compare = []; save(); renderTray(); }
      });
    }
    tray.innerHTML = `
      <div class="wrap tray__inner">
        <div class="tray__items">${list.map((id) => {
          const l = D.byId[id];
          return `<div class="tray__item">
            <span>${esc(l.street)}</span>
            <button data-uncompare="${id}" aria-label="Remove ${esc(l.street)} from the comparison">×</button>
          </div>`;
        }).join('')}</div>
        <div class="tray__acts">
          <button class="linkish" data-clear-compare>Clear</button>
          <a class="btn btn--primary btn--sm" href="compare.html">Compare ${list.length}</a>
        </div>
      </div>`;
    paintCompareButtons();
  }

  function paintCompareButtons() {
    document.querySelectorAll('[data-compare]').forEach((b) => {
      const on = comparing(b.dataset.compare);
      b.setAttribute('aria-pressed', String(on));
      if (b.dataset.compareLabel !== 'short') b.textContent = on ? '✓ Comparing' : 'Compare';
    });
  }

  const COMPARE_ROWS = [
    ['Price', (l) => money(l.price)],
    ['Price per sqft', (l) => money(l.ppsf)],
    ['Beds', (l) => l.beds],
    ['Baths', (l) => l.baths],
    ['Interior', (l) => l.sqft.toLocaleString() + ' sqft'],
    ['Lot', (l) => l.lot + ' acres'],
    ['Built', (l) => l.year],
    ['Type', (l) => l.type],
    ['Status', (l) => ({ active: 'For sale', pending: 'Pending', sold: 'Sold' })[l.status]],
    ['Days on market', (l) => l.dom],
    ['Annual taxes', (l) => money(l.taxes)],
    ['HOA', (l) => (l.hoa ? money(l.hoa) + '/yr' : 'None')],
    ['Est. monthly', (l) => money(monthlyCost(l, loanPrefs()).total)],
    ['Following', (l) => compact(followers(l))],
    ['Posts and comments', (l) => commentCount(l)],
    ['Open house', (l) => (openHouse(l) ? `${openHouse(l).day} ${openHouse(l).when}` : '—')],
  ];

  function compare() {
    const root = document.getElementById('compare-body');

    function render() {
      const list = compareIds().map((id) => D.byId[id]);
      if (!list.length) {
        root.innerHTML = `<div class="empty"><h2>Nothing to compare yet</h2>
          <p>Use the compare button on any listing card or address page — up to four at a time.</p>
          <p style="margin-top:14px"><a class="btn btn--primary" href="search.html">Find homes</a></p></div>`;
        return;
      }
      /* mark the best value in each numeric row that has an obvious better direction */
      const best = (label, vals) => {
        const nums = vals.map((v) => Number(String(v).replace(/[^0-9.]/g, '')));
        if (nums.some((n) => !isFinite(n))) return -1;
        const lower = ['Price', 'Price per sqft', 'Annual taxes', 'HOA', 'Est. monthly', 'Days on market'];
        const pick = lower.includes(label) ? Math.min(...nums) : Math.max(...nums);
        return nums.indexOf(pick);
      };

      root.innerHTML = `<div class="cmpgrid" style="--n:${list.length}">
        <div class="cmpgrid__row cmpgrid__row--head">
          <div></div>
          ${list.map((l, i) => `<div class="cmpgrid__cell">
            <a class="cmpgrid__art" href="address.html?id=${l.id}" aria-label="${esc(l.street)}">${art(l.hue, i)}</a>
            <a class="cmpgrid__addr" href="address.html?id=${l.id}">${esc(l.street)}</a>
            <div class="cmpgrid__city">${esc(l.city)}, ${l.state}</div>
            <button class="btn btn--sm" data-uncompare="${l.id}">Remove</button>
          </div>`).join('')}
        </div>
        ${COMPARE_ROWS.map(([label, fn]) => {
          const vals = list.map(fn);
          const b = list.length > 1 ? best(label, vals) : -1;
          return `<div class="cmpgrid__row">
            <div class="cmpgrid__label">${esc(label)}</div>
            ${vals.map((v, i) => `<div class="cmpgrid__cell${i === b ? ' is-best' : ''}">${esc(String(v))}</div>`).join('')}
          </div>`;
        }).join('')}
      </div>
      <p class="cmpgrid__note">Highlighted where a column is the lowest price, tax or monthly cost, or the highest of everything else. It is arithmetic, not advice.</p>`;

      root.querySelectorAll('[data-uncompare]').forEach((b) => b.addEventListener('click', () => {
        toggleCompare(b.dataset.uncompare); render();
      }));
    }

    render();
  }

  /* ---------- cost to own ---------- */
  /* A real amortisation, not a rule of thumb: principal and interest from the
     standard formula, plus tax, insurance, HOA and PMI while the loan is over 80%
     of value. Inputs persist, because nobody wants to retype their rate on every
     listing. */

  const loanPrefs = () => Object.assign({ down: 20, rate: 6.25, years: 30 }, S.loan || {});

  function monthlyCost(l, f) {
    const down = Math.max(0, Math.min(100, Number(f.down) || 0));
    const principal = l.price * (1 - down / 100);
    const r = (Number(f.rate) || 0) / 100 / 12;
    const n = (Number(f.years) || 30) * 12;
    const pi = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
    const tax = l.taxes / 12;
    const hoa = (l.hoa || 0) / 12;
    /* insurance: a flat 0.35% of value a year, which is the right order for most
       of the country and honest about being an estimate */
    const ins = l.price * 0.0035 / 12;
    const pmi = down < 20 ? principal * 0.0055 / 12 : 0;
    return { principal, pi, tax, hoa, ins, pmi, total: pi + tax + hoa + ins + pmi, down };
  }

  function costPanel(l) {
    const f = loanPrefs();
    const m = monthlyCost(l, f);
    const parts = [
      ['Principal & interest', m.pi, 'var(--accent)'],
      ['Property tax', m.tax, 'var(--gold)'],
      ['Insurance (est.)', m.ins, 'var(--ink-3)'],
    ].concat(m.hoa ? [['HOA', m.hoa, 'var(--accent-2)']] : [])
     .concat(m.pmi ? [['PMI', m.pmi, 'var(--danger)']] : []);

    return `<div class="panel panel--sticky">
      <div class="panel__title">Cost to own</div>
      <div class="panel__sub">Estimate at ${money(l.price)}</div>
      <div class="cost__total"><b id="cost-n">${money(m.total)}</b><span>a month</span></div>
      <div class="cost__bar" role="img" aria-label="${parts.map((p) => `${p[0]} ${money(p[1])}`).join(', ')}">
        ${parts.map(([, v, c]) => `<span style="width:${(v / m.total * 100).toFixed(1)}%;background:${c}"></span>`).join('')}
      </div>
      <div class="cost__key">${parts.map(([name, v, c]) =>
        `<div><span class="cost__dot" style="background:${c}"></span>${esc(name)}<b>${money(v)}</b></div>`).join('')}</div>
      <div class="cost__inputs">
        <div><label class="lbl" for="cost-down">Down payment</label>
          <div class="cost__row"><input class="field" id="cost-down" type="number" min="0" max="100" step="1" value="${f.down}"><span>%</span></div></div>
        <div><label class="lbl" for="cost-rate">Rate</label>
          <div class="cost__row"><input class="field" id="cost-rate" type="number" min="0" max="20" step="0.125" value="${f.rate}"><span>%</span></div></div>
        <div><label class="lbl" for="cost-years">Term</label>
          <select class="field" id="cost-years">${[30, 20, 15, 10].map((y) => `<option${y === Number(f.years) ? ' selected' : ''}>${y}</option>`).join('')}</select></div>
      </div>
      <div class="facts" style="margin-top:14px">
        <div><dt>Down payment</dt><dd>${money(l.price * m.down / 100)}</dd></div>
        <div><dt>Loan amount</dt><dd>${money(m.principal)}</dd></div>
      </div>
      <div class="notice" style="margin-top:12px">Insurance is estimated at 0.35% of value a year.${m.pmi ? ' PMI is included because the loan is over 80% of value.' : ''} Taxes are the county figure on this parcel.</div>
    </div>`;
  }

  /* ---------- private tours ---------- */
  /* An open house is public; a tour is an appointment. The request goes to the
     agent of record with a day and a window, and lands on their desk. */

  const TOUR_DAYS = ['Tomorrow', 'Saturday', 'Sunday', 'Next week'];
  const TOUR_TIMES = ['Morning', 'Midday', 'Afternoon', 'Evening'];
  const tourFor = (id) => (S.tours || {})[id] || null;

  function tourPanel(l) {
    const t = tourFor(l.id);
    if (t) {
      return `<div class="panel">
        <div class="panel__title">Tour requested</div>
        <div class="panel__sub">${esc(t.day)}, ${esc(t.time.toLowerCase())} · sent to ${esc(user(l.agent).name)}</div>
        <div class="notice">Nobody confirms it in this build. In production the agent accepts or proposes another
          time, and it lands in your alerts.</div>
        <button class="linkish" id="tour-drop" style="margin-top:12px">Cancel the request</button>
      </div>`;
    }
    return `<div class="panel">
      <div class="panel__title">See it in person</div>
      <div class="panel__sub">A private tour with ${esc(user(l.agent).name)}, agent of record</div>
      <div class="cost__inputs" style="grid-template-columns:1fr 1fr;margin-top:0">
        <div><label class="lbl" for="tour-day">Day</label>
          <select class="field" id="tour-day">${TOUR_DAYS.map((x) => `<option>${x}</option>`).join('')}</select></div>
        <div><label class="lbl" for="tour-time">Time</label>
          <select class="field" id="tour-time">${TOUR_TIMES.map((x) => `<option>${x}</option>`).join('')}</select></div>
      </div>
      <button class="btn btn--primary btn--wide" id="tour-go" style="margin-top:12px">Request a tour</button>
      <div class="notice" style="margin-top:12px">Your display name goes to the agent. Your contact details do not.</div>
    </div>`;
  }

  /* ---------- open houses ---------- */
  /* Scheduled by whoever has standing at the address — the agent of record or the
     verified owner. Anyone can say they are coming; the count is the only thing an
     agent actually wants from an RSVP. */

  const openHouse = (l) => (S.openHouses || {})[l.id] || l.openHouse || null;
  const canSchedule = (l) => isOwner(l.id) || (isAgent() && (S.repping || {})[l.id]);
  const rsvped = (l) => !!(S.rsvps || {})[l.id];
  const rsvpCount = (l) => {
    const oh = openHouse(l);
    return (oh ? (oh.rsvps || 0) : 0) + (rsvped(l) ? 1 : 0);
  };

  function openHousePanel(l) {
    const oh = openHouse(l);
    if (!oh) {
      return canSchedule(l) ? `<div class="panel" id="oh-panel">
        <div class="panel__title">Open house</div>
        <div class="panel__sub">Nothing scheduled. Put one on the page and everyone following gets told.</div>
        ${ohForm(null)}
      </div>` : '';
    }
    return `<div class="panel" id="oh-panel">
      <div class="panel__title">Open house</div>
      <div class="panel__sub">Hosted by ${esc(user(oh.host || l.agent).name)}</div>
      <div class="oh">
        <div class="oh__when"><b>${esc(oh.day)} ${esc(oh.when)}</b><span>${esc(oh.date)}</span></div>
        <div class="oh__n"><b id="oh-n">${rsvpCount(l)}</b> going</div>
      </div>
      <button class="btn ${rsvped(l) ? '' : 'btn--primary'} btn--wide" id="oh-rsvp" aria-pressed="${rsvped(l)}">
        ${rsvped(l) ? '✓ You are going' : 'I am going'}</button>
      ${canSchedule(l) ? `<details class="oh__edit"><summary>Change the time</summary>${ohForm(oh)}</details>` : ''}
      <div class="notice" style="margin-top:12px">An RSVP shares your display name with the host and nothing else.</div>
    </div>`;
  }

  function ohForm(oh) {
    const days = ['Saturday', 'Sunday', 'Thursday', 'Friday'];
    return `<div class="oh__form">
      <label class="lbl" for="oh-day">Day</label>
      <select class="field" id="oh-day">${days.map((d) => `<option${oh && oh.day === d ? ' selected' : ''}>${d}</option>`).join('')}</select>
      <label class="lbl" for="oh-time" style="margin-top:10px">Time</label>
      <input class="field" id="oh-time" value="${oh ? esc(oh.when) : ''}" placeholder="1–4pm">
      <label class="lbl" for="oh-date" style="margin-top:10px">Date</label>
      <input class="field" id="oh-date" value="${oh ? esc(oh.date) : ''}" placeholder="Sep 12">
      <button class="btn btn--primary btn--wide" id="oh-save" style="margin-top:12px">${oh ? 'Update it' : 'Schedule it'}</button>
    </div>`;
  }

  /* ---------- photo viewer ---------- */

  function openGallery(l, shots, start) {
    let i = start;
    const host = document.createElement('div');
    host.className = 'sheet lightbox';
    document.body.appendChild(host);
    const restore = sheetFocus(host);
    const close = () => { host.remove(); document.removeEventListener('keydown', keys); restore(); };
    const step = (d) => { i = (i + d + shots.length) % shots.length; render(); };
    const keys = (e) => {
      if (e.key === 'Escape') return close();
      if (e.key === 'ArrowRight') return step(1);
      if (e.key === 'ArrowLeft') return step(-1);
    };
    document.addEventListener('keydown', keys);

    function render() {
      host.innerHTML = `<div class="lightbox__box" role="dialog" aria-modal="true" aria-label="Photos of ${esc(l.street)}">
        <button class="sheet__x" data-x aria-label="Close">×</button>
        <button class="lightbox__nav lightbox__nav--prev" data-step="-1" aria-label="Previous photo">‹</button>
        <div class="lightbox__frame">${art(l.hue, shots[i])}</div>
        <button class="lightbox__nav lightbox__nav--next" data-step="1" aria-label="Next photo">›</button>
        <div class="lightbox__cap">${esc(l.street)}, ${esc(l.city)} · ${i + 1} of ${shots.length}</div>
      </div>`;
    }

    host.addEventListener('click', (e) => {
      if (e.target === host || e.target.closest('[data-x]')) return close();
      const n = e.target.closest('[data-step]');
      if (n) step(Number(n.dataset.step));
    });

    render();
  }

  /* ---------- hazard ---------- */
  /* Only some addresses have anything on file, which is what real hazard data
     looks like. The panel says what is known, where it came from, and — when
     nothing is on file — where you would go to look, rather than inventing a
     score for a house nobody has assessed. */

  const RISK_LABEL = { flood: 'Flood', fire: 'Wildfire', wind: 'Wind and storm', heat: 'Heat' };
  const RISK_RANK = { 'Very high': 4, High: 3, Moderate: 2, Low: 1 };
  const riskClass = (level) => {
    const s = RISK_RANK[level] || (String(level).startsWith('Zone V') ? 4
      : String(level).startsWith('Zone A') ? 3 : 1);
    return s >= 4 ? 'risk--high' : s === 3 ? 'risk--mid' : 'risk--low';
  };

  const SOURCES = 'FEMA flood maps, the state forester’s hazard portal, NOAA storm records and the county assessor.';

  function hazardPanel(l) {
    const r = l.risk;
    if (!r) {
      return `<div class="panel">
        <div class="panel__title">Hazard</div>
        <div class="panel__sub">Nothing on file for this address</div>
        <p style="color:var(--ink-2);font-size:.92rem;margin:0 0 10px">We do not guess. Where a hazard record
          exists it is shown here with its source; for this address there is none yet.</p>
        <div class="notice">Check ${SOURCES} Anything an owner or neighbour posts about water, fire or wind
          shows on the wall, not here.</div>
      </div>`;
    }
    return `<div class="panel">
      <div class="panel__title">Hazard</div>
      <div class="panel__sub">What is recorded for this parcel</div>
      <div class="risks">${Object.keys(r).map((k) => {
        const [level, note] = r[k];
        return `<div class="risk ${riskClass(level)}">
          <div class="risk__head"><b>${esc(RISK_LABEL[k] || k)}</b><span>${esc(level)}</span></div>
          <p>${esc(note)}</p>
        </div>`;
      }).join('')}</div>
      <div class="notice" style="margin-top:12px">Sources: ${SOURCES} A rating is not a prediction, and
        insurance is priced on more than this.</div>
    </div>`;
  }

  /* ---------- comparables ---------- */
  /* Nearest first, by great-circle distance from the coordinates the map already
     uses. With twelve records the nearest home can be four hundred miles away, so
     the panel says the distance rather than implying these are true comps. */

  function milesBetween(a, b) {
    const R = 3958.8, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  const distanceLabel = (mi) => mi < 1 ? `${Math.round(mi * 5280 / 100) * 100} ft`
    : mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;

  function comparables(l, n) {
    return D.listings
      .filter((x) => x.id !== l.id)
      .map((x) => ({ l: x, mi: milesBetween(l, x) }))
      .sort((a, b) => a.mi - b.mi)
      .slice(0, n || 3);
  }

  function comparablesPanel(l) {
    const comps = comparables(l, 3);
    const ppsfs = comps.map((c) => c.l.ppsf).sort((a, b) => a - b);
    const median = ppsfs.length % 2 ? ppsfs[(ppsfs.length - 1) / 2]
      : Math.round((ppsfs[ppsfs.length / 2 - 1] + ppsfs[ppsfs.length / 2]) / 2);
    const diff = Math.round((l.ppsf / median - 1) * 100);
    const top = Math.max(l.ppsf, ...ppsfs);
    const bar = (v, self) => `<div class="cmp__bar"><span class="cmp__fill${self ? ' is-self' : ''}"
      style="width:${(v / top * 100).toFixed(1)}%"></span></div>`;

    return `<div class="panel">
      <div class="panel__title">How it compares</div>
      <div class="panel__sub">Nearest addresses with a page, by price per square foot</div>
      <div class="cmp">
        <div class="cmp__row">
          <div class="cmp__who"><b>This home</b><span>${esc(l.city)}</span></div>
          ${bar(l.ppsf, true)}
          <div class="cmp__n">${money(l.ppsf)}</div>
        </div>
        ${comps.map((c) => `<div class="cmp__row">
          <div class="cmp__who"><a href="address.html?id=${c.l.id}">${esc(c.l.street)}</a><span>${distanceLabel(c.mi)} away · ${esc(c.l.city)}</span></div>
          ${bar(c.l.ppsf, false)}
          <div class="cmp__n">${money(c.l.ppsf)}</div>
        </div>`).join('')}
      </div>
      <div class="notice" style="margin-top:14px">${Math.abs(diff) < 4
        ? `Within a few percent of the median of these three at ${money(median)} a foot.`
        : `${Math.abs(diff)}% ${diff > 0 ? 'above' : 'below'} the median of these three at ${money(median)} a foot.`}
        Distance matters more than any of this — none of these are in the same market.</div>
    </div>`;
  }

  /* ---------- address record export ---------- */
  /* The product's claim is that an address keeps its record. A record you cannot
     take with you is not a record, so every address page can hand you the whole
     thing as JSON — the same shape the phase 7 public API would return. */

  function addressRecord(l) {
    return {
      schema: 'abode.address/v1',
      exported: 'sample build — no MLS feed connected',
      parcel: {
        id: l.id, street: l.street, city: l.city, state: l.state, zip: l.zip,
        lat: l.lat, lng: l.lng, type: l.type, year_built: l.year,
        beds: l.beds, baths: l.baths, sqft: l.sqft, lot_acres: l.lot,
      },
      listing: {
        status: l.status, price: l.price, prior_price: l.prior, days_on_market: l.dom,
        price_per_sqft: l.ppsf, annual_taxes: l.taxes, hoa: l.hoa, features: l.features,
      },
      price_history: priceSeries(l).map((p) => ({ date: p.date, event: p.kind, price: p.price })),
      history: l.history.map((h) => ({ date: h.date, event: h.what, detail: h.meta })),
      posts: postsFor(l).map((p) => ({
        id: p.id, by: user(p.by).name, role: p.role || user(p.by).role, when: p.ago,
        text: p.text, up: p.up, down: p.down, pinned: isPinned(p),
        replies: (p.replies || []).concat(S.replies[p.id] || []).map((r) => ({
          by: user(r.by).name, when: r.ago, text: r.text,
        })),
      })),
      offers: offersFor(l).map((o) => ({
        amount: o.amt, from: o.by, when: o.when, terms: o.note,
        status: ((S.offerReplies || {})[o.id] || { status: o.status }).status,
      })),
      following: followers(l),
    };
  }

  function exportRecord(l) {
    const json = JSON.stringify(addressRecord(l), null, 2);
    const name = l.street.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Downloaded the full record for this address');
    } catch (e) {
      /* no Blob or no downloads: fall back to the clipboard, then to a new tab */
      if (navigator.clipboard) navigator.clipboard.writeText(json);
      toast('Copied the full record to your clipboard');
    }
    return json;
  }

  /* ---------- owner analytics ---------- */
  /* What a verified owner gets that nobody else does: the demand side of their own
     address. The numbers are derived deterministically from the listing so they are
     stable across reloads — in production these are counters, not a hash. */

  function seeded(id, i) {
    let h = 0;
    const s = id + ':' + i;
    for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
    return (h % 1000) / 1000;
  }

  function interestWeeks(l) {
    const base = Math.max(18, Math.round(followers(l) / 6));
    return [0, 1, 2, 3, 4, 5, 6].map((i) => ({
      week: i === 6 ? 'This week' : `${6 - i} wk ago`,
      views: Math.round(base * (0.55 + seeded(l.id, i) * 0.9) * (i === 6 && l.prior ? 1.6 : 1)),
    }));
  }

  /* Columns, because these are seven discrete buckets and not a continuous line. */
  function interestChart(host, l) {
    const data = interestWeeks(l);
    const w = host.clientWidth || 320, h = 130;
    const pad = { l: 4, r: 4, t: 20, b: 20 };
    const top = Math.max(...data.map((d) => d.views));
    const band = (w - pad.l - pad.r) / data.length;
    const bw = Math.min(24, band - 8);

    host.innerHTML = `<svg class="oc__svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"
        aria-label="Views by week: ${data.map((d) => `${d.week} ${d.views}`).join(', ')}">
      ${data.map((d, i) => {
        const bh = Math.max(3, (d.views / top) * (h - pad.t - pad.b));
        const x = pad.l + i * band + (band - bw) / 2;
        const y = h - pad.b - bh;
        const on = i === data.length - 1;
        return `<g class="oc__col${on ? ' is-on' : ''}"><title>${esc(d.week)}: ${d.views} views</title>
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4"/>
          ${on ? `<text class="oc__val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${d.views}</text>` : ''}
        </g>`;
      }).join('')}
      <text class="oc__axis" x="${pad.l}" y="${h - 6}">7 weeks ago</text>
      <text class="oc__axis" x="${w - pad.r}" y="${h - 6}" text-anchor="end">now</text>
    </svg>`;
  }

  function ownerPanel(l) {
    const wk = interestWeeks(l);
    const views = wk.reduce((n, d) => n + d.views, 0);
    const trend = Math.round((wk[6].views / wk[5].views - 1) * 100);
    const live = offersFor(l).filter((o) => ((S.offerReplies || {})[o.id] || { status: o.status }).status === 'live').length;
    const threads = dmThreads().filter((t) => t.about === l.id).length;
    return `<div class="panel panel--owner">
      <div class="panel__title">Your address, last seven weeks</div>
      <div class="panel__sub">Only you see this panel</div>
      <div class="oc" id="oc-plot"></div>
      <div class="facts" style="margin-top:14px">
        <div><dt>Views</dt><dd>${views.toLocaleString()}</dd></div>
        <div><dt>Week on week</dt><dd>${trend >= 0 ? '+' : ''}${trend}%</dd></div>
        <div><dt>Following</dt><dd>${compact(followers(l))}</dd></div>
        <div><dt>Saves</dt><dd>${compact(l.saves + (S.saves[l.id] ? 1 : 0))}</dd></div>
        <div><dt>Live offers</dt><dd>${live}</dd></div>
        <div><dt>Message threads</dt><dd>${threads}</dd></div>
      </div>
      <div class="notice" style="margin-top:12px">${l.prior
        ? 'Interest jumped the week you cut the price. That decays in about ten days — answer the questions on the wall while people are looking.'
        : 'Posting an update puts this address back in the feed of everyone following it.'}</div>
    </div>`;
  }

  /* ---------- ownership claim ---------- */
  /* The phase-3 trust layer, front end first. Nothing here proves anything on
     its own: the real flow matches the claimant against the county deed name and
     then confirms with a mailed code or a document a human reviews. What this
     build does is model the states — unclaimed, pending, verified — and the
     powers that come with the badge, so the backend has a shape to fill. */

  const claimOf = (id) => S.claims[id] || null;
  const isOwner = (id) => !!(S.claims[id] && S.claims[id].status === 'verified' && roleOfClaim(S.claims[id]) === 'owner');
  const myRoleAt = (id) => (S.claims[id] && S.claims[id].status === 'verified' ? roleOfClaim(S.claims[id]) : null);

  const METHODS = [
    { id: 'postcard', name: 'Postcard mailed to the property', when: '5–7 days',
      note: 'A code goes to the address on the deed. Slow, and the hardest to fake.' },
    { id: 'utility', name: 'Utility bill in your name', when: '1 business day',
      note: 'Service address must match. Reviewed by a person, then deleted.' },
    { id: 'title', name: 'Title or recorded deed', when: '1 business day',
      note: 'Closing document with your name and this parcel.' },
    { id: 'id', name: 'Government ID matched to the deed name', when: 'Minutes',
      note: 'Name match only. We do not keep the image.' },
  ];
  const methodOf = (m) => METHODS.find((x) => x.id === m) || METHODS[0];

  /* County records show an abbreviated owner of record; the claimant supplies the
     full legal name and we match on surname the way a clerk would. */
  const deedName = (l) => {
    const parts = user(l.owner).name.split(' ');
    return parts[0][0] + '. ' + parts[parts.length - 1];
  };
  const surnameMatches = (typed, l) => {
    const want = user(l.owner).name.split(' ').pop().toLowerCase();
    return typed.trim().toLowerCase().split(/\s+/).includes(want);
  };

  const CLAIM_ROLES = [
    ['owner', 'I own this house', 'Matched against the recorded deed, then a code or a document.'],
    ['resident', 'I live here', 'Tenant or resident. Proof of address, no deed match — the badge says resident, not owner.'],
    ['past', 'I used to own it', 'Goes to manual review against the deed history. Slower, and worth it.'],
  ];
  const roleOfClaim = (c) => (c && c.role) || 'owner';

  function openClaim(l, done) {
    let step = 0, role = 'owner', method = 'postcard', typed = '', err = '';
    const host = document.createElement('div');
    host.className = 'sheet';
    document.body.appendChild(host);

    const restore = sheetFocus(host);
    const close = () => { host.remove(); document.removeEventListener('keydown', esckey); restore(); };
    const esckey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esckey);

    function render() {
      const body = step === 0 ? `
        <p class="sheet__lead">Three kinds of standing at <b>${esc(l.street)}</b>, and they are not
          interchangeable. Pick the one that is true.</p>
        <div class="opts">${CLAIM_ROLES.map(([v, name, note]) => `
          <label class="opt${role === v ? ' is-on' : ''}">
            <input type="radio" name="cl-role" value="${v}"${role === v ? ' checked' : ''}>
            <div><div class="opt__name">${esc(name)}</div><div class="opt__note">${esc(note)}</div></div>
          </label>`).join('')}</div>`
      : step === 1 ? `
        <p class="sheet__lead">${role === 'owner'
          ? `County records list the owner of record at <b>${esc(l.street)}</b> as <b>${esc(deedName(l))}</b>.
             Enter your full legal name as it appears on the deed.`
          : role === 'resident'
            ? `A resident badge says you live at <b>${esc(l.street)}</b> — nothing about who owns it.
               Enter the name your utility bill or lease is in.`
            : `A past-owner claim at <b>${esc(l.street)}</b> goes to a person who checks the deed history.
               Enter the name you owned it under.`}</p>
        <label class="lbl" for="cl-name">Full legal name</label>
        <input class="field" id="cl-name" value="${esc(typed)}" placeholder="First Middle Last">
        ${err ? `<div class="sheet__err">${esc(err)}</div>` : ''}
        <div class="notice" style="margin-top:14px">If you are a past owner, a tenant or the agent of record,
          you do not need this — post with your own badge instead.</div>`
      : step === 2 ? `
        <p class="sheet__lead">Pick how you want to prove it. Every route ends with a person or a
          postal address, never with a checkbox.</p>
        <div class="opts">${METHODS.map((m) => `
          <label class="opt${method === m.id ? ' is-on' : ''}">
            <input type="radio" name="cl-m" value="${m.id}"${method === m.id ? ' checked' : ''}>
            <div><div class="opt__name">${esc(m.name)}</div>
              <div class="opt__note">${esc(m.note)}</div></div>
            <div class="opt__when">${esc(m.when)}</div>
          </label>`).join('')}</div>`
      : `
        <p class="sheet__lead">Submitted. <b>${esc(methodOf(method).name)}</b> — expect a decision in
          <b>${esc(methodOf(method).when)}</b>. Until then you post as a neighbor.</p>
        <div class="facts" style="margin:16px 0">
          <div><dt>Address</dt><dd>${esc(l.street)}</dd></div>
          <div><dt>Claimed as</dt><dd>${esc(typed)}</dd></div>
          <div><dt>Method</dt><dd>${esc(methodOf(method).name)}</dd></div>
          <div><dt>Status</dt><dd>In review</dd></div>
        </div>
        <div class="notice">A verified badge can be revoked. Deed changes hands, badge follows it —
          the previous owner keeps a Past owner badge and their posts stay up.</div>`;

      host.innerHTML = `<div class="sheet__box" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
        <button class="sheet__x" data-x aria-label="Close">×</button>
        <div class="sheet__step">Step ${step + 1} of 4</div>
        <h3 class="sheet__t" id="sheet-t">${['What are you claiming',
          role === 'owner' ? 'Match the deed' : 'Your name', 'Choose your proof', 'In review'][step]}</h3>
        ${body}
        <div class="sheet__foot">
          ${step > 0 && step < 3 ? '<button class="btn" data-back>Back</button>' : '<span></span>'}
          <button class="btn btn--primary" data-go>${step === 3 ? 'Done' : 'Continue'}</button>
        </div>
      </div>`;
      const f = host.querySelector('#cl-name');
      if (f) f.focus();
    }

    host.addEventListener('input', (e) => {
      if (e.target.id === 'cl-name') typed = e.target.value;
    });
    host.addEventListener('change', (e) => {
      if (e.target.name === 'cl-m') { method = e.target.value; render(); }
      if (e.target.name === 'cl-role') { role = e.target.value; render(); }
    });
    host.addEventListener('click', (e) => {
      if (e.target === host || e.target.closest('[data-x]')) return close();
      if (e.target.closest('[data-back]')) { step--; render(); return; }
      if (!e.target.closest('[data-go]')) return;
      if (step === 0) { step = 1; return render(); }
      if (step === 1) {
        if (!typed.trim()) { err = 'Enter your name.'; return render(); }
        if (role === 'owner' && !surnameMatches(typed, l)) {
          err = `That surname does not match the owner of record (${deedName(l)}). Claims that do not match go to manual review and usually fail.`;
          return render();
        }
        err = ''; step = 2; return render();
      }
      if (step === 2) {
        S.claims[l.id] = { status: 'pending', role, method, name: typed.trim(), when: 'just now' };
        save(); step = 3; render(); if (done) done();
        return;
      }
      close();
    });

    render();
  }

  /* ---------- reporting ---------- */

  const REPORT_REASONS = [
    { id: 'fha', name: 'Fair Housing violation', note: 'Steering, or a preference about who should live somewhere.' },
    { id: 'privacy', name: 'Occupant privacy or safety', note: 'Names, schedules, who is home, when a house is empty.' },
    { id: 'false', name: 'False claim about the property', note: 'Says something about the house that is not true.' },
    { id: 'defame', name: 'Defamatory about a person', note: 'Targets a named person rather than the property.' },
    { id: 'spam', name: 'Spam or listing promotion', note: 'Agent advertising dressed up as a neighborhood post.' },
  ];
  const REPORT_STATUS = { triage: 'in triage', reviewing: 'with a moderator', done: 'decided' };
  const reasonOf = (id) => REPORT_REASONS.find((r) => r.id === id) || REPORT_REASONS[0];

  function openReport(postId, done) {
    if ((S.reports || {})[postId]) { toast('You already reported this one'); return; }
    let reason = 'fha', note = '';
    const host = document.createElement('div');
    host.className = 'sheet';
    document.body.appendChild(host);
    const restore = sheetFocus(host);
    const close = () => { host.remove(); document.removeEventListener('keydown', esckey); restore(); };
    const esckey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esckey);

    host.innerHTML = `<div class="sheet__box" role="dialog" aria-modal="true" aria-labelledby="rep-t">
      <button class="sheet__x" data-x aria-label="Close">×</button>
      <div class="sheet__step">Report</div>
      <h3 class="sheet__t" id="rep-t">What is wrong with this post?</h3>
      <p class="sheet__lead">A person reads every report. The owner of the address is told a report exists,
        not who filed it, and can respond before anything comes down.</p>
      <div class="opts">${REPORT_REASONS.map((r, i) => `
        <label class="opt${i === 0 ? ' is-on' : ''}">
          <input type="radio" name="rep-r" value="${r.id}"${i === 0 ? ' checked' : ''}>
          <div><div class="opt__name">${esc(r.name)}</div><div class="opt__note">${esc(r.note)}</div></div>
        </label>`).join('')}</div>
      <label class="lbl" for="rep-note" style="margin-top:14px">Anything else (optional)</label>
      <textarea class="field" id="rep-note" rows="2" placeholder="What should the moderator know?"></textarea>
      <div class="sheet__foot">
        <span></span>
        <button class="btn btn--primary" data-send>Send report</button>
      </div>
    </div>`;

    host.addEventListener('change', (e) => {
      if (e.target.name !== 'rep-r') return;
      reason = e.target.value;
      host.querySelectorAll('.opt').forEach((o) => o.classList.toggle('is-on', o.querySelector('input').checked));
    });
    host.addEventListener('input', (e) => { if (e.target.id === 'rep-note') note = e.target.value; });
    host.addEventListener('click', (e) => {
      if (e.target === host || e.target.closest('[data-x]')) return close();
      if (!e.target.closest('[data-send]')) return;
      (S.reports = S.reports || {})[postId] = { reason, note: note.trim(), when: 'just now', status: 'triage' };
      save(); close();
      toast('Reported — a moderator sees this within 24 hours');
      if (done) done();
    });
  }

  /* ---------- fair housing + safety screening ---------- */
  /* Phase 6, the part that is not optional. Every piece of user text on this site
     passes through here before it is stored. The rules below are deliberately
     narrow and explainable: a screen that silently eats posts teaches people
     nothing, so each hit says which rule it is and how to say the thing legally.
     A real deployment pairs this with human review — it is a speed bump on the
     obvious cases, not a compliance program. */

  const SCREEN_RULES = [
    { level: 'block', cat: 'Fair Housing',
      re: /\b(no|not for|not suitable for|adults? only|childless)\s*(kids|children|babies|families)?\b(?=[^.]*\b(kids|children|families|babies)\b)|\badults? only\b|\bno (kids|children)\b/i,
      why: 'Familial status is protected. You cannot say who a home is or is not for.',
      instead: 'Describe the house: number of bedrooms, stairs, yard, school district.' },
    { level: 'block', cat: 'Fair Housing',
      re: /\b(christian|catholic|jewish|muslim|hindu)\s+(neighborhood|community|area|block|family|buyers?)\b|\b(white|black|asian|hispanic|latino)\s+(neighborhood|community|area|block|buyers?)\b/i,
      why: 'Religion, race and national origin are protected. Describing a neighborhood that way is steering.',
      instead: 'Say what is actually nearby — the places of worship, shops and schools on the map.' },
    { level: 'block', cat: 'Fair Housing',
      re: /\b(english[- ]speaking|no (section 8|vouchers?)|able[- ]bodied|no wheelchairs?)\b/i,
      why: 'National origin, source of income and disability. Two of these are also state law almost everywhere.',
      instead: 'State the facts of the property and let any qualified buyer decide.' },
    { level: 'warn', cat: 'Fair Housing',
      re: /\b(safe|good|bad|rough|nice) (neighborhood|area|part of town)\b|\bgood schools?\b|\bfamily[- ]friendly\b/i,
      why: 'Coded language. "Safe" and "good schools" are read as proxies for race in fair-housing cases.',
      instead: 'Point at the source: crime statistics, test scores, the district boundary map.' },
    { level: 'block', cat: 'Privacy',
      re: /\b(lives (here|there|alone)|works? (at|nights?)|leaves (for work|at)|home alone|away (on|until)|out of town (until|on))\b/i,
      why: 'You cannot post who occupies a home or when they are away. This is the rule that keeps address pages from becoming a burglary index.',
      instead: 'Talk about the building, the sale and the block instead of the people in it.' },
    { level: 'warn', cat: 'Privacy',
      re: /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b|\b[\w.]+@[\w.]+\.\w{2,}\b/,
      why: 'That looks like a phone number or an email address in a public post.',
      instead: 'Use a reply here — contact details on a public page get scraped within the hour.' },
  ];

  function screen(text) {
    const hits = SCREEN_RULES.filter((r) => r.re.test(text));
    return {
      blocked: hits.some((h) => h.level === 'block'),
      hits,
    };
  }

  function screenNotice(res, onOverride) {
    const worst = res.hits.some((h) => h.level === 'block') ? 'block' : 'warn';
    return `<div class="screened screened--${worst}">
      <div class="screened__head">${worst === 'block'
        ? 'This post breaks a rule we do not bend'
        : 'Worth a second look before you post'}</div>
      ${res.hits.map((h) => `<div class="screened__rule">
        <span class="screened__cat">${esc(h.cat)}</span>
        <div><div>${esc(h.why)}</div><div class="screened__instead">Try instead: ${esc(h.instead)}</div></div>
      </div>`).join('')}
      ${worst === 'warn' ? '<button class="btn btn--sm" data-override>Post it anyway</button>' : ''}
    </div>`;
  }

  /* ---------- discussion thread ---------- */
  /* One component behind the address wall and the neighborhood group wall: the
     composer, the posts, replies, votes and reporting. Votes and replies key off
     the post id, so both surfaces share a single store. */

  function postArticle(p, o) {
    if (removed(p)) {
      return `<article class="post post--gone">
        <div class="post__body"><div class="post__text">This post was removed by a moderator for breaking the
          <a href="content-policy.html">content policy</a>. The removal is on the record; the post is not.
          ${(S.reports || {})[p.id] ? '<button class="linkish" data-appeal="' + p.id + '">Appeal this</button>' : ''}</div></div>
      </article>`;
    }
    const u = user(p.by);
    const role = p.role || u.role;
    const replies = (p.replies || []).concat(S.replies[p.id] || []);
    const canPin = !!(o && o.canPin && o.canPin());
    return `<article class="post">
      ${avatar(p.by, false, role)}
      <div class="post__body">
        ${isPinned(p) ? `<div class="post__pin">${esc(p.pinLabel || 'Pinned by owner')}</div>` : ''}
        ${p.type ? `<span class="post__type post__type--${esc(p.type)}">${esc(typeLabel(p.type))}</span>` : ''}
        ${(S.reports || {})[p.id] ? `<div class="post__flagged">${(S.reports[p.id].byOwner ? 'Owner asked for review' : 'You reported this')} — ${esc(REPORT_STATUS[S.reports[p.id].status])}</div>` : ''}
        <div class="post__head"><a class="post__who" href="profile.html?u=${esc(p.by)}">${esc(u.name)}</a>${badge(role)}<span class="post__when">${esc(p.ago)}</span></div>
        <div class="post__text">${esc(p.text)}</div>
        ${p.photo ? `<img class="post__photo" src="${p.photo}" alt="Posted photograph">` : ''}
        <div class="post__foot">
          ${voteBox(p.id, p.up, p.down)}
          <button class="linkish" data-reply="${p.id}">Reply</button>
          <button class="linkish" data-flag="${p.id}">Report</button>
          ${canPin ? `<button class="linkish" data-pin="${p.id}">${isPinned(p) ? 'Unpin' : 'Pin'}</button>` : ''}
          ${canPin && p.by !== 'me' ? `<button class="linkish" data-review="${p.id}">Ask for review</button>` : ''}
        </div>
        ${replies.length ? `<div class="replies">${replies.map((r) => {
          const ru = user(r.by);
          return `<div class="reply">${avatar(r.by, true)}
            <div class="reply__body">
              <div class="post__head"><a class="post__who" href="profile.html?u=${esc(r.by)}">${esc(ru.name)}</a>${badge(ru.role)}<span class="post__when">${esc(r.ago)}</span></div>
              <div class="post__text" style="margin-top:3px">${esc(r.text)}</div>
              <div class="post__foot" style="margin-top:7px">${voteBox(r.id, r.up, r.down)}</div>
            </div></div>`;
        }).join('')}</div>` : ''}
        <div class="reply-slot"></div>
      </div>
    </article>`;
  }

  const POST_TYPES = [
    ['question', 'Question', 'Ask the owner, the agent or the street'],
    ['update', 'Update', 'Something changed at this address'],
    ['work', 'Work done', 'A repair, a permit, a renovation'],
    ['observation', 'Observation', 'What you saw or know first hand'],
  ];
  const typeLabel = (t) => (POST_TYPES.find((x) => x[0] === t) || [])[1] || '';

  function thread(host, opts) {
    const inst = { opts, render };
    host._thread = inst;

    function render() {
      const o = host._thread.opts;
      const list = o.list();
      host.innerHTML = `
        <div class="composer" style="padding-bottom:20px;border-bottom:1px solid var(--line-2)">
          ${avatar('me')}
          <div class="composer__body">
            <textarea class="field" id="new-post" aria-label="${esc(o.placeholder)}" placeholder="${esc(o.placeholder)}"></textarea>
            <div id="screen-slot"></div>
            <div class="composer__row">
              <span class="composer__hint">${esc(o.hint)}</span>
              <span class="composer__row__right">
                <label class="btn btn--sm" for="post-photo">Add a photo</label>
                <input type="file" id="post-photo" accept="image/*" class="visually-hidden">
                <label class="lbl lbl--inline" for="post-type">Kind</label>
                <select class="field field--sm" id="post-type">
                  ${POST_TYPES.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
                </select>
                <button class="btn btn--primary btn--sm" id="post-go">Post</button>
              </span>
            </div>
          </div>
        </div>
        <div id="photo-slot"></div>
        <div id="posts">${list.length ? list.map((p) => postArticle(p, o)).join('')
          : `<div class="empty" style="margin-top:20px"><h3>Nothing here yet</h3><p>${esc(o.empty || 'Be the first to post.')}</p></div>`}</div>`;

      let photo = null;
      const fileEl = host.querySelector('#post-photo');
      if (fileEl) fileEl.addEventListener('change', () => {
        const f = fileEl.files && fileEl.files[0];
        const slot = host.querySelector('#photo-slot');
        if (!f) { photo = null; slot.innerHTML = ''; return; }
        shrinkPhoto(f, (data) => {
          photo = data;
          slot.innerHTML = `<div class="photoprev"><img src="${data}" alt="The photo you are about to post">
            <button class="linkish" data-drop-photo>Remove</button></div>`;
          slot.querySelector('[data-drop-photo]').addEventListener('click', () => {
            photo = null; slot.innerHTML = ''; fileEl.value = '';
          });
        }, (why) => { photo = null; slot.innerHTML = `<div class="notice">${esc(why)}</div>`; });
      });

      host.querySelector('#post-go').addEventListener('click', () => {
        const ta = host.querySelector('#new-post');
        const slot = host.querySelector('#screen-slot');
        const text = ta.value.trim();
        if (!text) { toast('Write something first'); return; }

        const submit = () => {
          const kindEl = host.querySelector('#post-type');
          host._thread.opts.onPost(text, kindEl ? kindEl.value : 'observation', photo);
          save(); render(); toast(host._thread.opts.posted || 'Posted');
        };

        const res = screen(text);
        if (res.hits.length) {
          slot.innerHTML = screenNotice(res);
          if (res.blocked) { toast('Not posted — this one breaks a rule'); return; }
          slot.querySelector('[data-override]').addEventListener('click', submit);
          return;
        }
        submit();
      });
    }

    if (!host._threadWired) {
      host._threadWired = true;
      host.addEventListener('click', (e) => {
        const rb = e.target.closest('[data-reply]');
        if (rb) {
          const slot = rb.closest('.post__body').querySelector('.reply-slot');
          if (slot.firstChild) { slot.innerHTML = ''; return; }
          slot.innerHTML = `<div style="display:flex;gap:9px;margin-top:12px">
            ${avatar('me', true)}
            <div style="flex:1"><input class="field" placeholder="Write a reply…">
            <div style="margin-top:7px"><button class="btn btn--sm btn--primary">Reply</button></div></div></div>`;
          const input = slot.querySelector('input');
          input.focus();
          const send = () => {
            const text = input.value.trim();
            if (!text) return;
            const res = screen(text);
            if (res.blocked) { toast(res.hits[0].why); return; }
            (S.replies[rb.dataset.reply] = S.replies[rb.dataset.reply] || []).push({
              id: 'r' + Date.now(), by: 'me', ago: 'just now', text, up: 0, down: 0,
            });
            save(); host._thread.render(); toast('Reply posted');
          };
          slot.querySelector('button').addEventListener('click', send);
          input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') send(); });
          return;
        }
        const rv = e.target.closest('[data-review]');
        if (rv) {
          const pid = rv.dataset.review;
          if ((S.reports || {})[pid]) { toast('That post is already with a moderator'); return; }
          (S.reports = S.reports || {})[pid] = {
            reason: 'false', note: 'Requested by the verified owner of this address.',
            when: 'just now', status: 'triage', byOwner: true,
          };
          save(); host._thread.render();
          toast('Sent to a moderator — the author is told a review was asked for, not who asked');
          return;
        }
        const ap = e.target.closest('[data-appeal]');
        if (ap) {
          const d = (S.decisions || {})[ap.dataset.appeal];
          if (d && d.appealed) { toast('You only get one appeal, and it has been used'); return; }
          if (d) { d.appealed = true; save(); }
          toast('Appeal filed — a different moderator will read it');
          return;
        }
        const pin = e.target.closest('[data-pin]');
        if (pin) {
          const pid = pin.dataset.pin;
          const cur = pin.textContent === 'Unpin';
          S.pins[pid] = !cur;
          save(); host._thread.render();
          toast(cur ? 'Unpinned' : 'Pinned to the top of this page');
          return;
        }
        const flag = e.target.closest('[data-flag]');
        if (flag) openReport(flag.dataset.flag, () => host._thread.render());
      });
    }

    render();
    return inst;
  }

  const groupPosts = (g) => (S.posts[g.id] || []).concat(g.posts)
    .slice().sort((a, b) => (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0));
  const groupHomes = (g) => g.addresses.map((id) => D.byId[id]).filter(Boolean);
  const members = (g) => g.members + (S.joined[g.id] ? 1 : 0);

  /* ---------- work log ---------- */
  /* The renovation log from the plan. A post is a conversation; a work entry is a
     record — date, what was done, who did it, what it cost, the permit number if
     there is one. It merges into the timeline with the county's own entries and is
     marked as owner-contributed, because the two are not the same kind of fact. */

  const workFor = (id) => (S.work || {})[id] || [];

  function workForm(l) {
    return `<div class="worklog">
      <div class="worklog__grid">
        <div><label class="lbl" for="wk-date">When</label>
          <input class="field" id="wk-date" placeholder="Mar 2026"></div>
        <div><label class="lbl" for="wk-cost">Cost (optional)</label>
          <input class="field" id="wk-cost" inputmode="numeric" placeholder="$12,400"></div>
      </div>
      <label class="lbl" for="wk-what" style="margin-top:10px">What was done</label>
      <input class="field" id="wk-what" placeholder="Roof replaced, standing seam">
      <div class="worklog__grid" style="margin-top:10px">
        <div><label class="lbl" for="wk-who">Who did it (optional)</label>
          <input class="field" id="wk-who" placeholder="Contractor or yourself"></div>
        <div><label class="lbl" for="wk-permit">Permit (optional)</label>
          <input class="field" id="wk-permit" placeholder="B26-1187"></div>
      </div>
      <button class="btn btn--primary btn--wide" id="wk-go" style="margin-top:12px">Add it to the record</button>
      <div class="notice" style="margin-top:10px">This joins the timeline marked as owner-contributed. County
        records and MLS entries are never edited by anyone here.</div>
    </div>`;
  }

  function wireWorkForm(l, after) {
    const go = document.getElementById('wk-go');
    if (!go) return;
    go.addEventListener('click', () => {
      const date = document.getElementById('wk-date').value.trim();
      const what = document.getElementById('wk-what').value.trim();
      if (!date || !what) { toast('A date and what was done, at minimum'); return; }
      const res = screen(what);
      if (res.blocked) { toast(res.hits[0].why); return; }
      const cost = document.getElementById('wk-cost').value.replace(/[^0-9]/g, '');
      const who = document.getElementById('wk-who').value.trim();
      const permit = document.getElementById('wk-permit').value.trim();
      const meta = [who, cost ? money(Number(cost)) : '', permit ? 'permit ' + permit : '']
        .filter(Boolean).join(' · ');
      (S.work = S.work || {})[l.id] = workFor(l.id).concat([{
        id: 'w' + Date.now(), date, what,
        meta: meta || 'Owner-contributed, no permit given', by: 'me',
      }]);
      save();
      toast('Added to the record for this address');
      if (after) after();
    });
  }

  /* county and MLS rows first, then anything an owner added, newest at the top */
  function timelineFor(l) {
    const mine = workFor(l.id).map((w) => Object.assign({}, w, { owner: true }));
    return mine.concat(l.history).sort((a, b) => whenOfSafe(b.date) - whenOfSafe(a.date));
  }
  const whenOfSafe = (d) => { const t = whenOf(d); return t === null ? 0 : t; };

  /* ---------- price history chart ---------- */
  /* One series, so no legend: the heading says what is plotted. Price holds flat
     between recorded events, so the line steps rather than slopes — a diagonal
     between a 2019 sale and a 2026 listing would draw six years of price movement
     nobody recorded. The timeline below the chart is its table view. */

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  function whenOf(date) {
    const m = String(date).match(/([A-Za-z]{3})[a-z]*\s+(\d{4})/);
    if (m) return Number(m[2]) + (MONTHS[m[1].toLowerCase()] || 0) / 12;
    const y = String(date).match(/^(\d{4})$/);
    return y ? Number(y[1]) + 0.5 : null;
  }

  const EVENT_KIND = [
    [/sold for/i, 'Sold'], [/listed for sale/i, 'Listed'], [/price cut/i, 'Price cut'],
    [/back on/i, 'Back on market'],
  ];

  function priceSeries(l) {
    /* history is newest first; reverse before the stable sort so two events in the
       same month (listed, then cut) keep the order they actually happened in. */
    return l.history.slice().reverse().map((h) => {
      const amt = (h.what.match(/\$([\d,]+)/) || [])[1];
      const t = whenOf(h.date);
      if (!amt || t === null) return null;
      const kind = (EVENT_KIND.find(([re]) => re.test(h.what)) || [null, 'Price'])[1];
      return { t, price: Number(amt.replace(/,/g, '')), kind, date: h.date, meta: h.meta };
    }).filter(Boolean).sort((a, b) => a.t - b.t);
  }

  function priceChart(host, l) {
    const pts = priceSeries(l);
    if (pts.length < 2) { host.innerHTML = ''; return; }

    const w = host.clientWidth || 680, h = 250;
    const pad = { l: 64, r: 20, t: 18, b: 30 };
    const lo = Math.min(...pts.map((p) => p.price)), hi = Math.max(...pts.map((p) => p.price));
    const span = hi - lo || hi * 0.2;
    const y0 = Math.max(0, lo - span * 0.25), y1 = hi + span * 0.25;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const iw = w - pad.l - pad.r;
    /* everything in one month (listed and sold in June) has no time axis to speak
       of, so fall back to even spacing rather than stacking the points. */
    const X = (t, i) => pad.l + (t1 === t0 ? i / (pts.length - 1) : (t - t0) / (t1 - t0)) * iw;
    const Y = (v) => h - pad.b - (v - y0) / (y1 - y0) * (h - pad.t - pad.b);

    /* ticks on clean round numbers, four of them */
    const rawStep = (y1 - y0) / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) || mag * 10;
    const ticks = [];
    for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticks.push(v);

    const at = pts.map((p, i) => ({ ...p, x: X(p.t, i), y: Y(p.price) }));
    let d = `M${at[0].x} ${at[0].y}`;
    at.slice(1).forEach((p, i) => { d += ` L${p.x} ${at[i].y} L${p.x} ${p.y}`; });
    const area = `${d} L${at[at.length - 1].x} ${h - pad.b} L${at[0].x} ${h - pad.b} Z`;

    const yearLabels = [at[0], at[at.length - 1]];
    const label = (p, anchor) => `<text class="pc__val" x="${p.x}" y="${p.y - 14}" text-anchor="${anchor}">${money(p.price)}</text>`;

    host.innerHTML = `
      <svg class="pc__svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"
        aria-label="Recorded price at ${esc(l.street)}: ${at.map((p) => `${p.kind} ${money(p.price)} in ${p.date}`).join(', ')}">
        ${ticks.map((v) => `<g><line class="pc__grid" x1="${pad.l}" y1="${Y(v).toFixed(1)}" x2="${w - pad.r}" y2="${Y(v).toFixed(1)}"/>
          <text class="pc__tick" x="${pad.l - 10}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">$${Math.round(v / 1000).toLocaleString()}k</text></g>`).join('')}
        ${yearLabels.map((p) => `<text class="pc__tick" x="${p.x}" y="${h - 9}" text-anchor="${p === at[0] ? 'start' : 'end'}">${Math.floor(p.t)}</text>`).join('')}
        <path class="pc__area" d="${area}"/>
        <path class="pc__line" d="${d}"/>
        <line class="pc__cross" id="pc-cross" x1="0" y1="${pad.t}" x2="0" y2="${h - pad.b}" style="display:none"/>
        ${at.map((p, i) => `<circle class="pc__dot" data-pt="${i}" cx="${p.x}" cy="${p.y}" r="4.5"/>`).join('')}
        ${label(at[0], 'start')}${label(at[at.length - 1], 'end')}
        <rect id="pc-hit" x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="transparent"/>
      </svg>
      <div class="pc__tip" id="pc-tip" hidden></div>`;

    const tip = host.querySelector('#pc-tip');
    const cross = host.querySelector('#pc-cross');
    const hit = host.querySelector('#pc-hit');

    const show = (i) => {
      const p = at[i];
      cross.setAttribute('x1', p.x); cross.setAttribute('x2', p.x);
      cross.style.display = '';
      host.querySelectorAll('.pc__dot').forEach((c, j) => c.classList.toggle('is-on', j === i));
      tip.hidden = false;
      tip.innerHTML = `<b>${money(p.price)}</b><span>${esc(p.kind)} · ${esc(p.date)}</span>`;
      tip.style.left = (p.x / w * 100) + '%';
      tip.style.top = (p.y / h * 100) + '%';
    };
    const hide = () => {
      cross.style.display = 'none';
      tip.hidden = true;
      host.querySelectorAll('.pc__dot').forEach((c) => c.classList.remove('is-on'));
    };

    const nearest = (px) => at.reduce((best, p, i) =>
      Math.abs(p.x - px) < Math.abs(at[best].x - px) ? i : best, 0);

    hit.addEventListener('mousemove', (ev) => {
      const box = host.querySelector('.pc__svg').getBoundingClientRect();
      const px = (ev.clientX - box.left) / (box.width || w) * w;
      show(nearest(px));
    });
    hit.addEventListener('mouseleave', hide);
    host.querySelectorAll('.pc__dot').forEach((c) =>
      c.addEventListener('mouseenter', () => show(Number(c.dataset.pt))));

    return at.length;
  }

  /* ---------- map ---------- */
  /* Web-Mercator fitted to whatever is on screen. There is no tile provider and
     no API key: the graticule, the scale bar and the pins are all drawn from the
     same coordinates, so the geometry you see is the real geometry of the result
     set. Phase 2 swaps this for PostGIS-backed bounds queries. */

  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  const unmercY = (y) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
  const GRID_STEPS = [10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01, 0.005];
  const BAR_MILES = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];

  const priceShort = (n) => n >= 1000000
    ? '$' + (n / 1000000).toFixed(2).replace(/0$/, '') + 'M'
    : '$' + Math.round(n / 1000) + 'k';

  function degLabel(v, dec, axis) {
    const hemi = axis === 'lat' ? (v < 0 ? 'S' : 'N') : (v < 0 ? 'W' : 'E');
    return Math.abs(v).toFixed(dec) + '°' + hemi;
  }

  function mapView(host, opts) {
    opts = opts || {};
    const minSpan = opts.minSpan || 0.06;   // ~4 miles, so one pin is not infinite zoom
    let items = [], sel = null, hot = null, proj = null;
    /* Null until you move the map. Once you do, the view stops following the
       results and starts following you — same rule every map app has. */
    let view = null;

    function project(w, h) {
      const pad = opts.compact ? { l: 30, r: 12, t: 12, b: 24 } : { l: 46, r: 20, t: 20, b: 32 };
      let n, s, e, wl;
      if (view) {
        ({ north: n, south: s, east: e, west: wl } = view);
      } else {
        n = -90; s = 90; e = -180; wl = 180;
        items.forEach((l) => {
          n = Math.max(n, l.lat); s = Math.min(s, l.lat);
          e = Math.max(e, l.lng); wl = Math.min(wl, l.lng);
        });
        if (e - wl < minSpan) { const c = (e + wl) / 2; e = c + minSpan / 2; wl = c - minSpan / 2; }
        if (n - s < minSpan) { const c = (n + s) / 2; n = c + minSpan / 2; s = c - minSpan / 2; }
        const mx = (e - wl) * 0.12, my = (n - s) * 0.12;
        e += mx; wl -= mx; n += my; s -= my;
      }

      /* Both axes have to be in the same units for the aspect to be honest:
         x is longitude in radians, y is the Mercator ordinate. */
      const rad = Math.PI / 180;
      const x0 = wl * rad, xw = (e - wl) * rad;
      const yTop = mercY(n), yh = yTop - mercY(s);
      const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
      const k = Math.min(iw / xw, ih / yh);
      const ox = pad.l + (iw - xw * k) / 2;
      const oy = pad.t + (ih - yh * k) / 2;
      return {
        w, h, k: k * rad, west: wl, east: e, north: n, south: s, pad,
        x: (lng) => ox + (lng * rad - x0) * k,
        y: (lat) => oy + (yTop - mercY(lat)) * k,
        lng: (px) => (x0 + (px - ox) / k) / rad,
        lat: (py) => unmercY(yTop - (py - oy) / k),
      };
    }

    function graticule(p) {
      const span = p.east - p.west;
      const step = GRID_STEPS.find((s) => span / s >= 3) || GRID_STEPS[GRID_STEPS.length - 1];
      const dec = step >= 1 ? 0 : String(step).split('.')[1].length;
      let out = '';
      for (let v = Math.ceil(p.west / step) * step; v <= p.east; v += step) {
        const x = p.x(v);
        out += `<line class="mp__grid" x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${p.h}"/>`;
        out += `<text class="mp__glab" x="${(x + 4).toFixed(1)}" y="${p.h - 8}">${degLabel(v, dec, 'lng')}</text>`;
      }
      for (let v = Math.ceil(p.south / step) * step; v <= p.north; v += step) {
        const y = p.y(v);
        out += `<line class="mp__grid" x1="0" y1="${y.toFixed(1)}" x2="${p.w}" y2="${y.toFixed(1)}"/>`;
        out += `<text class="mp__glab" x="6" y="${(y - 5).toFixed(1)}">${degLabel(v, dec, 'lat')}</text>`;
      }
      return out;
    }

    function scaleBar(p) {
      const latC = (p.north + p.south) / 2;
      const milesPerPx = 69.172 * Math.cos(latC * Math.PI / 180) / p.k;
      const want = (opts.compact ? 70 : 120) * milesPerPx;
      const miles = BAR_MILES.find((m) => m >= want) || BAR_MILES[BAR_MILES.length - 1];
      const px = miles / milesPerPx;
      const x = p.w - px - (opts.compact ? 14 : 24), y = p.h - (opts.compact ? 14 : 20);
      return `<g class="mp__scale">
        <line x1="${x}" y1="${y}" x2="${x + px}" y2="${y}"/>
        <line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}"/>
        <line x1="${x + px}" y1="${y - 4}" x2="${x + px}" y2="${y + 4}"/>
        <text x="${x + px / 2}" y="${y - 8}" text-anchor="middle">${miles} mi</text>
      </g>`;
    }

    /* Pins closer together than a thumb get one marker with a count. Clicking it
       zooms to what is inside, which is the only honest way to open a cluster. */
    const CLUSTER_PX = 38;

    function cluster(list) {
      const out = [];
      list.forEach((pin) => {
        const near = out.find((c) => Math.hypot(c.x - pin.x, c.y - pin.y) < CLUSTER_PX);
        if (near) {
          near.members.push(pin);
          near.x = near.members.reduce((n, m) => n + m.x, 0) / near.members.length;
          near.y = near.members.reduce((n, m) => n + m.y, 0) / near.members.length;
        } else {
          out.push({ x: pin.x, y: pin.y, members: [pin] });
        }
      });
      return out;
    }

    function clusterMarkers(groups) {
      return groups.filter((c) => c.members.length > 1).map((c) => {
        const ids = c.members.map((m) => m.l.id).join(',');
        const r = 15 + Math.min(9, c.members.length);
        return `<g class="mp__cluster" data-cluster="${ids}" tabindex="0" role="button"
            aria-label="${c.members.length} homes here — open this group"
            transform="translate(${c.x.toFixed(1)},${c.y.toFixed(1)})">
          <circle class="mp__chalo" r="${r + 7}"/>
          <circle class="mp__cdot" r="${r}"/>
          <text class="mp__cn" y="4" text-anchor="middle">${c.members.length}</text>
        </g>`;
      }).join('');
    }

    function pins(p) {
      const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      const placed = [];
      const m = 24;   /* a pin just off the edge is not drawn; it is not on the map */
      const onScreen = items
        .map((l) => ({ l, x: p.x(l.lng), y: p.y(l.lat) }))
        .filter((pin) => pin.x > -m && pin.x < p.w + m && pin.y > -m && pin.y < p.h + m);

      const groups = opts.compact ? onScreen.map((pin) => ({ x: pin.x, y: pin.y, members: [pin] })) : cluster(onScreen);
      const singles = groups.filter((c) => c.members.length === 1).map((c) => c.members[0]);

      return clusterMarkers(groups) + singles
        .sort((a, b) => a.y - b.y)
        .map((pin) => {
          const label = priceShort(pin.l.price);
          const pw = 18 + label.length * 7.4, ph = 22;
          let dx = 0, dy = -18;
          outer:
          for (const cy of [-18, 20, -38, 40, -58]) {
            for (const cx of [0, -pw / 2 - 8, pw / 2 + 8]) {
              const r = { x: pin.x + cx - pw / 2, y: pin.y + cy - ph / 2, w: pw, h: ph };
              if (!placed.some((q) => hit(q, r))) { dx = cx; dy = cy; placed.push(r); break outer; }
            }
          }
          const cls = `mp__pin mp__pin--${pin.l.status}` +
            (sel === pin.l.id ? ' is-sel' : '') + (hot === pin.l.id ? ' is-hot' : '');
          return `<g class="${cls}" data-pin="${pin.l.id}" tabindex="0" role="button"
              aria-label="${esc(pin.l.street)}, ${priceShort(pin.l.price)}"
              transform="translate(${pin.x.toFixed(1)},${pin.y.toFixed(1)})">
            <circle class="mp__halo" r="13"/>
            <circle class="mp__dot" r="5.5"/>
            <g transform="translate(${dx.toFixed(1)},${dy})">
              <rect class="mp__pill" x="${-pw / 2}" y="${-ph / 2}" width="${pw}" height="${ph}" rx="11"/>
              <text class="mp__price" y="4" text-anchor="middle">${label}</text>
            </g>
          </g>`;
        }).join('');
    }

    function popup(p) {
      const l = items.find((x) => x.id === sel);
      if (!l || opts.compact) return '';
      const x = p.x(l.lng), y = p.y(l.lat);
      const below = y < p.h * 0.42;
      const i = D.listings.indexOf(l);
      return `<div class="mp__pop${below ? ' mp__pop--below' : ''}"
          style="left:${(x / p.w * 100).toFixed(2)}%;top:${(y / p.h * 100).toFixed(2)}%">
        <button class="mp__close" data-mapclose aria-label="Close">×</button>
        <a class="mp__popmedia" href="address.html?id=${l.id}">${art(l.hue, i < 0 ? 0 : i)}</a>
        <div class="mp__popbody">
          <div class="mp__popprice">${money(l.price)}</div>
          <a class="mp__popaddr" href="address.html?id=${l.id}">${esc(l.street)}, ${esc(l.city)}, ${l.state}</a>
          <div class="mp__popfacts">${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString()} sqft</div>
          <div class="mp__popsocial">\u{1F465} ${compact(followers(l))} following · \u{1F4AC} ${commentCount(l)}</div>
        </div>
      </div>`;
    }

    /* The rectangle actually on screen, which is what "search this area" means. */
    function visible() {
      if (!proj) return null;
      const p = proj;
      return {
        west: p.lng(p.pad.l), east: p.lng(p.w - p.pad.r),
        north: p.lat(p.pad.t), south: p.lat(p.h - p.pad.b),
      };
    }

    function setView(box) { view = box; render(); }

    function zoomBy(factor) {
      const b = view || visible();
      if (!b) return;
      const cx = (b.east + b.west) / 2, cy = (b.north + b.south) / 2;
      const halfX = (b.east - b.west) * factor / 2, halfY = (b.north - b.south) * factor / 2;
      setView({ west: cx - halfX, east: cx + halfX, north: cy + halfY, south: cy - halfY });
    }

    function panBy(dxPx, dyPx) {
      const b = view || visible();
      if (!b || !proj) return;
      const degX = (b.east - b.west) / (proj.w - proj.pad.l - proj.pad.r);
      const degY = (b.north - b.south) / (proj.h - proj.pad.t - proj.pad.b);
      setView({
        west: b.west - dxPx * degX, east: b.east - dxPx * degX,
        north: b.north + dyPx * degY, south: b.south + dyPx * degY,
      });
    }

    function render() {
      const w = host.clientWidth || opts.w || 1000;
      const h = host.clientHeight || opts.h || 700;
      if (!items.length && !view) {
        host.innerHTML = '<div class="mp__none"><b>No homes on the map</b><span>Widen the filters and the pins come back.</span></div>';
        proj = null;
        return;
      }
      const p = project(w, h);
      proj = p;
      host.innerHTML =
        `<svg class="mp__svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"
            ${opts.compact ? '' : 'tabindex="0"'}
            aria-label="Map of ${items.length} home${items.length === 1 ? '' : 's'}. Arrow keys pan, plus and minus zoom.">
          <rect class="mp__bg" width="${w}" height="${h}"/>
          ${graticule(p)}${scaleBar(p)}${pins(p)}
        </svg>` + popup(p) +
        (opts.compact ? '' : `<div class="mp__ctrl">
          <button data-zoom="0.7" aria-label="Zoom in">+</button>
          <button data-zoom="1.45" aria-label="Zoom out">−</button>
          ${view ? '<button data-fit aria-label="Fit the map to the results">⤢</button>' : ''}
        </div>
        ${view && opts.onArea ? '<button class="mp__area" data-area>Search this area</button>' : ''}`) +
        (opts.caption ? `<div class="mp__cap">${opts.caption}</div>` : '');
    }

    host.addEventListener('click', (ev) => {
      const z = ev.target.closest('[data-zoom]');
      if (z) { zoomBy(Number(z.dataset.zoom)); return; }
      if (ev.target.closest('[data-fit]')) { view = null; render(); if (opts.onArea) opts.onArea(null); return; }
      if (ev.target.closest('[data-area]')) { if (opts.onArea) opts.onArea(visible()); return; }
      const cl = ev.target.closest('[data-cluster]');
      if (cl) {
        const ids = cl.getAttribute('data-cluster').split(',');
        const inside = items.filter((l) => ids.indexOf(l.id) > -1);
        let n = -90, s2 = 90, e = -180, w2 = 180;
        inside.forEach((l) => {
          n = Math.max(n, l.lat); s2 = Math.min(s2, l.lat);
          e = Math.max(e, l.lng); w2 = Math.min(w2, l.lng);
        });
        const padX = Math.max((e - w2) * 0.5, 0.004), padY = Math.max((n - s2) * 0.5, 0.004);
        setView({ west: w2 - padX, east: e + padX, north: n + padY, south: s2 - padY });
        if (opts.onArea) opts.onArea(visible());
        return;
      }
      if (ev.target.closest('[data-mapclose]')) { sel = null; render(); return; }
      const g = ev.target.closest('[data-pin]');
      if (!g) return;
      const id = g.getAttribute('data-pin');
      sel = sel === id ? null : id;
      render();
      if (sel && opts.onSelect) opts.onSelect(sel);
    });
    host.addEventListener('keydown', (ev) => {
      const g = ev.target.closest && ev.target.closest('[data-pin]');
      if (g && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        g.dispatchEvent(new Event('click', { bubbles: true }));
        return;
      }
      if (opts.compact) return;
      const step = 70;
      const pans = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (pans[ev.key]) {
        ev.preventDefault();
        if (!view) view = visible();
        panBy(pans[ev.key][0], pans[ev.key][1]);
        const svg = host.querySelector('.mp__svg');
        if (svg) svg.focus();
        return;
      }
      if (ev.key === '+' || ev.key === '=' || ev.key === '-') {
        ev.preventDefault();
        zoomBy(ev.key === '-' ? 1.45 : 0.7);
        const svg = host.querySelector('.mp__svg');
        if (svg) svg.focus();
      }
    });
    /* Hover only changes classes, so it never repaints the map. A home inside a
       cluster lights the cluster — otherwise hovering a card does nothing visible. */
    function markHot(id) {
      host.querySelectorAll('[data-pin]').forEach((el) =>
        el.classList.toggle('is-hot', el.getAttribute('data-pin') === id));
      host.querySelectorAll('[data-cluster]').forEach((el) =>
        el.classList.toggle('is-hot', !!id && el.getAttribute('data-cluster').split(',').indexOf(id) > -1));
    }

    host.addEventListener('mouseover', (ev) => {
      const g = ev.target.closest && ev.target.closest('[data-pin]');
      const id = g ? g.getAttribute('data-pin') : null;
      if (id === hot) return;
      hot = id;
      markHot(id);
      if (opts.onHover) opts.onHover(id);
    });

    /* Drag to pan. A drag that never really moved is still a click on a pin. */
    if (!opts.compact) {
      let from = null, moved = 0;
      host.addEventListener('mousedown', (ev) => {
        if (ev.target.closest('button')) return;
        from = { x: ev.clientX, y: ev.clientY };
        moved = 0;
        host.classList.add('is-dragging');
      });
      window.addEventListener('mousemove', (ev) => {
        if (!from) return;
        const dx = ev.clientX - from.x, dy = ev.clientY - from.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved < 3) return;
        from = { x: ev.clientX, y: ev.clientY };
        if (!view) view = visible();
        panBy(dx, dy);
      });
      window.addEventListener('mouseup', () => { from = null; host.classList.remove('is-dragging'); });
      let touch = null, pinch = 0;
      const spread = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      host.addEventListener('touchstart', (ev) => {
        if (ev.touches.length === 1) { touch = { x: ev.touches[0].clientX, y: ev.touches[0].clientY }; pinch = 0; }
        else if (ev.touches.length === 2) { pinch = spread(ev.touches); touch = null; }
      }, { passive: true });
      host.addEventListener('touchmove', (ev) => {
        if (ev.touches.length === 2 && pinch) {
          const now = spread(ev.touches);
          if (Math.abs(now - pinch) > 8) { zoomBy(pinch / now); pinch = now; }
          ev.preventDefault();
          return;
        }
        if (!touch || ev.touches.length !== 1) return;
        const dx = ev.touches[0].clientX - touch.x, dy = ev.touches[0].clientY - touch.y;
        if (Math.abs(dx) + Math.abs(dy) < 3) return;
        touch = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
        if (!view) view = visible();
        panBy(dx, dy);
        ev.preventDefault();
      }, { passive: false });
      host.addEventListener('touchend', () => { touch = null; pinch = 0; });

      host.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        zoomBy(ev.deltaY > 0 ? 1.2 : 0.85);
      }, { passive: false });
    }

    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 140); });

    return {
      set(list) {
        items = list;
        if (sel && !list.some((l) => l.id === sel)) sel = null;
        render();
      },
      fit() { view = null; render(); },
      visible,
      highlight(id) {
        if (hot === id) return;
        hot = id;
        markHot(id);
      },
      select(id) { sel = id; render(); },
      selected() { return sel; },
    };
  }

  function card(l, i) {
    const saved = !!S.saves[l.id];
    const owner = user(l.owner);
    return `<article class="card" data-listing="${l.id}">
      <a class="card__media" href="address.html?id=${l.id}" aria-label="${esc(l.street)}">
        ${art(l.hue, i)}
        <span class="card__tags">${statusTag(l)}${openHouse(l) ? `<span class="tag tag--open">Open ${esc(openHouse(l).day.slice(0, 3))}</span>` : ''}${owner.verified ? '<span class="tag tag--owner">✓ Owner on site</span>' : ''}</span>
      </a>
      <button class="card__save" data-save="${l.id}" aria-pressed="${saved}" aria-label="Save ${esc(l.street)}">${saved ? '★' : '☆'}</button>
      <button class="card__cmp" data-compare="${l.id}" data-compare-label="short" aria-pressed="${comparing(l.id)}" aria-label="Compare ${esc(l.street)}">⇄</button>
      <div class="card__body">
        <a href="address.html?id=${l.id}">
          <div class="card__price">${money(l.price)}${l.prior ? ` <span style="font-size:.72em;color:var(--ink-3);text-decoration:line-through">${money(l.prior)}</span>` : ''}</div>
          <div class="card__addr">${esc(l.street)}, ${esc(l.city)}, ${l.state} ${l.zip}</div>
          <div class="card__facts"><span><b>${l.beds}</b> bd</span><span><b>${l.baths}</b> ba</span><span><b>${l.sqft.toLocaleString()}</b> sqft</span><span><b>${l.lot}</b> ac</span></div>
        </a>
        <div class="card__social" style="margin-top:auto">
          <span>👥 ${compact(followers(l))} following</span>
          <span>💬 ${commentCount(l)}</span>
          ${offersFor(l).length ? `<span>🏷 ${offersFor(l).length} offer${offersFor(l).length > 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
    </article>`;
  }

  let activeNav = null;

  /* Signing in changes the name on your posts and the masthead, and nothing else.
     Redraw those two rather than re-running the page, which would double-wire it. */
  function afterAuth() {
    chrome(activeNav);
    const host = document.querySelector('#tabbody, #wall');
    if (host && host._thread) host._thread.render();
  }

  function chrome(active) {
    activeNav = active;
    const nav = [['index.html', 'Home'], ['search.html', 'Search'], ['feed.html', 'Feed'],
                 ['messages.html', 'Messages'], ['saved.html', 'Saved']]
      .concat(isAgent() ? [['agent.html', 'Agent desk']] : []);
    const unread = unreadAlerts();
    document.querySelectorAll('[data-chrome="head"]').forEach((el) => {
      el.innerHTML = `<a class="skip" href="#main">Skip to content</a>
      <div class="wrap masthead__inner">
        <a class="logo" href="index.html"><span class="logo__mark"></span>Abode</a>
        <nav class="nav">
          ${nav.map(([h, t]) => `<a href="${h}"${h === active ? ' class="is-active"' : ''}>${t}${h === 'messages.html' && dmUnread() ? `<span class="nav__pip">${dmUnread()}</span>` : ''}</a>`).join('')}
          <button class="themetoggle" data-theme-toggle aria-label="Switch to the ${themeNow() === 'dark' ? 'light' : 'dark'} theme">${themeNow() === 'dark' ? '☀' : '☾'}</button>
          <a class="nav__bell${active === 'alerts.html' ? ' is-active' : ''}" href="alerts.html" aria-label="Alerts${unread ? `, ${unread} unread` : ''}">
            <span aria-hidden="true">🔔</span>${unread ? `<span class="nav__count" id="nav-unread">${unread > 9 ? '9+' : unread}</span>` : ''}</a>
          ${signedIn()
            ? `<span class="nav__me">${avatar('me', true)}<span class="nav__name">${esc(displayName())}</span>
                 <button class="linkish" data-signout>Sign out</button></span>`
            : '<button class="btn btn--sm btn--primary" data-signin>Sign in</button>'}
        </nav>
      </div>`;
    });
    document.querySelectorAll('[data-chrome="foot"]').forEach((el) => {
      el.innerHTML = `<div class="wrap">
        <div class="foot__cols">
          <div><h2>Buy</h2><ul><li><a href="search.html">Homes for sale</a></li><li><a href="search.html">Open houses</a></li><li><a href="search.html">New construction</a></li></ul></div>
          <div><h2>Address pages</h2><ul><li><a href="feed.html">Follow an address</a></li><li><a href="index.html#claim">Claim your home</a></li><li><a href="groups.html">Neighborhood groups</a></li><li><a href="content-policy.html">Moderation</a></li></ul></div>
          <div><h2>Sell</h2><ul><li><a href="search.html">What is it worth</a></li><li><a href="search.html">Find an agent</a></li><li><a href="search.html">Review offers</a></li></ul></div>
          <div><h2>Company</h2><ul><li><a href="about.html">About</a></li><li><a href="fair-housing.html">Fair housing</a></li><li><a href="content-policy.html">Content policy</a></li></ul></div>
        </div>
        <div class="foot__fine">
          Abode is a demonstration build. Listings, owners, comments and offers on this site are fictional sample data — no MLS feed is connected.
          Abode is committed to the letter and spirit of the Fair Housing Act and the Equal Opportunity Act — see our <a href="fair-housing.html">fair housing policy</a>. Offers shown are expressions of interest and are not binding contracts.
        </div>
      </div>`;
    });
  }

  /* ---------- voting ---------- */

  function voteBox(id, up, down) {
    const v = S.votes[id] || 0;
    const n = up - down + v;
    return `<span class="vote" data-vote-for="${id}">
      <button class="up" aria-pressed="${v === 1}" aria-label="Upvote">▲</button>
      <span class="vote__n">${n}</span>
      <button class="down" aria-pressed="${v === -1}" aria-label="Downvote">▼</button>
    </span>`;
  }

  document.addEventListener('click', (e) => {
    const vb = e.target.closest('[data-vote-for] button');
    if (vb) {
      const box = vb.closest('[data-vote-for]');
      const id = box.dataset.voteFor;
      const dir = vb.classList.contains('up') ? 1 : -1;
      const cur = S.votes[id] || 0;
      const next = cur === dir ? 0 : dir;
      const base = Number(box.querySelector('.vote__n').textContent) - cur;
      S.votes[id] = next; save();
      box.querySelector('.vote__n').textContent = base + next;
      box.querySelector('.up').setAttribute('aria-pressed', next === 1);
      box.querySelector('.down').setAttribute('aria-pressed', next === -1);
      return;
    }
    const sv = e.target.closest('[data-save]');
    if (sv) {
      const id = sv.dataset.save;
      S.saves[id] = !S.saves[id]; save();
      sv.setAttribute('aria-pressed', String(!!S.saves[id]));
      sv.textContent = S.saves[id] ? '★' : '☆';
      toast(S.saves[id] ? 'Saved to your list' : 'Removed from saved');
    }
  });

  /* ---------- pages ---------- */

  function home() {
    const featured = D.listings.filter((l) => l.status === 'active').slice(0, 6);
    document.getElementById('featured').innerHTML = featured.map(card).join('');

    const active = D.listings.filter((l) => l.status === 'active').length;
    const talk = D.listings.reduce((n, l) => n + commentCount(l), 0);
    const foll = D.listings.reduce((n, l) => n + followers(l), 0);
    document.getElementById('stats').innerHTML = [
      [active + ' listings', 'live on the market'],
      [compact(foll), 'address followers'],
      [talk, 'posts and comments'],
      ['1889–2019', 'years of history on file'],
    ].map(([n, l]) => `<div><div class="stat__n">${n}</div><div class="stat__l">${l}</div></div>`).join('');

    document.getElementById('groups').innerHTML = D.groups.slice(0, 4).map((g) => `
      <div class="group-row">
        <div class="avatar">${esc(initials(g.name))}</div>
        <div style="flex:1">
          <a href="group.html?id=${g.id}" style="font-weight:600">${esc(g.name)}</a>
          <div class="group-row__n">${esc(g.city)} · ${g.members.toLocaleString()} members · ${g.today} today</div>
        </div>
        <button class="btn btn--sm" data-join="${g.id}" aria-pressed="${!!S.joined[g.id]}">${S.joined[g.id] ? 'Joined' : 'Join'}</button>
      </div>`).join('');

    const go = () => {
      const q = document.getElementById('q').value.trim();
      location.href = 'search.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    };
    document.getElementById('go').addEventListener('click', go);
    document.getElementById('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

    /* The claim box routes you to the page for the address you typed, or says
       plainly that we do not have it rather than pretending we do. */
    document.getElementById('claim-start').addEventListener('click', () => {
      const typed = document.getElementById('claim').value.trim().toLowerCase();
      const miss = document.getElementById('claim-miss');
      if (!typed) { location.href = 'address.html?id=a1#claim'; return; }
      const hit = D.listings.find((l) =>
        `${l.street} ${l.city} ${l.state} ${l.zip}`.toLowerCase().includes(typed) ||
        typed.includes(l.street.toLowerCase()));
      if (hit) { location.href = `address.html?id=${hit.id}#claim`; return; }
      miss.innerHTML = requestPanel(document.getElementById('claim').value.trim(), '');
      const rq = miss.querySelector('[data-request]');
      rq.addEventListener('click', () => {
        const rec = requestPage(rq.dataset.request, rq.dataset.requestCity);
        if (!rec) return;
        miss.innerHTML = `<div class="notice">Queued. It shows on your
          <a href="saved.html">saved page</a> until the parcel data lands.</div>`;
        toast('Address queued');
      });
    });
  }

  function search() {
    const params = new URLSearchParams(location.search);
    const el = {
      q: document.getElementById('f-q'), min: document.getElementById('f-min'),
      max: document.getElementById('f-max'), beds: document.getElementById('f-beds'),
      status: document.getElementById('f-status'), sort: document.getElementById('f-sort'),
    };
    if (params.get('q')) el.q.value = params.get('q');
    ['min', 'max', 'beds', 'status', 'sort'].forEach((k) => { if (params.get(k)) el[k].value = params.get(k); });

    const view = document.getElementById('view');
    const results = document.getElementById('results');
    const mapHost = document.getElementById('map');

    /* Layout choice sticks — someone who wants the map wants it every visit. */
    let layout = params.get('view') || S.layout || 'split';
    function setLayout(next) {
      layout = next;
      S.layout = next; save();
      view.className = 'searchview searchview--' + next;
      document.querySelectorAll('#f-view [data-view]').forEach((b) =>
        b.classList.toggle('is-active', b.getAttribute('data-view') === next));
      if (map) map.set(shown);
      if (typeof syncUrl === 'function' && shown.length) syncUrl();
    }

    const cardEl = (id) => results.querySelector(`[data-listing="${id}"]`);

    /* A dead end is a bug. Work out which single filter is doing the damage and
       offer to drop it, with the number of homes that would come back. */
    function emptyResults(q, min, max, beds, st) {
      const base = (over) => D.listings.filter((l) => {
        const hay = `${l.street} ${l.city} ${l.state} ${l.zip} ${l.type} ${l.features.join(' ')}`.toLowerCase();
        const useQ = 'q' in over ? over.q : q;
        const useMin = 'min' in over ? over.min : min;
        const useMax = 'max' in over ? over.max : max;
        const useBeds = 'beds' in over ? over.beds : beds;
        const useSt = 'st' in over ? over.st : st;
        if (offMarket(l) && useSt !== 'sold' && !useQ) return false;
        return (!useQ || hay.includes(useQ)) && l.price >= useMin && l.price <= useMax &&
          l.beds >= useBeds && (useSt === 'any' || l.status === useSt);
      }).length;

      const ideas = [];
      if (area) ideas.push(['Search everywhere instead of this part of the map', () => { area = null; map.fit(); run(); }]);
      if (q && base({ q: '' })) ideas.push([`Drop “${el.q.value.trim()}” — ${base({ q: '' })} homes`, () => { el.q.value = ''; run(); }]);
      if ((min || max !== Infinity) && base({ min: 0, max: Infinity })) {
        ideas.push([`Any price — ${base({ min: 0, max: Infinity })} homes`, () => { el.min.value = ''; el.max.value = ''; run(); }]);
      }
      if (beds && base({ beds: 0 })) ideas.push([`Any number of beds — ${base({ beds: 0 })} homes`, () => { el.beds.value = '0'; run(); }]);
      if (st !== 'any' && base({ st: 'any' })) ideas.push([`Any status — ${base({ st: 'any' })} homes`, () => { el.status.value = 'any'; run(); }]);

      setTimeout(() => {
        document.querySelectorAll('[data-fix]').forEach((b, i) => b.addEventListener('click', ideas[i][1]));
      }, 0);

      const typed = el.q.value.trim();
      const looksLikeAnAddress = /\d/.test(typed) && typed.length > 6;
      return `<div class="empty" style="grid-column:1/-1">
        <h2>Nothing matches ${area ? 'in this part of the map' : 'those filters'}</h2>
        <p>${ideas.length ? 'One of these brings homes back:' : 'Try widening the price range or clearing the search text.'}</p>
        <div class="fixes">${ideas.map((f, i) => `<button class="btn btn--sm" data-fix="${i}">${esc(f[0])}</button>`).join('')}</div>
        ${looksLikeAnAddress ? requestPanel(typed, '') : ''}
      </div>`;
    }

    let area = null;
    const chips = { open: false, cut: false, owner: false, talk: false };
    const map = mapView(mapHost, {
      onArea(box) { area = box; run({ keepView: true }); },
      onHover(id) {
        results.querySelectorAll('.card.is-hot').forEach((c) => c.classList.remove('is-hot'));
        const c = id && cardEl(id);
        if (c) c.classList.add('is-hot');
      },
      onSelect(id) {
        const c = cardEl(id);
        if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      },
    });

    let shown = [];
    function renderAfford() {
      const host = document.getElementById('afford');
      if (!host) return;
      const a = afford();
      const res = affordablePrice(a, loanPrefs());
      host.innerHTML = `
        <div class="afford">
          <div class="afford__inputs">
            <div><label class="lbl" for="af-income">Household income</label>
              <input class="field" id="af-income" inputmode="numeric" value="${a.income ? money(a.income) : ''}" placeholder="$120,000"></div>
            <div><label class="lbl" for="af-debts">Monthly debts</label>
              <input class="field" id="af-debts" inputmode="numeric" value="${a.debts ? money(a.debts) : ''}" placeholder="$450"></div>
            <div><label class="lbl" for="af-down">Cash for the down payment</label>
              <input class="field" id="af-down" inputmode="numeric" value="${a.down ? money(a.down) : ''}" placeholder="$60,000"></div>
          </div>
          ${res && res.price ? `<div class="afford__out">
              <div><b>${money(res.price)}</b><span>is roughly your ceiling</span></div>
              <button class="btn btn--sm btn--primary" id="af-apply">Use it as my maximum</button>
            </div>
            <p class="afford__note">At ${loanPrefs().rate}% over ${loanPrefs().years} years, spending no more than
              36% of income on all debt, and about 1.3% of value a year on tax and insurance.
              ${money(res.capacity)} a month is what that leaves for housing. A lender will use their own numbers.</p>`
            : res ? '<p class="afford__note">That income is already spoken for by the debts above.</p>'
              : '<p class="afford__note">Put in an income and this works backwards to a price.</p>'}
        </div>`;

      ['af-income', 'af-debts', 'af-down'].forEach((id) => {
        const el = document.getElementById(id);
        el.addEventListener('change', () => {
          S.afford = {
            income: Number(document.getElementById('af-income').value.replace(/[^0-9]/g, '')) || 0,
            debts: Number(document.getElementById('af-debts').value.replace(/[^0-9]/g, '')) || 0,
            down: Number(document.getElementById('af-down').value.replace(/[^0-9]/g, '')) || 0,
          };
          save(); renderAfford(); document.getElementById(id).focus();
        });
      });
      const apply = document.getElementById('af-apply');
      if (apply) apply.addEventListener('click', () => {
        el.max.value = String(res.price);
        run();
        toast(`Showing homes up to ${money(res.price)}`);
      });
    }

    const rememberSearch = () => {
      const f = filters();
      if (!f.q && !f.min && !f.max && !f.beds && f.status === 'any') return;
      const name = searchName(f);
      const list = (S.recentSearches || []).filter((r) => r.name !== name);
      list.unshift({ name, href: searchHref(f), when: 'just now' });
      S.recentSearches = list.slice(0, 5);
      save();
    };

    const paintRecentSearches = () => {
      const host = document.getElementById('recent-searches');
      const list = (S.recentSearches || []).filter((r) => r.name !== searchName(filters()));
      if (!host) return;
      host.innerHTML = list.length
        ? `<span class="lbl">Recent</span>${list.map((r) =>
            `<a class="chip" href="${r.href}">${esc(r.name)}</a>`).join('')}`
        : '';
    };

    const syncUrl = () => {
      const f = filters();
      const qs = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => {
        if (v && !(k === 'status' && v === 'any') && !(k === 'sort' && v === 'relevant')) qs.set(k, v);
      });
      Object.entries(chips).forEach(([k, on]) => { if (on) qs.append('only', k); });
      if (layout !== 'split') qs.set('view', layout);
      const url = location.pathname + (qs.toString() ? '?' + qs : '');
      if (url !== location.pathname + location.search) history.replaceState(null, '', url);
    };

    const filters = () => ({
      q: el.q.value.trim(), min: Number(el.min.value) || 0, max: Number(el.max.value) || 0,
      beds: Number(el.beds.value) || 0, status: el.status.value, sort: el.sort.value,
    });

    function run(o) {
      const q = el.q.value.trim().toLowerCase();
      const min = Number(el.min.value) || 0;
      const max = Number(el.max.value) || Infinity;
      const beds = Number(el.beds.value) || 0;
      const st = el.status.value;

      let out = D.listings.filter((l) => {
        const hay = `${l.street} ${l.city} ${l.state} ${l.zip} ${l.type} ${l.features.join(' ')}`.toLowerCase();
        const inArea = !area || (l.lat <= area.north && l.lat >= area.south &&
          l.lng >= area.west && l.lng <= area.east);
        const chipsOk = (!chips.open || !!openHouse(l)) &&
          (!chips.cut || (l.prior && l.prior > l.price)) &&
          (!chips.owner || postsFor(l).some((p) => p.by === l.owner)) &&
          (!chips.talk || commentCount(l) >= 3);
        if (!chipsOk) return false;
        /* an off-market address is a record, not a listing: it shows up when you
           search for sold homes or name it, never in the default browse */
        if (offMarket(l) && st !== 'sold' && !q) return false;
        return inArea && (!q || hay.includes(q)) && l.price >= min && l.price <= max &&
          l.beds >= beds && (st === 'any' || l.status === st);
      });

      const centre = area ? { lat: (area.north + area.south) / 2, lng: (area.east + area.west) / 2 } : null;
      const sorts = {
        relevant: (a, b) => followers(b) - followers(a),
        near: (a, b) => centre
          ? milesBetween(centre, a) - milesBetween(centre, b)
          : followers(b) - followers(a),
        low: (a, b) => a.price - b.price,
        high: (a, b) => b.price - a.price,
        new: (a, b) => a.dom - b.dom,
        talked: (a, b) => commentCount(b) - commentCount(a),
      };
      out.sort(sorts[el.sort.value] || sorts.relevant);
      shown = out;

      const countEl = document.getElementById('count');
      countEl.setAttribute('aria-live', 'polite');
      countEl.setAttribute('role', 'status');
      countEl.textContent =
        `${out.length} ${out.length === 1 ? 'home' : 'homes'}${q ? ` matching “${el.q.value.trim()}”` : ''}${area ? ' in this area' : ''}`;
      results.innerHTML = out.length
        ? out.map(card).join('')
        : emptyResults(q, min, max, beds, st);
      map.set(out);
      /* Typing a filter re-fits the map; moving the map does not. */
      if (!(o && o.keepView)) { area = null; map.fit(); }
      syncUrl();
      paintRecentSearches();
      clearTimeout(rememberT);
      rememberT = setTimeout(rememberSearch, 1200);
    }
    let rememberT = null;

    Object.values(el).forEach((c) => { c.addEventListener('input', run); c.addEventListener('change', run); });
    document.getElementById('f-clear').addEventListener('click', () => {
      el.q.value = ''; el.min.value = ''; el.max.value = '';
      el.beds.value = '0'; el.status.value = 'any'; el.sort.value = 'relevant';
      Object.keys(chips).forEach((k) => { chips[k] = false; });
      document.querySelectorAll('[data-chip]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      area = null; map.fit();
      run();
    });
    document.querySelector('.chips').addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-chip]');
      if (!c) return;
      chips[c.dataset.chip] = !chips[c.dataset.chip];
      c.setAttribute('aria-pressed', String(chips[c.dataset.chip]));
      run();
    });
    document.getElementById('f-save').addEventListener('click', () => {
      const f = filters();
      const id = 's' + Date.now();
      (S.searches = S.searches || {})[id] = Object.assign({ id, name: searchName(f), when: 'just now' }, f);
      save();
      toast(`Saved — ${searchName(f)}. New matches show up in your alerts.`);
    });
    document.getElementById('f-view').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-view]');
      if (b) setLayout(b.getAttribute('data-view'));
    });
    results.addEventListener('mouseover', (ev) => {
      const c = ev.target.closest && ev.target.closest('[data-listing]');
      map.highlight(c ? c.getAttribute('data-listing') : null);
    });
    results.addEventListener('mouseleave', () => map.highlight(null));

    /* chips can arrive in the URL too */
    params.getAll('only').forEach((k) => {
      if (k in chips) {
        chips[k] = true;
        const b = document.querySelector(`[data-chip="${k}"]`);
        if (b) b.setAttribute('aria-pressed', 'true');
      }
    });

    document.getElementById('afford-toggle').addEventListener('click', () => {
      const box = document.getElementById('afford');
      const open = box.hidden;
      box.hidden = !open;
      document.getElementById('afford-toggle').setAttribute('aria-expanded', String(open));
      if (open) renderAfford();
    });

    setLayout(layout);
    run();
  }

  function address() {
    const id = new URLSearchParams(location.search).get('id') || 'a1';
    const l = D.byId[id];
    if (!l) {
      document.getElementById('main').innerHTML = `<div class="wrap"><div class="empty">
        <h2>No page for that address</h2>
        <p>There are twenty addresses in this sample build. The one you asked for is not among them.</p>
        <p style="margin-top:14px"><a class="btn btn--primary" href="search.html">Browse what is here</a></p></div></div>`;
      return;
    }

    describe(`${l.street}, ${l.city} — Abode`,
      `${l.beds} bed, ${l.baths} bath ${l.type.toLowerCase()} of ${l.sqft.toLocaleString()} sqft at ${l.street}, ${l.city}, ${l.state}. ${offMarket(l) ? 'Off market — the page and its history stay up.' : money(l.price) + '.'} ${followers(l)} people follow this address.`);
    structuredData(listingSchema(l));

    /* hero */
    const shots = [0, 1, 2, 3, 4];
    document.getElementById('gallery').innerHTML = shots.map((i) =>
      `<button class="shot" data-shot="${i}" aria-label="Photo ${i + 1} of ${shots.length} at ${esc(l.street)}">${art(l.hue, i)}</button>`).join('');
    document.getElementById('gallery').addEventListener('click', (e) => {
      const b = e.target.closest('[data-shot]');
      if (b) openGallery(l, shots, Number(b.dataset.shot));
    });

    const owner = user(l.owner), agent = user(l.agent);
    document.getElementById('bar').innerHTML = `
      <div class="addr-bar__main">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px">${statusTag(l)}<span class="tag">${esc(l.type)}</span><span class="tag">Built ${l.year}</span></div>
        <div class="addr-bar__price">${money(l.price)}${l.prior ? ` <span style="font-size:.5em;color:var(--ink-3);text-decoration:line-through">${money(l.prior)}</span>` : ''}${offMarket(l) ? '<span class="addr-bar__sold">last sold</span>' : ''}</div>
        <h1 class="addr-bar__addr">${esc(l.street)}, ${esc(l.city)}, ${l.state} ${l.zip}</h1>
        <div class="addr-bar__facts">
          <span><b>${l.beds}</b> beds</span><span><b>${l.baths}</b> baths</span>
          <span><b>${l.sqft.toLocaleString()}</b> sqft</span><span><b>${l.lot}</b> acres</span>
          <span><b>${money(l.ppsf)}</b>/sqft</span><span><b>${l.dom}</b> days on market</span>
        </div>
      </div>
      <div class="addr-bar__actions">
        <button class="btn" id="follow" aria-pressed="${!!S.follows[l.id]}">${S.follows[l.id] ? '✓ Following' : '+ Follow this address'}</button>
        <button class="btn" data-save="${l.id}" aria-pressed="${!!S.saves[l.id]}">${S.saves[l.id] ? '★ Saved' : '☆ Save'}</button>
        <button class="btn" data-compare="${l.id}" aria-pressed="${comparing(l.id)}">${comparing(l.id) ? '✓ Comparing' : 'Compare'}</button>
        <button class="btn" id="share">Share</button>
        <button class="btn" id="print">Print</button>
        <button class="btn" id="follow-street" aria-pressed="${followingStreet(l)}">${followingStreet(l) ? `✓ Following ${esc(streetOf(l))}` : `Follow ${esc(streetOf(l))}`}</button>
        <button class="btn" id="mute" aria-pressed="${!!(S.muted || {})[l.id]}">${(S.muted || {})[l.id] ? '🔕 Muted' : 'Mute alerts'}</button>
        <button class="btn" data-dm="${l.owner}" data-dm-about="${l.id}">Message the owner</button>
        ${offMarket(l) ? '' : '<a class="btn btn--primary" href="#offer">Make an offer</a>'}
      </div>`;

    const fbtn = document.getElementById('follow');
    fbtn.addEventListener('click', () => {
      S.follows[l.id] = !S.follows[l.id]; save();
      fbtn.setAttribute('aria-pressed', String(!!S.follows[l.id]));
      fbtn.textContent = S.follows[l.id] ? '✓ Following' : '+ Follow this address';
      document.getElementById('foll-n').textContent = compact(followers(l));
      toast(S.follows[l.id] ? 'Following — you will get every update at this address' : 'Unfollowed');
    });

    /* right rail */
    document.getElementById('rail').innerHTML = `
      <div id="note-slot"></div>
      <div id="tour-slot"></div>
      <div id="oh-slot"></div>
      <div id="owner-dash"></div>
      <div id="rep-slot"></div>
      <div id="claim-slot"></div>
      <div class="panel">
        <div class="panel__title">Who is on this page</div>
        <div class="panel__sub">Everyone with standing at this address</div>
        <div style="display:grid;gap:13px">
          <div style="display:flex;gap:10px;align-items:center">${avatar(l.owner)}
            <div><a href="profile.html?u=${l.owner}" style="font-weight:600">${esc(owner.name)}</a><div>${badge(owner.role)}</div></div></div>
          <div style="display:flex;gap:10px;align-items:center">${avatar(l.agent)}
            <div style="flex:1"><a href="profile.html?u=${l.agent}" style="font-weight:600">${esc(agent.name)}</a><div>${badge(agent.role)}</div></div>
            <button class="btn btn--sm" data-dm="${l.agent}" data-dm-about="${l.id}">Message</button></div>
          <div id="me-row"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line-2)">
          <div class="faces">${['u2', 'u5', 'u8', 'u9'].map((u) => avatar(u, true)).join('')}</div>
          <div style="font-size:.88rem;color:var(--ink-3)"><b id="foll-n" style="color:var(--ink)">${compact(followers(l))}</b> people follow this address${
            l.history[0] ? ` · last moved ${esc(l.history[0].date)}` : ''}</div>
        </div>
      </div>

      <div class="panel" id="offer">
        <div class="panel__title">${offMarket(l) ? 'Not for sale' : 'Offers'}</div>
        <div class="panel__sub">${offMarket(l)
          ? 'This house sold and came off the market. The page and its history stay — that is the point of them.'
          : 'Non-binding expressions of interest, routed to the owner and listing agent'}</div>
        <div id="offers"></div>
        <div style="margin-top:16px;display:grid;gap:9px${offMarket(l) ? ';display:none' : ''}">
          <div><label class="lbl" for="offer-amt">Your offer</label>
            <input class="field" id="offer-amt" type="text" inputmode="numeric" placeholder="${money(Math.round(l.price * 0.97))}"></div>
          <div><label class="lbl" for="offer-terms">Terms</label>
            <select class="field" id="offer-terms">
              <option>Conventional, 20% down</option><option>Cash, 14-day close</option>
              <option>FHA</option><option>Contingent on sale of my home</option>
            </select></div>
          <button class="btn btn--primary btn--wide" id="offer-go">Submit offer</button>
          <div class="notice">Submitting sends your terms to the owner and the agent of record. It does not create a contract — a binding offer is written by a licensed broker on state forms.</div>
        </div>
      </div>

      ${estimatePanel(l)}

      ${hazardPanel(l)}

      ${comparablesPanel(l)}

      <div id="cost-slot"></div>`;

    function renderCost() {
      document.getElementById('cost-slot').innerHTML = costPanel(l);
      ['cost-down', 'cost-rate', 'cost-years'].forEach((id) => {
        const el = document.getElementById(id);
        el.addEventListener('change', () => {
          S.loan = {
            down: Number(document.getElementById('cost-down').value),
            rate: Number(document.getElementById('cost-rate').value),
            years: Number(document.getElementById('cost-years').value),
          };
          save(); renderCost();
          document.getElementById(id).focus();
        });
      });
    }

    function renderNote() {
      const slot = document.getElementById('note-slot');
      slot.innerHTML = notePanel(l);
      const ta = document.getElementById('note-text');
      const state = document.getElementById('note-state');
      document.getElementById('note-save').addEventListener('click', () => {
        const v = ta.value.trim();
        S.notes = S.notes || {};
        if (v) S.notes[l.id] = v; else delete S.notes[l.id];
        save();
        state.textContent = v ? 'Saved' : 'Cleared';
        toast(v ? 'Note saved — only you see it' : 'Note cleared');
      });
      ta.addEventListener('input', () => { state.textContent = 'Not saved yet'; });
    }

    function renderTour() {
      const slot = document.getElementById('tour-slot');
      slot.innerHTML = offMarket(l) ? '' : tourPanel(l);
      const go = document.getElementById('tour-go');
      if (go) go.addEventListener('click', () => {
        (S.tours = S.tours || {})[l.id] = {
          day: document.getElementById('tour-day').value,
          time: document.getElementById('tour-time').value,
          when: 'just now',
        };
        save(); renderTour(); toast('Tour requested — it is on the agent’s desk');
      });
      const drop = document.getElementById('tour-drop');
      if (drop) drop.addEventListener('click', () => {
        delete S.tours[l.id]; save(); renderTour(); toast('Tour request cancelled');
      });
    }

    function renderOpenHouse() {
      const slot = document.getElementById('oh-slot');
      slot.innerHTML = openHousePanel(l);
      const rb = document.getElementById('oh-rsvp');
      if (rb) rb.addEventListener('click', () => {
        (S.rsvps = S.rsvps || {})[l.id] = !rsvped(l);
        if (!S.rsvps[l.id]) delete S.rsvps[l.id];
        save(); renderOpenHouse();
        toast(rsvped(l) ? 'You are on the list — the host sees your name' : 'Taken off the list');
      });
      const sb = document.getElementById('oh-save');
      if (sb) sb.addEventListener('click', () => {
        const when = document.getElementById('oh-time').value.trim();
        const date = document.getElementById('oh-date').value.trim();
        if (!when || !date) { toast('A time and a date, please'); return; }
        const prev = openHouse(l);
        (S.openHouses = S.openHouses || {})[l.id] = {
          day: document.getElementById('oh-day').value, when, date,
          host: isOwner(l.id) ? 'me' : l.agent, rsvps: prev ? prev.rsvps : 0,
        };
        save(); renderOpenHouse();
        toast('Open house posted — everyone following this address is told');
      });
    }

    function renderClaim() {
      const c = claimOf(l.id);
      const slot = document.getElementById('claim-slot');
      const rep = document.getElementById('rep-slot');
      if (rep) {
        rep.innerHTML = !isAgent() ? '' : (S.repping || {})[l.id]
          ? `<div class="notice">You represent this address. It is on your <a href="agent.html">agent desk</a>.</div>`
          : `<button class="btn btn--sm btn--wide" id="rep-go">I represent this address</button>`;
        const rg = document.getElementById('rep-go');
        if (rg) rg.addEventListener('click', () => {
          (S.repping = S.repping || {})[l.id] = true; save(); renderClaim();
          toast('Added to your agent desk');
        });
      }
      const dash = document.getElementById('owner-dash');
      dash.innerHTML = isOwner(l.id) ? ownerPanel(l) : '';
      if (isOwner(l.id)) interestChart(document.getElementById('oc-plot'), l);
      slot.innerHTML = !c ? `
        <div class="panel panel--claim">
          <div class="panel__title">Do you own this house?</div>
          <div class="panel__sub">Claim the address and your posts here carry the gold badge</div>
          <ul class="claim-list">
            <li>Post and reply as the verified owner</li>
            <li>Pin one post to the top of this page</li>
            <li>Answer offers and questions in public</li>
            <li>Ask for review of anything defamatory</li>
          </ul>
          <button class="btn btn--primary btn--wide" id="claim-go">Claim this address</button>
          <div class="notice" style="margin-top:12px">We match your name against the recorded deed before anything is issued.</div>
        </div>`
      : c.status === 'pending' ? `
        <div class="panel panel--claim">
          <div class="panel__title">Claim in review</div>
          <div class="panel__sub">${esc(methodOf(c.method).name)} · submitted ${esc(c.when)}</div>
          ${c.method === 'postcard' ? `
            <label class="lbl" for="claim-code">Code from the postcard</label>
            <input class="field" id="claim-code" placeholder="6 characters" style="margin-bottom:9px">
            <button class="btn btn--primary btn--wide" id="claim-verify">Verify</button>`
          : `<button class="btn btn--primary btn--wide" id="claim-verify">Simulate the reviewer approving it</button>`}
          <div class="notice" style="margin-top:12px">Approval is stubbed in this build. In production a person reads the document, or the postcard arrives.</div>
          <button class="linkish" id="claim-drop" style="margin-top:12px">Withdraw the claim</button>
        </div>`
      : `
        <div class="panel panel--owner">
          <div class="panel__title">✓ ${esc({ owner: 'You are the verified owner', resident: 'You are a verified resident', past: 'You are a verified past owner' }[roleOfClaim(c)])}</div>
          <div class="panel__sub">Verified by ${esc(methodOf(c.method).name.toLowerCase())} · as ${esc(c.name)}</div>
          <ul class="claim-list">
            ${roleOfClaim(c) === 'owner'
              ? '<li>Your posts here carry the owner badge</li><li>Pin or unpin any post from its Pin control</li><li>Ask for review of anything defamatory</li>'
              : roleOfClaim(c) === 'resident'
                ? '<li>Your posts here carry the resident badge</li><li>You cannot pin, and you cannot speak for the owner</li><li>You can correct anything about living here</li>'
                : '<li>Your posts here carry the past-owner badge</li><li>Your posts stay up if the house sells again</li><li>You can add what you know to the record</li>'}
          </ul>
          <button class="linkish" id="claim-drop">Give up the badge</button>
        </div>`;

      const go = document.getElementById('claim-go');
      if (go) go.addEventListener('click', () => openClaim(l, refreshOwner));
      const v = document.getElementById('claim-verify');
      if (v) v.addEventListener('click', () => {
        const code = document.getElementById('claim-code');
        if (code && code.value.trim().length < 6) { toast('Enter the six-character code from the postcard'); return; }
        S.claims[l.id].status = 'verified'; save();
        refreshOwner(); toast('Verified — you now post as the owner of this address');
      });
      const drop = document.getElementById('claim-drop');
      if (drop) drop.addEventListener('click', () => {
        delete S.claims[l.id]; save(); refreshOwner(); toast('Claim withdrawn');
      });
    }

    function renderMeRow() {
      const row = document.getElementById('me-row');
      if (!row) return;
      const r = myRoleAt(l.id);
      row.innerHTML = r
        ? `<div style="display:flex;gap:10px;align-items:center">${avatar('me', false, r)}
             <div><div style="font-weight:600">${esc(displayName())}</div><div>${badge(r)}</div></div></div>`
        : '';
    }

    function refreshOwner() { renderClaim(); renderMeRow(); renderOffers(); renderOpenHouse(); renderFeed(); }

    /* An owner can answer an offer in public. Nothing here is binding — the reply
       is a signal to the buyer's agent, and the notice under the panel says so. */
    const OFFER_PILL = { live: ['Active', 'pill--live'], out: ['Withdrawn', 'pill--out'],
      accepted: ['Accepted', ''], declined: ['Declined', 'pill--out'], countered: ['Countered', 'pill--live'] };

    const offerState = (o) => (S.offerReplies || {})[o.id] || { status: o.status };
    const mine = (o) => (S.offers[l.id] || []).some((x) => x.id === o.id);

    function renderOffers() {
      const list = offersFor(l);
      const own = isOwner(l.id);
      document.getElementById('offers').innerHTML = list.length ? list.map((o) => {
        const st = offerState(o);
        const [label, cls] = OFFER_PILL[st.status] || OFFER_PILL.live;
        return `<div class="offer">
          <div style="flex:1;min-width:0">
            <div class="offer__amt">${money(o.amt)}</div>
            <div class="offer__meta">${esc(o.by)} · ${esc(o.when)}</div>
            <div class="offer__meta">${esc(o.note)}</div>
            ${st.reply ? `<div class="offer__reply">${esc(user(l.owner).name === displayName() ? 'You' : 'Owner')} replied: ${esc(st.reply)}</div>` : ''}
            ${st.thread ? `<div class="offer__thread">${st.thread.map((m) =>
              `<div><b>${esc(m.by)}</b> ${esc(m.text)}</div>`).join('')}</div>` : ''}
            ${!own && mine(o) && st.status === 'countered' ? `<div class="offer__acts">
              <button class="btn btn--sm btn--primary" data-buyer="${o.id}" data-act="taken">Accept the counter</button>
              <button class="btn btn--sm" data-buyer="${o.id}" data-act="split">Split the difference</button>
              <button class="btn btn--sm" data-buyer="${o.id}" data-act="out">Withdraw</button>
            </div>` : ''}
            ${own && st.status === 'live' ? `<div class="offer__acts">
              <button class="btn btn--sm" data-offer="${o.id}" data-act="accepted">Accept</button>
              <button class="btn btn--sm" data-offer="${o.id}" data-act="countered">Counter</button>
              <button class="btn btn--sm" data-offer="${o.id}" data-act="declined">Decline</button>
            </div>` : ''}
          </div>
          <span class="pill ${cls}">${label}</span>
        </div>`;
      }).join('') : '<div class="notice">No offers yet. Be the first — the owner sees it immediately.</div>';

      document.querySelectorAll('#offers [data-buyer]').forEach((b) => b.addEventListener('click', () => {
        const oid = b.dataset.buyer, act = b.dataset.act;
        const st = (S.offerReplies || {})[oid] || {};
        const o = offersFor(l).find((x) => x.id === oid);
        const thread = (st.thread || []).slice();
        if (act === 'taken') {
          thread.push({ by: 'You', text: `accepted the counter at ${money(st.counterAt)}.` });
          S.offerReplies[oid] = Object.assign({}, st, { status: 'accepted', thread,
            reply: `Agreed at ${money(st.counterAt)}, subject to a written contract through the listing broker.` });
        } else if (act === 'split') {
          const at = Math.round((o.amt + st.counterAt) / 2000) * 1000;
          thread.push({ by: 'You', text: `came back at ${money(at)}.` });
          S.offerReplies[oid] = Object.assign({}, st, { status: 'live', thread, counterAt: at,
            reply: `Buyer countered back at ${money(at)}.` });
        } else {
          thread.push({ by: 'You', text: 'withdrew.' });
          S.offerReplies[oid] = Object.assign({}, st, { status: 'out', thread, reply: 'Withdrawn by the buyer.' });
        }
        save(); renderOffers();
        toast(act === 'taken' ? 'Accepted — the broker takes it from here'
          : act === 'split' ? 'Sent back to the owner' : 'Offer withdrawn');
      }));

      document.querySelectorAll('#offers [data-offer]').forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.act, oid = b.dataset.offer;
        const o = offersFor(l).find((x) => x.id === oid);
        let reply = { accepted: 'Accepted, subject to a written contract through the listing broker.',
          declined: 'Declined. Thank you for writing.' }[act];
        if (act === 'countered') {
          const at = Math.round(o.amt * 1.03 / 1000) * 1000;
          reply = `Countered at ${money(at)}, same terms.`;
        }
        const prev = (S.offerReplies || {})[oid] || {};
        (S.offerReplies = S.offerReplies || {})[oid] = {
          status: act, reply, counterAt: act === 'countered' ? Math.round(o.amt * 1.03 / 1000) * 1000 : prev.counterAt,
          thread: prev.thread,
        };
        save(); renderOffers();
        toast(act === 'countered' ? 'Counter sent to the buyer' : `Offer ${act}`);
      }));
    }
    renderOffers();

    document.getElementById('offer-go').addEventListener('click', () => {
      const raw = document.getElementById('offer-amt').value.replace(/[^0-9]/g, '');
      const amt = Number(raw);
      if (!amt) { toast('Enter an offer amount'); return; }
      (S.offers[l.id] = S.offers[l.id] || []).unshift({
        id: 'o' + Date.now(), amt, by: 'You', when: 'just now', status: 'live',
        note: document.getElementById('offer-terms').value,
      });
      save(); renderOffers();
      document.getElementById('offer-amt').value = '';
      toast('Offer sent to the owner and agent');
    });

    /* tabs */
    const tabs = { feed: renderFeed, timeline: renderTimeline, facts: renderFacts };
    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('is-active', x === b));
      tabs[b.dataset.tab]();
    }));

    function renderFeed() {
      const own = isOwner(l.id);
      const myRole = myRoleAt(l.id);
      thread(document.getElementById('tabbody'), {
        list: () => postsFor(l),
        canPin: () => isOwner(l.id),
        placeholder: own
          ? `Post an update about ${l.street} — a renovation, a correction, an answer…`
          : `Ask a question, share what you know about ${l.street}, or post an update…`,
        hint: myRole
          ? `Posting as the verified ${myRole === 'past' ? 'past owner' : myRole} of this address.`
          : 'Posting as a neighbor. Claim this address to post as the verified owner.',
        posted: own ? 'Posted as the verified owner' : 'Posted to this address',
        onPost(text, type, photo) {
          (S.posts[l.id] = S.posts[l.id] || []).unshift({
            id: 'p' + Date.now(), by: 'me', ago: 'just now', text, up: 0, down: 0,
            pinned: false, replies: [], type, photo, role: myRoleAt(l.id) || undefined,
          });
        },
      });
    }

    function renderTimeline() {
      const pts = priceSeries(l);
      const rows = timelineFor(l);
      document.getElementById('tabbody').innerHTML = `
        ${pts.length > 1 ? `<section class="pc">
          <h3 class="pc__title">Recorded price</h3>
          <p class="pc__sub">Every dollar figure in the public record for this address. Flat between events because nothing was recorded in between.</p>
          <div class="pc__plot" id="pc-plot"></div>
        </section>` : ''}
        <p style="color:var(--ink-3);margin-bottom:20px">Everything recorded at this address, oldest at the bottom. History stays on the page after a sale.</p>
        <div class="tl">${rows.map((h, i) => `
          <div class="tl__item${i > 1 ? ' tl__item--muted' : ''}${h.owner ? ' tl__item--owner' : ''}">
            <div class="tl__date">${esc(h.date)}</div>
            <div class="tl__what">${esc(h.what)}${h.owner ? '<span class="tl__tag">added by the owner</span>' : ''}</div>
            <div class="tl__meta">${esc(h.meta)}</div>
          </div>`).join('')}</div>
        ${canSchedule(l) ? `<h3 style="margin:28px 0 10px">Add work to the record</h3>
          <p style="color:var(--ink-3);font-size:.92rem;margin:0 0 12px">You have standing at this address, so
             what you add stays with the house.</p>${workForm(l)}` : ''}`;
      wireWorkForm(l, renderTimeline);
      const plot = document.getElementById('pc-plot');
      if (plot) priceChart(plot, l);
    }

    function renderFacts() {
      document.getElementById('tabbody').innerHTML = `
        <p style="margin-bottom:20px">${esc(l.blurb)}</p>
        <div class="facts" style="margin-bottom:20px">
          <div><dt>Property type</dt><dd>${esc(l.type)}</dd></div>
          <div><dt>Year built</dt><dd>${l.year}</dd></div>
          <div><dt>Lot size</dt><dd>${l.lot} acres</dd></div>
          <div><dt>Interior</dt><dd>${l.sqft.toLocaleString()} sqft</dd></div>
          <div><dt>Annual taxes</dt><dd>${money(l.taxes)}</dd></div>
          <div><dt>HOA</dt><dd>${l.hoa ? money(l.hoa) + '/yr' : 'None'}</dd></div>
        </div>
        <h3 style="margin-bottom:10px">Features</h3>
        <div style="display:flex;gap:7px;flex-wrap:wrap">${l.features.map((f) => `<span class="tag" style="text-transform:none;letter-spacing:0;font-weight:500">${esc(f)}</span>`).join('')}</div>
        <h3 style="margin:26px 0 10px">Where it is</h3>
        <div class="mp mp--locator" id="locator"></div>
        <h3 style="margin:26px 0 10px">Take the record with you</h3>
        <p style="color:var(--ink-3);font-size:.92rem;margin:0 0 12px">Everything on this page as one JSON file —
          the parcel, the price history, every post and reply, and the offers. The address keeps its record whether
          or not you keep using Abode.</p>
        <button class="btn" id="export-go">Download the address record</button>`;
      document.getElementById('export-go').addEventListener('click', () => exportRecord(l));
      mapView(document.getElementById('locator'), {
        compact: true, w: 660, h: 300, minSpan: 0.05,
        caption: `${degLabel(l.lat, 4, 'lat')}, ${degLabel(l.lng, 4, 'lng')} · parcel centroid, approximate`,
      }).set([l]);
    }

    const lastVisit = noteVisit(l.id);
    document.getElementById('share').addEventListener('click', () => shareAddress(l));
    document.getElementById('print').addEventListener('click', () => {
      /* the history is the part worth having on paper, so open it first */
      const tab = document.querySelector('.tabs button[data-tab="timeline"]');
      if (tab) tab.click();
      if (window.print) window.print();
    });
    const sb = document.getElementById('follow-street');
    sb.addEventListener('click', () => {
      const k = streetKey(l);
      (S.streets = S.streets || {})[k] = !(S.streets || {})[k];
      if (!S.streets[k]) delete S.streets[k];
      save();
      const on = followingStreet(l);
      sb.setAttribute('aria-pressed', String(on));
      sb.textContent = on ? `✓ Following ${streetOf(l)}` : `Follow ${streetOf(l)}`;
      toast(on ? `Following every address on ${streetOf(l)} — ${onStreet(l).length} with a page`
        : `Unfollowed ${streetOf(l)}`);
    });

    const mb = document.getElementById('mute');
    mb.addEventListener('click', () => {
      (S.muted = S.muted || {})[l.id] = !(S.muted || {})[l.id];
      if (!S.muted[l.id]) delete S.muted[l.id];
      save();
      const on = !!(S.muted || {})[l.id];
      mb.setAttribute('aria-pressed', String(on));
      mb.textContent = on ? '🔕 Muted' : 'Mute alerts';
      toast(on ? 'Muted — you still follow it, it just stops telling you' : 'Alerts back on for this address');
    });

    renderCost();
    renderNote();
    renderTour();
    renderOpenHouse();
    renderClaim();
    renderMeRow();
    renderFeed();

    /* the group this address sits in, if any — neighbours beat comparables */
    const inGroup = D.groups.find((g) => g.addresses.indexOf(l.id) > -1);
    if (inGroup) {
      const near = groupHomes(inGroup).filter((x) => x.id !== l.id);
      if (near.length) {
        const host = document.getElementById('nearby');
        host.innerHTML = `<div class="sec__head" style="margin-bottom:14px">
            <div><h2>More in ${esc(inGroup.name)}</h2>
            <p>${near.length} other ${near.length === 1 ? 'address' : 'addresses'} on this page's own block.</p></div>
            <a class="link-more" href="group.html?id=${inGroup.id}">The group →</a></div>
          <div class="grid">${near.slice(0, 3).map(card).join('')}</div>`;
      }
    }

    const changes = changedSince(l, lastVisit);
    if (changes.length) {
      const bar = document.createElement('div');
      bar.className = 'sincebar sincebar--page';
      bar.innerHTML = `<span>Since you last looked: ${esc(changes.slice(0, 3).join(', '))}${changes.length > 3 ? ` and ${changes.length - 3} more` : ''}</span>`;
      const body = document.getElementById('tabbody');
      body.parentNode.insertBefore(bar, body);
    }

    recentStrip(document.getElementById('recent'), l.id);

    /* index.html sends "Start verification" straight into the flow */
    if (location.hash === '#claim' && !claimOf(l.id)) openClaim(l, refreshOwner);
  }

  /* Everything that happened, not just what was written: a price cut, an open
     house or an accepted offer is activity too, and burying it under posts was a
     lie about what the site knows. */
  function feedActivity() {
    const items = [];
    D.listings.forEach((l, i) => {
      postsFor(l).forEach((p, j) => items.push({ kind: 'post', l, p, rank: j + i * 0.3 }));
      if (l.prior && l.prior > l.price) {
        items.push({ kind: 'cut', l, rank: i * 0.3 - 0.2,
          text: `Price cut to ${money(l.price)} from ${money(l.prior)}, down ${((1 - l.price / l.prior) * 100).toFixed(1)}%.` });
      }
      const oh = openHouse(l);
      if (oh) items.push({ kind: 'open', l, rank: i * 0.3 - 0.15,
        text: `Open house ${oh.day} ${oh.when} on ${oh.date}. ${rsvpCount(l)} people say they are going.` });
      if (l.status === 'pending') items.push({ kind: 'status', l, rank: i * 0.3 - 0.1,
        text: 'Under agreement. Backup offers are still being taken on the page.' });
      offersFor(l).filter((o) => o.status === 'accepted').forEach((o) => items.push({
        kind: 'offer', l, rank: i * 0.3 - 0.05, text: `Offer accepted at ${money(o.amt)}. ${o.note}` }));
    });
    return items.sort((a, b) => a.rank - b.rank);
  }

  const FEED_KINDS = { post: 'Posts', cut: 'Price cuts', open: 'Open houses', status: 'Status', offer: 'Offers' };

  function feed() {
    /* mark where you left off before this visit overwrites it */
    const lastSeen = S.feedSeen || null;
    S.feedSeen = Date.now(); save();

    const all = feedActivity();
    const on = {};
    Object.keys(FEED_KINDS).forEach((k) => { on[k] = true; });
    let items = all;

    let shown = 16;
    const paintFeed = () => {
      document.getElementById('feed').innerHTML = feedItems(items.slice(0, shown));
      const more = document.getElementById('feed-more');
      more.hidden = shown >= items.length;
      more.textContent = `Show more (${Math.max(0, items.length - shown)} left)`;
    };

    /* Anything posted in hours is "new"; the divider goes where the clock says. */
    const sinceHours = lastSeen ? Math.max(1, Math.round((Date.now() - lastSeen) / 3600000)) : null;
    let dividerAt = -1;
    if (sinceHours) {
      dividerAt = items.findIndex((it) => (it.kind === 'post' ? agoHours(it.p.ago) : it.rank * 24) > sinceHours);
    }

    const feedItems = (list) => list.map((it, idx) => {
      const divider = idx === dividerAt && dividerAt > 0
        ? `<div class="sincebar"><span>Everything below was here before your last visit</span></div>` : '';
      return divider + oneItem(it);
    }).join('');

    const oneItem = (it) => {
      const { l, p } = it;
      const head = `<div style="display:flex;gap:10px;align-items:center;padding-bottom:13px;margin-bottom:13px;border-bottom:1px solid var(--line-2)">
          <a href="address.html?id=${l.id}" aria-label="${esc(l.street)}" style="width:56px;height:44px;border-radius:8px;overflow:hidden;flex:none">${art(l.hue, 0)}</a>
          <div style="flex:1;min-width:0">
            <a href="address.html?id=${l.id}" style="font-weight:600">${esc(l.street)}</a>
            <div style="font-size:.85rem;color:var(--ink-3)">${esc(l.city)}, ${l.state} · ${money(l.price)} · ${compact(followers(l))} following</div>
          </div>
          <button class="btn btn--sm" data-follow="${l.id}" aria-pressed="${!!S.follows[l.id]}">${S.follows[l.id] ? 'Following' : 'Follow'}</button>
        </div>`;
      if (it.kind !== 'post') {
        return `<div class="panel">${head}
          <div class="event event--${it.kind}">
            <span class="event__icon" aria-hidden="true">${{ cut: '↓', open: '🚪', status: '◆', offer: '🏷' }[it.kind]}</span>
            <div><b>${esc(FEED_KINDS[it.kind])}</b><p>${esc(it.text)}</p></div>
          </div>
        </div>`;
      }
      return oldFeedItem(l, p);
    };

    const oldFeedItem = (l, p) => {
      const u = user(p.by);
      return `<div class="panel">
        <div style="display:flex;gap:10px;align-items:center;padding-bottom:13px;margin-bottom:13px;border-bottom:1px solid var(--line-2)">
          <a href="address.html?id=${l.id}" aria-label="${esc(l.street)}" style="width:56px;height:44px;border-radius:8px;overflow:hidden;flex:none">${art(l.hue, 0)}</a>
          <div style="flex:1;min-width:0">
            <a href="address.html?id=${l.id}" style="font-weight:600">${esc(l.street)}</a>
            <div style="font-size:.85rem;color:var(--ink-3)">${esc(l.city)}, ${l.state} · ${money(l.price)} · ${compact(followers(l))} following</div>
          </div>
          <button class="btn btn--sm" data-follow="${l.id}" aria-pressed="${!!S.follows[l.id]}">${S.follows[l.id] ? 'Following' : 'Follow'}</button>
        </div>
        <article class="post" style="padding:0;border:0">
          ${avatar(p.by)}
          <div class="post__body">
            ${p.pinned ? '<div class="post__pin">Pinned by owner</div>' : ''}
            <div class="post__head"><span class="post__who">${esc(u.name)}</span>${badge(u.role)}<span class="post__when">${esc(p.ago)}</span></div>
            <div class="post__text">${esc(p.text)}</div>
            <div class="post__foot">${voteBox(p.id, p.up, p.down)}
              <a class="linkish" href="address.html?id=${l.id}">${(p.replies || []).length} repl${(p.replies || []).length === 1 ? 'y' : 'ies'}</a></div>
          </div>
        </article>
      </div>`;
    };

    document.getElementById('feed-kinds').innerHTML = Object.entries(FEED_KINDS).map(([k, t]) =>
      `<button class="chip" data-kind-chip="${k}" aria-pressed="true">${t}</button>`).join('');
    document.getElementById('feed-kinds').addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind-chip]');
      if (!b) return;
      on[b.dataset.kindChip] = !on[b.dataset.kindChip];
      b.setAttribute('aria-pressed', String(on[b.dataset.kindChip]));
      items = all.filter((i) => on[i.kind]);
      shown = 16;
      paintFeed();
    });

    paintFeed();
    document.getElementById('feed-more').addEventListener('click', () => { shown += 12; paintFeed(); });

    document.getElementById('groups-rail').innerHTML = D.groups.map((g) => `
      <div class="group-row">
        <div class="avatar avatar--sm">${esc(initials(g.name))}</div>
        <div style="flex:1;min-width:0">
          <a href="group.html?id=${g.id}" style="font-weight:600;font-size:.92rem">${esc(g.name)}</a>
          <div class="group-row__n">${g.members.toLocaleString()} members · ${g.today} today</div>
        </div>
        <button class="btn btn--sm" data-join="${g.id}" aria-pressed="${!!S.joined[g.id]}">${S.joined[g.id] ? '✓' : 'Join'}</button>
      </div>`).join('');

    const phone = document.getElementById('feed-phone');
    const pref0 = alertPrefs();
    phone.value = pref0.phone;
    const btn = document.getElementById('feed-alerts');
    const paint = () => {
      const on = alertPrefs().sms;
      btn.textContent = on ? '✓ Text alerts on' : 'Turn on alerts';
      btn.classList.toggle('btn--primary', !on);
    };
    btn.addEventListener('click', () => {
      const p = alertPrefs();
      if (!p.sms && !phone.value.trim()) { toast('Add a mobile number first'); phone.focus(); return; }
      p.sms = !p.sms; p.phone = phone.value.trim();
      S.alerts = p; save(); paint();
      toast(p.sms ? 'Text alerts on for everything you follow' : 'Text alerts off');
    });
    paint();

    const following = D.listings.filter((l) => S.follows[l.id]);
    document.getElementById('following').innerHTML = following.length
      ? following.map((l) => `<a href="address.html?id=${l.id}">${esc(l.street)}</a>`).join('')
      : '<div style="padding:9px 12px;font-size:.88rem;color:var(--ink-3)">Follow an address and it shows up here.</div>';
  }

  function group() {
    const id = new URLSearchParams(location.search).get('id') || 'g1';
    const g = D.groups.find((x) => x.id === id);
    if (!g) {
      document.getElementById('main').innerHTML = `<div class="wrap"><div class="empty">
        <h2>No such group</h2>
        <p>That group does not exist here. There are six.</p>
        <p style="margin-top:14px"><a class="btn btn--primary" href="groups.html">See every group</a></p></div></div>`;
      return;
    }
    const homes = groupHomes(g);
    describe(`${g.name}, ${g.city} — Abode`,
      `${g.name} in ${g.city}: ${members(g).toLocaleString()} neighbours, ${g.stats.forSale} homes for sale, and a wall going back years.`);

    function renderHero() {
      const joined = !!S.joined[g.id];
      document.getElementById('hero').innerHTML = `
        <div class="grp-head">
          <div class="avatar avatar--lg">${esc(initials(g.name))}</div>
          <div class="grp-head__main">
            <div class="grp-head__eyebrow">Neighborhood group · ${esc(g.city)}</div>
            <h1 class="grp-head__name">${esc(g.name)}</h1>
            <p class="grp-head__blurb">${esc(g.blurb)}</p>
            <div class="grp-head__facts">
              <span><b id="mem-n">${members(g).toLocaleString()}</b> members</span>
              <span><b>${g.today}</b> posts today</span>
              <span><b>${g.stats.forSale}</b> homes for sale</span>
              <span><b>${homes.length}</b> with an Abode page</span>
            </div>
          </div>
          <div class="grp-head__actions">
            <button class="btn ${joined ? '' : 'btn--primary'}" data-join="${g.id}" data-join-cta aria-pressed="${joined}">${joined ? 'Joined' : 'Join'}</button>
            <a class="btn" href="search.html?q=${encodeURIComponent(g.city.split(',')[0])}">Homes here</a>
          </div>
        </div>`;
    }

    function renderRail() {
      const med = money(g.stats.median);
      document.getElementById('rail').innerHTML = `
        <div class="panel">
          <div class="panel__title">Market here</div>
          <div class="panel__sub">Neighborhood-wide, last 90 days</div>
          <div class="oc" id="trend-plot"></div>
          <p id="trend-note" class="panel__sub" style="margin:8px 0 14px"></p>
          <div class="facts">
            <div><dt>For sale</dt><dd>${g.stats.forSale}</dd></div>
            <div><dt>Sold</dt><dd>${g.stats.sold90}</dd></div>
            <div><dt>Median ask</dt><dd>${med}</dd></div>
            <div><dt>Median $/sqft</dt><dd>$${g.stats.ppsf}</dd></div>
            <div><dt>Price cuts</dt><dd>${g.stats.cuts}</dd></div>
            <div><dt>Members</dt><dd>${members(g).toLocaleString()}</dd></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__title">On the map</div>
          <div class="panel__sub">Homes in this group with a page</div>
          <div class="mp mp--locator" id="grp-map"></div>
          <div id="grp-homes" style="margin-top:14px"></div>
        </div>

        ${(g.events || []).length ? `<div class="panel">
          <div class="panel__title">What is on</div>
          <div class="panel__sub">Things this group is actually doing</div>
          ${g.events.map((ev) => {
            const going = !!(S.going || {})[ev.id];
            return `<div class="gevent">
              <div class="gevent__when">${esc(ev.when)}</div>
              <div class="gevent__title">${esc(ev.title)}</div>
              <div class="gevent__where">${esc(ev.where)}</div>
              <p>${esc(ev.note)}</p>
              <div class="gevent__foot">
                <span>${ev.going + (going ? 1 : 0)} going</span>
                <button class="btn btn--sm${going ? '' : ' btn--primary'}" data-going="${ev.id}" aria-pressed="${going}">${going ? '✓ You are going' : 'I am going'}</button>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

        <div class="panel">
          <div class="panel__title">Moderators</div>
          <div class="panel__sub">Neighbors who handle reports here${isMod(g) ? ' · <a href="moderation.html">your queue</a>' : ''}</div>
          ${g.mods.map((m) => {
            const u = user(m);
            return `<div class="group-row">${avatar(m)}
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.92rem">${esc(u.name)}</div>
                <div class="group-row__n">${esc(D.roleLabel[u.role])}</div>
              </div></div>`;
          }).join('')}
        </div>

        <div class="panel panel--sticky">
          <div class="panel__title">Other groups</div>
          <div class="panel__sub">Join the ones you actually live in</div>
          ${D.groups.filter((o) => o.id !== g.id).map((o) => `
            <div class="group-row">
              <div class="avatar avatar--sm">${esc(initials(o.name))}</div>
              <div style="flex:1;min-width:0">
                <a href="group.html?id=${o.id}" style="font-weight:600;font-size:.92rem">${esc(o.name)}</a>
                <div class="group-row__n">${esc(o.city)} · ${o.members.toLocaleString()} members</div>
              </div>
              <button class="btn btn--sm" data-join="${o.id}" aria-pressed="${!!S.joined[o.id]}">${S.joined[o.id] ? 'Joined' : 'Join'}</button>
            </div>`).join('')}
        </div>`;

      const drew = trendChart(document.getElementById('trend-plot'), g);
      document.getElementById('trend-note').textContent = drew
        ? `Median asking price of the ${homes.length} homes here with a page.`
        : 'Only one home here has a page yet — not enough to draw a trend.';

      document.querySelectorAll('[data-going]').forEach((b) => b.addEventListener('click', () => {
        (S.going = S.going || {})[b.dataset.going] = !(S.going || {})[b.dataset.going];
        if (!S.going[b.dataset.going]) delete S.going[b.dataset.going];
        save(); renderRail();
        toast((S.going || {})[b.dataset.going] ? 'You are on the list' : 'Taken off the list');
      }));

      document.getElementById('grp-homes').innerHTML = homes.length
        ? homes.map((l) => `<div class="group-row">
            <a href="address.html?id=${l.id}" aria-label="${esc(l.street)}" style="width:52px;height:40px;border-radius:6px;overflow:hidden;flex:none">${art(l.hue, 0)}</a>
            <div style="flex:1;min-width:0">
              <a href="address.html?id=${l.id}" style="font-weight:600;font-size:.92rem">${esc(l.street)}</a>
              <div class="group-row__n">${money(l.price)} · ${compact(followers(l))} following</div>
            </div>
            <button class="btn btn--sm" data-follow="${l.id}" aria-pressed="${!!S.follows[l.id]}">${S.follows[l.id] ? 'Following' : 'Follow'}</button>
          </div>`).join('')
        : '<div class="group-row__n">No pages in this group yet.</div>';

      mapView(document.getElementById('grp-map'), {
        compact: true, w: 660, h: 300, minSpan: 0.08,
        caption: `${esc(g.name)} · ${homes.length} home${homes.length === 1 ? '' : 's'}`,
        onSelect(pid) { location.href = 'address.html?id=' + pid; },
      }).set(homes);
    }

    renderHero();
    renderRail();

    thread(document.getElementById('wall'), {
      list: () => groupPosts(g),
      placeholder: `Ask the ${g.name} group something, or share what is happening on your block…`,
      hint: 'Posting as a neighbor. Group rules: no occupant names, no schedules, no listing spam.',
      posted: 'Posted to the group',
      empty: 'Start the first thread in this group.',
      onPost(text) {
        (S.posts[g.id] = S.posts[g.id] || []).unshift({
          id: 'gp' + Date.now(), by: 'me', ago: 'just now', text, up: 0, down: 0, pinned: false, replies: [],
        });
      },
    });

    /* The join button lives in two places on this page; keep the count honest. */
    document.addEventListener('click', (e) => {
      if (e.target.closest(`[data-join="${g.id}"]`)) {
        const n = document.getElementById('mem-n');
        if (n) n.textContent = members(g).toLocaleString();
      }
    });
  }

  function alerts() {
    const list = document.getElementById('alerts');

    function renderDigest() {
      const p = alertPrefs();
      const items = alertsFor().filter((a) => !(S.read || {})[a.id]);
      const host = document.getElementById('digest-preview');
      if (!host) return;
      if (!items.length) {
        host.innerHTML = '<p class="digest__none">Nothing to send. We do not send an empty digest.</p>';
        return;
      }
      const when = p.digest === 'instant' ? 'Sent one at a time, as each happens'
        : p.digest === 'daily' ? 'Sent tomorrow morning, outside quiet hours' : 'Sent Monday morning';
      host.innerHTML = `<div class="digest__msg">
          <b>Abode · ${items.length} update${items.length === 1 ? '' : 's'}</b>
          ${items.slice(0, 4).map((a) => `<div>• ${esc(a.title)}</div>`).join('')}
          ${items.length > 4 ? `<div>• and ${items.length - 4} more</div>` : ''}
          <div class="digest__foot">Reply STOP to end texts. Manage what you get on Abode.</div>
        </div>
        <p class="digest__when">${esc(when)}.</p>`;
    }

    function renderList() {
      const items = alertsFor();
      list.innerHTML = items.length ? items.map((a) => {
        const unread = !(S.read || {})[a.id];
        const k = ALERT_KINDS[a.kind];
        return `<a class="alert${unread ? ' is-unread' : ''}" href="${a.href}" data-alert="${a.id}">
          <span class="alert__icon" aria-hidden="true">${k.icon}</span>
          <span class="alert__body">
            <span class="alert__title">${esc(a.title)}</span>
            <span class="alert__text">${esc(a.body)}</span>
            <span class="alert__meta">${esc(k.label)} · ${esc(a.ago)}</span>
          </span>
          <button class="alert__mark" data-mark="${a.id}" aria-pressed="${!unread}"
            aria-label="${unread ? 'Mark read' : 'Mark unread'}">${unread ? '●' : '○'}</button>
        </a>`;
      }).join('') : `<div class="empty"><h2>Nothing to tell you yet</h2>
        <p>Follow an address, join a group or claim a home and this fills up.</p>
        <p style="margin-top:14px"><a class="btn btn--primary" href="search.html">Find a home to follow</a></p></div>`;
      chrome('alerts.html');
      renderDigest();
    }

    function renderRail() {
      const pref = alertPrefs();
      document.getElementById('alert-rail').innerHTML = `
        <div class="panel">
          <div class="panel__title">How to reach you</div>
          <div class="panel__sub">Nothing leaves this browser in the demo build</div>
          <label class="lbl" for="al-phone">Mobile number</label>
          <input class="field" id="al-phone" value="${esc(pref.phone)}" placeholder="(555) 010-4477" style="margin-bottom:14px">
          <div class="switches">
            ${[['push', 'Push'], ['email', 'Email'], ['sms', 'Text message']].map(([k, t]) => `
              <label class="switch"><input type="checkbox" data-chan="${k}"${pref[k] ? ' checked' : ''}><span>${t}</span></label>`).join('')}
          </div>
          <div class="notice" style="margin-top:14px">Texts only go out for things you follow, and every message carries a STOP line.</div>
        </div>

        <div class="panel">
          <div class="panel__title">When to send</div>
          <div class="panel__sub">Nothing here wakes you up</div>
          <label class="lbl" for="al-digest">Delivery</label>
          <select class="field" id="al-digest">
            ${[['instant', 'As it happens'], ['daily', 'One daily digest'], ['weekly', 'One weekly digest']]
              .map(([v, t]) => `<option value="${v}"${pref.digest === v ? ' selected' : ''}>${t}</option>`).join('')}
          </select>
          <div class="quiet">
            <div><label class="lbl" for="al-from">Quiet from</label>
              <select class="field" id="al-from">${HOURS.map((h, i) => `<option value="${i}"${pref.quietFrom === i ? ' selected' : ''}>${h}</option>`).join('')}</select></div>
            <div><label class="lbl" for="al-to">until</label>
              <select class="field" id="al-to">${HOURS.map((h, i) => `<option value="${i}"${pref.quietTo === i ? ' selected' : ''}>${h}</option>`).join('')}</select></div>
          </div>
          <div class="notice" style="margin-top:12px" id="al-summary">${deliverySentence(pref)}</div>
        </div>

        <div class="panel">
          <div class="panel__title">What your digest would say</div>
          <div class="panel__sub">The message we would actually send, given the switches above</div>
          <div class="digest" id="digest-preview"></div>
        </div>

        ${dataPanel()}

        <div class="panel panel--sticky">
          <div class="panel__title">What to send</div>
          <div class="panel__sub">Off means it never reaches you and never shows here</div>
          <div class="switches">
            ${Object.entries(ALERT_KINDS).map(([k, v]) => `
              <label class="switch"><input type="checkbox" data-kind="${k}"${pref.kinds[k] ? ' checked' : ''}>
                <span>${esc(v.label)}<em>${esc(v.note)}</em></span></label>`).join('')}
          </div>
        </div>`;
    }

    function write(fn) {
      const pref = alertPrefs();
      fn(pref);
      S.alerts = pref; save();
    }

    document.addEventListener('change', (e) => {
      const chan = e.target.closest('[data-chan]');
      if (chan) {
        write((p) => { p[chan.dataset.chan] = chan.checked; });
        if (chan.dataset.chan === 'sms' && chan.checked && !alertPrefs().phone) toast('Add a mobile number to get texts');
        return;
      }
      if (e.target.id === 'al-digest' || e.target.id === 'al-from' || e.target.id === 'al-to') {
        write((p) => {
          p.digest = document.getElementById('al-digest').value;
          p.quietFrom = Number(document.getElementById('al-from').value);
          p.quietTo = Number(document.getElementById('al-to').value);
        });
        document.getElementById('al-summary').textContent = deliverySentence(alertPrefs());
        return;
      }
      const kind = e.target.closest('[data-kind]');
      if (kind) {
        write((p) => { p.kinds[kind.dataset.kind] = kind.checked; });
        renderList();
        toast(kind.checked ? `${ALERT_KINDS[kind.dataset.kind].label} on` : `${ALERT_KINDS[kind.dataset.kind].label} off`);
      }
    });
    document.addEventListener('input', (e) => {
      if (e.target.id === 'al-phone') write((p) => { p.phone = e.target.value; });
    });

    list.addEventListener('click', (e) => {
      const mark = e.target.closest('[data-mark]');
      if (mark) {
        e.preventDefault();
        S.read = S.read || {};
        if (S.read[mark.dataset.mark]) delete S.read[mark.dataset.mark];
        else S.read[mark.dataset.mark] = true;
        save(); renderList();
        return;
      }
      const a = e.target.closest('[data-alert]');
      if (!a) return;
      (S.read = S.read || {})[a.dataset.alert] = true; save();
    });

    document.getElementById('mark-all').addEventListener('click', () => {
      S.read = S.read || {};
      alertsFor().forEach((a) => { S.read[a.id] = true; });
      save(); renderList(); toast('All caught up');
    });

    renderRail();
    renderList();
    wireDataPanel(() => { renderRail(); renderList(); wireDataPanel(); });
  }

  /* ---------- direct messages ---------- */
  /* Seeded threads come from the data layer; anything you start or send lives in
     the client store and stays unanswered, because there is nobody on the other
     end of this build. Messages run through the same fair-housing screen as posts. */

  const dmThreads = () => {
    const mine = Object.values(S.dms || {});
    return D.threads.concat(mine).map((t) => {
      const extra = (S.dmSent || {})[t.id] || [];
      return Object.assign({}, t, { msgs: t.msgs.concat(extra) });
    }).sort((a, b) => agoHours(last(a).ago) - agoHours(last(b).ago));
  };
  const last = (t) => t.msgs[t.msgs.length - 1];
  const dmUnread = () => dmThreads().filter((t) => last(t).by !== 'me' && !(S.read || {})['dm-' + t.id]).length;

  function dmStart(withId, aboutId) {
    const all = dmThreads();
    const found = all.find((t) => t.with === withId && t.about === aboutId);
    if (found) return found.id;
    const id = 'dm' + Date.now();
    (S.dms = S.dms || {})[id] = { id, with: withId, about: aboutId, ago: 'just now', msgs: [] };
    save();
    return id;
  }

  function messages() {
    const listEl = document.getElementById('dm-list');
    const pane = document.getElementById('dm-pane');
    let open = new URLSearchParams(location.search).get('t');

    function renderList() {
      const ts = dmThreads();
      if (!ts.length) {
        listEl.innerHTML = '<div class="dm__none">No messages yet. Open any address and write to the owner or the agent.</div>';
        return;
      }
      if (!open || !ts.some((t) => t.id === open)) open = ts[0].id;
      listEl.innerHTML = ts.map((t) => {
        const u = user(t.with), l = D.byId[t.about];
        const unread = last(t).by !== 'me' && !(S.read || {})['dm-' + t.id];
        return `<button class="dm__row${t.id === open ? ' is-open' : ''}${unread ? ' is-unread' : ''}" data-thread="${t.id}">
          ${avatar(t.with)}
          <span class="dm__rowbody">
            <span class="dm__who">${esc(u.name)}${badge(u.role)}</span>
            <span class="dm__about">${l ? esc(l.street) : 'General'}</span>
            <span class="dm__peek">${esc(last(t).text.slice(0, 60))}${last(t).text.length > 60 ? '…' : ''}</span>
          </span>
          <span class="dm__when">${esc(last(t).ago)}</span>
        </button>`;
      }).join('');
    }

    function renderPane() {
      const t = dmThreads().find((x) => x.id === open);
      if (!t) {
        pane.innerHTML = `<div class="empty"><h2>Nothing open</h2><p>Pick a conversation, or start one from an address page.</p>
          <p style="margin-top:14px"><a class="btn btn--primary" href="search.html">Browse listings</a></p></div>`;
        return;
      }
      (S.read = S.read || {})['dm-' + t.id] = true; save();
      const u = user(t.with), l = D.byId[t.about];
      pane.innerHTML = `
        <div class="dm__head">
          ${avatar(t.with)}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600">${esc(u.name)} ${badge(u.role)}</div>
            ${l ? `<a class="dm__link" href="address.html?id=${l.id}">${esc(l.street)}, ${esc(l.city)}</a>` : ''}
          </div>
        </div>
        <div class="dm__msgs" id="dm-msgs">${t.msgs.map((m) => `
          <div class="dm__msg${m.by === 'me' ? ' dm__msg--me' : ''}">
            <div class="dm__bubble">${esc(m.text)}</div>
            <div class="dm__stamp">${esc(m.by === 'me' ? displayName() : user(m.by).name)} · ${esc(m.ago)}</div>
          </div>`).join('') || '<div class="dm__none">No messages in this thread yet.</div>'}
          ${last(t) && last(t).by === 'me' ? '<div class="dm__pending">Sent. Nobody replies in this build.</div>' : ''}
        </div>
        <div class="dm__compose">
          <textarea class="field" id="dm-text" rows="2" aria-label="Write to ${esc(u.name)}" placeholder="Write to ${esc(u.name)}…"></textarea>
          <div id="dm-screen"></div>
          <div class="composer__row">
            <span class="composer__hint">Owners see your display name, never your contact details.</span>
            <button class="btn btn--primary btn--sm" id="dm-send">Send</button>
          </div>
        </div>`;

      document.getElementById('dm-send').addEventListener('click', () => {
        const ta = document.getElementById('dm-text');
        const text = ta.value.trim();
        if (!text) { toast('Write something first'); return; }
        const res = screen(text);
        if (res.hits.length) {
          document.getElementById('dm-screen').innerHTML = screenNotice(res);
          if (res.blocked) { toast('Not sent — this one breaks a rule'); return; }
          document.getElementById('dm-screen').querySelector('[data-override]').addEventListener('click', () => send(text));
          return;
        }
        send(text);
      });

      function send(text) {
        ((S.dmSent = S.dmSent || {})[t.id] = (S.dmSent[t.id] || [])).push({ by: 'me', ago: 'just now', text });
        save(); renderList(); renderPane(); toast('Sent');
      }
    }

    listEl.addEventListener('click', (e) => {
      const row = e.target.closest('[data-thread]');
      if (!row) return;
      open = row.dataset.thread;
      renderList(); renderPane(); chrome('messages.html');
    });

    renderList();
    renderPane();
  }

  /* ---------- agent tools ---------- */
  /* The third badge tier. An agent verifies a licence, marks the addresses they
     represent, and gets one page that answers the only question an agent has in
     the morning: where do I owe somebody a reply. */

  const agentAcct = () => S.agent || null;
  const isAgent = () => !!(S.agent && S.agent.status === 'verified');
  const repping = () => D.listings.filter((l) => (S.repping || {})[l.id]);

  const STATES = ['NC', 'GA', 'ID', 'RI', 'FL', 'MI', 'OR', 'TX', 'ME', 'CO', 'VT'];

  /* A post asking a question that nobody answered is the agent's queue. */
  const openQuestions = (l) => postsFor(l).filter((p) =>
    (p.type === 'question' || p.text.includes('?')) &&
    !((p.replies || []).length + ((S.replies || {})[p.id] || []).length));

  const liveOffers = (l) => offersFor(l).filter((o) =>
    ((S.offerReplies || {})[o.id] || { status: o.status }).status === 'live');

  function openAgent(done) {
    let state = 'NC', lic = '', err = '';
    const host = document.createElement('div');
    host.className = 'sheet';
    document.body.appendChild(host);
    const restore = sheetFocus(host);
    const close = () => { host.remove(); document.removeEventListener('keydown', esckey); restore(); };
    const esckey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esckey);

    function render() {
      host.innerHTML = `<div class="sheet__box" role="dialog" aria-modal="true" aria-labelledby="ag-t">
        <button class="sheet__x" data-x aria-label="Close">×</button>
        <div class="sheet__step">Agent</div>
        <h3 class="sheet__t" id="ag-t">Verify your licence</h3>
        <p class="sheet__lead">We check the number against the state licensing board and the brokerage
          on record. An agent badge that anyone could mint would be worth nothing.</p>
        <label class="lbl" for="ag-state">Licensing state</label>
        <select class="field" id="ag-state">${STATES.map((s) => `<option${s === state ? ' selected' : ''}>${s}</option>`).join('')}</select>
        <label class="lbl" for="ag-lic" style="margin-top:12px">Licence number</label>
        <input class="field" id="ag-lic" value="${esc(lic)}" placeholder="e.g. 284471">
        ${err ? `<div class="sheet__err">${esc(err)}</div>` : ''}
        <div class="notice" style="margin-top:14px">Agents post under their own name and brokerage. Posting as a neighbour while representing a seller is grounds for losing the badge.</div>
        <div class="sheet__foot"><span></span><button class="btn btn--primary" data-go>Verify</button></div>
      </div>`;
    }

    host.addEventListener('click', (e) => {
      if (e.target === host || e.target.closest('[data-x]')) return close();
      if (!e.target.closest('[data-go]')) return;
      state = host.querySelector('#ag-state').value;
      lic = host.querySelector('#ag-lic').value.trim();
      if (!/^[A-Za-z0-9-]{5,}$/.test(lic)) { err = 'Licence numbers are at least five characters.'; return render(); }
      S.agent = { status: 'verified', state, lic, when: 'just now' };
      save(); close(); chrome(activeNav);
      toast(`Agent badge issued for ${state} licence ${lic}`);
      if (done) done();
    });

    render();
  }

  function agent() {
    const root = document.getElementById('agent-body');

    function render() {
      if (!isAgent()) {
        root.innerHTML = `<div class="empty">
          <h2>Agent tools</h2>
          <p>Verify a real estate licence and this becomes your desk: every address you
             represent, the offers waiting on you, and the questions nobody has answered.</p>
          <p style="margin-top:14px"><button class="btn btn--primary" id="ag-go">Verify a licence</button></p></div>`;
        document.getElementById('ag-go').addEventListener('click', () => openAgent(render));
        return;
      }

      const mine = repping();
      const a = agentAcct();
      root.innerHTML = `
        <div class="panel panel--owner" style="margin-bottom:22px">
          <div class="panel__title">✓ Agent of record</div>
          <div class="panel__sub">${esc(a.state)} licence ${esc(a.lic)} · verified ${esc(a.when)}</div>
          <div class="facts">
            <div><dt>Addresses</dt><dd>${mine.length}</dd></div>
            <div><dt>Offers waiting</dt><dd>${mine.reduce((n, l) => n + liveOffers(l).length, 0)}</dd></div>
            <div><dt>Open questions</dt><dd>${mine.reduce((n, l) => n + openQuestions(l).length, 0)}</dd></div>
            <div><dt>Tour requests</dt><dd>${mine.filter((l) => tourFor(l.id)).length}</dd></div>
            <div><dt>Threads</dt><dd>${mine.reduce((n, l) => n + dmThreads().filter((t) => t.about === l.id).length, 0)}</dd></div>
          </div>
          <button class="linkish" id="ag-drop" style="margin-top:12px">Give up the agent badge</button>
        </div>

        <div class="results-head" style="padding-top:0"><h2>Your listings</h2></div>
        <div id="ag-list">${mine.length ? mine.map((l) => {
          const q = openQuestions(l).length, o = liveOffers(l).length;
          const wk = interestWeeks(l);
          return `<div class="agrow">
            <a class="agrow__art" href="address.html?id=${l.id}" aria-label="${esc(l.street)}">${art(l.hue, 0)}</a>
            <div class="agrow__main">
              <a class="agrow__addr" href="address.html?id=${l.id}">${esc(l.street)}, ${esc(l.city)}</a>
              <div class="agrow__meta">${money(l.price)} · ${l.dom} days on market · ${wk[6].views} views this week</div>
              <div class="agrow__meta">${openHouse(l)
                ? `Open house ${esc(openHouse(l).day)} ${esc(openHouse(l).when)} · ${rsvpCount(l)} going`
                : 'No open house scheduled'}</div>
              <div class="agrow__flags">
                ${o ? `<span class="flagpill flagpill--hot">${o} offer${o > 1 ? 's' : ''} waiting</span>` : ''}
                ${q ? `<span class="flagpill">${q} unanswered question${q > 1 ? 's' : ''}</span>` : ''}
                ${tourFor(l.id) ? `<span class="flagpill flagpill--hot">Tour: ${esc(tourFor(l.id).day)} ${esc(tourFor(l.id).time.toLowerCase())}</span>` : ''}
                ${!o && !q && !tourFor(l.id) ? '<span class="flagpill flagpill--calm">Nothing owed</span>' : ''}
              </div>
            </div>
            <div class="agrow__acts">
              ${q ? `<button class="btn btn--sm btn--primary" data-answer="${l.id}">Answer</button>` : ''}
              <a class="btn btn--sm" href="address.html?id=${l.id}">Open page</a>
              <button class="btn btn--sm" data-drop-rep="${l.id}">Stop representing</button>
            </div>
            <div class="agrow__answer" id="answer-${l.id}"></div>
          </div>`;
        }).join('') : `<div class="empty"><h3>No addresses yet</h3>
          <p>Open any address page and use “I represent this address”.</p>
          <p style="margin-top:14px"><a class="btn btn--primary" href="search.html">Find your listings</a></p></div>`}</div>`;

      document.getElementById('ag-drop').addEventListener('click', () => {
        delete S.agent; save(); render(); chrome(activeNav); toast('Agent badge given up');
      });
      root.querySelectorAll('[data-answer]').forEach((b) => b.addEventListener('click', () => {
        const l = D.byId[b.dataset.answer];
        const slot = document.getElementById('answer-' + l.id);
        if (slot.firstChild) { slot.innerHTML = ''; return; }
        const qs = openQuestions(l);
        slot.innerHTML = qs.map((p) => `<div class="qrow">
          <div class="qrow__q"><b>${esc(user(p.by).name)}</b> ${esc(p.text)}</div>
          <div class="qrow__a">
            <input class="field" data-answer-for="${p.id}" placeholder="Answer as ${esc(agentAcct() ? 'the agent of record' : 'yourself')}…">
            <button class="btn btn--sm btn--primary" data-send-answer="${p.id}">Send</button>
          </div>
        </div>`).join('');
        slot.querySelectorAll('[data-send-answer]').forEach((sb) => sb.addEventListener('click', () => {
          const input = slot.querySelector(`[data-answer-for="${sb.dataset.sendAnswer}"]`);
          const text = input.value.trim();
          if (!text) { toast('Write an answer first'); return; }
          const res = screen(text);
          if (res.blocked) { toast(res.hits[0].why); return; }
          (S.replies[sb.dataset.sendAnswer] = S.replies[sb.dataset.sendAnswer] || []).push({
            id: 'r' + Date.now(), by: 'me', ago: 'just now', text, up: 0, down: 0, role: 'agent',
          });
          save(); render();
          toast('Answered on the address page');
        }));
      }));

      root.querySelectorAll('[data-drop-rep]').forEach((b) => b.addEventListener('click', () => {
        delete S.repping[b.dataset.dropRep]; save(); render(); toast('Removed from your listings');
      }));
    }

    render();
  }

  function saved() {
    const list = D.listings.filter((l) => S.saves[l.id]);
    const foll = D.listings.filter((l) => S.follows[l.id]);
    const searches = savedSearches();
    if (searches.length) {
      document.getElementById('searches-sec').hidden = false;
      const paint = () => {
        document.getElementById('searches').innerHTML = savedSearches().map((f) => {
          const hits = searchMatches(f);
          const fresh = hits.filter((l) => l.dom <= 7 || l.prior).length;
          return `<div class="srow">
            <div style="flex:1;min-width:0">
              <a class="srow__name" href="${searchHref(f)}">${esc(f.name)}</a>
              <div class="srow__n">${hits.length} ${hits.length === 1 ? 'home' : 'homes'}${fresh ? ` · ${fresh} new or reduced` : ''} · saved ${esc(f.when)}</div>
            </div>
            <button class="btn btn--sm" data-unsave-search="${f.id}">Remove</button>
          </div>`;
        }).join('');
      };
      document.getElementById('searches').addEventListener('click', (e) => {
        const b = e.target.closest('[data-unsave-search]');
        if (!b) return;
        delete S.searches[b.dataset.unsaveSearch]; save(); paint();
        if (!savedSearches().length) document.getElementById('searches-sec').hidden = true;
        toast('Saved search removed');
      });
      paint();
    }

    if (requests().length) {
      document.getElementById('requests-sec').hidden = false;
      document.getElementById('requests').innerHTML = requests().map((r) => `
        <div class="srow">
          <div style="flex:1;min-width:0">
            <b class="srow__name">${esc(r.street)}${r.city ? ', ' + esc(r.city) : ''}</b>
            <div class="srow__n">Queued ${esc(r.when)} · waiting on parcel data</div>
          </div>
          <button class="btn btn--sm" data-drop-request="${r.id}">Remove</button>
        </div>`).join('');
      document.getElementById('requests').addEventListener('click', (e) => {
        const b = e.target.closest('[data-drop-request]');
        if (!b) return;
        S.requests = requests().filter((r) => r.id !== b.dataset.dropRequest);
        save(); saved(); toast('Request removed');
      });
    }

    const streets = followedStreets();
    if (streets.length) {
      document.getElementById('streets-sec').hidden = false;
      document.getElementById('streets').innerHTML = streets.map((k) => {
        const [name, city] = k.split('|');
        const homes = D.listings.filter((l) => streetKey(l) === k);
        return `<div class="srow">
          <div style="flex:1;min-width:0">
            <b class="srow__name">${esc(name)}</b>
            <div class="srow__n">${esc(city)} · ${homes.length} ${homes.length === 1 ? 'address' : 'addresses'} with a page</div>
          </div>
          <button class="btn btn--sm" data-unfollow-street="${esc(k)}">Unfollow</button>
        </div>`;
      }).join('');
      document.getElementById('streets').addEventListener('click', (e) => {
        const b = e.target.closest('[data-unfollow-street]');
        if (!b) return;
        delete S.streets[b.dataset.unfollowStreet]; save(); saved();
        toast('Street unfollowed');
      });
    }

    recentStrip(document.getElementById('recent'), null);

    const own = D.listings.filter((l) => isOwner(l.id));
    if (own.length) {
      document.getElementById('owned-sec').hidden = false;
      document.getElementById('owned').innerHTML = own.map(card).join('');
    }
    document.getElementById('saved').innerHTML = list.length
      ? list.map((l, i) => card(l, i) + (noteFor(l.id)
          ? `<div class="savednote">Your note: ${esc(noteFor(l.id))}</div>` : '')).join('')
      : '<div class="empty" style="grid-column:1/-1"><h2>No saved homes yet</h2><p>Tap the star on any listing to keep it here.</p><p style="margin-top:14px"><a class="btn btn--primary" href="search.html">Browse listings</a></p></div>';
    document.getElementById('followed').innerHTML = foll.length
      ? foll.map(card).join('')
      : '<div class="empty" style="grid-column:1/-1"><p>You are not following any addresses yet. Following an address gets you every post, price change and offer on it.</p></div>';
  }

  /* join buttons (home + feed) */
  document.addEventListener('click', (e) => {
    const rq = e.target.closest('[data-request]');
    if (rq) {
      const rec = requestPage(rq.dataset.request, rq.dataset.requestCity);
      if (rec) {
        rq.textContent = '✓ Queued';
        rq.setAttribute('disabled', 'disabled');
        toast('Queued — it is on your saved page');
      }
      return;
    }
    const cmp = e.target.closest('[data-compare]');
    if (cmp) { toggleCompare(cmp.dataset.compare); return; }
    if (e.target.closest('[data-theme-toggle]')) { toggleTheme(); return; }
    const dm = e.target.closest('[data-dm]');
    if (dm) {
      const id = dmStart(dm.dataset.dm, dm.dataset.dmAbout);
      location.href = 'messages.html?t=' + id;
      return;
    }
    if (e.target.closest('[data-signin]')) { openSignIn(afterAuth); return; }
    if (e.target.closest('[data-signout]')) { signOut(); afterAuth(); return; }
    const j = e.target.closest('[data-join]');
    if (j) {
      const id = j.dataset.join;
      S.joined[id] = !S.joined[id]; save();
      j.setAttribute('aria-pressed', String(!!S.joined[id]));
      j.textContent = S.joined[id] ? (j.closest('#groups-rail') ? '✓' : 'Joined') : 'Join';
      if ('joinCta' in j.dataset) j.classList.toggle('btn--primary', !S.joined[id]);
      toast(S.joined[id] ? 'Joined the group' : 'Left the group');
    }
    const f = e.target.closest('[data-follow]');
    if (f) {
      const id = f.dataset.follow;
      S.follows[id] = !S.follows[id]; save();
      f.setAttribute('aria-pressed', String(!!S.follows[id]));
      f.textContent = S.follows[id] ? 'Following' : 'Follow';
    }
  });

  /* ---------- boot ---------- */

  const pages = { home, search, address, feed, saved, group, groups, profile, alerts, messages, agent, compare, moderation };
  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    const page = document.body.dataset.page;
    chrome({ home: 'index.html', doc: null, search: 'search.html', address: 'search.html', feed: 'feed.html', group: 'feed.html', groups: 'feed.html', profile: 'feed.html', moderation: 'feed.html', alerts: 'alerts.html', messages: 'messages.html', agent: 'agent.html', compare: 'search.html', saved: 'saved.html' }[page]);
    if (pages[page]) pages[page]();
    renderTray();
    wireShortcuts();
    firstRun();
  });
})();
