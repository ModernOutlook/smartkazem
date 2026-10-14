import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const baseURL = process.env.SMARTKAZEM_BASE_URL || 'http://127.0.0.1:4173';
const output = path.join(process.cwd(), 'artifacts', 'realm-rings');
fs.mkdirSync(output, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1365, height: 900 },
  { name: 'mobile-portrait', width: 390, height: 844 },
  { name: 'mobile-landscape', width: 844, height: 390 },
];
const realms = [
  { id: 'structure', radius: 445, selector: '#realm-structure' },
  { id: 'continuity', radius: 365, selector: '#realm-continuity' },
  { id: 'experience', radius: 285, selector: '#realm-experience' },
  { id: 'reference', radius: 205, selector: '#realm-reference' },
  { id: 'share', radius: 125, selector: '#realm-share' },
];
let failures = 0;
const fail = (message) => { failures++; console.error('FAIL ' + message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });

try {
  for (const viewport of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${baseURL}/index.html`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      fail(`${viewport.name}: index.html HTTP ${response?.status() ?? 'no response'}`);
      await page.close();
      continue;
    }
    await page.locator('#splash').click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(100);

    const inspection = await page.evaluate(() => {
      const svg = document.querySelector('#universe');
      const ids = ['structure', 'continuity', 'experience', 'reference', 'share'];
      return {
        svgVisible: Boolean(svg && svg.getBoundingClientRect().width > 0),
        realms: ids.map(id => {
          const group = document.querySelector('#realm-' + id);
          const fo = group?.querySelector('foreignObject');
          const wrapper = fo?.querySelector('.' + id + '-page');
          return {
            id,
            groupExists: Boolean(group),
            foreignObjectExists: Boolean(fo),
            clipPath: fo?.getAttribute('clip-path') || '',
            wrapperExists: Boolean(wrapper),
            sceneExists: Boolean(wrapper?.querySelector('.' + ({
              structure: 'structure-space',
              continuity: 'continuity-space',
              experience: 'experience-space',
              reference: 'reference-scene',
              share: 'share-space'
            })[id])),
            hasBackground: Boolean(wrapper && getComputedStyle(wrapper).backgroundImage !== 'none'),
            bounds: fo ? (() => { const r=fo.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })() : null
          };
        })
      };
    });
    if (!inspection.svgVisible) fail(`${viewport.name}: landing SVG is not visible`);
    for (const realm of inspection.realms) {
      if (!realm.groupExists || !realm.foreignObjectExists || !realm.wrapperExists || !realm.sceneExists || !realm.hasBackground || !realm.clipPath) {
        fail(`${viewport.name}/${realm.id}: missing exact page background layer or circular clip (${JSON.stringify(realm)})`);
      }
    }

    // Compare each clipped ring's actual pixels with the same realm page's original
    // background scene rendered at the visible annulus at matching viewport scale and opacity.
    const svgBoxForCompare = await page.locator('#universe').boundingBox();
    if (svgBoxForCompare) {
      const scale = Math.ceil(svgBoxForCompare.width) / 1000;
      await page.mouse.move(0, 0);
      const fullPageShot = PNG.sync.read(await page.screenshot({ fullPage: false }));
      const cropX = Math.max(0, Math.round(svgBoxForCompare.x));
      const cropY = Math.max(0, Math.round(svgBoxForCompare.y));
      const cropWidth = Math.min(Math.round(svgBoxForCompare.width), fullPageShot.width - cropX);
      const cropHeight = Math.min(Math.round(svgBoxForCompare.height), fullPageShot.height - cropY);
      const actualMenu = new PNG({ width: cropWidth, height: cropHeight });
      PNG.bitblt(fullPageShot, actualMenu, cropX, cropY, cropWidth, cropHeight, 0, 0);
      const svgShotBuffer = PNG.sync.write(actualMenu);
      fs.writeFileSync(path.join(output, `${viewport.name}-menu-svg.png`), svgShotBuffer);
      for (const realm of realms) {
        const referenceState = await page.evaluate((args) => {
          const sourcePage = document.querySelector('#' + args.id + '-page');
          const sceneClass = ({
            structure: 'structure-space',
            continuity: 'continuity-space',
            experience: 'experience-space',
            reference: 'reference-scene',
            share: 'share-space'
          })[args.id];
          const sourceScene = sourcePage?.querySelector('.' + sceneClass);
          if (!sourceScene) return null;
          const svg = document.querySelector('#universe');
          const groupState = [...svg.querySelectorAll('.realm')].map(group => ({
            group,
            visibility: group.style.visibility
          }));
          const core = svg.querySelector('#core');
          const coreVisibility = core?.style.visibility ?? '';
          groupState.forEach(({group}) => { group.style.visibility = 'hidden'; });
          if (core) core.style.visibility = 'hidden';
          const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
          foreignObject.setAttribute('x', '0');
          foreignObject.setAttribute('y', '0');
          foreignObject.setAttribute('width', '1000');
          foreignObject.setAttribute('height', '1000');
          foreignObject.setAttribute('clip-path', `url(#ringClip-${args.id})`);
          foreignObject.setAttribute('opacity', '1');
          foreignObject.setAttribute('class', 'realm-ring-layer');
          const wrapper = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
          wrapper.className = 'page realm-ring-background ' + args.id + '-page';
          wrapper.appendChild(sourceScene.cloneNode(true));
          foreignObject.appendChild(wrapper);
          svg.appendChild(foreignObject);
          window.__realmVisualReferenceState = { foreignObject, groupState, core, coreVisibility };
          return true;
        }, { id: realm.id });
        if (!referenceState) {
          fail(`${viewport.name}/${realm.id}: could not render a reference background layer`);
          continue;
        }
        const topbar = page.locator('.lang-switch');
        const priorVisibility = await topbar.evaluate(el => el.style.visibility);
        await topbar.evaluate(el => el.style.setProperty('visibility', 'hidden', 'important'));
        const sourceFull = PNG.sync.read(await page.screenshot({ fullPage: false }));
        const sourceMenu = new PNG({ width: cropWidth, height: cropHeight });
        PNG.bitblt(sourceFull, sourceMenu, cropX, cropY, cropWidth, cropHeight, 0, 0);
        const sourceShot = PNG.sync.write(sourceMenu);
        await page.evaluate(() => {
          const state = window.__realmVisualReferenceState;
          if (!state) return;
          state.foreignObject.remove();
          state.groupState.forEach(({group, visibility}) => { group.style.visibility = visibility; });
          if (state.core) state.core.style.visibility = state.coreVisibility;
          delete window.__realmVisualReferenceState;
        });
        await topbar.evaluate((el, value) => { if (value) el.style.visibility = value; else el.style.removeProperty('visibility'); }, priorVisibility);
        fs.writeFileSync(path.join(output, `${viewport.name}-source-${realm.id}.png`), sourceShot);
        const expected = PNG.sync.read(sourceShot);
        const commonWidth = Math.min(expected.width, actualMenu.width);
        const commonHeight = Math.min(expected.height, actualMenu.height);
        const ex = Math.floor((expected.width - commonWidth) / 2);
        const ax = Math.floor((actualMenu.width - commonWidth) / 2);
        const ey = Math.floor((expected.height - commonHeight) / 2);
        const ay = Math.floor((actualMenu.height - commonHeight) / 2);
        let compared = 0;
        let different = 0;
        const cx = (commonWidth - 1) / 2;
        const cy = (commonHeight - 1) / 2;
        const scaleX = commonWidth / 1000;
        const scaleY = commonHeight / 1000;
        const innerRadius = ({ structure: 365, continuity: 285, experience: 205, reference: 125, share: 0 })[realm.id];
        for (let y = 0; y < commonHeight; y++) {
          for (let x = 0; x < commonWidth; x++) {
            const radiusUser = Math.hypot((x - cx) / scaleX, (y - cy) / scaleY);
            if (radiusUser > realm.radius - 3 / Math.min(scaleX, scaleY)) continue;
            if (innerRadius && radiusUser < innerRadius + 3 / Math.min(scaleX, scaleY)) continue;
            compared++;
            const expectedOffset = ((y + ey) * expected.width + (x + ex)) * 4;
            const actualOffset = ((y + ay) * actualMenu.width + (x + ax)) * 4;
            if (expected.data[expectedOffset] !== actualMenu.data[actualOffset] ||
                expected.data[expectedOffset + 1] !== actualMenu.data[actualOffset + 1] ||
                expected.data[expectedOffset + 2] !== actualMenu.data[actualOffset + 2] ||
                expected.data[expectedOffset + 3] !== actualMenu.data[actualOffset + 3]) different++;
          }
        }
        const percent = compared ? different * 100 / compared : 100;
        console.log(`PIXEL ${viewport.name}/${realm.id}: ${different}/${compared} differing interior pixels (${percent.toFixed(4)}%)`);
        if (different > 0) {
          fail(`${viewport.name}/${realm.id}: background is not pixel-identical to the realm page (${different} interior pixel differences)`);
        }
      }
    }

    await page.screenshot({ path: path.join(output, `${viewport.name}-unselected.png`), fullPage: false });
    const svgBox = await page.locator('#universe').boundingBox();
    if (!svgBox) fail(`${viewport.name}: cannot measure menu SVG`);
    else {
      for (const realm of realms) {
        const x = svgBox.x + svgBox.width * (500 + realm.radius - 8) / 1000;
        const y = svgBox.y + svgBox.height * 500 / 1000;
        const before = await page.locator(realm.selector).evaluate(el => ({
          filter: getComputedStyle(el).filter,
          bounds: (() => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()
        }));
        await page.mouse.move(x, y);
        await page.waitForTimeout(80);
        const after = await page.locator(realm.selector).evaluate(el => ({
          filter: getComputedStyle(el).filter,
          bounds: (() => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()
        }));
        if (after.filter === before.filter || after.filter === 'none') {
          fail(`${viewport.name}/${realm.id}: hover selection effect did not activate (${before.filter} -> ${after.filter})`);
        }
        if (Math.abs(after.bounds.x-before.bounds.x)>0.1 || Math.abs(after.bounds.y-before.bounds.y)>0.1 ||
            Math.abs(after.bounds.width-before.bounds.width)>0.1 || Math.abs(after.bounds.height-before.bounds.height)>0.1) {
          fail(`${viewport.name}/${realm.id}: hover effect changed ring geometry`);
        }
        await page.screenshot({ path: path.join(output, `${viewport.name}-hover-${realm.id}.png`), fullPage: false });
      }
    }
    if (errors.length) fail(`${viewport.name}: browser errors: ${errors.slice(0, 3).join(' | ')}`);
    await page.close();
  }
} finally {
  await context.close();
  await browser.close();
}

if (failures) {
  console.error(`Realm ring visual checks failed: ${failures} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('Realm ring checks passed: exact page background classes, circular clipping, and hover selection across desktop, mobile portrait, and mobile landscape. Screenshots saved to artifacts/realm-rings/.');
}
