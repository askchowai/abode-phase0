/* Dead-link audit. Loads every page, collects every internal href the app renders,
   and fails if one points at a file that is not there or an id nothing matches.
   Cheap to run, and it catches the class of bug nobody notices until a user does. */

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

const pages = ['/index.html', '/search.html', '/address.html?id=a1', '/address.html?id=a19',
  '/feed.html', '/group.html?id=g1', '/groups.html', '/profile.html?u=u1', '/alerts.html',
  '/messages.html', '/agent.html', '/compare.html', '/moderation.html', '/saved.html',
  '/about.html', '/fair-housing.html', '/content-policy.html'];

let fail = 0;
const seen = new Map();

for (const p of pages) {
  const dom = await JSDOM.fromURL(base + p, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  });
  await new Promise((r) => setTimeout(r, 200));
  const d = dom.window.document;
  const data = dom.window.ABODE;

  [...d.querySelectorAll('a[href]')].forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || /^(https?:|mailto:|tel:|data:|#)/.test(href)) return;
    const bare = href.split('#')[0];
    if (!bare) return;                     /* a pure fragment stays on the page */
    const [file, qs] = bare.split('?');
    if (!seen.has(bare)) seen.set(bare, p);
    if (!fs.existsSync(path.resolve(file))) {
      console.log(`   ! ${p} links to a missing file: ${href}`);
      fail++;
      return;
    }
    const params = new URLSearchParams(qs || '');
    const id = params.get('id'), u = params.get('u');
    if (file === 'address.html' && id && !data.byId[id]) { console.log(`   ! ${p} → unknown address ${id}`); fail++; }
    if (file === 'group.html' && id && !data.groups.some((g) => g.id === id)) { console.log(`   ! ${p} → unknown group ${id}`); fail++; }
    if (file === 'profile.html' && u && !data.users[u]) { console.log(`   ! ${p} → unknown person ${u}`); fail++; }
  });

  dom.window.close();
}

/* every page in the repo should be reachable from somewhere */
const orphans = fs.readdirSync('.').filter((f) => f.endsWith('.html'))
  .filter((f) => ![...seen.keys()].some((h) => h.split('?')[0] === f));
orphans.forEach((f) => { console.log(`   ! ${f} is not linked from anywhere`); fail++; });

console.log(`${seen.size} distinct internal links across ${pages.length} pages`);
srv.close();
console.log(fail ? `\n${fail} broken links` : '\nno broken links');
process.exit(fail ? 1 : 0);
