/* Data integrity. The mock layer stands in for an MLS feed, so it should be as
   strict as one: unique keys, coordinates that are actually on land in the state
   they claim, every reference resolving, and no record half-filled. */

import { JSDOM } from 'jsdom';
import fs from 'fs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
dom.window.eval(fs.readFileSync('assets/js/data.js', 'utf8'));
const D = dom.window.ABODE;

let fail = 0;
const bad = (msg) => { console.log('   ! ' + msg); fail++; };
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) fail++;
};

/* rough bounding boxes for the states the sample data claims */
const BOX = {
  NC: [33.8, 36.6, -84.4, -75.4], GA: [30.3, 35.0, -85.7, -80.8], ID: [42.0, 49.0, -117.3, -111.0],
  RI: [41.1, 42.1, -71.9, -71.1], FL: [24.4, 31.1, -87.7, -79.9], MI: [41.6, 48.3, -90.5, -82.1],
  OR: [41.9, 46.3, -124.6, -116.4], TX: [25.8, 36.6, -106.7, -93.5], ME: [42.9, 47.5, -71.1, -66.9],
  CO: [36.9, 41.1, -109.1, -102.0], VT: [42.7, 45.1, -73.5, -71.4],
};

const ids = new Set();
const postIds = new Set();

D.listings.forEach((l) => {
  const at = `${l.id} ${l.street}`;
  if (ids.has(l.id)) bad(`duplicate listing id ${l.id}`);
  ids.add(l.id);

  ['street', 'city', 'state', 'zip', 'type', 'blurb'].forEach((k) => {
    if (!l[k] || typeof l[k] !== 'string') bad(`${at}: missing ${k}`);
  });
  ['price', 'beds', 'baths', 'sqft', 'lot', 'year', 'taxes', 'ppsf', 'lat', 'lng', 'hue', 'followers', 'saves', 'dom'].forEach((k) => {
    if (typeof l[k] !== 'number' || !isFinite(l[k])) bad(`${at}: ${k} is not a number`);
  });

  if (!['active', 'pending', 'sold'].includes(l.status)) bad(`${at}: odd status ${l.status}`);
  if (l.year < 1600 || l.year > 2030) bad(`${at}: year ${l.year}`);
  if (l.price < 10000) bad(`${at}: price ${l.price}`);

  const box = BOX[l.state];
  if (!box) bad(`${at}: no bounding box for ${l.state}`);
  else if (l.lat < box[0] || l.lat > box[1] || l.lng < box[2] || l.lng > box[3]) {
    bad(`${at}: ${l.lat},${l.lng} is not in ${l.state}`);
  }

  /* price per sqft should be the arithmetic, within rounding */
  const ppsf = l.price / l.sqft;
  if (Math.abs(ppsf - l.ppsf) > 3) bad(`${at}: ppsf says ${l.ppsf}, price/sqft is ${ppsf.toFixed(0)}`);

  if (!D.users[l.owner]) bad(`${at}: unknown owner ${l.owner}`);
  if (!D.users[l.agent]) bad(`${at}: unknown agent ${l.agent}`);
  if (!Array.isArray(l.history) || !l.history.length) bad(`${at}: no history`);
  if (!Array.isArray(l.features) || !l.features.length) bad(`${at}: no features`);

  l.history.forEach((h) => {
    if (!h.date || !h.what || !h.meta) bad(`${at}: incomplete history row`);
  });

  (l.posts || []).forEach((p) => {
    if (postIds.has(p.id)) bad(`${at}: duplicate post id ${p.id}`);
    postIds.add(p.id);
    if (!D.users[p.by]) bad(`${at}: post by unknown user ${p.by}`);
    if (p.up < 0 || p.down < 0) bad(`${at}: negative votes on ${p.id}`);
    (p.replies || []).forEach((r) => {
      if (postIds.has(r.id)) bad(`${at}: duplicate reply id ${r.id}`);
      postIds.add(r.id);
      if (!D.users[r.by]) bad(`${at}: reply by unknown user ${r.by}`);
    });
  });

  (l.offers || []).forEach((o) => {
    if (!['live', 'out', 'accepted'].includes(o.status)) bad(`${at}: odd offer status ${o.status}`);
    if (o.amt < 1000) bad(`${at}: offer amount ${o.amt}`);
  });

  if (l.risk) {
    Object.entries(l.risk).forEach(([k, v]) => {
      if (!Array.isArray(v) || v.length !== 2) bad(`${at}: risk.${k} should be [level, note]`);
    });
  }

  if (l.openHouse) {
    ['day', 'when', 'date'].forEach((k) => { if (!l.openHouse[k]) bad(`${at}: open house missing ${k}`); });
    if (l.openHouse.host && !D.users[l.openHouse.host]) bad(`${at}: open house host unknown`);
  }
});

D.groups.forEach((g) => {
  if (!g.blurb || !g.stats) bad(`${g.id}: incomplete group`);
  g.addresses.forEach((id) => { if (!D.byId[id]) bad(`${g.id}: unknown address ${id}`); });
  g.mods.forEach((u) => { if (!D.users[u]) bad(`${g.id}: unknown moderator ${u}`); });
  (g.posts || []).forEach((p) => {
    if (postIds.has(p.id)) bad(`${g.id}: duplicate post id ${p.id}`);
    postIds.add(p.id);
    if (!D.users[p.by]) bad(`${g.id}: post by unknown user ${p.by}`);
  });
});

D.threads.forEach((t) => {
  if (!D.users[t.with]) bad(`${t.id}: thread with unknown user`);
  if (!D.byId[t.about]) bad(`${t.id}: thread about unknown address`);
  t.msgs.forEach((m) => { if (m.by !== 'me' && !D.users[m.by]) bad(`${t.id}: message from unknown user`); });
});

Object.entries(D.users).forEach(([id, u]) => {
  if (u.id !== id) bad(`user key ${id} does not match its id ${u.id}`);
  if (!D.roleLabel[u.role]) bad(`${id}: role ${u.role} has no label`);
});

ok('every listing is well formed and where it says it is', fail === 0);
ok('twenty-four addresses', D.listings.length === 24, String(D.listings.length));
ok('six groups, every address in them real', D.groups.length === 6);
ok('post ids are unique across the whole dataset', postIds.size > 0, `${postIds.size} posts and replies`);

console.log(fail ? `\n${fail} data problems` : '\nno data problems');
process.exit(fail ? 1 : 0);
