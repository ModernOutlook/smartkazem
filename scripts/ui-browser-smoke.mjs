import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173';
const htmlFiles = fs.readdirSync(process.cwd()).filter((file) => file.endsWith('.html')).sort();
const viewports = [
  { name: 'mobile portrait', width: 360, height: 800 },
  { name: 'mobile landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1365, height: 900 },
];
const languages = [
  { code: 'fa', dir: 'rtl' },
  { code: 'en', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'zh', dir: 'ltr' },
];
const failures = [];
const fail = (message) => {
  failures.push(message);
  console.error('FAIL ' + message);
};

const browser = await chromium.launch({ headless: true });
try {
  // One pass over each standalone HTML entry point: HTTP response, runtime
  // exceptions, and document-level horizontal overflow at three useful sizes.
  for (const file of htmlFiles) {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(5000);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      const response = await page.goto(new URL(encodeURIComponent(file), baseURL.endsWith('/') ? baseURL : baseURL + '/').href, {
        waitUntil: 'domcontentloaded',
      });
      if (!response?.ok()) {
        fail(file + ': HTTP ' + (response?.status() ?? 'no response'));
        await page.close();
        continue;
      }

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(80);
        const geometry = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body?.scrollWidth ?? 0,
        }));
        if (geometry.document > geometry.viewport + 2 || geometry.body > geometry.viewport + 2) {
          fail(file + ' @ ' + viewport.name + ': horizontal overflow (viewport=' +
            geometry.viewport + ', document=' + geometry.document + ', body=' + geometry.body + ')');
        }
      }

      if (pageErrors.length) fail(file + ': runtime exception: ' + pageErrors[0]);
    } catch (error) {
      fail(file + ': ' + String(error).split('\n')[0]);
    } finally {
      await page.close();
    }
  }

  // The language control is shared from the landing page. Exercise each
  // supported language and verify the real document language/direction pair.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(5000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    const response = await page.goto(baseURL.endsWith('/') ? baseURL : baseURL + '/', { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) fail('index.html: landing page did not load');

    await page.waitForFunction(() => Boolean(window.SiteI18n), null, { timeout: 7000 });
    for (const language of languages) {
      const button = page.locator('[data-site-lang="' + language.code + '"]').first();
      if (await button.count() !== 1) {
        fail('landing page: expected one language button for ' + language.code);
        continue;
      }
      await button.click();
      await page.waitForFunction(({ code, dir }) =>
        document.documentElement.lang === code &&
        document.documentElement.dir === dir &&
        document.querySelector('[data-site-lang="' + code + '"]')?.getAttribute('aria-pressed') === 'true',
      language, { timeout: 5000 });
    }
    if (pageErrors.length) fail('landing page: runtime exception: ' + pageErrors[0]);
  } catch (error) {
    fail('landing language switching: ' + String(error).split('\n')[0]);
  } finally {
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('UI smoke failed: ' + failures.length + ' issue(s).');
  process.exitCode = 1;
} else {
  console.log('UI smoke passed: HTML entry points, three viewport sizes, and four-language switching.');
}
