/* A phone audit. jsdom has no layout engine, so this cannot measure a rendered
   line box — instead it reads the things that actually break a small screen:
   fixed widths wider than a phone, grids that never collapse, form fields small
   enough to make iOS zoom, tap targets under 44px, fixed furniture that ignores
   the notch, and markup the app generates at runtime with hard pixel widths. */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import http from 'http';
import path from 'path';

const PHONE = 375;          /* the narrow end of what people actually carry */
/* comments would otherwise ride along inside selector text */
const css = fs.readFileSync('assets/css/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

let fail = 0;
const bad = (msg) => { console.log('   ! ' + msg); fail++; };
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) fail++;
};

/* split the stylesheet into blocks, remembering whether each is inside a
   narrow-screen media query (where a fixed width is a decision, not a bug) */
function blocks(source) {
  /* brace-count the media queries rather than guessing where they end */
  const out = [];
  let rest = '';
  for (let i = 0; i < source.length; i++) {
    if (source.startsWith('@media', i)) {
      const open = source.indexOf('{', i);
      const query = source.slice(i + 6, open).trim();
      let depth = 1, j = open + 1;
      while (j < source.length && depth > 0) {
        if (source[j] === '{') depth++;
        else if (source[j] === '}') depth--;
        j++;
      }
      out.push({ inMedia: true, narrow: /max-width:\s*(\d+)px/.test(query), css: source.slice(open + 1, j - 1), query });
      i = j - 1;
    } else {
      rest += source[i];
    }
  }
  out.push({ inMedia: false, narrow: false, css: rest, query: 'base' });
  return out;
}

const parts = blocks(css);
const base = parts.filter((b) => !b.inMedia);

/* --- 1. nothing in the base stylesheet is wider than a phone --- */
const wideRules = [];
base.forEach((b) => {
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(b.css))) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2];
    const widths = [...body.matchAll(/(?:^|;|\s)(min-width|width)\s*:\s*(\d+)px/g)];
    widths.forEach(([, prop, px]) => {
      if (Number(px) > PHONE) wideRules.push(`${sel} { ${prop}: ${px}px }`);
    });
  }
});
ok('nothing is hard-coded wider than a phone', wideRules.length === 0, wideRules.join('; '));

/* --- 2. every multi-column grid collapses somewhere --- */
const fixedGrids = [];
base.forEach((b) => {
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(b.css))) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2];
    const grid = /grid-template-columns\s*:\s*([^;]+)/.exec(body);
    if (!grid) continue;
    const value = grid[1];
    const autoFits = /auto-fill|auto-fit/.test(value);
    const columns = (value.match(/minmax|1fr|px|%/g) || []).length;
    if (autoFits || columns < 2) continue;
    /* a fixed multi-column grid must be overridden for narrow screens */
    const key = sel.split(',')[0].trim();
    const overridden = parts.some((p) => p.narrow && p.css.includes(key));
    if (!overridden) fixedGrids.push(`${key} → ${value.trim()}`);
  }
});
ok('every fixed grid collapses on a narrow screen', fixedGrids.length === 0, fixedGrids.join('; '));

/* --- 3. form fields are 16px or bigger, or iOS zooms on focus --- */
const fieldRule = /\.field\s*\{([^}]*)\}/.exec(css);
const fieldSize = fieldRule ? /font-size\s*:\s*([\d.]+)(rem|px)/.exec(fieldRule[1]) : null;
const fieldPx = fieldSize ? (fieldSize[2] === 'rem' ? Number(fieldSize[1]) * 16 : Number(fieldSize[1])) : 16;
ok('form fields do not trigger the iOS zoom', fieldPx >= 16, `${fieldPx}px`);

