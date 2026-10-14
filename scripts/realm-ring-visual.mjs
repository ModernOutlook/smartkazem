import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173';
const output = path.join(process.cwd(), 'artifacts', 'realm-rings');
fs.mkdirSync(output, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1365, height: 900 },
  { name: 'mobile-portrait', width: 390, height: 844 },
  { name: 'mobile-landscape', width: 844, height: 390 },
];
const realms = [
  { id: 'structure', radius: 445, selector: '#realm-structure' },
  { id: 'continuity', radius: 365, selector: '#realm-continuity' },
  { id: 'experience', radius: 285, selector: '#realm-experience' },
  { id: 'reference', radius: 205, selector: '#realm-reference' },
  { id: 'share', radius: 125, selector: '#realm-share' },
];
let failures = 0;
const fail = (message) => { failures++; console.error('FAIL ' + message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });

try {
  for (const viewport of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${baseURL}/index.html`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      fail(`${viewport.name}: index.html HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }
    await page.locator('#splash').click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(100);

    const inspection = await page.evaluate(() => {
      const svg = document.querySelector('#universe');
      const ids = ['structure', 'continuity', 'experience', 'reference', 'share'];
      return {
        svgVisible: Boolean(svg && svg.getBoundingClientRect().width > 0),
        realms: ids.map(id => {
          const group = document.querySelector('#realm-' + id);
          const fo = group?.querySelector('foreignObject');
          const wrapper = fo?.querySelector('.' + id + '-page');
          return {
            id,
            groupExists: Boolean(group),
            foreignObjectExists: Boolean(fo),
            clipPath: fo?.getAttribute('clip-path') || '',
            wrapperExists: Boolean(wrapper),
            sceneExists: Boolean(wrapper?.querySelector('.' + ({
              structure: 'structure-space',
              continuity: 'continuity-space',
              experience: 'experience-space',
              reference: 'reference-scene',
              share: 'share-space'
            })[id])),
            hasBackground: Boolean(wrapper && getComputedStyle(wrapper).backgroundImage !== 'none'),
            bounds: fo ? (() => { const r=fo.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })() : null
          };
        })
      };
    });
    if (!inspection.svgVisible) fail(`${viewport.name}: landing SVG is not visible`);
    for (const realm of inspection.realms) {
      if (!realm.groupExists || !realm.foreignObjectExists || !realm.wrapperExists || !realm.sceneExists || !realm.hasBackground || !realm.clipPath) {
        fail(`${viewport.name}/${realm.id}: missing exact page background layer or circular clip (${JSON.stringify(realm)})`);
      }
    }

    await page.screenshot({ path: path.join(output, `${viewport.name}-unselected.png`), fullPage: false });
    const svgBox = await page.locator('#universe').boundingBox();
    if (!svgBox) fail(`${viewport.name}: cannot measure menu SVG`);
    else {
      for (const realm of realms) {
        const x = svgBox.x + svgBox.width * (500 + realm.radius - 8) / 1000;
        const y = svgBox.y + svgBox.height * 500 / 1000;
        const before = await page.locator(realm.selector).evaluate(el => ({
          filter: getComputedStyle(el).filter,
          bounds: (() => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()
        }));
        await page.mouse.move(x, y);
        await page.waitForTimeout(80);
        const after = await page.locator(realm.selector).evaluate(el => ({
          filter: getComputedStyle(el).filter,
          bounds: (() => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()
        }));
        if (after.filter === before.filter || after.filter === 'none') {
          fail(`${viewport.name}/${realm.id}: hover selection effect did not activate (${before.filter} -> ${after.filter})`);
        }
        if (Math.abs(after.bounds.x-before.bounds.x)>0.1 || Math.abs(after.bounds.y-before.bounds.y)>0.1 ||
            Math.abs(after.bounds.width-before.bounds.width)>0.1 || Math.abs(after.bounds.height-before.bounds.height)>0.1) {
          fail(`${viewport.name}/${realm.id}: hover effect changed ring geometry`);
        }
        await page.screenshot({ path: path.join(output, `${viewport.name}-hover-${realm.id}.png`), fullPage: false });
      }
    }
    if (errors.length) fail(`${viewport.name}: browser errors: ${errors.slice(0, 3).join(' | ')}`);
    await page.close();
  }
} finally {
  await context.close();
  await browser.close();
}

if (failures) {
  console.error(`Realm ring visual checks failed: ${failures} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('Realm ring checks passed: exact page background classes, circular clipping, and hover selection across desktop, mobile portrait, and mobile landscape. Screenshots saved to artifacts/realm-rings/.');
}
