/* Builds sitemap.xml from the data layer, so a new address never gets left out
   of it. Run with `npm run sitemap`. */

import { JSDOM } from 'jsdom';
import fs from 'fs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
dom.window.eval(fs.readFileSync('assets/js/data.js', 'utf8'));
const D = dom.window.ABODE;

const base = process.argv[2] || 'https://abode.example';
const today = new Date().toISOString().slice(0, 10);

const urls = [
  ['index.html', '1.0', 'daily'],
  ['search.html', '0.9', 'hourly'],
  ['groups.html', '0.7', 'weekly'],
  ['feed.html', '0.6', 'hourly'],
  ['about.html', '0.4', 'monthly'],
  ['fair-housing.html', '0.4', 'monthly'],
  ['content-policy.html', '0.4', 'monthly'],
].concat(
  D.listings.map((l) => [`address.html?id=${l.id}`, l.status === 'active' ? '0.9' : '0.6', 'daily']),
  D.groups.map((g) => [`group.html?id=${g.id}`, '0.6', 'weekly']),
  Object.keys(D.users).filter((u) => u !== 'me').map((u) => [`profile.html?u=${u}`, '0.3', 'weekly']),
);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, priority, freq]) => `  <url>
    <loc>${base}/${loc.replace(/&/g, '&amp;')}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync('sitemap.xml', xml);
console.log(`sitemap.xml — ${urls.length} urls`);
