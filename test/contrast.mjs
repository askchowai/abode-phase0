/* Colour contrast, computed rather than eyeballed, for both themes. The pairs
   below are the ones that carry meaning: body text, secondary text, the accent
   used as a control, and text sitting on a filled accent. */

import fs from 'fs';

const css = fs.readFileSync('assets/css/styles.css', 'utf8');

function tokens(block) {
  const out = {};
  const re = /--([a-z0-9-]+):\s*([^;]+);/g;
  let m;
  while ((m = re.exec(block))) out['--' + m[1]] = m[2].trim();
  return out;
}

/* the default theme is the dark one; the light theme is the override */
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const lightStart = css.indexOf('[data-theme="light"] {');
const lightBlock = css.slice(lightStart, css.indexOf('}', lightStart));

const dark = tokens(rootBlock);
const light = Object.assign({}, dark, tokens(lightBlock));

const hex = (c) => {
  const h = c.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
};
const lum = (c) => {
  const [r, g, b] = hex(c).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* [foreground, background, minimum, what it is] */
const PAIRS = [
  ['--ink', '--canvas', 4.5, 'body text on the page'],
  ['--ink', '--surface', 4.5, 'body text on a card'],
  ['--ink-2', '--surface', 4.5, 'secondary text on a card'],
  ['--ink-3', '--surface', 3, 'muted text on a card'],
  ['--accent', '--surface', 3, 'the accent as a control'],
  ['--accent', '--canvas', 3, 'the accent on the page'],
  ['--on-accent', '--accent', 4.5, 'text on a filled accent button'],
  ['--danger', '--surface', 3, 'error text'],
  ['--gold', '--gold-wash', 3, 'the verification badge'],
  ['--accent-2', '--accent-wash', 3, 'owner panel heading'],
  ['--tip-ink', '--tip-bg', 4.5, 'tooltip text'],
];

let fail = 0;
[['light', light], ['dark', dark]].forEach(([name, t]) => {
  PAIRS.forEach(([fg, bg, min, what]) => {
    const r = ratio(t[fg], t[bg]);
    const pass = r >= min;
    if (!pass) fail++;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${what}  ${r.toFixed(2)}:1 (needs ${min})`);
  });
});

console.log(fail ? `\n${fail} contrast failures` : '\nevery pair clears its threshold');
process.exit(fail ? 1 : 0);
