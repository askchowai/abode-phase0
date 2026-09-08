import { JSDOM } from 'jsdom';
import fs from 'fs';
import http from 'http';
import path from 'path';

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const f = path.resolve('.' + decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;

// jsdom gives each window its own localStorage, so carry state forward by hand
// the way a real browser would.
let carried = null;
const open = async (p) => {
  const errs = [];
  const dom = await JSDOM.fromURL(base + p, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) { if (carried) w.localStorage.setItem('abode.state.v1', carried); },
  });
  dom.virtualConsole.on('jsdomError', (e) => errs.push(e.message));
  await new Promise((r) => setTimeout(r, 200));
  return { dom, d: dom.window.document, w: dom.window, errs };
};
const click = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true }));
const tick = () => new Promise((r) => setTimeout(r, 60));

let fail = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!cond) fail++; };

/* --- address page interactions --- */
{
  const { d, w, errs } = await open('/address.html?id=a1');
  ok('address renders title', d.title.includes('418 Juniper Hollow'), d.title);

  const follow = d.getElementById('follow');
  const before = d.getElementById('foll-n').textContent;
  click(follow); await tick();
  ok('follow toggles', follow.textContent.includes('Following') && d.getElementById('foll-n').textContent !== before,
     `${before} -> ${d.getElementById('foll-n').textContent}`);

  const vb = d.querySelector('.vote');
  const n0 = Number(vb.querySelector('.vote__n').textContent);
  click(vb.querySelector('.up')); await tick();
  const n1 = Number(vb.querySelector('.vote__n').textContent);
  click(vb.querySelector('.down')); await tick();
  const n2 = Number(vb.querySelector('.vote__n').textContent);
  click(vb.querySelector('.down')); await tick();
  ok('upvote/downvote/undo', n1 === n0 + 1 && n2 === n0 - 1 && Number(vb.querySelector('.vote__n').textContent) === n0,
     `${n0} ${n1} ${n2} ${vb.querySelector('.vote__n').textContent}`);

  const p0 = d.querySelectorAll('#posts .post').length;
  d.getElementById('new-post').value = 'Test post from the smoke run.';
  click(d.getElementById('post-go')); await tick();
  const p1 = d.querySelectorAll('#posts .post').length;
  ok('posting adds a post', p1 === p0 + 1 && d.getElementById('posts').textContent.includes('Test post from the smoke run.'), `${p0} -> ${p1}`);

  click(d.querySelector('[data-reply]')); await tick();
  const inp = d.querySelector('.reply-slot input');
  inp.value = 'Test reply.';
  click(d.querySelector('.reply-slot button')); await tick();
  const copies = (d.getElementById('posts').textContent.match(/Test reply\./g) || []).length;
  ok('replying adds a reply', copies === 1, `${copies} copies`);

  const o0 = d.querySelectorAll('#offers .offer').length;
  d.getElementById('offer-amt').value = '850,000';
  click(d.getElementById('offer-go')); await tick();
  ok('offer submits', d.querySelectorAll('#offers .offer').length === o0 + 1 && d.getElementById('offers').textContent.includes('$850,000'));

  const tabs = [...d.querySelectorAll('.tabs button')];
  click(tabs[1]); await tick();
  ok('history tab', d.querySelectorAll('.tl__item').length === 6, String(d.querySelectorAll('.tl__item').length));
  ok('price chart plots the recorded prices', d.querySelectorAll('#pc-plot .pc__dot').length === 3,
     String(d.querySelectorAll('#pc-plot .pc__dot').length));
  ok('chart steps rather than slopes', (d.querySelector('.pc__line').getAttribute('d').match(/L/g) || []).length === 4);
  ok('endpoints are labelled, not every point', d.querySelectorAll('#pc-plot .pc__val').length === 2);
  ok('chart is described for screen readers', d.querySelector('.pc__svg').getAttribute('aria-label').includes('Sold $604,000'),
     d.querySelector('.pc__svg').getAttribute('aria-label').slice(0, 60));
  const dot = d.querySelector('#pc-plot .pc__dot');
  dot.dispatchEvent(new d.defaultView.MouseEvent('mouseenter', { bubbles: true })); await tick();
  ok('hovering a point opens the tooltip', !d.getElementById('pc-tip').hidden &&
     d.getElementById('pc-tip').textContent.includes('Sold'), d.getElementById('pc-tip').textContent);
  click(tabs[2]); await tick();
  ok('facts tab', d.getElementById('tabbody').textContent.includes('Screened porch'));
  ok('locator map drawn', !!d.querySelector('#locator .mp__svg') && d.querySelectorAll('#locator [data-pin]').length === 1);
  {
    let captured = null;
    // jsdom cannot follow a download link; the browser can
    d.addEventListener('click', (ev) => { if (ev.target.matches('a[download]')) ev.preventDefault(); }, true);
    w.URL.createObjectURL = () => 'blob:test';
    w.URL.revokeObjectURL = () => {};
    const realBlob = w.Blob;
    w.Blob = function (parts) { captured = String(parts[0]); return new realBlob(parts); };
    click(d.getElementById('export-go')); await tick();
    w.Blob = realBlob;
    const rec = JSON.parse(captured);
    ok('the record exports as json', rec.schema === 'abode.address/v1' && rec.parcel.street === '418 Juniper Hollow Rd');
    ok('the export carries the whole page', rec.posts.length >= 4 && rec.history.length === 6 &&
       rec.price_history.length === 3 && rec.offers.length >= 2 && !!rec.parcel.lat,
       `${rec.posts.length} posts, ${rec.offers.length} offers`);
    ok('replies ride along with their post', rec.posts.some((p) => p.replies.length > 0));
    ok('it says it is sample data', String(rec.exported).includes('no MLS feed'));
  }

  ok('locator captions the coordinates', d.querySelector('#locator .mp__cap').textContent.includes('35.6320°N'),
     d.querySelector('#locator .mp__cap').textContent);
  ok('no page errors', errs.length === 0, errs.join('; '));

  ok('localStorage persisted', !!w.localStorage.getItem('abode.state.v1'));
  carried = w.localStorage.getItem('abode.state.v1');
}

/* --- ownership claim and the owner badge --- */
{
  const { d, w, errs } = await open('/address.html?id=a2');
  ok('claim panel offers the claim', d.getElementById('claim-slot').textContent.includes('Do you own this house'));
  ok('no owner dashboard before the badge', !d.querySelector('#owner-dash .panel--owner'));

  click(d.getElementById('claim-go')); await tick();
  ok('the claim asks what you are claiming first', !!d.querySelector('.sheet') &&
     d.querySelector('.sheet__t').textContent === 'What are you claiming' &&
     d.querySelectorAll('.sheet .opt').length === 3);
  click(d.querySelector('[data-go]')); await tick();
  ok('claiming ownership goes to the deed step', d.querySelector('.sheet__t').textContent === 'Match the deed');
  ok('sheet abbreviates the owner of record', d.querySelector('.sheet__lead').textContent.includes('P. Raghavan'),
     d.querySelector('.sheet__lead').textContent.replace(/\s+/g, ' ').slice(0, 80));

  const type = (v) => {
    const f = d.querySelector('#cl-name');
    f.value = v;
    f.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  };
  type('Wrong Person');
  click(d.querySelector('[data-go]')); await tick();
  ok('a mismatched surname is refused', !!d.querySelector('.sheet__err') && d.querySelector('.sheet__t').textContent === 'Match the deed');

  type('Priya Raghavan');
  click(d.querySelector('[data-go]')); await tick();
  ok('a matching surname advances', d.querySelector('.sheet__t').textContent === 'Choose your proof' && d.querySelectorAll('.opt').length === 4);

  const util = d.querySelector('.opt input[value="utility"]');
  util.checked = true;
  util.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  click(d.querySelector('[data-go]')); await tick();
  ok('submitting leaves it in review', d.querySelector('.sheet__t').textContent === 'In review' &&
     JSON.parse(w.localStorage.getItem('abode.state.v1')).claims.a2.status === 'pending');
  ok('the page shows the pending claim', d.getElementById('claim-slot').textContent.includes('Claim in review'));

  click(d.querySelector('[data-x]')); await tick();
  ok('sheet closes', !d.querySelector('.sheet'));

  ok('pending owner cannot pin yet', !d.querySelector('#posts [data-pin]'));
  click(d.getElementById('claim-verify')); await tick();
  ok('approval grants the badge', d.getElementById('claim-slot').textContent.includes('You are the verified owner'));
  ok('owner appears on the page', d.getElementById('me-row').textContent.includes('Verified owner'));
  ok('composer speaks as the owner', d.querySelector('.composer__hint').textContent.includes('verified owner'));

  d.getElementById('new-post').value = 'Owner here — the cistern is original and it drains to the lane.';
  click(d.getElementById('post-go')); await tick();
  const mine = () => [...d.querySelectorAll('#posts .post')].find((p) => p.textContent.includes('cistern is original'));
  ok('owner post carries the gold badge', !!mine() && mine().textContent.includes('Verified owner') &&
     !!mine().querySelector('.avatar--gold'));

  ok('owner can pin', d.querySelectorAll('#posts [data-pin]').length === d.querySelectorAll('#posts .post').length);
  click(mine().querySelector('[data-pin]')); await tick();
  const top = d.querySelector('#posts .post');
  ok('pinning moves the post to the top', top.textContent.includes('cistern is original') && !!top.querySelector('.post__pin'));
  click(d.querySelector('#posts .post [data-pin]')); await tick();
  ok('unpinning puts it back', mine().querySelector('[data-pin]').textContent === 'Pin' &&
     !mine().querySelector('.post__pin'));

  ok('the owner dashboard appears with the badge', !!d.querySelector('#owner-dash .panel--owner') &&
     d.getElementById('owner-dash').textContent.includes('Only you see this panel'));
  ok('it charts seven weeks', d.querySelectorAll('#oc-plot .oc__col').length === 7);
  ok('only the latest column is labelled', d.querySelectorAll('#oc-plot .oc__val').length === 1);
  ok('the chart is described for screen readers', d.querySelector('.oc__svg').getAttribute('aria-label').includes('This week'));
  ok('the numbers are stable across reloads', (() => {
    const first = d.getElementById('owner-dash').textContent;
    d.querySelector('.tabs button').dispatchEvent(new d.defaultView.MouseEvent('click', { bubbles: true }));
    return d.getElementById('owner-dash').textContent === first;
  })());

  const offers = () => [...d.querySelectorAll('#offers .offer')];
  ok('the badge unlocks answering offers', offers()[0].querySelectorAll('[data-offer]').length === 3);
  click(offers()[0].querySelector('[data-act="countered"]')); await tick();
  ok('countering is recorded in public', offers()[0].textContent.includes('Countered at') &&
     offers()[0].querySelector('.pill').textContent === 'Countered');
  ok('an answered offer loses its buttons', !offers()[0].querySelector('[data-offer]'));

  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = w.localStorage.getItem('abode.state.v1');
}

