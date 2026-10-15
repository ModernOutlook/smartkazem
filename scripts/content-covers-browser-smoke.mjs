import { chromium } from 'playwright';

const baseURL = process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173';
const shared = [
  ['treatise', 'philosophical-treatise.jpg'],
  ['emergence', 'emergence-1.jpg'],
  ['observation25', 'observation-25.jpg'],
  ['possibleMirror', 'possible-mirror.jpg'],
  ['emergence2', 'emergence-2.jpg'],
  ['observation', 'observation-river.jpg'],
  ['layer3', 'echo-layer-3.jpg'],
  ['disturbedManifesto', 'disturbed-manifesto.jpg'],
  ['zero', 'zero.jpg']
];
const books = [
  ['humanMachines', 'human-and-its-machines.jpg'],
  ['forgers', 'forgers-of-imitation.jpg'],
  ['tabahian', 'tabahian.jpg']
];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = async (page, filename, label) => {
  const state = await page.locator('[data-content-cover]').evaluate((figure) => {
    const image = figure.querySelector('img');
    const rect = figure.getBoundingClientRect();
    return {
      filename: figure.dataset.contentCover,
      ratio: rect.width / rect.height,
      imageLoaded: image.complete && image.naturalWidth > 0,
      alt: image.alt
    };
  }).catch(() => null);
  if (!state) { failures.push(label + ': missing cover frame'); return; }
  if (state.filename !== filename) failures.push(label + ': expected ' + filename + ', got ' + state.filename);
  if (Math.abs(state.ratio - .75) > .015) failures.push(label + ': frame ratio is ' + state.ratio);
  if (!state.imageLoaded) failures.push(label + ': cover image did not load');
  if (!state.alt) failures.push(label + ': cover image has no accessible name');
};

try {
  for (const viewport of viewports) {
    for (const [route, filename] of shared) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      page.on('pageerror', (error) => failures.push(route + ': ' + error.message));
      await page.goto(baseURL + '/index.html?page=' + encodeURIComponent(route), { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-content-cover]');
      await page.locator('[data-content-cover]').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const image = document.querySelector('[data-content-cover] img');
        return image?.complete && image.naturalWidth > 0;
      });
      await check(page, filename, viewport.width + 'x' + viewport.height + '/' + route);
      const last = await page.locator('[data-content-cover]').evaluate((node) => node.parentElement.lastElementChild === node);
      if (!last) failures.push(route + ': cover is not the final child of its page root');
      await page.close();
    }

    for (const [kind, filename] of books) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      page.on('pageerror', (error) => failures.push('book-' + kind + ': ' + error.message));
      await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean(window.BookNavigation && window.ContentCovers));
      await page.evaluate((bookKind) => window.BookNavigation.openBook('share', bookKind), kind);
      await page.waitForSelector('#book-page [data-content-cover]');
      await page.locator('#book-page [data-content-cover]').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const image = document.querySelector('#book-page [data-content-cover] img');
        return image?.complete && image.naturalWidth > 0;
      });
      await check(page, filename, viewport.width + 'x' + viewport.height + '/book-' + kind);
      await page.close();
    }
  }

  // Explicitly protect the two user-requested exclusions.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(baseURL + '/index.html?page=shahnameh', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SharedPages?.getActive() === 'shahnameh');
    if (await page.locator('[data-content-cover]').count()) failures.push('Shahnameh Reading must remain excluded from content covers');
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.SitePages && window.ContentCovers));
    await page.evaluate(() => window.SitePages.openParagraph('experience'));
    if (await page.locator('#paragraph-page [data-content-cover]').count()) failures.push('Paragraph Machine must remain excluded from content covers');
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Content-cover checks passed for 12 content pages at desktop, portrait, and landscape viewports.');
}
