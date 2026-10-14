import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173';
const outputDir = path.join(process.cwd(), 'artifacts', 'realm-child-backgrounds');
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'portrait-390x844', width: 390, height: 844 },
  { name: 'landscape-844x390', width: 844, height: 390 },
];
const routes = [
  { route: 'treatise', realm: 'structure', asset: 'ساختار تالار.jpg' },
  { route: 'shahnameh', realm: 'continuity', asset: 'تداوم عالم.jpg' },
  { route: 'emergence', realm: 'continuity', asset: 'تداوم عالم.jpg' },
  { route: 'disturbedManifesto', realm: 'continuity', asset: 'تداوم عالم.jpg' },
  { route: 'observation25', realm: 'experience', asset: 'قلمرو تجربه.jpg' },
  { route: 'possibleMirror', realm: 'experience', asset: 'قلمرو تجربه.jpg' },
  { route: 'emergence2', realm: 'experience', asset: 'قلمرو تجربه.jpg' },
  { route: 'observation', realm: 'reference', asset: 'مرجع تقلید.jpg' },
  { route: 'layer3', realm: 'reference', asset: 'مرجع تقلید.jpg' },
  { route: 'zero', realm: 'structure', asset: 'ساختار تالار.jpg' },
  { route: 'quantum-maze', realm: 'structure', asset: 'ساختار تالار.jpg' },
];
const books = ['humanMachines', 'forgers', 'tabahian'];
const paragraphModes = [
  { kind: 'experience', realm: 'experience', asset: 'قلمرو تجربه.jpg' },
  { kind: 'reference', realm: 'reference', asset: 'مرجع تقلید.jpg' },
];

fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
let failures = 0;
const fail = (message) => { failures += 1; console.error('FAIL ' + message); };

async function newPage(viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => fail(viewport.name + ': uncaught browser error: ' + error.message));
  return page;
}

async function assertBackground(page, realm, asset, label) {
  const state = await page.evaluate(() => {
    const root = document.querySelector('#shared-page-host [data-realm-background], #book-page[data-realm-background], #paragraph-page[data-realm-background]');
    if (!root) return null;
    const style = getComputedStyle(root);
    return {
      realm: root.dataset.realmBackground,
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      backgroundRepeat: style.backgroundRepeat,
      backgroundAttachment: style.backgroundAttachment,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  if (!state) { fail(label + ': no realm-background page root'); return; }
  if (state.realm !== realm) fail(label + ': expected realm ' + realm + ', got ' + state.realm);
  if (!decodeURIComponent(state.backgroundImage).includes(asset)) fail(label + ': background image does not include ' + asset);
  if (state.backgroundRepeat !== 'no-repeat') fail(label + ': expected no-repeat, got ' + state.backgroundRepeat);
  if (state.backgroundAttachment !== 'scroll') fail(label + ': expected scrolling background, got ' + state.backgroundAttachment);
  if (state.scrollWidth > state.clientWidth + 1) fail(label + ': horizontal overflow ' + state.scrollWidth + ' > ' + state.clientWidth);
}

try {
  for (const viewport of viewports) {
    for (const item of routes) {
      const page = await newPage(viewport);
      const imageResponses = [];
      page.on('response', (response) => {
        if (decodeURIComponent(response.url()).includes(item.asset)) imageResponses.push({ status: response.status(), url: response.url() });
      });
      const response = await page.goto(baseURL + '/index.html?page=' + encodeURIComponent(item.route), { waitUntil: 'domcontentloaded' });
      if (!response?.ok()) fail(viewport.name + '/' + item.route + ': HTTP ' + (response?.status() ?? 'no response'));
      await page.waitForFunction((realm) => document.querySelector('#shared-page-host [data-realm-background]')?.dataset.realmBackground === realm, item.realm).catch(() => fail(viewport.name + '/' + item.route + ': shared page did not acquire expected background'));
      await page.waitForTimeout(100);
      await assertBackground(page, item.realm, item.asset, viewport.name + '/' + item.route);
      if (!imageResponses.some((entry) => entry.status === 200)) fail(viewport.name + '/' + item.route + ': source image was not requested successfully');
      await page.screenshot({ path: path.join(outputDir, viewport.name + '-' + item.route + '.png'), fullPage: false });
      await page.close();
    }

    for (const book of books) {
      const page = await newPage(viewport);
      await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean(window.BookNavigation && window.RealmBackgrounds));
      await page.evaluate((kind) => window.BookNavigation.openBook('share', kind), book);
      await assertBackground(page, 'share', 'اقتصاد سهم.jpg', viewport.name + '/book-' + book);
      await page.screenshot({ path: path.join(outputDir, viewport.name + '-book-' + book + '.png'), fullPage: false });
      await page.close();
    }

    for (const mode of paragraphModes) {
      const page = await newPage(viewport);
      await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean(window.SitePages && window.RealmBackgrounds));
      await page.evaluate((kind) => window.SitePages.openParagraph(kind), mode.kind);
      await assertBackground(page, mode.realm, mode.asset, viewport.name + '/paragraph-' + mode.kind);
      await page.screenshot({ path: path.join(outputDir, viewport.name + '-paragraph-' + mode.kind + '.png'), fullPage: false });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log('Realm child background browser checks: ' + (failures ? failures + ' failure(s)' : 'passed') + '; screenshots: ' + outputDir);
if (failures) process.exitCode = 1;
