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
  'shahnameh.html',
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
    page.setDefaultTimeout(7000);
    const pageErrors = [];
    const failedRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url() + ': ' + (request.failure()?.errorText || 'request failed')));
    const response = await page.goto(`${baseURL}/${encodeURIComponent(file)}`, { waitUntil: 'domcontentloaded' });
    if (!response || !response.ok()) {
      fail(`${file}: HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    await page.waitForFunction(() => Boolean(window.SiteI18n && window.SiteI18n.getCatalog()), null, { timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => {
      const lang = document.documentElement.lang;
      return Boolean(document.querySelector(`[data-site-lang="${lang}"][aria-pressed="true"]`));
    }, null, { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => {
      window.__languageSmokeEvents = [];
      document.addEventListener('click', (event) => {
        const button = event.target.closest?.('[data-site-lang]');
        if (button) window.__languageSmokeEvents.push({ type: 'click-capture', requested: button.dataset.siteLang, lang: document.documentElement.lang });
      }, true);
      document.addEventListener('site:languagechange', (event) => {
        window.__languageSmokeEvents.push({ type: 'languagechange', lang: event.detail?.lang, dir: document.documentElement.dir });
      });
    });

    const splash = page.locator('#splash');
    if (await splash.count() && await splash.isVisible()) {
      await splash.click().catch(() => {});
      await page.waitForTimeout(150);
    }

    const languageButtonCount = await page.locator('[data-site-lang]').count();
    if (languageButtonCount !== 4) fail(`${file}: expected four shared language buttons, found ${languageButtonCount}`);

    let languageFailures = 0;
    for (const language of languages) {
      const button = page.locator(`[data-site-lang="${language.code}"]`).first();
      try {
        await button.scrollIntoViewIfNeeded();
        await button.click({ timeout: 5000 });
        await page.waitForFunction(
          ({ code, dir }) => document.documentElement.lang === code && document.documentElement.dir === dir && document.querySelector(`[data-site-lang="${code}"]`)?.getAttribute('aria-pressed') === 'true',
          language,
          { timeout: 5000 }
        );
      } catch (error) {
        languageFailures++;
        const diagnostic = await page.evaluate(async (code) => {
          const state = () => ({
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            active: document.querySelector('[data-site-lang][aria-pressed="true"]')?.dataset.siteLang || null,
            catalogLoaded: Boolean(window.SiteI18n?.getCatalog()),
            i18nAvailable: Boolean(window.SiteI18n),
            button: (() => { const el = document.querySelector(`[data-site-lang="${code}"]`); if (!el) return null; const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, visible: Boolean(r.width && r.height && getComputedStyle(el).visibility !== 'hidden'), hitTag: hit?.tagName || null, hitLang: hit?.closest?.('[data-site-lang]')?.dataset.siteLang || null, hitClass: typeof hit?.className === 'string' ? hit.className : '' }; })(),
            eventsBeforeRetry: [...(window.__languageSmokeEvents || [])],
          });
          const beforeRetry = state();
          try {
            const result = await Promise.race([
              window.SiteI18n?.setLanguage(code),
              new Promise((resolve) => setTimeout(() => resolve('__diagnostic_timeout__'), 3000)),
            ]);
            return { beforeRetry, afterRetry: state(), retry: result === '__diagnostic_timeout__' ? 'setLanguage did not settle within 3s' : (result || 'SiteI18n unavailable') };
          } catch (cause) {
            return { ...state(), retryError: String(cause) };
          }
        }, language.code);
        fail(`${file}: switching to ${language.code} failed; diagnostic=${JSON.stringify(diagnostic)}; ${String(error).split('\n')[0]}`);
      }
    }

    if (pageErrors.length) {
      fail(`${file}: browser runtime exception(s): ${pageErrors.slice(0, 3).join(' | ')}`);
    }
    if (failedRequests.length) {
      fail(`${file}: failed browser request(s): ${failedRequests.slice(0, 3).join(' | ')}`);
    }
    if (!languageFailures && !pageErrors.length && !failedRequests.length) console.log(`OK language round-trip: ${file}`);
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