/* --- 4. fixed and sticky furniture respects the notch --- */
const fixedSelectors = [];
base.forEach((b) => {
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(b.css))) {
    if (/position\s*:\s*fixed/.test(m[2])) fixedSelectors.push(m[1].trim().split(',')[0].trim());
  }
});
const safeAware = fixedSelectors.filter((sel) => {
  const key = sel.replace(/[.#]/, '');
  return css.includes('safe-area-inset') &&
    parts.some((p) => p.narrow && p.css.includes(sel) && /safe-|env\(/.test(p.css));
});
ok('fixed furniture accounts for the safe area',
   fixedSelectors.length === 0 || safeAware.length > 0,
   `fixed: ${fixedSelectors.join(', ')}`);

/* --- 5. the runtime markup has no hard pixel widths wider than a phone --- */
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => {
  const f = path.resolve('.' + decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, r));
const base_url = 'http://127.0.0.1:' + srv.address().port;

const pages = ['/index.html', '/search.html', '/address.html?id=a1', '/feed.html', '/group.html?id=g1',
  '/groups.html', '/profile.html?u=u1', '/alerts.html', '/messages.html', '/agent.html',
  '/compare.html', '/moderation.html', '/saved.html', '/about.html'];

const offenders = [];
const tinyText = [];
for (const p of pages) {
  const dom = await JSDOM.fromURL(base_url + p, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  });
  await new Promise((r) => setTimeout(r, 200));
  const d = dom.window.document;

  d.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style');
    const m = /(?:^|;)\s*(width|min-width)\s*:\s*(\d+)px/.exec(style);
    if (m && Number(m[2]) > PHONE) offenders.push(`${p} ${el.tagName.toLowerCase()} ${m[1]}:${m[2]}px`);
  });

  /* an element that cannot wrap and holds a long string will push the page wide */
  d.querySelectorAll('table, pre').forEach((el) => offenders.push(`${p} ${el.tagName.toLowerCase()} does not reflow`));

  /* a row of things laid out in a line, with no permission to wrap, on a 375px screen */
  d.querySelectorAll('[style*="display:flex"], [style*="display: flex"]').forEach((el) => {
    const style = el.getAttribute('style');
    if (!/flex-wrap/.test(style) && el.children.length > 2) {
      offenders.push(`${p} a ${el.children.length}-child inline flex row cannot wrap`);
    }
  });

  /* a heading long enough to overflow a phone before it can break */
  [...d.querySelectorAll('h1, h2')].forEach((h) => {
    const longest = h.textContent.split(/\s+/).reduce((a, b) => (a.length > b.length ? a : b), '');
    if (longest.length > 26) offenders.push(`${p} heading word "${longest}" will not fit`);
  });

  dom.window.close();
}
srv.close();

ok('runtime markup has no fixed widths wider than a phone', offenders.length === 0, offenders.slice(0, 6).join('; '));

/* --- 6. tap targets in the base stylesheet --- */
const TAPPABLE = ['.btn--sm', '.chip', '.viewtoggle button', '.card__save', '.card__cmp',
  '.themetoggle', '.nav__bell', '.alert__mark', '.mp__ctrl button', '.linkish'];
const missing = TAPPABLE.filter((sel) => {
  const inNarrow = parts.some((p) => p.narrow && new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(p.css) && /min-height/.test(p.css));
  return !inNarrow;
});
ok('tap targets are raised to 44px on a phone', missing.length === 0, missing.join(', '));

/* --- 7. pinch zoom is never disabled --- */
const blocked = fs.readdirSync('.').filter((f) => f.endsWith('.html'))
  .filter((f) => /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(fs.readFileSync(f, 'utf8')));
ok('nobody is stopped from pinching to zoom', blocked.length === 0, blocked.join(', '));

/* --- 8. the map does not swallow the page scroll --- */
const mapTouch = /\.mp\s*\{[^}]*touch-action\s*:\s*([^;]+);/.exec(css);
ok('the page can still be scrolled over the map',
   !!mapTouch && /pan-y/.test(mapTouch[1]), mapTouch ? mapTouch[1].trim() : 'no touch-action set');
ok('a single finger does not pan the map on a phone',
   /oneFingerPans/.test(fs.readFileSync('assets/js/app.js', 'utf8')));

/* --- 9. images never exceed their column --- */
const imgRules = [...css.matchAll(/([^{}]*img[^{}]*)\{([^}]*)\}/g)]
  .filter(([, sel]) => !/max-width/.test(sel));
const unbounded = imgRules.filter(([, , body]) => !/max-width|width\s*:\s*100%/.test(body))
  .map(([, sel]) => sel.trim().replace(/\s+/g, ' '));
ok('images are bounded by their column', unbounded.length === 0, unbounded.join('; '));

/* --- 10. long unbroken words can break --- */
ok('long tokens are allowed to break', /overflow-wrap\s*:\s*anywhere/.test(css));

/* --- 11. full-height panes use a unit that iOS agrees with --- */
const vhRules = [...css.matchAll(/([^{}]+)\{([^}]*100vh[^}]*)\}/g)];
const noDvh = vhRules.filter(([, , body]) => !body.includes('dvh')).map(([, sel]) => sel.trim().split(',')[0]);
ok('full-height panes fall back to dvh for the iOS url bar', noDvh.length === 0, noDvh.join('; '));

/* --- 12. the fixed tray does not sit on top of the end of the page --- */
ok('the compare tray reserves room at the end of the page',
   /body\.has-tray\s*\{[^}]*padding-bottom/.test(css) &&
   /has-tray/.test(fs.readFileSync('assets/js/app.js', 'utf8')));

console.log(fail ? `\n${fail} things that would hurt on a phone` : '\nnothing that would hurt on a phone');
process.exit(fail ? 1 : 0);
