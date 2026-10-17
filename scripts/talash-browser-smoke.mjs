import { chromium } from 'playwright';

const baseURL=process.env.SMARTKAZEM_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const failures=[];
const fail=message=>{failures.push(message);console.error('FAIL '+message);};
const waitForSplashToDismiss=async page=>page.locator('#splash').waitFor({state:'detached',timeout:20000});
try{
 for(const viewport of [
  {name:'desktop',width:1365,height:900},
  {name:'mobile-portrait',width:390,height:844},
  {name:'mobile-landscape',width:844,height:390}
 ]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  page.setDefaultTimeout(7000);
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const response=await page.goto(`${baseURL}/index.html?page=five-realms`,{waitUntil:'domcontentloaded'});
  if(!response?.ok()){fail(`${viewport.name}: game hub route HTTP ${response?.status()??'no response'}`);await page.close();continue;}
  await waitForSplashToDismiss(page);
  await page.waitForSelector('.fr-hub-grid .fr-game-tile');
  if(await page.locator('.fr-hub-grid .fr-game-tile').count()!==5)fail(`${viewport.name}: hub does not show exactly five game tiles`);
  if(await page.locator('[data-talash-link]').isDisabled())fail(`${viewport.name}: Talash button is disabled`);
  if(await page.locator('.fr-game-tile:disabled').count()!==2)fail(`${viewport.name}: only the unfinished Gold and Simulation games should remain disabled`);

  // The hub's Tadbir tile first opens the card-game page; its own Tadbir
  // control then opens the Tadbir page, whose start action returns to the game.
  await page.locator('.fr-game-tadbir[data-tadbir-link]').click();
  await page.waitForFunction(()=>window.SharedPages?.getActive()==='five-realms-cards');
  await page.waitForSelector('#five-realms-game #fr-start');
  await page.locator('#five-realms-tadbir').click();
  await page.waitForFunction(()=>window.SharedPages?.getActive()==='tadbir');
  await page.waitForSelector('#tadbir-title');
  if(!(await page.locator('#tadbir-start-game').isVisible()))fail(`${viewport.name}: Tadbir no longer exposes its start-game path when no card game is active`);
  await page.locator('#tadbir-start-game').click();
  await page.waitForFunction(()=>window.SharedPages?.getActive()==='five-realms-cards');
  await page.waitForSelector('#five-realms-game #fr-start');

  // The Experience tile now opens the Quantum Maze directly.
  await page.goto(`${baseURL}/index.html?page=five-realms`,{waitUntil:'domcontentloaded'});
  await waitForSplashToDismiss(page);
  await page.locator('[data-quantum-maze-link]').click();
  await page.waitForFunction(()=>window.SharedPages?.getActive()==='quantum-maze');
  await page.waitForSelector('#quantum-maze-game');
  if(!(await page.locator('#quantum-maze-title').isVisible()))fail(`${viewport.name}: Experience tile did not open the Quantum Maze page`);

  // The Continuity realm no longer exposes Five Realms; its Tadbir button
  // is a direct, independent entry to the Tadbir page.
  await page.goto(`${baseURL}/index.html`,{waitUntil:'domcontentloaded'});
  await waitForSplashToDismiss(page);
  await page.locator('#realm-continuity').click();
  await page.waitForFunction(()=>document.querySelector('#continuity-page')?.classList.contains('is-active'));
  if(await page.locator('#continuity-five-realms').count()!==0)fail(`${viewport.name}: removed Five Realms button is still present in Continuity`);
  if(await page.locator('#continuity-tadbir[data-tadbir-link]').count()!==1)fail(`${viewport.name}: Continuity does not expose exactly one Tadbir entry`);
  await page.locator('#continuity-tadbir').click();
  await page.waitForFunction(()=>window.SharedPages?.getActive()==='tadbir');
  await page.waitForSelector('#tadbir-title');
  await page.locator('#tadbir-close').click();
  await page.waitForFunction(()=>!window.SharedPages?.getActive() && document.querySelector('#continuity-page')?.classList.contains('is-active'));

  // The renamed Economy of Share action opens the game directory.
  await page.locator('#continuity-close').click();
  await page.locator('#realm-share').click();
  await page.waitForFunction(()=>document.querySelector('#share-page')?.classList.contains('is-active'));
  if(await page.locator('#share-actuality-center').count()!==1)fail(`${viewport.name}: Economy of Share does not expose the renamed Actuality Center action`);
  await page.locator('#share-actuality-center').click();
  await page.waitForFunction(()=>window.SharedPages?.getActive()==='five-realms');

  if(pageErrors.length)fail(`${viewport.name}: hub/Tadbir/realm navigation page errors: ${pageErrors.join('; ')}`);

  const talashResponse=await page.goto(`${baseURL}/index.html?page=talash`,{waitUntil:'domcontentloaded'});
  if(!talashResponse?.ok()){fail(`${viewport.name}: Talash route HTTP ${talashResponse?.status()??'no response'}`);await page.close();continue;}
  await waitForSplashToDismiss(page);
  await page.waitForSelector('#talash-canvas');
  const geometry=await page.evaluate(()=>{
   const c=document.querySelector('#talash-canvas'),r=c.getBoundingClientRect();
   return {canvasWidth:r.width,canvasHeight:r.height,ratio:r.width/Math.max(1,r.height),left:r.left,right:r.right,viewport:innerWidth,docWidth:document.documentElement.scrollWidth};
  });
  if(geometry.canvasWidth<200||geometry.canvasHeight<200)fail(`${viewport.name}: Talash canvas is too small: ${JSON.stringify(geometry)}`);
  if(Math.abs(geometry.ratio-1)>0.01)fail(`${viewport.name}: Talash playfield is not square (1:1): ${JSON.stringify(geometry)}`);
  const backgrounds=await page.evaluate(async()=>{const m=await import("/games/shared/backgrounds.mjs");const images=await Promise.all(m.GAME_BACKGROUNDS.map(asset=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve({id:asset.id,ok:true,width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>resolve({id:asset.id,ok:false,width:0,height:0});image.src=asset.dataUri;})));return {count:m.GAME_BACKGROUNDS.length,images};});
  if(backgrounds.count!==5||backgrounds.images.some(image=>!image.ok||image.width!==image.height))fail(`${viewport.name}: five Base64 backgrounds must load and be square: ${JSON.stringify(backgrounds)}`);
  if(geometry.left<0||geometry.right>geometry.viewport+1)fail(`${viewport.name}: Talash canvas clips horizontally: ${JSON.stringify(geometry)}`);
  if(geometry.docWidth>geometry.viewport+1)fail(`${viewport.name}: Talash causes horizontal page overflow: ${JSON.stringify(geometry)}`);
  await page.locator('#talash-start').click();
  await page.waitForFunction(()=>document.querySelector('#talash-overlay')?.hidden===true);
  if(!(await page.locator('#talash-pause').isEnabled()))fail(`${viewport.name}: pause control did not enable after start`);
  await page.locator('#talash-pause').click();
  await page.waitForFunction(()=>document.querySelector('#talash-overlay')?.hidden===false);
  await page.locator('#talash-pause').click();
  await page.waitForFunction(()=>document.querySelector('#talash-overlay')?.hidden===true);
  await page.locator('#talash-reset').click();
  await page.waitForFunction(()=>document.querySelector('#talash-overlay')?.hidden===false);
  if(pageErrors.length)fail(`${viewport.name}: Talash page errors: ${pageErrors.join('; ')}`);
  await page.close();
 }
}finally{await browser.close();}
if(failures.length){console.error(`Talash browser smoke failed with ${failures.length} issue(s).`);process.exit(1);}
console.log('Talash hub, Tadbir handoff, and responsive gameplay smoke passed.');