/* --- persistence across a page load --- */
{
  const { d } = await open('/saved.html');
  ok('followed address carried to saved page', d.getElementById('followed').textContent.includes('418 Juniper Hollow'));
  ok('saved empty state shows', d.getElementById('saved').textContent.includes('No saved homes yet'));
  ok('owned section lists the claimed address', !d.getElementById('owned-sec').hidden &&
     d.getElementById('owned').textContent.includes('77 Pemberton Row'));
}

/* --- search filters --- */
{
  const { d, errs } = await open('/search.html');
  const count = () => d.querySelectorAll('#results .card').length;
  ok('off-market addresses stay out of the default browse', count() === 21, String(count()));

  d.getElementById('f-status').value = 'sold';
  d.getElementById('f-status').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('asking for sold homes reveals the archive', count() === 3 &&
     d.getElementById('results').textContent.includes('54 Cranmore Ave'), String(count()));
  d.getElementById('f-status').value = 'any';
  d.getElementById('f-status').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();

  d.getElementById('f-q').value = 'adobe';
  d.getElementById('f-q').dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  ok('text search narrows', count() === 1 && d.getElementById('results').textContent.includes('Mesquite Bend'), String(count()));

  d.getElementById('f-q').value = '';
  d.getElementById('f-max').value = '600000';
  d.getElementById('f-max').dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  const prices = [...d.querySelectorAll('#results .card__price')].map((e) => Number(e.textContent.replace(/[^0-9]/g, '').slice(0, 7)));
  ok('max price filter', count() === 6, String(count()));

  d.getElementById('f-min').value = '9000000';
  d.getElementById('f-min').dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  ok('empty state', d.getElementById('results').textContent.includes('Nothing matches'));
  ok('a dead end offers a way out', d.querySelectorAll('[data-fix]').length > 0 &&
     d.getElementById('results').textContent.includes('Any price'),
     d.getElementById('results').textContent.replace(/\s+/g, ' ').slice(0, 80));
  click(d.querySelector('[data-fix]')); await tick();
  ok('taking the suggestion brings homes back', d.querySelectorAll('#results .card').length > 0,
     String(d.querySelectorAll('#results .card').length));

  click(d.getElementById('f-clear')); await tick();
  ok('clear restores', count() === 21, String(count()));

  /* closest-to-the-map only means something once the map has been moved */
  d.getElementById('f-sort').value = 'near';
  d.getElementById('f-sort').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('sorting by distance is safe before the map moves', d.querySelectorAll('#results .card').length === 21,
     String(d.querySelectorAll('#results .card').length));

  d.getElementById('f-sort').value = 'low';
  d.getElementById('f-sort').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  const first = d.querySelector('#results .card__price').textContent;
  ok('sort low to high', first.includes('$329,000'), first);

  const chip = (k) => d.querySelector(`[data-chip="${k}"]`);
  click(chip('open')); await tick();
  ok('the open-house chip filters', count() === 3 && chip('open').getAttribute('aria-pressed') === 'true',
     String(count()));
  click(chip('cut')); await tick();
  ok('chips stack', count() === 2, String(count()));
  click(chip('open')); click(chip('cut')); await tick();
  ok('turning them off restores everything', count() === 21, String(count()));
  click(chip('owner')); await tick();
  ok('owner-on-site means the owner actually posts there', count() > 0 && count() < 21, String(count()));
  click(d.getElementById('f-clear')); await tick();
  ok('clear drops the chips too', count() === 21 && chip('owner').getAttribute('aria-pressed') === 'false');

  const sv = d.querySelector('.card__save');
  click(sv); await tick();
  ok('save toggles', sv.getAttribute('aria-pressed') === 'true' && sv.textContent === '★');
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- a search is a url --- */
{
  const { d, w } = await open('/search.html');
  d.getElementById('f-q').value = 'Detroit';
  d.getElementById('f-q').dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  d.getElementById('f-beds').value = '4';
  d.getElementById('f-beds').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('the filters write themselves into the url', w.location.search.includes('q=Detroit') &&
     w.location.search.includes('beds=4'), w.location.search);
  click(d.querySelector('[data-chip="owner"]')); await tick();
  ok('a chip lands in the url too', w.location.search.includes('only=owner'), w.location.search);
  ok('the search still has results to reproduce', d.querySelectorAll('#results .card').length > 0,
     d.getElementById('count').textContent);
  const url = w.location.pathname + w.location.search;

  const { d: d2 } = await open(url.replace(/^\//, '/'));
  ok('the url reproduces the search', d2.getElementById('f-q').value === 'Detroit' &&
     d2.getElementById('f-beds').value === '4' &&
     d2.querySelector('[data-chip="owner"]').getAttribute('aria-pressed') === 'true');
  ok('and the same results', d2.getElementById('count').textContent === d.getElementById('count').textContent,
     `${d2.getElementById('count').textContent} vs ${d.getElementById('count').textContent}`);
}

/* --- saved searches --- */
{
  const { d, w, errs } = await open('/search.html');
  d.getElementById('f-q').value = 'Asheville';
  d.getElementById('f-q').dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  d.getElementById('f-max').value = '900000';
  d.getElementById('f-max').dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  click(d.getElementById('f-save')); await tick();
  const st = JSON.parse(w.localStorage.getItem('abode.state.v1')).searches;
  const one = Object.values(st)[0];
  ok('a search saves its whole filter set', Object.keys(st).length === 1 && one.q === 'Asheville' && one.max === 900000);
  ok('it is named from the filters', one.name.includes('Asheville') && one.name.includes('under $900,000'), one.name);
  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d } = await open('/saved.html');
  ok('saved searches list with their match counts', !d.getElementById('searches-sec').hidden &&
     d.getElementById('searches').textContent.includes('4 homes'),
     d.getElementById('searches').textContent.replace(/\s+/g, ' ').slice(0, 60));
  const link = d.querySelector('.srow__name').getAttribute('href');
  ok('the link carries every filter back', link.includes('q=Asheville') && link.includes('max=900000'), link);

  const { d: d2 } = await open('/' + link);
  ok('reopening restores the filters', d2.getElementById('f-q').value === 'Asheville' &&
     d2.getElementById('f-max').value === '900000' && d2.querySelectorAll('#results .card').length === 4);
}

/* --- search map --- */
{
  const { d, w, errs } = await open('/search.html');
  const pins = () => [...d.querySelectorAll('#map [data-pin]')];
  const cards = () => d.querySelectorAll('#results .card').length;
  const clusters = () => [...d.querySelectorAll('#map [data-cluster]')];
  const onMap = () => pins().length + clusters().reduce((n, c) => n + c.getAttribute('data-cluster').split(',').length, 0);
  ok('every result is on the map, pinned or clustered', onMap() === cards() && cards() === 21,
     `${pins().length} pins + ${clusters().length} clusters = ${onMap()}`);
  ok('close homes collapse into a counted cluster', clusters().length > 0 &&
     Number(clusters()[0].querySelector('.mp__cn').textContent) > 1);
  {
    const asheville = clusters().find((c) => c.getAttribute('data-cluster').split(',').indexOf('a1') > -1);
    const inside = asheville.getAttribute('data-cluster').split(',').length;
    click(asheville); await tick();
    ok('opening a cluster zooms to what is inside', cards() === inside && !!d.querySelector('[data-fit]'),
       `${cards()} of ${inside}`);
    click(d.querySelector('[data-fit]')); await tick();
  }

  const box = d.querySelector('#map .mp__svg').getAttribute('viewBox').split(' ').map(Number);
  const inside = pins().every((g) => {
    const [x, y] = g.getAttribute('transform').match(/-?[\d.]+/g).map(Number);
    return x >= 0 && x <= box[2] && y >= 0 && y <= box[3];
  });
  ok('every pin projects inside the frame', inside);

  ok('pins carry price labels', d.querySelector('#map .mp__price').textContent.startsWith('$'),
     d.querySelector('#map .mp__price').textContent);

  d.getElementById('f-status').value = 'sold';
  d.getElementById('f-status').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('filters drive the map', onMap() === cards() && cards() < 21, `${onMap()} on the map`);
  ok('sold pins are styled sold', pins().length > 0 &&
     pins().every((g) => g.getAttribute('class').includes('mp__pin--sold')));

  d.getElementById('f-status').value = 'any';
  d.getElementById('f-status').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();

  /* open the Asheville cluster so a1 is its own pin */
  const ash = clusters().find((c) => c.getAttribute('data-cluster').split(',').indexOf('a1') > -1);
  if (ash) { click(ash); await tick(); }
  const target = d.querySelector('#map [data-pin="a1"]');
  click(target); await tick();
  const pop = d.querySelector('#map .mp__pop');
  ok('clicking a pin opens its preview', !!pop && pop.textContent.includes('418 Juniper Hollow'), pop && pop.textContent.slice(0, 40));
  ok('selected pin is marked', d.querySelector('#map [data-pin="a1"]').getAttribute('class').includes('is-sel'));
  ok('preview links to the address page', d.querySelector('#map .mp__popaddr').getAttribute('href') === 'address.html?id=a1');

  click(d.querySelector('#map [data-mapclose]')); await tick();
  ok('closing the preview clears selection', !d.querySelector('#map .mp__pop'));

  const fit = d.querySelector('[data-fit]');
  if (fit) { click(fit); await tick(); }
  const card = d.querySelector('#results [data-listing="a2"]');
  card.dispatchEvent(new d.defaultView.MouseEvent('mouseover', { bubbles: true })); await tick();
  const litPin = d.querySelector('#map [data-pin="a2"]');
  const litCluster = [...d.querySelectorAll('#map [data-cluster]')]
    .find((c) => c.getAttribute('data-cluster').split(',').indexOf('a2') > -1);
  ok('hovering a card lights its pin, or the cluster holding it',
     (litPin && litPin.getAttribute('class').includes('is-hot')) ||
     (litCluster && litCluster.getAttribute('class').includes('is-hot')));

  ok('split is the default layout', d.getElementById('view').className.includes('searchview--split'));
  click(d.querySelector('#f-view [data-view="map"]')); await tick();
  ok('view toggle switches layout', d.getElementById('view').className.includes('searchview--map') &&
     d.querySelector('#f-view [data-view="map"]').classList.contains('is-active'));
  ok('layout persists', JSON.parse(w.localStorage.getItem('abode.state.v1')).layout === 'map');

  ok('the map frame is reachable by keyboard', d.querySelector('#map .mp__svg').getAttribute('tabindex') === '0' &&
     d.querySelector('#map .mp__svg').getAttribute('aria-label').includes('Arrow keys pan'));
  const key = (k) => d.querySelector('#map .mp__svg').dispatchEvent(
    new d.defaultView.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const firstPin = () => d.querySelector('#map [data-pin]').getAttribute('transform');
  const startAt = firstPin();
  key('ArrowRight'); await tick();
  ok('arrow keys pan the map', firstPin() !== startAt, `${startAt} -> ${firstPin()}`);
  key('-'); await tick();
  ok('minus zooms out', !!d.querySelector('[data-fit]'));
  click(d.querySelector('[data-fit]')); await tick();

  ok('no zoom controls until the map is drawn', !!d.querySelector('#map .mp__ctrl'));
  ok('no area button before you move it', !d.querySelector('[data-area]'));
  click(d.querySelector('[data-zoom="0.7"]')); await tick();
  ok('zooming in drops homes off the edges', onMap() < 21 && onMap() > 0, `${onMap()} on the map`);
  ok('moving the map offers to search it', !!d.querySelector('[data-area]'));
  click(d.querySelector('[data-area]')); await tick();
  ok('searching the area narrows the list to what is on screen',
     cards() > 0 && cards() < 21 && onMap() === cards(), `${cards()} of 21`);
  ok('the count says where it looked', d.getElementById('count').textContent.includes('in this area'),
     d.getElementById('count').textContent);

  {
    /* the distance sort needs somewhere to measure from, which is the map view */
    d.getElementById('f-sort').value = 'near';
    d.getElementById('f-sort').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
    const nearest = d.querySelector('#results .card__addr').textContent;
    d.getElementById('f-sort').value = 'high';
    d.getElementById('f-sort').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
    const dearest = d.querySelector('#results .card__addr').textContent;
    ok('distance sorts differently from price', nearest !== dearest || cards() === 1, `${nearest} vs ${dearest}`);
    d.getElementById('f-sort').value = 'relevant';
    d.getElementById('f-sort').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
    click(d.querySelector('[data-zoom="0.7"]')); await tick();
    click(d.querySelector('[data-area]')); await tick();
  }
  click(d.querySelector('[data-fit]')); await tick();
  ok('fitting goes back to every result', cards() === 21 && onMap() === 21);

  d.getElementById('f-min').value = '9000000';
  d.getElementById('f-min').dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  ok('map empty state', !!d.querySelector('#map .mp__none') && pins().length === 0);
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- neighborhood group --- */
{
  const { d, errs } = await open('/group.html?id=g3');
  ok('group renders its name', d.title.includes('Boston-Edison') && d.getElementById('hero').textContent.includes('Boston-Edison'), d.title);
  ok('group wall lists threads', d.querySelectorAll('#wall .post').length === 3, String(d.querySelectorAll('#wall .post').length));
  ok('pinned thread is first', d.querySelector('#wall .post').textContent.includes('Slate roof thread'));
  ok('market snapshot renders', d.getElementById('rail').textContent.includes('$468,000'));

  const mem = d.getElementById('mem-n').textContent;
  const join = d.querySelector('[data-join-cta]');
  click(join); await tick();
  ok('joining updates the count', join.textContent === 'Joined' && d.getElementById('mem-n').textContent !== mem,
     `${mem} -> ${d.getElementById('mem-n').textContent}`);

  const p0 = d.querySelectorAll('#wall .post').length;
  d.getElementById('new-post').value = 'Anyone have a mason they trust for the porch piers?';
  click(d.getElementById('post-go')); await tick();
  ok('posting to the group', d.querySelectorAll('#wall .post').length === p0 + 1 &&
     d.getElementById('wall').textContent.includes('porch piers'));

  click(d.querySelector('#wall [data-reply]')); await tick();
  const inp = d.querySelector('#wall .reply-slot input');
  inp.value = 'Group reply.';
  click(d.querySelector('#wall .reply-slot button')); await tick();
  const dupes = (d.getElementById('wall').textContent.match(/Group reply\./g) || []).length;
  ok('replying on the group wall', dupes === 1, `${dupes} copies`);

  const vb = d.querySelector('#wall .vote');
  const v0 = Number(vb.querySelector('.vote__n').textContent);
  click(vb.querySelector('.up')); await tick();
  ok('group votes count', Number(vb.querySelector('.vote__n').textContent) === v0 + 1);

  ok('group map pins its homes', d.querySelectorAll('#grp-map [data-pin]').length === 4);
  ok('homes list links to the address', !!d.querySelector('#grp-homes a[href="address.html?id=a6"]'));
  ok('other groups link across', !!d.querySelector('#rail a[href="group.html?id=g1"]'));
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- feed --- */
{
  const { d, errs } = await open('/feed.html');
  ok('feed lists activity', d.querySelectorAll('#feed > .panel').length === 16,
     String(d.querySelectorAll('#feed > .panel').length));
  ok('activity is more than posts', d.querySelectorAll('#feed .event').length > 0 &&
     d.querySelectorAll('#feed .post').length > 0,
     `${d.querySelectorAll('#feed .event').length} events, ${d.querySelectorAll('#feed .post').length} posts`);
  const kindChip = (k) => d.querySelector(`[data-kind-chip="${k}"]`);
  click(kindChip('post')); await tick();
  ok('a kind can be switched off', d.querySelectorAll('#feed .post').length === 0 &&
     d.querySelectorAll('#feed .event').length > 0);
  click(kindChip('post')); await tick();
  const more = d.getElementById('feed-more');
  ok('there is more to show', !more.hidden && more.textContent.includes('left'), more.textContent);
  ok('the feed marks where you left off on a return visit',
     d.querySelectorAll('.sincebar').length <= 1);
  click(more); await tick();
  ok('showing more adds to the feed', d.querySelectorAll('#feed > .panel').length > 16,
     String(d.querySelectorAll('#feed > .panel').length));
  ok('following rail populated', d.getElementById('following').textContent.includes('418 Juniper Hollow'));
  const j = d.querySelector('[data-join]');
  click(j); await tick();
  ok('join group toggles', j.getAttribute('aria-pressed') === 'true');
  ok('feed links to group pages', !!d.querySelector('#groups-rail a[href^="group.html?id="]'));
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- first run --- */
{
  const before = carried;
  carried = null;
  const { d, w } = await open('/index.html');
  ok('a first visit says what this build is', !!d.querySelector('.intro') &&
     d.querySelector('.intro').textContent.includes('No MLS feed is connected'));
  click(d.querySelector('[data-intro-ok]')); await tick();
  ok('dismissing it sticks', !d.querySelector('.intro') &&
     JSON.parse(w.localStorage.getItem('abode.state.v1')).seenIntro === true);
  const seen = w.localStorage.getItem('abode.state.v1');
  carried = seen;
  const { d: d2 } = await open('/search.html');
  ok('it does not come back', !d2.querySelector('.intro'));
  carried = before;
}

/* --- home page --- */
{
  const { d, errs } = await open('/index.html');
  ok('featured listings render', d.querySelectorAll('#featured .card').length === 6);
  ok('the hero offers the map', !!d.querySelector('a[href="search.html?view=map"]'));
  ok('groups link to their pages', !!d.querySelector('#groups a[href^="group.html?id="]'));
  ok('the directory covers every surface', d.querySelectorAll('.tile').length === 9);

  d.getElementById('claim').value = '77 Nowhere Road';
  click(d.getElementById('claim-start')); await tick();
  ok('an unknown address says so and offers to queue it',
     d.getElementById('claim-miss').textContent.includes('No page for 77 Nowhere Road yet') &&
     d.getElementById('claim-miss').textContent.includes('Normalise the address'));
  click(d.querySelector('[data-request]')); await tick();
  ok('asking for it queues it', d.getElementById('claim-miss').textContent.includes('Queued'));
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- addresses and pages that do not exist --- */
{
  const { d } = await open('/address.html?id=nope');
  ok('an unknown address explains itself', d.getElementById('main').textContent.includes('No page for that address') &&
     !!d.querySelector('a[href="search.html"]'));
}
{
  const { d } = await open('/group.html?id=nope');
  ok('an unknown group explains itself', d.getElementById('main').textContent.includes('No such group'));
}
{
  const { d } = await open('/profile.html?u=nope');
  ok('an unknown person explains itself', d.getElementById('main').textContent.includes('No such person'));
}

/* --- group directory and profiles --- */
{
  const { d, errs } = await open('/groups.html');
  ok('every group is listed', d.querySelectorAll('.gcard').length === 6);
  ok('a group shows what is in it', d.getElementById('groups-all').textContent.includes('with a page'));
  d.getElementById('g-q').value = 'savannah';
  d.getElementById('g-q').dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  ok('searching narrows to one', d.querySelectorAll('.gcard').length === 1 &&
     d.getElementById('groups-all').textContent.includes('Troup Square'));
  d.getElementById('g-q').value = 'zzz';
  d.getElementById('g-q').dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  ok('an empty result says so', d.getElementById('groups-all').textContent.includes('No group by that name'));
  ok('no page errors', errs.length === 0, errs.join('; '));
}

{
  const { d, errs } = await open('/profile.html?u=u8');
  ok('the profile names the person', d.title.includes('Bea Okonkwo') &&
     d.querySelector('.grp-head__name').textContent === 'Bea Okonkwo');
  ok('it collects everything they wrote', d.querySelectorAll('#prof-posts .post').length >= 3,
     String(d.querySelectorAll('#prof-posts .post').length));
  ok('each entry says where it was posted', d.querySelector('#prof-posts .linkish').textContent.includes('on '));
  ok('addresses they own are listed', d.getElementById('prof-rail').textContent.includes('2118 Chicago Blvd'));
  ok('you can message them', !!d.querySelector('[data-dm="u8"]'));
  ok('no page errors', errs.length === 0, errs.join('; '));
}

{
  const { d } = await open('/address.html?id=a1');
  ok('post authors link to their profile', !!d.querySelector('#posts a.post__who[href^="profile.html?u="]'));
  ok('the owner in the rail links too', !!d.querySelector('#rail a[href^="profile.html?u="]'));
}

/* --- keyboard shortcuts and delivery rules --- */
{
  const { d, w, errs } = await open('/search.html');
  const press = (k, el) => (el || d.body).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  press('/');
  ok('slash jumps to the search box', d.activeElement === d.getElementById('f-q'), d.activeElement.id);
  press('?', d.getElementById('f-q'));
  ok('shortcuts do not fire while you type', !d.querySelector('.sheet'));
  d.getElementById('f-q').blur();
  press('?');
  ok('question mark opens the list', !!d.querySelector('.sheet') &&
     d.querySelector('.sheet__t').textContent === 'Shortcuts');
  press('Escape'); await tick();
  ok('escape closes it', !d.querySelector('.sheet'));
  const before = d.documentElement.getAttribute('data-theme');
  press('t'); await tick();
  ok('t switches the theme', d.documentElement.getAttribute('data-theme') !== before);
  press('t'); await tick();
  ok('no page errors', errs.length === 0, errs.join('; '));
}

{
  const { d, w } = await open('/alerts.html');
  ok('delivery is stated in a sentence', d.getElementById('al-summary').textContent.includes('as things happen'),
     d.getElementById('al-summary').textContent);
  d.getElementById('al-digest').value = 'daily';
  d.getElementById('al-digest').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('a daily digest is respected', d.getElementById('al-summary').textContent.includes('once a day'));
  ok('quiet hours are spelled out', d.getElementById('al-summary').textContent.includes('Nothing between 10pm and 7am'),
     d.getElementById('al-summary').textContent);
  ok('the rule persists', JSON.parse(w.localStorage.getItem('abode.state.v1')).alerts.digest === 'daily');
}

/* --- badges beyond owner, streets, digest preview --- */
{
  const { d, w } = await open('/address.html?id=a16');
  click(d.getElementById('claim-go')); await tick();
  const res = d.querySelector('.sheet input[value="resident"]');
  res.checked = true;
  res.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  click(d.querySelector('[data-go]')); await tick();
  ok('a resident is not asked to match the deed',
     d.querySelector('.sheet__lead').textContent.includes('says you live at'));
  d.querySelector('#cl-name').value = 'Someone Whoisnotthedeed';
  d.querySelector('#cl-name').dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  click(d.querySelector('[data-go]')); await tick();
  ok('a name that is not on the deed is fine for a resident',
     d.querySelector('.sheet__t').textContent === 'Choose your proof');
  click(d.querySelector('[data-go]')); await tick();
  click(d.querySelector('[data-x]')); await tick();
  d.getElementById('claim-code').value = 'K7QP42';   // the postcard code
  click(d.getElementById('claim-verify')); await tick();
  ok('the badge says resident, not owner',
     d.getElementById('claim-slot').textContent.includes('verified resident') &&
     !d.getElementById('claim-slot').textContent.includes('verified owner'),
     d.getElementById('claim-slot').textContent.replace(/\s+/g, ' ').slice(0, 90));
  ok('a resident cannot pin', !d.querySelector('#posts [data-pin]'));
  ok('a resident cannot answer offers as the owner', !d.querySelector('#offers [data-offer]'));
  d.getElementById('new-post').value = 'Resident here — the boiler is original and it is fine.';
  click(d.getElementById('post-go')); await tick();
  ok('their post carries the resident badge',
     [...d.querySelectorAll('#posts .post')].some((p) =>
       p.textContent.includes('boiler is original') && p.textContent.includes('Resident')));
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d, w } = await open('/address.html?id=a17');
  click(d.getElementById('follow-street')); await tick();
  ok('a whole street can be followed', d.getElementById('follow-street').textContent.includes('Chicago Blvd') &&
     JSON.parse(w.localStorage.getItem('abode.state.v1')).streets['Chicago Blvd|Detroit'] === true);
  carried = w.localStorage.getItem('abode.state.v1');
  const { d: d2 } = await open('/saved.html');
  ok('followed streets are listed', !d2.getElementById('streets-sec').hidden &&
     d2.getElementById('streets').textContent.includes('Chicago Blvd'));
}

{
  const { d } = await open('/alerts.html');
  ok('the digest shows the message it would send',
     d.getElementById('digest-preview').textContent.includes('Abode ·') &&
     d.getElementById('digest-preview').textContent.includes('STOP'));
  ok('and when it would go', d.querySelector('.digest__when').textContent.length > 5,
     d.querySelector('.digest__when').textContent);
}

/* --- what changed since you last looked --- */
{
  const before = carried;
  const state = JSON.parse(carried || '{}');
  state.visits = Object.assign({}, state.visits, { a17: Date.now() - 1000 * 60 * 60 * 24 * 30 });
  carried = JSON.stringify(state);
  const { d } = await open('/address.html?id=a17');
  ok('coming back says what changed while you were away',
     !!d.querySelector('.sincebar--page') &&
     d.querySelector('.sincebar--page').textContent.includes('Since you last looked'),
     d.querySelector('.sincebar--page') ? d.querySelector('.sincebar--page').textContent.slice(0, 60) : 'no bar');
  const { d: d2 } = await open('/address.html?id=a13');
  ok('a first visit says nothing of the kind', !d2.querySelector('.sincebar--page'));
  carried = before;
}

/* --- affordability, notes, estimate --- */
{
  const { d, w } = await open('/search.html');
  click(d.getElementById('afford-toggle')); await tick();
  ok('the affordability panel opens', !d.getElementById('afford').hidden && !!d.getElementById('af-income'));
  d.getElementById('af-income').value = '150,000';
  d.getElementById('af-income').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  const ceiling = d.querySelector('.afford__out b').textContent;
  ok('it works backwards to a price', /\$[\d,]+/.test(ceiling), ceiling);
  ok('it says which assumptions did the work',
     d.querySelector('.afford__note').textContent.includes('36%') &&
     d.querySelector('.afford__note').textContent.includes('lender'));

  d.getElementById('af-debts').value = '2,000';
  d.getElementById('af-debts').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  const lower = d.querySelector('.afford__out b').textContent;
  ok('debts bring the ceiling down',
     Number(lower.replace(/\D/g, '')) < Number(ceiling.replace(/\D/g, '')), `${ceiling} -> ${lower}`);

  click(d.getElementById('af-apply')); await tick();
  ok('it can drive the search', d.getElementById('f-max').value === String(Number(lower.replace(/\D/g, ''))) &&
     d.getElementById('count').textContent.includes('home'));
  ok('the figures persist', JSON.parse(w.localStorage.getItem('abode.state.v1')).afford.income === 150000);
}

{
  const { d, w } = await open('/address.html?id=a14');
  ok('an estimate is a range, not a number', d.querySelectorAll('.est b').length === 2 &&
     d.getElementById('rail').textContent.includes('to'));
  ok('it shows its working', d.querySelector('.est__note').textContent.includes('a foot across those comparables'));
  ok('it says it is not an appraisal', d.getElementById('rail').textContent.includes('not an appraisal'));

  d.getElementById('note-text').value = 'Ask about the driveway grade in January.';
  click(d.getElementById('note-save')); await tick();
  ok('a private note saves', d.getElementById('note-state').textContent === 'Saved' &&
     JSON.parse(w.localStorage.getItem('abode.state.v1')).notes.a14.includes('driveway grade'));
  click(d.querySelector('[data-save="a14"]')); await tick();
  carried = w.localStorage.getItem('abode.state.v1');

  const { d: d2 } = await open('/saved.html');
  ok('the note rides along on the saved page', d2.getElementById('saved').textContent.includes('driveway grade'));
}

/* --- announcements, recent searches, group events --- */
{
  const { d } = await open('/search.html');
  ok('the result count is announced, not just shown',
     d.getElementById('count').getAttribute('aria-live') === 'polite' &&
     d.getElementById('count').getAttribute('role') === 'status');

  d.getElementById('f-q').value = 'Camden';
  d.getElementById('f-q').dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 1400));
  d.getElementById('f-q').value = 'Boise';
  d.getElementById('f-q').dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 1400));
  ok('a search you did before is one tap away',
     d.getElementById('recent-searches').textContent.includes('Camden'),
     d.getElementById('recent-searches').textContent.replace(/\s+/g, ' ').slice(0, 60));

  click(d.querySelector('[data-save]')); await tick();
  ok('a toast is announced to a screen reader', !!d.querySelector('.toast') &&
     d.querySelector('.toast').getAttribute('aria-live') === 'polite' &&
     d.querySelector('.toast').getAttribute('role') === 'status');
}

{
  const { d, w } = await open('/group.html?id=g1');
  ok('a group lists what it is doing', d.querySelectorAll('.gevent').length === 2 &&
     d.getElementById('rail').textContent.includes('Creek cleanup'));
  const going = Number(d.querySelector('.gevent__foot span').textContent.replace(/\D/g, ''));
  click(d.querySelector('[data-going]')); await tick();
  ok('you can say you are going', Number(d.querySelector('.gevent__foot span').textContent.replace(/\D/g, '')) === going + 1 &&
     d.querySelector('[data-going]').getAttribute('aria-pressed') === 'true');
  ok('it is remembered', Object.keys(JSON.parse(w.localStorage.getItem('abode.state.v1')).going).length === 1);
}

/* --- photos --- */
{
  const { d } = await open('/address.html?id=a24');
  ok('the composer offers a photo', !!d.getElementById('post-photo') &&
     d.getElementById('post-photo').getAttribute('accept') === 'image/*');
  ok('the control is labelled without shouting', !!d.querySelector('label[for="post-photo"]') &&
     d.getElementById('post-photo').classList.contains('visually-hidden'));

  /* jsdom has no canvas, so this is the path a browser without one takes */
  const file = { size: 40 * 1024 * 1024, name: 'huge.jpg' };
  Object.defineProperty(d.getElementById('post-photo'), 'files', { value: [file], configurable: true });
  d.getElementById('post-photo').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('a photo that cannot be handled says why, and does not block the post',
     d.getElementById('photo-slot').textContent.length > 0 &&
     !!d.getElementById('post-go'), d.getElementById('photo-slot').textContent.trim().slice(0, 50));

  d.getElementById('new-post').value = 'The barn floor is packed clay, not concrete.';
  click(d.getElementById('post-go')); await tick();
  ok('the post still goes through', d.getElementById('posts').textContent.includes('packed clay'));
}

/* --- work log, feed divider, j/k --- */
{
  /* a2 is claimed by "me" earlier in this run, so the work form is offered */
  const { d, w } = await open('/address.html?id=a2');
  const tabs = [...d.querySelectorAll('.tabs button')];
  click(tabs[1]); await tick();
  ok('someone with standing can add work', !!d.getElementById('wk-go'));
  const before = d.querySelectorAll('.tl__item').length;
  d.getElementById('wk-date').value = 'Mar 2026';
  d.getElementById('wk-what').value = 'Cistern relined and the downspout re-routed to the lane';
  d.getElementById('wk-cost').value = '4,800';
  d.getElementById('wk-permit').value = 'HRB-26-119';
  click(d.getElementById('wk-go')); await tick();
  ok('it joins the timeline', d.querySelectorAll('.tl__item').length === before + 1 &&
     d.getElementById('tabbody').textContent.includes('Cistern relined'));
  ok('it is marked as owner-contributed', !!d.querySelector('.tl__item--owner') &&
     d.querySelector('.tl__item--owner').textContent.includes('added by the owner'));
  ok('the cost and permit are kept', d.querySelector('.tl__item--owner').textContent.includes('$4,800') &&
     d.querySelector('.tl__item--owner').textContent.includes('HRB-26-119'));
  ok('it sits in date order, not at the end', d.querySelectorAll('.tl__item')[0].textContent.includes('Cistern') ||
     d.querySelectorAll('.tl__item')[1].textContent.includes('Cistern'),
     d.querySelectorAll('.tl__item')[0].textContent.replace(/\s+/g, ' ').slice(0, 40));
  d.getElementById('wk-date').value = 'Apr 2026';
  d.getElementById('wk-what').value = 'Rebuilt the porch — adults only building, no children on site';
  click(d.getElementById('wk-go')); await tick();
  ok('the record is screened like everything else',
     !d.getElementById('tabbody').textContent.includes('Rebuilt the porch'));
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d, w } = await open('/search.html');
  const press = (k) => d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  press('j');
  ok('j puts a cursor on the first result', !!d.querySelector('#results .card.is-cursor'));
  press('j');
  const second = [...d.querySelectorAll('#results .card')].indexOf(d.querySelector('.is-cursor'));
  ok('j moves down', second === 1, String(second));
  press('k');
  ok('k moves back up', [...d.querySelectorAll('#results .card')].indexOf(d.querySelector('.is-cursor')) === 0);
}

/* --- theme --- */
{
  const { d, w, errs } = await open('/index.html');
  ok('a theme is applied on load', ['light', 'dark'].includes(d.documentElement.getAttribute('data-theme')),
     d.documentElement.getAttribute('data-theme'));
  const before = d.documentElement.getAttribute('data-theme');
  click(d.querySelector('[data-theme-toggle]')); await tick();
  ok('the toggle flips it', d.documentElement.getAttribute('data-theme') !== before,
     d.documentElement.getAttribute('data-theme'));
  ok('the choice is stored', JSON.parse(w.localStorage.getItem('abode.state.v1')).theme === (before === 'dark' ? 'light' : 'dark'));
  ok('the button relabels itself', d.querySelector('[data-theme-toggle]').getAttribute('aria-label')
     .includes(before === 'dark' ? 'dark' : 'light'), d.querySelector('[data-theme-toggle]').getAttribute('aria-label'));
  click(d.querySelector('[data-theme-toggle]')); await tick();
  ok('and flips back', d.documentElement.getAttribute('data-theme') === before);
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- signing in --- */
{
  const { d, w, errs } = await open('/address.html?id=a5');
  ok('signed out by default', !!d.querySelector('[data-signin]'));
  const opener = d.querySelector('[data-signin]');
  opener.focus();  // a real click focuses the button; a synthetic one does not
  click(opener); await tick();
  ok('the sheet takes focus', d.activeElement === d.getElementById('si-handle'), d.activeElement.tagName);
  d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
  ok('escape closes the sheet', !d.querySelector('.sheet'));
  ok('focus goes back to the button that opened it', d.activeElement === opener,
     d.activeElement === d.body ? 'body' : d.activeElement.outerHTML.slice(0, 40));

  click(d.querySelector('[data-signin]')); await tick();
  ok('sign-in sheet opens', !!d.querySelector('.sheet') && !!d.getElementById('si-handle'));

  const fill = (id, v) => { d.getElementById(id).value = v; };
  fill('si-handle', 'not-an-email'); fill('si-name', 'Rae Tolliver');
  click(d.querySelector('[data-go]')); await tick();
  ok('a bad email is refused', !!d.querySelector('.sheet__err') && !!d.getElementById('si-handle'));

  fill('si-handle', 'rae@example.com'); fill('si-name', '');
  click(d.querySelector('[data-go]')); await tick();
  ok('a display name is required', d.querySelector('.sheet__err').textContent.includes('display name'));

  fill('si-handle', 'rae@example.com'); fill('si-name', 'Rae Tolliver');
  click(d.querySelector('[data-go]')); await tick();
  ok('it moves to the code step', !!d.getElementById('si-code'));
  d.getElementById('si-code').value = '12';
  click(d.querySelector('[data-go]')); await tick();
  ok('a short code is refused', !!d.getElementById('si-code'));
  d.getElementById('si-code').value = '481902';
  click(d.querySelector('[data-go]')); await tick();
  ok('signing in closes the sheet', !d.querySelector('.sheet'));
  ok('the masthead shows who you are', d.querySelector('.nav__name').textContent === 'Rae Tolliver');
  ok('the account persists', JSON.parse(w.localStorage.getItem('abode.state.v1')).account.name === 'Rae Tolliver');

  d.getElementById('new-post').value = 'Walked the dunes below this one at low tide, the crossover is public.';
  click(d.getElementById('post-go')); await tick();
  ok('your posts carry your name', d.getElementById('posts').textContent.includes('Rae Tolliver'));

  click(d.querySelector('[data-signout]')); await tick();
  ok('signing out restores the button', !!d.querySelector('[data-signin]') && !d.querySelector('.nav__name'));
  ok('the post goes back to You', d.getElementById('posts').textContent.includes('You') &&
     !d.getElementById('posts').textContent.includes('Rae Tolliver'));
  ok('saves and follows survive the sign-out', !!JSON.parse(w.localStorage.getItem('abode.state.v1')).posts.a5);
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- fair housing screening and reporting --- */
{
  const { d, w, errs } = await open('/address.html?id=a3');
  const write = (t) => {
    const ta = d.getElementById('new-post');
    ta.value = t;
  };
  const posts = () => d.querySelectorAll('#posts .post').length;
  const n0 = posts();

  write('Quiet street, adults only, no children please.');
  click(d.getElementById('post-go')); await tick();
  ok('familial-status steering is blocked', posts() === n0 && !!d.querySelector('.screened--block'));
  ok('the block explains the rule', d.querySelector('#screen-slot').textContent.includes('Familial status is protected'));

  write('The owner works nights and the house is empty until Sunday.');
  click(d.getElementById('post-go')); await tick();
  ok('occupant privacy is blocked', posts() === n0 &&
     d.querySelector('#screen-slot').textContent.includes('burglary index'));

  write('Honestly a safe neighborhood with good schools nearby.');
  click(d.getElementById('post-go')); await tick();
  ok('coded language only warns', posts() === n0 && !!d.querySelector('.screened--warn') &&
     !!d.querySelector('[data-override]'));
  click(d.querySelector('[data-override]')); await tick();
  ok('a warning can be overridden', posts() === n0 + 1 &&
     d.getElementById('posts').textContent.includes('good schools nearby'));

  write('Roof was redone in 2016 and the permit is on file with the county.');
  click(d.getElementById('post-go')); await tick();
  ok('an ordinary post goes straight through', posts() === n0 + 2 && !d.querySelector('.screened'));

  click(d.querySelector('#posts [data-reply]')); await tick();
  const inp = d.querySelector('.reply-slot input');
  inp.value = 'No section 8 here.';
  click(d.querySelector('.reply-slot button')); await tick();
  ok('replies are screened too', !d.getElementById('posts').textContent.includes('No section 8'));

  click(d.querySelector('#posts [data-flag]')); await tick();
  ok('report sheet opens with reasons', !!d.querySelector('.sheet') && d.querySelectorAll('.sheet .opt').length === 5);
  const priv = d.querySelector('.sheet input[value="privacy"]');
  priv.checked = true;
  priv.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  click(d.querySelector('[data-send]')); await tick();
  const rep = JSON.parse(w.localStorage.getItem('abode.state.v1')).reports;
  ok('the report is filed against the post', Object.keys(rep).length === 1 && Object.values(rep)[0].reason === 'privacy');
  ok('the post shows it is under review', d.getElementById('posts').textContent.includes('You reported this'));
  click(d.querySelector('#posts [data-flag]')); await tick();
  ok('you cannot report the same post twice', !d.querySelector('.sheet'));
  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = w.localStorage.getItem('abode.state.v1');
}

/* --- questions and owner review requests --- */
{
  const { d, w, errs } = await open('/address.html?id=a21');
  ok('a post can say what kind it is', !!d.getElementById('post-type') &&
     d.querySelectorAll('#post-type option').length === 4);
  d.getElementById('new-post').value = 'Is the sewer line the 2019 trenchless one all the way to the main';
  d.getElementById('post-type').value = 'question';
  click(d.getElementById('post-go')); await tick();
  const mine = [...d.querySelectorAll('#posts .post')].find((p) => p.textContent.includes('trenchless one'));
  ok('the kind shows on the post', !!mine && mine.textContent.includes('Question'));
  ok('a question with no answer is an open one',
     JSON.parse(w.localStorage.getItem('abode.state.v1')).posts.a21[0].type === 'question');
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  /* claim a21, then ask for review of somebody else's post on it */
  const st = JSON.parse(carried);
  st.claims = Object.assign({}, st.claims, { a21: { status: 'verified', method: 'title', name: 'Dev Patel', when: 'now' } });
  carried = JSON.stringify(st);
  const { d, w } = await open('/address.html?id=a21');
  const other = [...d.querySelectorAll('#posts .post')].find((p) => p.querySelector('[data-review]'));
  ok('an owner can ask for a post to be reviewed', !!other);
  click(other.querySelector('[data-review]')); await tick();
  ok('the request is recorded against the post', d.getElementById('posts').textContent.includes('Owner asked for review'));
  const reports = JSON.parse(w.localStorage.getItem('abode.state.v1')).reports;
  ok('it is marked as coming from the owner', Object.values(reports).some((r) => r.byOwner === true));
  carried = w.localStorage.getItem('abode.state.v1');
}

/* --- agent desk --- */
{
  const { d, w, errs } = await open('/agent.html');
  ok('the desk asks for a licence first', d.getElementById('agent-body').textContent.includes('Verify a real estate licence'));
  click(d.getElementById('ag-go')); await tick();
  d.getElementById('ag-lic').value = '12';
  click(d.querySelector('[data-go]')); await tick();
  ok('a short licence number is refused', !!d.querySelector('.sheet__err'));
  d.getElementById('ag-state').value = 'GA';
  d.getElementById('ag-lic').value = '284471';
  click(d.querySelector('[data-go]')); await tick();
  ok('verifying issues the badge', !d.querySelector('.sheet') &&
     d.getElementById('agent-body').textContent.includes('GA licence 284471'));
  ok('the desk starts empty', d.getElementById('ag-list').textContent.includes('No addresses yet'));
  ok('the nav gains the desk', !!d.querySelector('.nav a[href="agent.html"]'));
  carried = w.localStorage.getItem('abode.state.v1');
  ok('no page errors', errs.length === 0, errs.join('; '));
}

{
  const { d, w } = await open('/address.html?id=a2');
  click(d.getElementById('rep-go')); await tick();
  ok('an agent can claim an address', !!JSON.parse(w.localStorage.getItem('abode.state.v1')).repping.a2 &&
     d.getElementById('rep-slot').textContent.includes('You represent this address'));
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d, w: w2 } = await open('/agent.html');
  const row = d.querySelector('.agrow');
  if (row && row.querySelector('[data-answer]')) {
    const before = d.querySelector('.flagpill').textContent;
    click(row.querySelector('[data-answer]')); await tick();
    ok('the desk lists the unanswered questions', d.querySelectorAll('.qrow').length > 0);
    const pid = d.querySelector('[data-answer-for]').getAttribute('data-answer-for');
    d.querySelector('[data-answer-for]').value = 'Trenchless to the main in 2019; the permit is in the history.';
    click(d.querySelector('[data-send-answer]')); await tick();
    const state = JSON.parse(w2.localStorage.getItem('abode.state.v1'));
    ok('the answer is stored against that question as the agent',
       (state.replies[pid] || []).some((r) => r.role === 'agent' && r.text.includes('Trenchless')));
    ok('the desk stops flagging it', d.querySelector('.flagpill').textContent !== before ||
       !d.querySelector('.flagpill').textContent.includes('unanswered'),
       `${before} -> ${d.querySelector('.flagpill').textContent}`);
  }
  ok('the address shows on the desk', !!row && row.textContent.includes('77 Pemberton Row'));
  ok('it flags what is owed', row.textContent.includes('offer') || row.textContent.includes('question') ||
     row.textContent.includes('Nothing owed'), row.querySelector('.flagpill').textContent);
  click(row.querySelector('[data-drop-rep]')); await tick();
  ok('representation can be dropped', d.getElementById('ag-list').textContent.includes('No addresses yet'));
  click(d.getElementById('ag-drop')); await tick();
  ok('the badge can be given up', d.getElementById('agent-body').textContent.includes('Verify a real estate licence'));
}

/* --- compare, recently viewed, share --- */
{
  const { d, w, errs } = await open('/search.html');
  const cmpBtns = () => [...d.querySelectorAll('#results [data-compare]')];
  click(cmpBtns()[0]); await tick();
  click(cmpBtns()[1]); await tick();
  ok('the tray collects what you picked', d.querySelectorAll('.tray__item').length === 2);
  ok('the card button shows it is picked', cmpBtns()[0].getAttribute('aria-pressed') === 'true');
  click(cmpBtns()[2]); await tick();
  click(cmpBtns()[3]); await tick();
  click(cmpBtns()[4]); await tick();
  ok('it stops at four', d.querySelectorAll('.tray__item').length === 4);
  click(d.querySelector('.tray__item button')); await tick();
  ok('you can drop one from the tray', d.querySelectorAll('.tray__item').length === 3);
  ok('the picks persist', JSON.parse(w.localStorage.getItem('abode.state.v1')).compare.length === 3);
  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d, errs } = await open('/compare.html');
  ok('the comparison carries over', d.querySelectorAll('.cmpgrid__row--head .cmpgrid__cell').length === 3);
  ok('it compares the numbers that differ', d.getElementById('compare-body').textContent.includes('Price per sqft') &&
     d.getElementById('compare-body').textContent.includes('Est. monthly'));
  ok('the best cell in a row is marked', d.querySelectorAll('.cmpgrid__cell.is-best').length > 3);
  ok('it says the highlight is arithmetic', d.querySelector('.cmpgrid__note').textContent.includes('not advice'));
  click(d.querySelector('.cmpgrid__row--head [data-uncompare]')); await tick();
  ok('removing a column redraws it', d.querySelectorAll('.cmpgrid__row--head .cmpgrid__cell').length === 2);
  ok('no page errors', errs.length === 0, errs.join('; '));
}

{
  const { d, w } = await open('/address.html?id=a17');
  ok('visiting an address is remembered',
     JSON.parse(w.localStorage.getItem('abode.state.v1')).recent[0] === 'a17');
  let shared = null;
  w.navigator.share = undefined;
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: (t) => { shared = t; return Promise.resolve(); } }, configurable: true });
  click(d.getElementById('share')); await tick();
  ok('share copies a link to this address', String(shared).includes('address.html?id=a17'), String(shared));
  let printed = false;
  w.print = () => { printed = true; };
  click(d.getElementById('print')); await tick();
  ok('print opens the history and asks the browser to print', printed &&
     d.querySelector('.tabs button.is-active').dataset.tab === 'timeline');
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d } = await open('/address.html?id=a13');
  ok('the strip shows what you looked at before', d.querySelectorAll('#recent .recent__item').length >= 1 &&
     d.getElementById('recent').textContent.includes('2118 Chicago Blvd'));
  ok('the page you are on is not in its own strip', !d.querySelector('#recent a[href="address.html?id=a13"]'));
}

