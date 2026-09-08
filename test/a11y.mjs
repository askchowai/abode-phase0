/* Accessibility audit. Loads every page, walks the rendered DOM, and fails on the
   defects that are cheap to introduce and expensive to live with: unnamed
   controls, unlabelled fields, decorative graphics announced to a screen reader,
   headings that skip levels, and links that say nothing. */

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

const pages = ['/index.html', '/search.html', '/address.html?id=a1', '/feed.html',
  '/group.html?id=g1', '/alerts.html', '/messages.html', '/agent.html', '/compare.html', '/groups.html', '/profile.html?u=u5', '/about.html', '/fair-housing.html', '/content-policy.html', '/moderation.html', '/saved.html'];

let fail = 0;
const bad = (page, what, el) => {
  console.log(`   ! ${page} — ${what}${el ? ': ' + el.outerHTML.replace(/\s+/g, ' ').slice(0, 90) : ''}`);
  fail++;
};

const name = (el) =>
  (el.getAttribute('aria-label') || '').trim() ||
  (el.getAttribute('title') || '').trim() ||
  el.textContent.replace(/\s+/g, ' ').trim();

for (const p of pages) {
  const dom = await JSDOM.fromURL(base + p, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  });
  await new Promise((r) => setTimeout(r, 220));
  const d = dom.window.document;
  let issues = fail;

  if (d.documentElement.getAttribute('lang') !== 'en') bad(p, 'html is missing lang');
  if (d.querySelectorAll('h1').length !== 1) bad(p, `expected one h1, found ${d.querySelectorAll('h1').length}`);
  if (!d.querySelector('main')) bad(p, 'no main landmark');
  if (!d.querySelector('#main')) bad(p, 'skip link has no target');
  if (!d.querySelector('a.skip')) bad(p, 'no skip link');

  d.querySelectorAll('button').forEach((b) => { if (!name(b)) bad(p, 'button with no accessible name', b); });
  d.querySelectorAll('a[href]').forEach((a) => { if (!name(a)) bad(p, 'link with no text', a); });

  d.querySelectorAll('input, select, textarea').forEach((f) => {
    if (f.type === 'hidden' || f.type === 'radio' || f.type === 'checkbox') return;
    const labelled = (f.id && d.querySelector(`label[for="${f.id}"]`)) ||
      f.closest('label') || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
    if (!labelled) bad(p, 'form field with no label', f);
  });

  d.querySelectorAll('svg').forEach((s) => {
    const role = s.getAttribute('role');
    const hidden = s.getAttribute('aria-hidden') === 'true';
    if (!hidden && role === 'img' && !s.getAttribute('aria-label')) bad(p, 'svg role=img with no label', s);
    if (!hidden && !role) bad(p, 'svg that is neither hidden nor labelled', s);
  });

  d.querySelectorAll('[aria-pressed], [aria-expanded]').forEach((el) => {
    const v = el.getAttribute('aria-pressed') || el.getAttribute('aria-expanded');
    if (v !== 'true' && v !== 'false') bad(p, `aria state is "${v}"`, el);
  });

  let level = 0;
  d.querySelectorAll('h1, h2, h3, h4').forEach((h) => {
    const n = Number(h.tagName[1]);
    if (level && n > level + 1) bad(p, `heading jumps h${level} to h${n}`, h);
    level = n;
  });

  console.log(`${p.padEnd(24)} ${fail === issues ? 'clean' : (fail - issues) + ' issues'}`);
  dom.window.close();
}

/* Colour lives in the token blocks so the dark theme can re-pick every value.
   A raw hex anywhere else is a value the dark theme cannot reach. */
const css = fs.readFileSync('assets/css/styles.css', 'utf8');
css.split('\n').forEach((line, i) => {
  if (/#[0-9a-fA-F]{3,8}\b/.test(line) && !/^\s*--/.test(line)) {
    console.log(`   ! styles.css:${i + 1} — hard-coded colour outside the tokens: ${line.trim().slice(0, 70)}`);
    fail++;
  }
});

srv.close();
console.log(fail ? `\n${fail} accessibility issues` : '\nno accessibility issues');
process.exit(fail ? 1 : 0);
