/* The page around the simulation: does it load, wire up, and expose the controls
   a thumb needs. jsdom cannot paint a canvas, so this checks the plumbing. */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

/* run from anywhere: paths are relative to this file, not to the shell */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (p) => path.join(ROOT, p);

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const f = at(decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) fail++;
};

const errs = [];
const dom = await JSDOM.fromURL(base + '/index.html', {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
});
/* jsdom has no canvas; that is the test environment's limitation, not the game's */
dom.virtualConsole.on('jsdomError', (e) => {
  const first = e.message.split('\n')[0];
  if (!/getContext/.test(first)) errs.push(first);
});
await new Promise((r) => setTimeout(r, 300));
const d = dom.window.document;
const w = dom.window;

ok('the page loads without errors', errs.length === 0, errs.join('; '));
ok('the simulation is on the page', !!w.SPEED && typeof w.SPEED.step === 'function');
ok('the game booted', !!w.CHOWSPEED && !!w.CHOWSPEED.world);
ok('there is a pitch to draw on', !!d.getElementById('field'));
ok('it opens with an explanation, not a blank screen',
   !d.getElementById('banner').hidden && /hold anywhere/i.test(d.getElementById('banner-sub').textContent));
ok('the thumb controls exist',
   !!d.getElementById('btn-boost') && !!d.getElementById('btn-flip') && !!d.getElementById('btn-drift'));
ok('the game modes are offered', d.querySelectorAll('#mode option').length === 3);
ok('the constants are the real ones', w.SPEED.RL.CAR_MAX_SPEED === 2300 &&
   w.SPEED.RL.BALL_RADIUS_SOCCAR === 91.25 && w.SPEED.RL.BOOST.LOCS_SMALL.length === 28);
ok('the pitch takes touches, not page scrolling',
   /touch-action:\s*none/.test(fs.readFileSync(at('assets/style.css'), 'utf8')));
ok('the scoreboard, clock and boost gauge are wired',
   !!d.getElementById('score-us') && !!d.getElementById('clock') && !!d.getElementById('boost-fill'));
ok('the notch and home bar are accounted for',
   /safe-area-inset/.test(fs.readFileSync(at('assets/style.css'), 'utf8')) &&
   /viewport-fit=cover/.test(fs.readFileSync(at('index.html'), 'utf8')));
ok('nobody is stopped from pinching to zoom',
   !/user-scalable\s*=\s*no/.test(fs.readFileSync(at('index.html'), 'utf8')));

/* kicking off should start the clock moving */
const before = w.CHOWSPEED.world.clock;
d.getElementById('banner-btn').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 260));
ok('kick off starts the game', d.getElementById('banner').hidden && w.CHOWSPEED.world.clock < before,
   `${before} -> ${w.CHOWSPEED.world.clock.toFixed(2)}`);

d.getElementById('btn-pause').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const paused = w.CHOWSPEED.world.clock;
await new Promise((r) => setTimeout(r, 200));
ok('pause stops the clock', Math.abs(w.CHOWSPEED.world.clock - paused) < 0.001);

dom.window.close();
srv.close();
console.log(fail ? `\n${fail} failing` : '\nall green');
process.exit(fail ? 1 : 0);