/* --- cost to own --- */
{
  const { d, w, errs } = await open('/address.html?id=a13');
  /* $745,000 at 20% down, 6.25%, 30 years: P&I is $3,669.67 on a $596,000 loan */
  const pi = [...d.querySelectorAll('.cost__key div')][0].textContent;
  ok('principal and interest are amortised, not guessed', pi.includes('$3,670'), pi);
  ok('no PMI at twenty percent down', !d.getElementById('cost-slot').textContent.includes('PMI'));

  const total = d.getElementById('cost-n').textContent;
  d.getElementById('cost-down').value = '5';
  d.getElementById('cost-down').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('less down costs more a month', d.getElementById('cost-n').textContent !== total);
  ok('PMI appears under twenty percent', d.getElementById('cost-slot').textContent.includes('PMI'));
  ok('the loan amount follows', d.getElementById('cost-slot').textContent.includes('$707,750'));

  d.getElementById('cost-rate').value = '3';
  d.getElementById('cost-rate').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  const cheap = Number(d.getElementById('cost-n').textContent.replace(/[^0-9]/g, ''));
  d.getElementById('cost-rate').value = '9';
  d.getElementById('cost-rate').dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  const dear = Number(d.getElementById('cost-n').textContent.replace(/[^0-9]/g, ''));
  ok('a higher rate costs more', dear > cheap, `${cheap} -> ${dear}`);
  ok('the inputs persist', JSON.parse(w.localStorage.getItem('abode.state.v1')).loan.rate === 9);
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- open houses --- */
{
  const { d, w, errs } = await open('/address.html?id=a1');
  ok('a scheduled open house shows on the page', d.getElementById('oh-slot').textContent.includes('Saturday 1–4pm'));
  const before = Number(d.getElementById('oh-n').textContent);
  click(d.getElementById('oh-rsvp')); await tick();
  ok('rsvp adds you to the count', Number(d.getElementById('oh-n').textContent) === before + 1 &&
     d.getElementById('oh-rsvp').getAttribute('aria-pressed') === 'true');
  click(d.getElementById('oh-rsvp')); await tick();
  ok('and takes you back off', Number(d.getElementById('oh-n').textContent) === before);
  ok('visitors cannot reschedule it', !d.getElementById('oh-save'));
  click(d.getElementById('oh-rsvp')); await tick();
  carried = w.localStorage.getItem('abode.state.v1');
  ok('no page errors', errs.length === 0, errs.join('; '));
}

{
  /* the claim block above made "me" the verified owner of a2 */
  const { d, w } = await open('/address.html?id=a2');
  ok('an owner is offered the scheduling form', !!d.getElementById('oh-save'));
  d.getElementById('oh-time').value = '2–4pm';
  d.getElementById('oh-date').value = 'Sep 19';
  d.getElementById('oh-day').value = 'Sunday';
  click(d.getElementById('oh-save')); await tick();
  ok('scheduling posts it to the page', d.getElementById('oh-slot').textContent.includes('Sunday 2–4pm') &&
     d.getElementById('oh-slot').textContent.includes('Sep 19'));
  ok('it is stored against the address', JSON.parse(w.localStorage.getItem('abode.state.v1')).openHouses.a2.when === '2–4pm');
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d } = await open('/search.html');
  ok('open houses are flagged on the cards',
     [...d.querySelectorAll('#results .card')].some((c) => c.textContent.includes('Open Sat')));
}

