import { chromium } from 'playwright';

const baseURL = (process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const normalize = (raw) => {
  const url = new URL(raw);
  return url.origin === new URL(baseURL).origin ? url.pathname + url.search : null;
};
const actualBySection = new Map();
let activeSection = 'home';
page.on('request', (request) => {
  const resource = normalize(request.url());
  if (!resource || request.isNavigationRequest()) return;
  if (!actualBySection.has(activeSection)) actualBySection.set(activeSection, new Set());
  actualBySection.get(activeSection).add(resource);
});

try {
  await page.goto(baseURL + '/index.html?skipSiteResourceWarmup=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.SharedPages?.collectSectionResources && window.SiteI18n));
  const homeRequests = new Set(actualBySection.get('home') || []);
  const inventory = new Set(await page.evaluate(() => window.SharedPages.collectSectionResources()));
  // Ignore the inventory scanner's own fetches, but retain the real shared-shell requests.
  actualBySection.clear();
  actualBySection.set('home', homeRequests);
  const sections = await page.evaluate(() => window.SharedPages.getSectionKeys());
  for (const section of sections) {
    activeSection = section;
    await page.evaluate(async (key) => {
      await window.SharedPages.open(key, 'home', { push: false });
      document.querySelectorAll('img[loading="lazy"]').forEach((image) => { image.loading = 'eager'; });
    }, section);
    await page.waitForTimeout(350);
    await page.evaluate(() => Promise.all([...document.images].map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 1500);
      });
    })));
  }

  const missing = [];
  for (const [section, requests] of actualBySection) {
    for (const resource of requests) {
      if (!inventory.has(resource)) missing.push({ section, resource });
    }
  }
  const observedCount = new Set([...actualBySection.values()].flatMap((set) => [...set])).size;
  console.log(JSON.stringify({
    sectionsVisited: sections.length,
    inventoryResources: inventory.size,
    runtimeResourcesObserved: observedCount,
    missingCount: missing.length,
    missing
  }, null, 2));
  if (missing.length) {
    console.error('FAIL: runtime section requests are missing from the proactive resource inventory.');
    process.exitCode = 1;
  } else {
    console.log('PASS: every same-origin resource request observed while opening each registered section is in the proactive inventory.');
  }
} finally {
  await browser.close();
}
