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

    if (file === 'index.html') {
      const measure = async (selectors) => page.evaluate((items) => {
        const result = Object.fromEntries(items.map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return [selector, null];
          const rect = element.getBoundingClientRect();
          return [selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
        }));
        // Capture the viewport shell and its computed layout contract around
        // every direction transition so a geometry failure points to the
        // owning ancestor instead of only reporting a downstream 30px shift.
        result.__viewport = {
          innerWidth: window.innerWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          shell: Object.fromEntries(['html', 'body', '#app', '.home-page', '.home-page > .orbit', '.home-page > .info'].map((selector) => {
            const element = document.querySelector(selector);
            if (!element) return [selector, null];
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return [selector, {
              x: rect.x, y: rect.y, width: rect.width, height: rect.height,
              clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
              clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
              scrollLeft: element.scrollLeft,
              direction: style.direction, writingMode: style.writingMode,
              display: style.display, position: style.position,
              widthStyle: style.width, maxWidth: style.maxWidth,
              overflowX: style.overflowX, overflowY: style.overflowY,
              justifyItems: style.justifyItems, alignItems: style.alignItems,
              gridTemplateColumns: style.gridTemplateColumns,
              gridTemplateRows: style.gridTemplateRows,
              gridTemplateAreas: style.gridTemplateAreas,
              gridArea: style.gridArea,
              gridColumnStart: style.gridColumnStart,
              gridColumnEnd: style.gridColumnEnd,
              gridRowStart: style.gridRowStart,
              gridRowEnd: style.gridRowEnd,
              justifyItems: style.justifyItems, alignItems: style.alignItems,
              justifySelf: style.justifySelf, alignSelf: style.alignSelf,
              inset: style.inset, left: style.left, right: style.right,
              paddingInline: style.paddingInline, boxSizing: style.boxSizing,
              marginLeft: style.marginLeft, marginRight: style.marginRight,
              transform: style.transform,
            }];
          })),
        };
        return result;
      }, selectors);
      const compareGeometry = (before, after, label) => {
        let viewportDiagnosticsLogged = false;
        const selectorsToCompare = [
          ...Object.keys(before || {}).filter((key) => !key.startsWith('__')),
          ...['html', 'body', '#app'].filter((selector) => before?.__viewport?.shell?.[selector] && after?.__viewport?.shell?.[selector]),
        ];
        for (const selector of selectorsToCompare) {
          const a = before[selector] || before?.__viewport?.shell?.[selector];
          const b = (after && after[selector]) || after?.__viewport?.shell?.[selector];
          if (!a || !b) {
            if (a !== b) fail(label + ': missing geometry for ' + selector);
            continue;
          }
          const axes = ['html', 'body', '#app'].includes(selector)
            ? ['x', 'y', 'width', 'height']
            : ['x', 'width'];
          for (const key of axes) {
            if (Math.abs(a[key] - b[key]) > 2) {
              fail(label + ': ' + selector + ' shifted (' + key + ': ' + a[key] + ' -> ' + b[key] + ')');
              if (!viewportDiagnosticsLogged) {
                console.error('DIAGNOSTIC ' + label + ': ' + JSON.stringify({
                  before: before.__viewport,
                  after: after && after.__viewport,
                }));
                viewportDiagnosticsLogged = true;
              }
              break;
            }
          }
        }
      };
      const landingSelectors = ['.home-page', '.home-page .orbit', '.home-page .menu-svg', '.home-page > .info'];
      await page.locator('[data-site-lang="fa"]').click();
      await page.waitForFunction(() => document.documentElement.lang === 'fa' && document.documentElement.dir === 'rtl');
      const landingBaseline = await measure(landingSelectors);
      console.info('LAYOUT SNAPSHOT fa/rtl baseline ' + JSON.stringify(landingBaseline.__viewport));
      for (const language of languages) {
        await page.locator('[data-site-lang="' + language.code + '"]').click();
        await page.waitForFunction(({ code, dir }) => document.documentElement.lang === code && document.documentElement.dir === dir, language);
        const afterDirectionChange = await measure(landingSelectors);
        console.info('LAYOUT SNAPSHOT fa/rtl -> ' + language.code + '/' + language.dir + ' ' + JSON.stringify({
          before: landingBaseline.__viewport,
          after: afterDirectionChange.__viewport,
        }));
        if (afterDirectionChange.__viewport.shell['#app']?.scrollLeft !== 0) {
          fail('landing RTL/LTR ' + language.code + ': #app has nonzero horizontal scroll offset (' + afterDirectionChange.__viewport.shell['#app']?.scrollLeft + ')');
        }
        compareGeometry(landingBaseline, afterDirectionChange, 'landing RTL/LTR ' + language.code);
      }
      const realmCases = [
        { id: 'structure', root: '#structure-page', parts: ['.structure-head', '.structure-actions'], close: '#structure-close' },
        { id: 'continuity', root: '#continuity-page', parts: ['.continuity-head', '.continuity-actions'], close: '#continuity-close' },
        { id: 'experience', root: '#experience-page', parts: ['.experience-head', '.experience-actions'], close: '#experience-close' },
        { id: 'reference', root: '#reference-page', parts: ['.reference-head', '.reference-actions'], close: '#reference-close' },
        { id: 'share', root: '#share-page', parts: ['.share-head', '.share-actions'], close: '#share-close' },
      ];
      for (const realm of realmCases) {
        // The SVG territories are concentric, so clicking the center of a
        // group's bounding box lands on a different, inner ring. Click the
        // exposed annulus of each intended territory instead.
        const universeBox = await page.locator('#universe').boundingBox();
        if (!universeBox) throw new Error('Missing territory SVG geometry: ' + realm.id);
        const annulusRadius = {
          structure: 410,
          continuity: 330,
          experience: 250,
          reference: 175,
          share: 100,
        }[realm.id];
        if (!annulusRadius) throw new Error('Missing non-overlapping annulus radius: ' + realm.id);
        await page.mouse.click(
          universeBox.x + universeBox.width / 2,
          universeBox.y + universeBox.height * (0.5 - annulusRadius / 1000),
        );
        await page.waitForFunction((selector) => document.querySelector(selector)?.classList.contains('is-active'), realm.root);
        const selectors = [realm.root].concat(realm.parts.map((part) => realm.root + ' ' + part));
        await page.locator('[data-site-lang="fa"]').click();
        await page.waitForFunction(() => document.documentElement.lang === 'fa' && document.documentElement.dir === 'rtl');
        const baseline = await measure(selectors);
        for (const language of languages) {
          await page.locator('[data-site-lang="' + language.code + '"]').click();
          await page.waitForFunction(({ code, dir }) => document.documentElement.lang === code && document.documentElement.dir === dir, language);
          compareGeometry(baseline, await measure(selectors), realm.id + ' realm RTL/LTR ' + language.code);
        }
        await page.locator(realm.close).click();
        await page.waitForFunction(() => document.querySelector('#home-page')?.classList.contains('is-active'));
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


const sharedRoutes = [
  { route: 'treatise', content: '#treatise-content', close: '#close' },
  { route: 'shahnameh', content: '#episode-list', close: '#back', preserveNavigation: true },
  { route: 'emergence', content: '#episode-list', close: '#emergence-close' },
  { route: 'observation25', content: '#observation25-tabs', close: '#observation25-close' },
  { route: 'possibleMirror', content: '#possible-mirror-tabs', close: '#possible-mirror-close' },
  { route: 'emergence2', content: '#episode-list', close: '#emergence2-close' },
  { route: 'observation', content: '#observation-source-title', close: '#close', measure: ['.observation-page', '.book-head', '.book-body'] },
  { route: 'layer3', content: '#chapters', close: '#close' },
  { route: 'disturbedManifesto', content: '#part-list', close: '#manifesto-close', measure: ['.disturbed-manifesto-page', '.top', '.reader'] },
  { route: 'zero', content: '#zero-story', close: '#zero-back', measure: ['.zero-page', '.zero-header', '.zero-article'] },
  { route: 'inventory', content: '#inventory-grid', close: 'a.inventory-home' },
];

for (const route of sharedRoutes) {
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url() + ': ' + (request.failure()?.errorText || 'request failed')));
  const response = await page.goto(`${baseURL}/index.html?page=${encodeURIComponent(route.route)}`, { waitUntil: 'domcontentloaded' });
  if (!response || !response.ok()) {
    fail(`shared route ${route.route}: HTTP ${response?.status() ?? 'no response'}`);
    await page.close();
    continue;
  }

  let measureRouteGeometry;
  let routeGeometryBaseline;
  try {
    await page.waitForFunction((key) => window.SharedPages?.getActive() === key && document.querySelector('#shared-page-host .child-page.is-active'), route.route, { timeout: 7000 });
    await page.waitForSelector(route.content, { state: 'attached', timeout: 7000 });
    const splash = page.locator('#splash');
    if (await splash.count() && await splash.isVisible()) {
      await splash.click().catch(() => {});
      await page.waitForTimeout(100);
    }
    const initialContent = await page.waitForFunction((selector) => { const el = document.querySelector(selector); return Boolean(el && (el.textContent.trim() || el.children.length)); }, route.content, { timeout: 5000 }).then(() => true).catch(() => false);
    if (!initialContent) fail(`shared route ${route.route}: content region is empty after mount`);
    measureRouteGeometry = async () => page.evaluate((selectors) => {
      const root = document.querySelector('#shared-page-host .child-page.is-active');
      const rectOf = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          direction: style.direction, writingMode: style.writingMode,
          display: style.display, position: style.position,
          widthStyle: style.width, maxWidth: style.maxWidth,
          inlineWidth: element.style.width, inlineHeight: element.style.height,
          inlineInset: element.style.inset,
          clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
          scrollLeft: element.scrollLeft,
          offsetLeft: element.offsetLeft, offsetTop: element.offsetTop,
          zoom: style.zoom, translate: style.translate, scale: style.scale,
          offsetParent: element.offsetParent ? {
            id: element.offsetParent.id, className: element.offsetParent.className,
            x: element.offsetParent.getBoundingClientRect().x,
            y: element.offsetParent.getBoundingClientRect().y,
            width: element.offsetParent.getBoundingClientRect().width,
            height: element.offsetParent.getBoundingClientRect().height,
            direction: getComputedStyle(element.offsetParent).direction,
            clientWidth: element.offsetParent.clientWidth,
            scrollWidth: element.offsetParent.scrollWidth,
            scrollLeft: element.offsetParent.scrollLeft,
          } : null,
          overflowX: style.overflowX, overflowY: style.overflowY,
          gridTemplateColumns: style.gridTemplateColumns,
          gridTemplateAreas: style.gridTemplateAreas, gridArea: style.gridArea,
          gridColumnStart: style.gridColumnStart, gridColumnEnd: style.gridColumnEnd,
          inset: style.inset, left: style.left, right: style.right,
          marginLeft: style.marginLeft, marginRight: style.marginRight,
          transform: style.transform,
        };
      };
      const result = {
        __shell: Object.fromEntries(['html', 'body', '#app', '#shared-page-host', '[data-shared-route]', '.child-page.is-active'].map((selector) => {
          const element = document.querySelector(selector);
          return [selector, rectOf(element)];
        })),
        __viewport: {
          innerWidth: window.innerWidth, clientWidth: document.documentElement.clientWidth,
          scrollX: window.scrollX, scrollY: window.scrollY,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
        },
      };
      for (const selector of selectors) {
        const element = root && (root.matches(selector) ? root : root.querySelector(selector));
        result[selector] = rectOf(element);
      }
      return result;
    }, route.measure || []);
    await page.locator('[data-site-lang="fa"]').first().click({ timeout: 5000 });
    await page.waitForFunction(() => document.documentElement.lang === 'fa' && document.documentElement.dir === 'rtl', null, { timeout: 5000 });
    routeGeometryBaseline = await measureRouteGeometry();
    if (routeGeometryBaseline.__shell['#app']?.scrollLeft !== 0) {
      fail('shared route ' + route.route + ': #app has nonzero horizontal scroll offset in fa/rtl (' + routeGeometryBaseline.__shell['#app']?.scrollLeft + ')');
    }
    console.info('LAYOUT SNAPSHOT ' + route.route + ' fa/rtl baseline ' + JSON.stringify(routeGeometryBaseline));
    const geometry = await page.evaluate(() => {
      const app = document.querySelector('#app')?.getBoundingClientRect();
      const root = document.querySelector('#shared-page-host .child-page.is-active')?.getBoundingClientRect();
      return app && root ? { app: { x: app.x, y: app.y, width: app.width, height: app.height }, root: { x: root.x, y: root.y, width: root.width, height: root.height } } : null;
    });
    if (!geometry || Math.abs(geometry.app.width - geometry.root.width) > 2 || Math.abs(geometry.app.x - geometry.root.x) > 2 || Math.abs(geometry.app.y - geometry.root.y) > 2) {
      fail(`shared route ${route.route}: child page does not fill shared shell; geometry=${JSON.stringify(geometry)}`);
    }
  } catch (error) {
    fail(`shared route ${route.route}: fragment/content did not mount; ${String(error).split('\\n')[0]}`);
  }

  for (const language of languages) {
    try {
      await page.locator(`[data-site-lang="${language.code}"]`).first().click({ timeout: 5000 });
      await page.waitForFunction(({ code, dir, key }) =>
        document.documentElement.lang === code &&
        document.documentElement.dir === dir &&
        document.querySelector(`[data-site-lang="${code}"]`)?.getAttribute('aria-pressed') === 'true' &&
        window.SharedPages?.getActive() === key,
      { ...language, key: route.route }, { timeout: 5000 });
      const localizedContent = await page.evaluate((selector) => { const el = document.querySelector(selector); return Boolean(el && (el.textContent.trim() || el.children.length)); }, route.content);
      if (!localizedContent) fail(`shared route ${route.route}: content region became empty in ${language.code}`);
      if (route.route === 'emergence2') {
        // Compare the rendered reader against the actual canonical data loaded
        // by the page: Persian sourceData for fa, and the selected language's
        // translation catalog for en/ar/zh. Exercise every episode, not only
        // the initially selected one, and keep a non-first episode active
        // across language changes.
        const audit = await page.evaluate((languageCode) => {
          const reader = document.querySelector('#reader');
          const source = window.Emergence2Catalog;
          const catalogs = window.SiteI18n?.getCatalog?.() || {};
          const book = catalogs.bookContent?.emergence2 || catalogs.chapters?.emergence2;
          const expectedChapterTitle = languageCode === 'fa'
            ? 'فصل دوم ظهور'
            : book?.title?.[languageCode] || '';
          const issues = [];
          if (document.documentElement.lang !== languageCode) issues.push('html lang mismatch');
          const expectedDir = ['fa', 'ar'].includes(languageCode) ? 'rtl' : 'ltr';
          if (document.documentElement.dir !== expectedDir) issues.push('html dir mismatch');
          if ((document.querySelector('#page-title')?.textContent || '').trim() !== expectedChapterTitle) {
            issues.push('chapter title differs from canonical catalog');
          }
          const buttons = [...document.querySelectorAll('#episode-list .episode')];
          if (!Array.isArray(source?.episodes) || source.episodes.length !== 11 || buttons.length !== 11) {
            issues.push('expected 11 canonical episodes and 11 rendered selectors');
          }
          const episodeResults = [];
          for (let index = 0; index < Math.min(11, source?.episodes?.length || 0); index++) {
            buttons[index]?.click();
            const base = source.episodes[index];
            const localized = book?.episodes?.[index];
            const expectedTitle = languageCode === 'fa'
              ? base.title
              : (typeof localized?.title === 'string' ? localized.title : localized?.title?.[languageCode]);
            const expectedParagraphs = languageCode === 'fa'
              ? (Array.isArray(base.paragraphs) ? base.paragraphs : [])
              : (Array.isArray(localized?.paragraphs?.[languageCode]) ? localized.paragraphs[languageCode] : []);
            const actualTitle = reader?.querySelector('h2')?.textContent?.trim() || '';
            const actualParagraphs = [...(reader?.querySelectorAll('.prose') || [])].map(node => node.textContent);
            const placeholder = Boolean(reader?.querySelector('.placeholder'));
            const rawObject = reader?.textContent?.includes('[object Object]') || false;
            const titleMatches = actualTitle === (expectedTitle || '');
            const paragraphsMatch = JSON.stringify(actualParagraphs) === JSON.stringify(expectedParagraphs);
            if (!expectedTitle || !expectedParagraphs.length || !titleMatches || !paragraphsMatch || placeholder || rawObject) {
              episodeResults.push({
                number: base.number,
                titleMatches,
                paragraphsMatch,
                expectedParagraphCount: expectedParagraphs.length,
                actualParagraphCount: actualParagraphs.length,
                placeholder,
                rawObject
              });
            }
          }
          // Leave episode 24 (index 4) active so the next language transition
          // proves that the controller preserves the selected episode.
          buttons[4]?.click();
          const activeNumber = source.episodes[4]?.number;
          const activeButtonNumber = buttons.findIndex(button => button.classList.contains('active'));
          return {
            expectedChapterTitle,
            actualChapterTitle: (document.querySelector('#page-title')?.textContent || '').trim(),
            activeNumber,
            activeButtonNumber,
            episodeResults,
            issues
          };
        }, language.code);
        if (audit.issues.length || audit.episodeResults.length || audit.activeButtonNumber !== 4) {
          fail(`Emergence II canonical-content mismatch in ${language.code}: ${JSON.stringify(audit)}`);
        }
      }
      const currentGeometry = await measureRouteGeometry();
      if (currentGeometry.__shell['#app']?.scrollLeft !== 0) {
        fail('shared route ' + route.route + ': #app has nonzero horizontal scroll offset after ' + language.code + ' switch (' + currentGeometry.__shell['#app']?.scrollLeft + ')');
      }
      console.info('LAYOUT SNAPSHOT ' + route.route + ' -> ' + language.code + ' ' + JSON.stringify(currentGeometry));
      const geometrySelectors = ['html', 'body', '#app', '.child-page.is-active', ...(route.measure || [])];
      for (const selector of geometrySelectors) {
        const before = selector.startsWith('__') ? routeGeometryBaseline[selector] : (routeGeometryBaseline[selector] || routeGeometryBaseline.__shell?.[selector]);
        const after = selector.startsWith('__') ? currentGeometry[selector] : (currentGeometry[selector] || currentGeometry.__shell?.[selector]);
        if (!before || !after) {
          fail(`shared route ${route.route}: missing shell/page geometry for ${selector} after ${language.code} switch`);
          continue;
        }
        const axes = ['html', 'body', '#app'].includes(selector)
          ? ['x', 'y', 'width', 'height']
          : selector === '.child-page.is-active'
            ? ['x', 'y', 'width']
            : ['x', 'width'];
        for (const axis of axes) {
          if (typeof before[axis] === 'number' && typeof after[axis] === 'number' && Math.abs(before[axis] - after[axis]) > 2) {
            fail(`shared route ${route.route}: ${selector} shifted on ${axis} after ${language.code} switch (${before[axis]} -> ${after[axis]})`);
          }
        }
      }
    } catch (error) {
      fail(`shared route ${route.route}: language ${language.code} transition failed; ${String(error).split('\\n')[0]}`);
      break;
    }
  }

  if (!route.preserveNavigation) {
    const activePage = page.locator('#shared-page-host .child-page.is-active');
    const forbidden = await activePage.locator('#art-prev, #art-next, #prev, #next, #prev-part, #next-part, #prev-bottom, #next-bottom').count();
    if (forbidden) fail(`shared route ${route.route}: non-Shahnameh previous/next controls found (${forbidden})`);
  } else {
    if (await page.locator('#art-prev').count() !== 1 || await page.locator('#art-next').count() !== 1) {
      fail('shared route shahnameh: its dedicated previous/next controls are missing');
    }
  }

  if (pageErrors.length) fail(`shared route ${route.route}: browser exception(s): ${pageErrors.slice(0, 3).join(' | ')}`);
  if (failedRequests.length) fail(`shared route ${route.route}: failed request(s): ${failedRequests.slice(0, 3).join(' | ')}`);

  try {
    await page.locator(route.close).first().click({ timeout: 5000 });
    await page.waitForFunction(() => window.SharedPages?.getActive() === null, null, { timeout: 5000 });
  } catch (error) {
    fail(`shared route ${route.route}: close/return action failed; ${String(error).split('\\n')[0]}`);
  }
  await page.close();
}


