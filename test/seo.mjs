/* What a crawler and a link preview see. The address pages are the public part of
   this product, so they carry a description, Open Graph tags and schema.org data
   that matches the record — and the sitemap is checked against the data layer so
   a new address cannot quietly go missing from it. */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import http from 'http';
import path from 'path';

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml' };
const srv = http.createServer((req, res) => {
  const f = path.resolve('.' + decodeURIComponent(req.url.split('?')[0]));
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

/* every page ships a description in the markup, before any script runs */
const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html'));
const missing = pages.filter((f) => !/name="description"/.test(fs.readFileSync(f, 'utf8')));
ok('every page has a description in its head', missing.length === 0, missing.join(', '));

const dom = await JSDOM.fromURL(base + '/address.html?id=a14', {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
});
await new Promise((r) => setTimeout(r, 220));
const d = dom.window.document;
const D = dom.window.ABODE;
const l = D.byId.a14;

const desc = d.querySelector('meta[name="description"]').content;
ok('the address page describes itself', desc.includes('Elk Mountain') || desc.includes(l.street), desc.slice(0, 60));
ok('open graph is filled in', !!d.querySelector('meta[property="og:title"]').content.includes(l.street) &&
   !!d.querySelector('meta[property="og:description"]').content);

const ld = JSON.parse(d.getElementById('ld').textContent);
ok('structured data is schema.org', ld['@context'] === 'https://schema.org' && !!ld['@type']);
ok('the address in it matches the record', ld.address.streetAddress === l.street &&
   ld.address.postalCode === l.zip && ld.geo.latitude === l.lat);
ok('the numbers in it match the record', ld.numberOfRooms === l.beds && ld.floorSize.value === l.sqft &&
   ld.yearBuilt === l.year);
ok('the offer carries the asking price', ld.offers && ld.offers.price === l.price && ld.offers.priceCurrency === 'USD');
ok('it says out loud that this is sample data', /demonstration|sample/i.test(ld.disambiguatingDescription));
dom.window.close();

/* an off-market address is not advertised as for sale */
const dom2 = await JSDOM.fromURL(base + '/address.html?id=a19', {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
});
await new Promise((r) => setTimeout(r, 200));
const ld2 = JSON.parse(dom2.window.document.getElementById('ld').textContent);
ok('an off-market address carries no offer', !ld2.offers);
dom2.window.close();

/* a phone should be able to keep it on the home screen */
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
ok('there is a web manifest with an icon', manifest.name === 'Abode' && manifest.icons.length > 0 &&
   fs.existsSync(manifest.icons[0].src));
ok('the manifest points at a page that exists', fs.existsSync(manifest.start_url));
const home = fs.readFileSync('index.html', 'utf8');
ok('the viewport allows for a notch', /viewport-fit=cover/.test(home));
ok('ios has an icon and a title', /apple-touch-icon/.test(home) && /apple-mobile-web-app-title/.test(home));
ok('the browser chrome is themed for both schemes',
   (home.match(/name="theme-color"/g) || []).length === 2);
const noManifest = fs.readdirSync('.').filter((f) => f.endsWith('.html'))
  .filter((f) => !/manifest.webmanifest/.test(fs.readFileSync(f, 'utf8')));
ok('every page links the manifest', noManifest.length === 0, noManifest.join(', '));

/* the sitemap covers the data */
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const dataDom = new JSDOM('<!doctype html><html></html>', { runScripts: 'outside-only' });
dataDom.window.eval(fs.readFileSync('assets/js/data.js', 'utf8'));
const all = dataDom.window.ABODE;
const missingAddresses = all.listings.filter((x) => !sitemap.includes(`address.html?id=${x.id}`));
ok('every address is in the sitemap', missingAddresses.length === 0, missingAddresses.map((x) => x.id).join(', '));
ok('every group is in the sitemap', all.groups.every((g) => sitemap.includes(`group.html?id=${g.id}`)));
ok('the sitemap is well formed', sitemap.startsWith('<?xml') && sitemap.includes('</urlset>'));
ok('the manifest and icon ship with the site', fs.existsSync('assets/icon-180.png') &&
   fs.statSync('assets/icon-180.png').size > 200);
ok('robots points at the sitemap', fs.readFileSync('robots.txt', 'utf8').includes('Sitemap:'));

srv.close();
console.log(fail ? `\n${fail} metadata problems` : '\nmetadata is complete');
process.exit(fail ? 1 : 0);
