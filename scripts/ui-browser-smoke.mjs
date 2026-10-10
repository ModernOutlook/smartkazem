import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173';
const root = process.cwd();
const htmlFiles = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .sort();
const languages = [
  { code: 'fa', dir: 'rtl' },
  { code: 'en', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'zh', dir: 'ltr' },
];
const responsivePages = [
  'index.html',
  'inventory.html',
  'observation.html',
  'observation-25.html',
  'possible-mirror.html',
  'philosophical-treatise.html',
  'echo-layer3.html',
  'emergence.html',
  'emergence-2.html',
  'shahnameh-reading.html',
];
const viewports = [
  { width: 320, height: 740, name: 'small portrait' },
  { width: 360, height: 800, name: 'portrait' },
  { width: 390, height: 844, name: 'portrait' },
  { width: 430, height: 932, name: 'large portrait' },
  { width: 768, height: 1024, name: 'tablet portrait' },
  { width: 844, height: 390, name: 'phone landscape' },
  { width: 1024, height: 768, name: 'desktop threshold' },
  { width: 1365, height: 900, name: 'desktop' },
];

let failures = 0;
const fail = (message) => { failures++; console.error('FAIL ' + message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });

try {
  for (const file of htmlFiles) {
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const response = await page.goto(`${baseURL}/${encodeURIComponent(file)}`, { waitUntil: 'domcontentloaded' });
    if (!response || !response.ok()) {
      fail(`${file}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    const languageButtonCount = await page.locator('[data-site-lang]').count();
    if (languageButtonCount !== 4) fail(`${file}: expected four shared language buttons, found ${languageButtonCount}`);

    for (const language of languages) {
      const button = page.locator(`[data-site-lang="${language.code}"]`).first();
      try {
        await button.click();
        await page.waitForFunction(
          ({ code, dir }) => document.documentElement.lang === code && document.documentElement.dir === dir,
          language,
          { timeout: 5000 }
        );
      } catch (error) {
        fail(`${file}: switching to ${language.code} did not set lang/dir correctly (${String(error).split('\n')[0]})`);
      }
    }

    if (pageErrors.length) {
      fail(`${file}: browser runtime exception(s): ${pageErrors.slice(0, 2).join(' | ')}`);
    }
    console.log(`OK language round-trip: ${file}`);
    await page.close();
  }

  for (const file of responsivePages) {
    if (!htmlFiles.includes(file)) {
      console.log(`SKIP responsive viewport sweep: ${file} not present in repository root`);
      continue;
    }
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.goto(`${baseURL}/${encodeURIComponent(file)}`, { waitUntil: 'domcontentloaded' });
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(100);
      const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      if (metrics.documentWidth > metrics.innerWidth + 2) {
        fail(`${file} @ ${viewport.name} (${viewport.width}px): document horizontal overflow ${metrics.documentWidth}>${metrics.innerWidth}`);
      }
    }
    console.log(`OK responsive viewport sweep: ${file}`);
    await page.close();
  }
} finally {
  await context.close();
  await browser.close();
}

if (failures) {
  console.error(`Browser smoke tests failed: ${failures} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('Browser smoke tests passed.');
}