const sharedBooks = [
  { kind: 'forgers', label: 'Forgers' },
  { kind: 'humanMachines', label: 'Human and its Machines' },
  { kind: 'tabahian', label: 'Tabahian' },
];

for (const book of sharedBooks) {
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url() + ': ' + (request.failure()?.errorText || 'request failed')));
  const response = await page.goto(`${baseURL}/index.html`, { waitUntil: 'domcontentloaded' });
  if (!response || !response.ok()) {
    fail(`shared book ${book.kind}: HTTP ${response?.status() ?? 'no response'}`);
    await page.close();
    continue;
  }

  await page.waitForFunction(() => Boolean(window.BookNavigation && window.SiteI18n?.getCatalog()), null, { timeout: 7000 }).catch(() => {});
  const splash = page.locator('#splash');
  if (await splash.count() && await splash.isVisible()) {
    await splash.click().catch(() => {});
    await page.waitForTimeout(100);
  }

  try {
    await page.evaluate((kind) => window.BookNavigation.openBook('share', kind), book.kind);
    await page.waitForFunction(() => document.querySelector('#book-page.is-active') && document.querySelector('#book-body')?.children.length, null, { timeout: 5000 });
  } catch (error) {
    fail(`shared book ${book.kind}: did not open/render; ${String(error).split('\\n')[0]}`);
  }

  for (const language of languages) {
    try {
      await page.locator(`[data-site-lang="${language.code}"]`).first().click({ timeout: 5000 });
      await page.waitForFunction(({ code, dir }) =>
        document.documentElement.lang === code &&
        document.documentElement.dir === dir &&
        document.querySelector(`[data-site-lang="${code}"]`)?.getAttribute('aria-pressed') === 'true' &&
        document.querySelector('#book-page.is-active') !== null,
      language, { timeout: 5000 });
      const populated = await page.locator('#book-body').evaluate((el) => Boolean(el.textContent.trim() || el.children.length));
      if (!populated) fail(`shared book ${book.kind}: content became empty in ${language.code}`);
    } catch (error) {
      fail(`shared book ${book.kind}: language ${language.code} transition failed; ${String(error).split('\\n')[0]}`);
      break;
    }
  }

  if (pageErrors.length) fail(`shared book ${book.kind}: browser exception(s): ${pageErrors.slice(0, 3).join(' | ')}`);
  if (failedRequests.length) fail(`shared book ${book.kind}: failed request(s): ${failedRequests.slice(0, 3).join(' | ')}`);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(75);
    const metrics = await page.evaluate(() => ({ innerWidth: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    if (metrics.documentWidth > metrics.innerWidth + 2) fail(`shared book ${book.kind} @ ${viewport.name}: horizontal overflow ${metrics.documentWidth}>${metrics.innerWidth}`);
  }

  try {
    await page.locator('#book-close').click({ timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('#book-page')?.classList.contains('is-active'), null, { timeout: 5000 });
  } catch (error) {
    fail(`shared book ${book.kind}: close/return action failed; ${String(error).split('\\n')[0]}`);
  }
  console.log(`OK shared book workspace: ${book.label}`);
  await page.close();
}

  for (const route of sharedRoutes) {
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.goto(`${baseURL}/index.html?page=${encodeURIComponent(route.route)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((key) => window.SharedPages?.getActive() === key && document.querySelector('#shared-page-host .child-page.is-active'), route.route, { timeout: 7000 }).catch(() => {});
    await page.waitForSelector(route.content, { state: 'attached', timeout: 7000 }).catch(() => {});
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(100);
      const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      if (metrics.documentWidth > metrics.innerWidth + 2) {
        fail(`shared route ${route.route} @ ${viewport.name} (${viewport.width}px): document horizontal overflow ${metrics.documentWidth}>${metrics.innerWidth}`);
      }
    }
    console.log(`OK responsive viewport sweep: ${route.route}`);
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
