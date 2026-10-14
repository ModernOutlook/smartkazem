import { chromium } from 'playwright';

const baseURL = process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const failures = [];
const fail = (message) => { failures.push(message); console.error('FAIL ' + message); };

try {
  for (const viewport of [
    { name: 'desktop', width: 1365, height: 900 },
    { name: 'mobile-portrait', width: 390, height: 844 },
    { name: 'mobile-landscape', width: 844, height: 390 },
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    page.setDefaultTimeout(7000);
    const pageErrors = [];
    const failedRequests = [];
    const failuresBeforeViewport = failures.length;
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => failedRequests.push(request.url() + ': ' + (request.failure()?.errorText || 'request failed')));

    const response = await page.goto(`${baseURL}/index.html?page=five-realms`, { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) {
      fail(`${viewport.name}: game route HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }

    await page.waitForSelector('#five-realms-game #fr-start', { state: 'visible' });
    await page.locator('#fr-player-count').selectOption('2');
    await page.locator('[data-player-name="0"]').fill('Browser Alice');
    await page.locator('[data-player-name="1"]').fill('Browser Bob');
    await page.locator('#fr-start').click();
    await page.waitForFunction(() => {
      const play = document.querySelector('#fr-play');
      return play && !play.hidden && document.querySelectorAll('#fr-hand .fr-card').length === 5;
    });
    if ((await page.locator('#fr-current').innerText()) !== 'Browser Alice') fail(`${viewport.name}: first player is not active after game start`);

    // Score one non-joker card, then verify the private-hand handoff to player two.
    await page.locator('#fr-hand .fr-card').filter({ hasNotText: 'JOKER' }).first().click();
    await page.locator('[data-action="score"]').click();
    await page.locator('#fr-action-form button').last().click();
    await page.waitForFunction(() => !document.querySelector('#fr-pass').hidden);
    if (!(await page.locator('#fr-pass-name').innerText()).includes('Browser Bob')) fail(`${viewport.name}: turn handoff did not name player two`);
    await page.locator('#fr-reveal').click();
    await page.waitForFunction(() => !document.querySelector('#fr-play').hidden && document.querySelector('#fr-current')?.textContent === 'Browser Bob');
    if (await page.locator('#fr-hand .fr-card').count() !== 5) fail(`${viewport.name}: second player's hand was not rendered`);

    // Exercise exchange form and its confirmation/turn transition.
    await page.locator('[data-action="exchange"]').click();
    const exchangeSelects = page.locator('#fr-action-form select');
    if (await exchangeSelects.count() < 2) {
      fail(`${viewport.name}: exchange form did not render expected controls`);
    } else {
      const firstSelect = exchangeSelects.nth(0);
      const nonJokerValue = await firstSelect.evaluate(el => [...el.options].find(option => !/JOKER/i.test(option.textContent))?.value);
      if (!nonJokerValue) {
        fail(`${viewport.name}: no non-joker exchange card option was available`);
      } else {
        await firstSelect.selectOption(nonJokerValue);
        await page.locator('#fr-action-form button').last().click();
        await page.waitForFunction(() => !document.querySelector('#fr-pass').hidden);
        await page.locator('#fr-reveal').click();
        await page.waitForFunction(() => !document.querySelector('#fr-play').hidden && document.querySelector('#fr-current')?.textContent === 'Browser Alice');
      }
    }

    // Verify the remaining primary action panels are reachable without submitting them.
    for (const action of ['buy', 'sell', 'deposit', 'withdraw', 'question']) {
      await page.locator(`[data-action="${action}"]`).click();
      if (!(await page.locator('#fr-action-form').locator('button').count())) {
        fail(`${viewport.name}: ${action} action did not expose a confirm control`);
      }
    }

    const metrics = await page.evaluate(() => ({
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    if (metrics.documentWidth > metrics.viewportWidth + 2) {
      fail(`${viewport.name}: game causes horizontal overflow ${metrics.documentWidth}>${metrics.viewportWidth}`);
    }
    if (pageErrors.length) fail(`${viewport.name}: browser exception(s): ${pageErrors.slice(0, 3).join(' | ')}`);
    if (failedRequests.length) fail(`${viewport.name}: failed request(s): ${failedRequests.slice(0, 3).join(' | ')}`);
    if (failures.length === failuresBeforeViewport) console.log(`OK Five Realms gameplay smoke: ${viewport.name}`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Five Realms gameplay browser tests failed: ${failures.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('Five Realms gameplay browser tests passed.');
}
