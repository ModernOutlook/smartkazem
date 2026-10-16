import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: 'mobile portrait', width: 390, height: 844, mobile: true },
  { name: 'narrow mobile landscape', width: 640, height: 360, mobile: true },
  { name: 'wide mobile landscape', width: 844, height: 390, mobile: true },
  { name: 'desktop portrait', width: 1024, height: 1366, mobile: false },
  { name: 'desktop landscape', width: 1440, height: 900, mobile: false },
];
const languages = [
  { code: 'fa', dir: 'rtl' },
  { code: 'en', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'zh', dir: 'ltr' },
];
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
          judgment: {}
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
            input: rect('#paragraph-input'),
            primaryPanel: rect('#paragraph-primary-panel'),
            primaryOutput: { ...rect('#paragraph-primary-output'), hidden: document.querySelector('#paragraph-primary-output')?.hidden, childCount: document.querySelector('#paragraph-primary-output')?.children.length },
            primaryPanelClass: document.querySelector('#paragraph-primary-panel')?.className,
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
        check(metrics.realms.every(r => r.width > 0 && r.height > 0 && r.left >= -2 && r.right <= viewport.width + 2), tag + ': one or more realm controls are outside viewport');
        check(metrics.choices && metrics.choices.width > 0 && metrics.choices.left >= -2 && metrics.choices.right <= viewport.width + 2, tag + ': realm-choice track outside viewport');
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
      }
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