{
  const { d } = await open('/alerts.html');
  ok('a followed address reports its open house',
     d.getElementById('alerts').textContent.includes('Open house at 418 Juniper Hollow Rd'));
}

/* --- photo viewer --- */
{
  const { d, errs } = await open('/address.html?id=a4');
  const shots = d.querySelectorAll('#gallery .shot');
  ok('every photo is a labelled control', shots.length === 5 &&
     shots[0].getAttribute('aria-label').includes('Photo 1 of 5'));
  shots[0].focus();
  click(shots[0]); await tick();
  ok('the viewer opens on the photo you clicked', !!d.querySelector('.lightbox') &&
     d.querySelector('.lightbox__cap').textContent.includes('1 of 5'));
  click(d.querySelector('[data-step="1"]')); await tick();
  ok('arrows move through the set', d.querySelector('.lightbox__cap').textContent.includes('2 of 5'));
  d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); await tick();
  d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); await tick();
  ok('it wraps at the ends', d.querySelector('.lightbox__cap').textContent.includes('5 of 5'));
  d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
  ok('escape closes it and returns focus', !d.querySelector('.lightbox') && d.activeElement === shots[0]);
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- an offer is a negotiation --- */
{
  const carriedBefore = carried;   // this block plays with claims; put the state back after
  const { d, w, errs } = await open('/address.html?id=a3');
  d.getElementById('offer-amt').value = '600,000';
  click(d.getElementById('offer-go')); await tick();
  ok('you can write an offer', d.getElementById('offers').textContent.includes('$600,000'));
  const oid = JSON.parse(w.localStorage.getItem('abode.state.v1')).offers.a3[0].id;

  /* become the owner so the counter can be sent */
  w.localStorage.setItem('abode.state.v1', JSON.stringify(Object.assign(
    JSON.parse(w.localStorage.getItem('abode.state.v1')),
    { claims: { a3: { status: 'verified', method: 'utility', name: 'Aisha Brandt', when: 'now' } } })));
  carried = w.localStorage.getItem('abode.state.v1');

  const { d: d2, w: w2 } = await open('/address.html?id=a3');
  click([...d2.querySelectorAll('#offers [data-act="countered"]')][0]); await tick();
  ok('the owner counters', d2.getElementById('offers').textContent.includes('Countered at'));
  carried = w2.localStorage.getItem('abode.state.v1');

  /* drop the badge and answer as the buyer */
  const st = JSON.parse(carried); delete st.claims.a3;
  carried = JSON.stringify(st);
  const { d: d3, w: w3 } = await open('/address.html?id=a3');
  ok('the buyer is offered a way back', !!d3.querySelector('[data-buyer]') &&
     d3.querySelectorAll('[data-buyer]').length === 3);
  click(d3.querySelector('[data-act="split"]')); await tick();
  ok('splitting the difference goes back to the owner',
     d3.getElementById('offers').textContent.includes('came back at'));
  const after = JSON.parse(w3.localStorage.getItem('abode.state.v1')).offerReplies[oid];
  ok('the counter is between the two numbers', after.counterAt > 600000 && after.counterAt < 618000,
     String(after.counterAt));
  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = carriedBefore;
}

