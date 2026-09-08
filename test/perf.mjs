/* A budget, so a page that quietly becomes slow fails instead of shipping.
   jsdom is not a browser, so these numbers are relative: what matters is that
   rendering a page stays in the same order of magnitude as the dataset grows. */

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

const BUDGET_MS = 900;      /* per page, first paint of the app's own markup */
const pages = ['/index.html', '/search.html', '/address.html?id=a1', '/feed.html', '/compare.html'];

let fail = 0;
for (const p of pages) {
  const t0 = Date.now();
  const dom = await JSDOM.fromURL(base + p, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  });
  await new Promise((r) => setTimeout(r, 60));
  const ms = Date.now() - t0;
  const rendered = dom.window.document.querySelectorAll('.masthead .nav a').length > 0;
  const okay = rendered && ms < BUDGET_MS;
  if (!okay) fail++;
  console.log(`${okay ? 'PASS' : 'FAIL'}  ${p.padEnd(22)} ${ms}ms (budget ${BUDGET_MS}ms)${rendered ? '' : ' — nothing rendered'}`);
  dom.window.close();
}

/* the shipped bytes are a budget too — no build step means no accidental bundle */
const sizes = ['assets/js/app.js', 'assets/js/data.js', 'assets/css/styles.css']
  .map((f) => [f, fs.statSync(f).size]);
const total = sizes.reduce((n, [, s]) => n + s, 0);
sizes.forEach(([f, s]) => console.log(`      ${f.padEnd(24)} ${(s / 1024).toFixed(0)}k`));
/* 400k of hand-written source with no build step. When this fails, the answer is
   to split app.js rather than to raise the number. */
const BYTES = 400 * 1024;
const under = total < BYTES;
if (!under) fail++;
console.log(`${under ? 'PASS' : 'FAIL'}  total shipped  ${(total / 1024).toFixed(0)}k (budget ${BYTES / 1024}k)`);

srv.close();
console.log(fail ? `\n${fail} over budget` : '\neverything inside budget');
process.exit(fail ? 1 : 0);
