import { chromium } from 'playwright';

const baseURL=process.env.SMARTKAZEM_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const failures=[];
const fail=message=>{failures.push(message);console.error('FAIL '+message);};
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
  await page.waitForSelector('.fr-hub-grid .fr-game-tile');
  if(await page.locator('.fr-hub-grid .fr-game-tile').count()!==5)fail(`${viewport.name}: hub does not show exactly five game buttons`);
  if(await page.locator('[data-talash-link]').isDisabled())fail(`${viewport.name}: Talash button is disabled`);
  if(await page.locator('.fr-game-tile:disabled').count()!==3)fail(`${viewport.name}: unfinished games should remain disabled until implemented`);
  await page.locator('[data-tadbir-link]').click();
  await page.waitForSelector('#tadbir-title');
  if(!(await page.locator('#tadbir-start-game').isVisible()))fail(`${viewport.name}: Tadbir no longer exposes its existing start-game path when no card game is active`);
  await page.locator('#tadbir-start-game').click();
  await page.waitForSelector('#five-realms-game #fr-start');
  if(pageErrors.length)fail(`${viewport.name}: hub/Tadbir/card-game page errors: ${pageErrors.join('; ')}`);

  const talashResponse=await page.goto(`${baseURL}/index.html?page=talash`,{waitUntil:'domcontentloaded'});
  if(!talashResponse?.ok()){fail(`${viewport.name}: Talash route HTTP ${talashResponse?.status()??'no response'}`);await page.close();continue;}
  await page.waitForSelector('#talash-canvas');
  const geometry=await page.evaluate(()=>{
   const c=document.querySelector('#talash-canvas'),r=c.getBoundingClientRect();
   return {canvasWidth:r.width,canvasHeight:r.height,left:r.left,right:r.right,viewport:innerWidth,docWidth:document.documentElement.scrollWidth};
  });
  if(geometry.canvasWidth<200||geometry.canvasHeight<250)fail(`${viewport.name}: Talash canvas is too small: ${JSON.stringify(geometry)}`);
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