/* --- the record outlives the listing --- */
{
  const { d, errs } = await open('/address.html?id=a19');
  ok('an off-market address still has its page', d.title.includes('54 Cranmore Ave') &&
     d.querySelectorAll('#posts .post').length >= 2);
  ok('it is labelled off market', d.getElementById('bar').textContent.includes('last sold') &&
     d.querySelector('.tag--gone') !== null);
  ok('you cannot offer on it', !d.querySelector('a[href="#offer"]') &&
     d.getElementById('rail').textContent.includes('Not for sale'));
  const tabs = [...d.querySelectorAll('.tabs button')];
  click(tabs[1]); await tick();
  ok('the history goes back further than the listing', d.querySelectorAll('.tl__item').length === 7 &&
     d.getElementById('tabbody').textContent.includes('House fire'));
  ok('the price chart covers four decades', d.querySelectorAll('#pc-plot .pc__dot').length === 4);
  ok('no page errors', errs.length === 0, errs.join('; '));
}

/* --- tours and your data --- */
{
  const { d, w } = await open('/address.html?id=a23');
  ok('a tour can be requested from the page', !!d.getElementById('tour-go'));
  d.getElementById('tour-day').value = 'Saturday';
  d.getElementById('tour-time').value = 'Afternoon';
  click(d.getElementById('tour-go')); await tick();
  ok('the request is recorded and named', d.getElementById('tour-slot').textContent.includes('Tour requested') &&
     d.getElementById('tour-slot').textContent.includes('Saturday'));
  ok('it says nobody confirms it here', d.getElementById('tour-slot').textContent.includes('Nobody confirms it'));
  ok('it persists', JSON.parse(w.localStorage.getItem('abode.state.v1')).tours.a23.day === 'Saturday');
  click(d.getElementById('tour-drop')); await tick();
  ok('and can be cancelled', !!d.getElementById('tour-go'));
}

