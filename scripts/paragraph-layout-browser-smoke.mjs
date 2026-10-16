import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: 'minimum mobile portrait', width: 320, height: 568, mobile: true },
  { name: 'compact mobile portrait', width: 360, height: 640, mobile: true },
  { name: 'mobile portrait', width: 390, height: 844, mobile: true },
  { name: 'narrow mobile landscape', width: 568, height: 320, mobile: true },
  { name: 'standard mobile landscape', width: 640, height: 360, mobile: true },
  { name: 'wide mobile landscape', width: 844, height: 390, mobile: true },
  { name: 'tablet portrait', width: 768, height: 1024, mobile: true },
  { name: 'desktop breakpoint landscape', width: 1024, height: 768, mobile: false },
  { name: 'desktop portrait', width: 1024, height: 1366, mobile: false },
  { name: 'compact desktop landscape', width: 1280, height: 720, mobile: false },
  { name: 'standard desktop landscape', width: 1366, height: 768, mobile: false },
  { name: 'desktop landscape', width: 1440, height: 900, mobile: false },
  { name: 'wide desktop landscape', width: 1920, height: 1080, mobile: false },
];
const languages = [
  { code: 'fa', dir: 'rtl' },
  { code: 'en', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'zh', dir: 'ltr' },
];
const screenshotDir = 'artifacts/paragraph-machine';
await mkdir(screenshotDir, { recursive: true });
let failures = 0;
function check(ok, message) {
  if (!ok) { failures += 1; console.error('FAIL ' + message); }
}
const context = await browser.newContext();
try {
  for (const viewport of viewports) {
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const response = await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });
    check(Boolean(response && response.ok()), viewport.name + ': site failed to load');
    await page.waitForFunction(() => Boolean(window.ParagraphPage && window.ParagraphLLM && window.SiteI18n), null, { timeout: 8000 });
    const splash = page.locator('#splash');
    if (await splash.count() && await splash.isVisible()) {
      await splash.click().catch(() => {});
      await page.waitForTimeout(120);
    }
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Keep this a presentation-only test: stub the workspace adapter with
    // deterministic, schema-independent data so opening the recognition route
    // populates its output panel without any model/network calls. Production
    // adapter and request/response contracts remain untouched.
    await page.evaluate(() => {
      // The production adapter is frozen, so replace the global reference
      // rather than assigning methods on the frozen object.
      window.ParagraphWorkspaceAdapter = {
        generateParagraphs: async count =>
          Array.from({ length: count }, (_, index) => ({
            text: 'Layout smoke test paragraph ' + (index + 1) + '.'
          })),
        evaluateText: async text => ({
          text,
          judgment: Object.fromEntries(['S', 'T', 'E', 'R', 'C'].map(domain => [domain, {
            status: 'warn',
            reason: 'Layout fixture; no conceptual claim is tested.'
          }])),
          normative: Object.fromEntries(['S', 'T', 'E', 'R', 'C'].map(domain => [domain, {
            direction: 'indeterminate',
            rationale: 'This fixture deliberately supplies insufficient evidence.',
            evidence: 'Insufficient textual evidence.'
          }]))
        })
      };
    });

    for (const language of languages) {
      await page.evaluate(() => window.SitePages.closeParagraph());
      await page.locator('[data-site-lang="' + language.code + '"]').first().click();
      await page.waitForFunction(({ code, dir }) =>
        document.documentElement.lang === code &&
        document.documentElement.dir === dir,
      language);
      for (const entry of ['experience', 'reference']) {
        await page.evaluate(kind => window.SitePages.openParagraph(kind), entry);
        await page.waitForFunction(() => {
          const page = document.querySelector('#paragraph-page');
          return page?.classList.contains('open') && page.classList.contains('is-active') && getComputedStyle(page).display !== 'none' && page.getBoundingClientRect().width > 0;
        });
        // Recognition generation is asynchronous; wait for its deterministic fixture to render.
        if (entry === 'experience') {
          await page.waitForFunction(() => {
            const output = document.querySelector('#paragraph-primary-output');
            return Boolean(output && (output.querySelector('.pm-primary-card') || document.querySelector('#paragraph-error')?.textContent));
          }, null, { timeout: 3000 }).catch(() => {});
        }
        await page.waitForTimeout(40);
        const metrics = await page.evaluate(() => {
          const rect = selector => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return {
              left: r.left, right: r.right, top: r.top, bottom: r.bottom,
              width: r.width, height: r.height,
              clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
              clientHeight: el.clientHeight, scrollHeight: el.scrollHeight,
              display: s.display, overflowX: s.overflowX, overflowY: s.overflowY,
            };
          };
          const workspace = document.querySelector('.paragraph-workspace');
          const stage = document.querySelector('.pm-recognition-stage');
          const choices = document.querySelector('.pm-realm-choices');
          const contextStrong = document.querySelector('.paragraph-context strong');
          const contextSpan = document.querySelector('.paragraph-context span');
          const connection = document.querySelector('.paragraph-connection');
          const realms = [...document.querySelectorAll('.pm-realm-choice')].map(el => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, height: r.height };
          });
          return {
            innerWidth: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            page: rect('#paragraph-page'),
            workspace: rect('.paragraph-workspace'),
            stage: rect('.pm-recognition-stage'),
            smartbot: rect('.pm-smartbot'),
            choices: rect('.pm-realm-choices'),
            contextStrong: contextStrong ? (() => { const r = contextStrong.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; })() : null,
            contextSpan: contextSpan ? (() => { const r = contextSpan.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; })() : null,
            connection: connection ? (() => { const r = connection.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; })() : null,
            input: rect('#paragraph-input'),
            primaryPanel: rect('#paragraph-primary-panel'),
            primaryOutput: { ...rect('#paragraph-primary-output'), hidden: document.querySelector('#paragraph-primary-output')?.hidden, childCount: document.querySelector('#paragraph-primary-output')?.children.length },
            primaryPanelClass: document.querySelector('#paragraph-primary-panel')?.className,
            normative: rect('#paragraph-normative-output'),
            normativeCards: document.querySelectorAll('#paragraph-normative-output .pm-normative-card').length,
            normativeHeading: document.querySelector('#paragraph-normative-output h3')?.textContent || '',
            entry: document.querySelector('#paragraph-page')?.dataset.entry,
            settings: rect('#paragraph-settings'),
            output: rect('#paragraph-output'),
            realms,
            workspaceScrolls: workspace ? workspace.scrollHeight > workspace.clientHeight + 2 : false,
            stageColumns: stage ? getComputedStyle(stage).gridTemplateColumns : '',
            choiceColumns: choices ? getComputedStyle(choices).gridTemplateColumns : '',
          };
        });
        const tag = viewport.name + ' / ' + language.code + ' / ' + entry;
        check(metrics.documentWidth <= viewport.width + 2, tag + ': document horizontal overflow ' + metrics.documentWidth + '>' + viewport.width);
        check(metrics.bodyWidth <= viewport.width + 2, tag + ': body horizontal overflow ' + metrics.bodyWidth + '>' + viewport.width);
        check(metrics.workspace && metrics.workspace.width > 0 && metrics.workspace.left >= -2 && metrics.workspace.right <= viewport.width + 2, tag + ': workspace outside viewport');
        check(metrics.realms.length === 5, tag + ': expected five realm controls, got ' + metrics.realms.length);
        if (entry === 'experience') {
          check(metrics.normative && metrics.normative.width > 0 && metrics.normative.height > 0, tag + ': independent normative panel is not visible');
          check(metrics.normativeCards === 5, tag + ': expected five separate normative judgments, got ' + metrics.normativeCards);
          check(Boolean(metrics.normativeHeading), tag + ': normative panel heading is missing');
        }
        check(metrics.realms.every(r => r.width > 0 && r.height > 0 && r.left >= -2 && r.right <= viewport.width + 2), tag + ': one or more realm controls are outside viewport');
        check(metrics.choices && metrics.choices.width > 0 && metrics.choices.left >= -2 && metrics.choices.right <= viewport.width + 2, tag + ': realm-choice track outside viewport');
        if (metrics.stage && metrics.choices) {
          check(metrics.choices.left >= metrics.stage.left - 2 && metrics.choices.right <= metrics.stage.right + 2, tag + ': realm-choice track spills outside its stage');
        }
        if (viewport.width >= 1024 && metrics.choices && metrics.connection) {
          const overlapsConnection = metrics.realms.some(r =>
            r.left < metrics.connection.right - 2 &&
            r.right > metrics.connection.left + 2 &&
            r.top < metrics.connection.bottom - 2 &&
            r.bottom > metrics.connection.top + 2
          );
          check(!overlapsConnection, tag + ': realm controls overlap the connection panel');
        }
        if (viewport.width <= 700 && metrics.contextStrong && metrics.contextSpan) {
          check(metrics.contextStrong.right <= metrics.contextSpan.left + 2 ||
            metrics.contextSpan.top >= metrics.contextStrong.bottom - 2,
          tag + ': context messages overlap instead of wrapping');
          check(metrics.contextStrong.width <= viewport.width && metrics.contextSpan.width <= viewport.width,
            tag + ': context message exceeds viewport width');
        }
        if (viewport.width <= 1023 && viewport.height < viewport.width) {
          check(metrics.realms.every(r => r.width >= 20), tag + ': realm controls too narrow in landscape');
          check(metrics.choices && metrics.choices.scrollWidth <= metrics.choices.clientWidth + 2, tag + ': realm-choice track overflows its own width');
        }
        if (viewport.width >= 1024) {
          check(metrics.workspace.overflowY === 'auto' || metrics.workspace.overflowY === 'scroll', tag + ': desktop workspace is not vertically scrollable');
          check(metrics.output && metrics.output.overflowY === 'auto', tag + ': desktop result panel is not independently scrollable');
        }
        if (entry === 'reference') {
          check(metrics.input && metrics.input.display !== 'none' && metrics.input.width > 0, tag + ': equivalency input is not visible');
        } else {
          check(metrics.primaryPanel && metrics.primaryPanel.display !== 'none' && metrics.primaryPanel.width > 0, tag + ': recognition panel container is not visible (display=' + metrics.primaryPanel?.display + ', width=' + metrics.primaryPanel?.width + ', class=' + metrics.primaryPanelClass + ', entry=' + metrics.entry + ')');
          check(metrics.primaryOutput && metrics.primaryOutput.display !== 'none' && metrics.primaryOutput.hidden !== true && metrics.primaryOutput.childCount > 0, tag + ': recognition output has not rendered (display=' + metrics.primaryOutput?.display + ', width=' + metrics.primaryOutput?.width + ', hidden=' + metrics.primaryOutput?.hidden + ', children=' + metrics.primaryOutput?.childCount + ', parentClass=' + metrics.primaryPanelClass + ', entry=' + metrics.entry + ')');
        }
        if (viewport.width >= 640 && viewport.width <= 1023 && viewport.height < viewport.width) {
          check(metrics.smartbot && metrics.smartbot.width > 0 && metrics.choices && metrics.choices.width > 0, tag + ': SmartBot or realm controls collapsed');
        }
        console.log('OK ' + tag + ': workspace=' + Math.round(metrics.workspace?.width || 0) + 'px, realms=' + metrics.realms.map(r => Math.round(r.width)).join('/') + ', workspaceScroll=' + metrics.workspaceScrolls);
        const safe = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await page.screenshot({
          path: screenshotDir + '/' + safe(viewport.name) + '__' + language.code + '__' + entry + '.png',
          fullPage: false,
          animations: 'disabled'
        });
      }
    }
    // Exercise real in-session reflow across orientation changes and the
    // 1024px mobile/desktop breakpoint, not only fresh-page viewport loads.
    const languageAtEnd = languages[languages.length - 1].code;
    for (const size of [
      { name: 'resize to minimum portrait', width: 320, height: 568 },
      { name: 'resize to narrow landscape', width: 568, height: 320 },
      { name: 'resize below desktop breakpoint', width: 1023, height: 768 },
      { name: 'resize across desktop breakpoint', width: 1024, height: 768 },
      { name: 'resize to wide desktop', width: 1920, height: 1080 },
      { name: 'resize back to mobile portrait', width: 360, height: 640 },
    ]) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(50);
      const resized = await page.evaluate(() => {
        const workspace = document.querySelector('.paragraph-workspace');
        const choices = document.querySelector('.pm-realm-choices');
        const wr = workspace?.getBoundingClientRect();
        const cr = choices?.getBoundingClientRect();
        return {
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          workspace: wr ? { left: wr.left, right: wr.right, width: wr.width } : null,
          choices: cr ? { left: cr.left, right: cr.right, width: cr.width, scrollWidth: choices.scrollWidth, clientWidth: choices.clientWidth } : null,
          realmCount: document.querySelectorAll('.pm-realm-choice').length,
        };
      });
      const tag = size.name + ' / ' + languageAtEnd;
      check(resized.documentWidth <= size.width + 2, tag + ': document horizontal overflow ' + resized.documentWidth + '>' + size.width);
      check(resized.bodyWidth <= size.width + 2, tag + ': body horizontal overflow ' + resized.bodyWidth + '>' + size.width);
      check(resized.workspace && resized.workspace.width > 0 && resized.workspace.left >= -2 && resized.workspace.right <= size.width + 2, tag + ': workspace outside viewport');
      check(resized.realmCount === 5, tag + ': expected five realm controls, got ' + resized.realmCount);
      check(resized.choices && resized.choices.left >= -2 && resized.choices.right <= size.width + 2, tag + ': realm-choice track outside viewport');
      if (size.width <= 1023 && size.height < size.width) {
        check(resized.choices && resized.choices.scrollWidth <= resized.choices.clientWidth + 2, tag + ': realm-choice track overflows after resize');
      }
      console.log('OK ' + tag + ': workspace=' + Math.round(resized.workspace?.width || 0) + 'px');
    }
    check(pageErrors.length === 0, viewport.name + ': browser exceptions: ' + pageErrors.slice(0, 2).join(' | '));
    await page.close();
  }
} finally {
  await context.close();
  await browser.close();
}
if (failures) {
  console.error('Paragraph Machine layout smoke tests failed: ' + failures + ' issue(s).');
  process.exitCode = 1;
} else {
  console.log('Paragraph Machine layout smoke tests passed across all viewports, entry routes and languages.');
}
