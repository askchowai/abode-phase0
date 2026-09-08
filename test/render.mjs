import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const pages = ['index.html', 'search.html', 'address.html?id=a5', 'feed.html', 'group.html?id=g3', 'alerts.html', 'messages.html', 'agent.html', 'compare.html', 'groups.html', 'profile.html?u=u1', 'about.html', 'fair-housing.html', 'content-policy.html', 'moderation.html', 'saved.html'];
let fail = 0;

for (const p of pages) {
  const [file, qs] = p.split('?');
  const errs = [];
  const url = pathToFileURL(path.resolve(file)).href + (qs ? '?' + qs : '');
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url,
  });
  dom.virtualConsole.on('jsdomError', (e) => errs.push(e.message));
  await new Promise((r) => dom.window.addEventListener('load', r));
  await new Promise((r) => setTimeout(r, 150));
  const d = dom.window.document;
  const n = (s) => d.querySelectorAll(s).length;
  console.log(`${p.padEnd(22)} nav=${n('.masthead .nav a')} cards=${n('.card')} posts=${n('.post')} votes=${n('.vote')} panels=${n('.panel')} err=${errs.length}`);
  errs.forEach((e) => { console.log('   !', e.split('\n')[0]); fail++; });
  if (!n('.masthead .nav a')) { console.log('   ! chrome did not render'); fail++; }
  dom.window.close();
}
process.exit(fail ? 1 : 0);