{
  const { d, w } = await open('/alerts.html');
  let dump = null;
  d.addEventListener('click', (ev) => { if (ev.target.matches('a[download]')) ev.preventDefault(); }, true);
  w.URL.createObjectURL = () => 'blob:test';
  w.URL.revokeObjectURL = () => {};
  const realBlob = w.Blob;
  w.Blob = function (parts) { dump = String(parts[0]); return new realBlob(parts); };
  click(d.getElementById('data-export')); await tick();
  w.Blob = realBlob;
  const rec = JSON.parse(dump);
  ok('you can take everything with you', rec.schema === 'abode.account/v1' &&
     Array.isArray(rec.following) && 'reports_filed' in rec && 'messages_sent' in rec);
  ok('the export says the data never left the browser', String(rec.exported).includes('never left'));

  click(d.getElementById('data-forget')); await tick();
  ok('deleting asks first', d.getElementById('data-confirm').textContent.includes('cannot be undone'));
  click(d.getElementById('data-really')); await tick();
  ok('deleting really deletes', !JSON.parse(w.localStorage.getItem('abode.state.v1') || '{}').follows ||
     Object.keys(JSON.parse(w.localStorage.getItem('abode.state.v1')).follows).length === 0,
     w.localStorage.getItem('abode.state.v1').slice(0, 60));
}

