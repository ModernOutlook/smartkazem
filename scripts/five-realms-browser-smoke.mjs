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
    try {
      await page.waitForFunction(() => {
        const images = [...document.querySelectorAll('#fr-hand .fr-card-image')];
        return images.length === 5 && images.every(image => image.complete && image.naturalWidth > 0);
      });
    } catch {
      fail(`${viewport.name}: hand did not load all five inventory card images`);
    }
    const handImages = await page.locator('#fr-hand .fr-card-image').evaluateAll(images => images.map(image => image.getAttribute('src')));
    if (handImages.length !== 5 || handImages.some(src => !src?.startsWith('content/'))) {
      fail(`${viewport.name}: hand cards are not using the shared inventory artwork`);
    }
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

    // Badge actions remain in the game; bank actions live only in Tadbir.
    for (const action of ['buy', 'sell']) {
      await page.locator(`[data-action="${action}"]`).click();
      if (!(await page.locator('#fr-action-form').locator('button').count())) {
        fail(`${viewport.name}: ${action} action did not expose a confirm control`);
      }
    }
    if (await page.locator('[data-action="deposit"], [data-action="withdraw"]').count()) {
      fail(`${viewport.name}: deposit/withdraw controls are still exposed in the game action panel`);
    }
    await page.evaluate(() => window.SharedPages.open('tadbir', 'continuity'));
    await page.waitForSelector('#tadbir-title');
    await page.waitForFunction(() => !document.querySelector('#tadbir-account')?.hidden);
    if ((await page.locator('#tadbir-player').innerText()) !== 'Browser Alice') {
      fail(`${viewport.name}: Tadbir is not connected to the active in-game player`);
    }
    if (!(await page.locator('#tadbir-deposit-form').isVisible())) {
      fail(`${viewport.name}: Tadbir deposit form is unavailable for the active player`);
    }
    await page.locator('#tadbir-return-game').click();
    await page.waitForFunction(() => document.querySelector('#fr-play') && !document.querySelector('#fr-play').hidden && document.querySelector('#fr-current')?.textContent === 'Browser Alice');

    // Isolate the recognition UI from network credentials while exercising the shared adapter contract.
    await page.evaluate(() => {
      const statusByDomain = {S:'ok',T:'warn',E:'bad',R:'ok',C:'warn'};
      window.ParagraphWorkspaceAdapter = {
        async generateParagraphs(count, mode, language) {
          if (count !== 1 || mode !== 'mixed') throw new Error('Unexpected generation request');
          return [{text:'این یک پاراگراف آزمایشی برای سنجش بازشناسی پنج قلمرو است.'}];
        },
        async evaluateText(text, language) {
          return {text, judgment:Object.fromEntries(Object.entries(statusByDomain).map(([domain,status])=>[domain,{status,reason:'browser smoke'}]))};
        }
      };
    });
    const urlBeforeQuestion = page.url();
    await page.locator('[data-action="question"]').click();
    await page.waitForSelector('.fr-question-paragraph .fr-question-text');
    if (page.url() !== urlBeforeQuestion) fail(`${viewport.name}: question action navigated away from the game`);
    if (await page.locator('.fr-judgment-realm').count() !== 5) {
      fail(`${viewport.name}: recognition question did not render five realm judgment boxes`);
    }
    for (const realm of ['blue','yellow','purple','red','green']) {
      if (await page.locator(`.fr-judgment-realm[data-realm="${realm}"] input[type="radio"]`).count() !== 3) {
        fail(`${viewport.name}: realm ${realm} did not expose the three recognition statuses`);
      }
    }
    const matchingStatuses = {blue:'ok',yellow:'warn',purple:'bad',red:'ok',green:'warn'};
    for (const [realm,status] of Object.entries(matchingStatuses)) {
      await page.locator(`.fr-judgment-realm[data-realm="${realm}"] input[value="${status}"]`).check();
    }
    await page.locator('#fr-action-form button').last().click();
    await page.waitForFunction(() => !document.querySelector('#fr-pass').hidden);
    const recognitionMessage = await page.locator('#fr-action-message').innerText();
    if (!/منطبق است|match.*reference|参考判断一致|تتطابق أحكامك/.test(recognitionMessage)) {
      fail(`${viewport.name}: exact five-realm recognition match was not reported as correct: ${recognitionMessage}`);
    }

    // One mismatched realm must make the overall recognition result incorrect.
    await page.locator('#fr-reveal').click();
    await page.waitForFunction(() => !document.querySelector('#fr-play').hidden && document.querySelector('#fr-current')?.textContent === 'Browser Bob');
    await page.locator('[data-action="question"]').click();
    await page.waitForSelector('.fr-question-paragraph .fr-question-text');
    const mismatchingStatuses = {blue:'bad',yellow:'warn',purple:'bad',red:'ok',green:'warn'};
    for (const [realm,status] of Object.entries(mismatchingStatuses)) {
      await page.locator(`.fr-judgment-realm[data-realm="${realm}"] input[value="${status}"]`).check();
    }
    await page.locator('#fr-action-form button').last().click();
    await page.waitForFunction(() => !document.querySelector('#fr-pass').hidden);
    const incorrectMessage = await page.locator('#fr-action-message').innerText();
    if (!/منطبق نیست|do not match|并不完全一致|لا تتطابق/.test(incorrectMessage)) {
      fail(`${viewport.name}: a mismatched realm was not reported as an incorrect recognition: ${incorrectMessage}`);
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