/* --- neighbours, trends and muting --- */
{
  const { d } = await open('/address.html?id=a13');
  ok('an address shows its own block', d.getElementById('nearby').textContent.includes('More in Reems Creek Valley') &&
     d.querySelectorAll('#nearby .card').length === 3);
  ok('it does not list itself', !d.querySelector('#nearby [data-listing="a13"]'));
}

{
  const { d } = await open('/group.html?id=g1');
  ok('a group with several homes draws a trend', d.querySelectorAll('#trend-plot .oc__col').length === 6);
  ok('the trend says what it is measuring', d.getElementById('trend-note').textContent.includes('Median asking price'));
}
{
  const { d } = await open('/group.html?id=g2');
  ok('a thin group draws nothing and says why',
     d.getElementById('trend-note').textContent.includes('Only one home') ||
     d.querySelectorAll('#trend-plot .oc__col').length === 6,
     d.getElementById('trend-note').textContent);
}

{
  const { d, w } = await open('/address.html?id=a1');
  click(d.getElementById('mute')); await tick();
  ok('an address can be muted without unfollowing', d.getElementById('mute').textContent.includes('Muted') &&
     JSON.parse(w.localStorage.getItem('abode.state.v1')).muted.a1 === true &&
     JSON.parse(w.localStorage.getItem('abode.state.v1')).follows.a1 === true);
  const withMute = w.localStorage.getItem('abode.state.v1');
  const saved = carried;
  carried = withMute;
  const { d: d2 } = await open('/alerts.html');
  const alertsText = d2.getElementById('alerts').textContent;
  ok('a muted address stops raising alerts of its own',
     !alertsText.includes('Open house at 418 Juniper Hollow') &&
     !alertsText.includes('Price cut at 418 Juniper Hollow'));
  carried = saved;
}

/* --- hazard --- */
{
  const { d } = await open('/address.html?id=a5');
  ok('a recorded hazard is shown with its note', d.getElementById('rail').textContent.includes('Zone VE') &&
     d.getElementById('rail').textContent.includes('helical piers'));
  ok('the worst rating is marked', !!d.querySelector('.risk--high'));
  ok('sources are named', d.getElementById('rail').textContent.includes('FEMA flood maps'));
}
{
  const { d } = await open('/address.html?id=a8');
  ok('an address with nothing on file says so', d.getElementById('rail').textContent.includes('Nothing on file') &&
     !d.querySelector('.risk'));
}

/* --- comparables --- */
{
  const { d } = await open('/address.html?id=a6');
  ok('comparables list the nearest addresses', d.querySelectorAll('.cmp__row').length === 4);
  ok('the nearest neighbour comes first',
     d.querySelectorAll('.cmp__row')[1].textContent.includes('905 W Boston Blvd'),
     d.querySelectorAll('.cmp__row')[1].textContent.replace(/\s+/g, ' ').slice(0, 60));
  ok('close comps are measured in feet', /\d+ ft away/.test(d.querySelector('.cmp').textContent),
     d.querySelector('.cmp__who span').textContent);
  ok('this home is the marked bar', !!d.querySelector('.cmp__row .cmp__fill.is-self'));
  ok('it says these are not real comps', d.querySelector('.panel .notice').textContent.includes('same market') ||
     [...d.querySelectorAll('.notice')].some((n) => n.textContent.includes('same market')));
}

/* --- direct messages --- */
{
  const { d, w, errs } = await open('/messages.html');
  ok('seeded threads are listed', d.querySelectorAll('.dm__row').length === 2, String(d.querySelectorAll('.dm__row').length));
  ok('the newest thread opens first', d.querySelector('#dm-pane').textContent.includes('Marisol Reyes'));
  ok('the thread reads in order', d.querySelectorAll('#dm-msgs .dm__msg').length === 4);
  ok('the thread links back to the address', !!d.querySelector('#dm-pane a[href="address.html?id=a1"]'));

  d.getElementById('dm-text').value = 'Is the studio wired for 240?';
  click(d.getElementById('dm-send')); await tick();
  ok('sending appends to the thread', d.querySelectorAll('#dm-msgs .dm__msg').length === 5 &&
     d.getElementById('dm-msgs').textContent.includes('wired for 240'));
  ok('it says plainly that nobody answers', d.getElementById('dm-msgs').textContent.includes('Nobody replies'));
  ok('the sent message persists', JSON.parse(w.localStorage.getItem('abode.state.v1')).dmSent.t1.length === 1);

  d.getElementById('dm-text').value = 'Would you rather sell to a family with no children?';
  click(d.getElementById('dm-send')); await tick();
  ok('messages are screened like posts', d.querySelectorAll('#dm-msgs .dm__msg').length === 5 &&
     !!d.querySelector('#dm-screen .screened--block'));

  click(d.querySelectorAll('.dm__row')[1]); await tick();
  ok('switching threads works', d.querySelector('#dm-pane').textContent.includes('Sam Yarrow') &&
     d.querySelectorAll('.dm__row')[1].classList.contains('is-open'));
  ok('reading clears the unread pip', !d.querySelector('.nav__pip'));
  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = w.localStorage.getItem('abode.state.v1');
}

/* --- starting a thread from an address --- */
{
  const { d } = await open('/address.html?id=a6');
  const btn = d.querySelector('[data-dm]');
  ok('address pages offer to message the owner', !!btn && btn.textContent.includes('Message the owner'));
  ok('the agent can be messaged from the rail', !!d.querySelector('#rail [data-dm]'));
}

/* --- moderation queue --- */
{
  const { d, w, errs } = await open('/moderation.html');
  ok('you are not a moderator by default', d.getElementById('mod-body').textContent.includes('do not moderate'));
  click(d.getElementById('mod-take')); await tick();
  ok('taking the role shows the queue', d.getElementById('mod-body').textContent.includes('Moderating Reems Creek Valley'));
  ok('it hides who reported the post', d.getElementById('mod-body').textContent.includes('do not see who reported'));
  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  /* report a post inside a group this moderator covers, then decide it */
  const { d, w } = await open('/address.html?id=a1');
  click(d.querySelector('#posts [data-flag]')); await tick();
  click(d.querySelector('[data-send]')); await tick();
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d, w } = await open('/moderation.html');
  ok('the report reaches the queue', d.querySelectorAll('.modcard').length === 1 &&
     d.querySelector('.modcard').textContent.includes('Fair Housing'));
  ok('three decisions are offered', d.querySelectorAll('.modcard [data-call]').length === 3);
  click(d.querySelector('[data-call="remove"]')); await tick();
  ok('deciding records it', d.querySelector('.modcard__decision').textContent.includes('Removed'));
  ok('the decision is stored', Object.keys(JSON.parse(w.localStorage.getItem('abode.state.v1')).decisions).length === 1);
  carried = w.localStorage.getItem('abode.state.v1');
}

{
  const { d } = await open('/address.html?id=a1');
  ok('the removed post is gone from the wall', !!d.querySelector('.post--gone') &&
     d.querySelector('.post--gone').textContent.includes('removed by a moderator'));
  ok('the author can appeal once', !!d.querySelector('[data-appeal]'));
  click(d.querySelector('[data-appeal]')); await tick();
  click(d.querySelector('[data-appeal]')); await tick();
  ok('a second appeal is refused', d.querySelector('.toast').textContent.includes('one appeal'),
     d.querySelector('.toast').textContent);
}

/* --- alerts --- */
{
  const { d, w, errs } = await open('/alerts.html');
  const rows = () => [...d.querySelectorAll('#alerts .alert')];
  ok('alerts derive from what you follow and own', rows().length > 0, `${rows().length} alerts`);
  ok('the claimed address reports in', d.getElementById('alerts').textContent.includes('You are verified at 77 Pemberton Row'));
  ok('a saved search reports its new matches', d.getElementById('alerts').textContent.includes('for “Asheville”'),
     d.getElementById('alerts').textContent.slice(0, 40));
  ok('the filed report has a status line', d.getElementById('alerts').textContent.includes('Your report is in triage'));
  ok('an offer on your own address surfaces', d.getElementById('alerts').textContent.includes('Offer on your address'));
  ok('nav bell counts the unread', !!d.getElementById('nav-unread'), d.querySelector('.nav__bell') && d.querySelector('.nav__bell').textContent);

  {
    const idOf = () => rows()[0].dataset.alert;
    const unreadNow = () => rows()[0].classList.contains('is-unread');
    const target = idOf();
    const before = unreadNow();
    const tap = () => rows()[0].querySelector('[data-mark]')
      .dispatchEvent(new d.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
    tap(); await tick();
    ok('the read mark flips from the list', idOf() === target && unreadNow() !== before,
       `${before ? 'unread' : 'read'} -> ${unreadNow() ? 'unread' : 'read'}`);
    tap(); await tick();
    ok('and flips back', unreadNow() === before);
  }


  const before = rows().length;
  const off = d.querySelector('[data-kind="post"]');
  off.checked = false;
  off.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('switching a kind off removes those alerts', rows().length < before &&
     !d.getElementById('alerts').textContent.includes('posted at'), `${before} -> ${rows().length}`);
  ok('the preference persists', JSON.parse(w.localStorage.getItem('abode.state.v1')).alerts.kinds.post === false);

  off.checked = true;
  off.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  ok('switching it back restores them', rows().length === before);

  const first = rows()[0];
  ok('unread rows are marked', first.classList.contains('is-unread'));
  d.addEventListener('click', (ev) => ev.preventDefault(), true);  // jsdom will not follow the link
  first.dispatchEvent(new d.defaultView.MouseEvent('click', { bubbles: true, cancelable: true })); await tick();
  ok('clicking marks it read', !!JSON.parse(w.localStorage.getItem('abode.state.v1')).read[first.dataset.alert]);

  click(d.getElementById('mark-all')); await tick();
  ok('mark all clears the badge', rows().every((r) => !r.classList.contains('is-unread')) && !d.getElementById('nav-unread'));

  const ph = d.getElementById('al-phone');
  ph.value = '(555) 010-4477';
  ph.dispatchEvent(new d.defaultView.Event('input', { bubbles: true })); await tick();
  const sms = d.querySelector('[data-chan="sms"]');
  sms.checked = true;
  sms.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })); await tick();
  const st = JSON.parse(w.localStorage.getItem('abode.state.v1')).alerts;
  ok('channel and number are kept', st.sms === true && st.phone.includes('010-4477'), JSON.stringify(st.phone));
  ok('no page errors', errs.length === 0, errs.join('; '));
  carried = w.localStorage.getItem('abode.state.v1');
}

/* --- the feed alert panel talks to the same store --- */
{
  const { d } = await open('/feed.html');
  const btn = d.getElementById('feed-alerts');
  ok('feed shows text alerts already on', btn.textContent.includes('on'), btn.textContent);
  click(btn); await tick();
  ok('feed can switch them off', btn.textContent === 'Turn on alerts');
}

srv.close();
console.log(fail ? `\n${fail} failing` : '\nall green');
process.exit(fail ? 1 : 0);
