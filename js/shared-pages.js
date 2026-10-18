(() => {
'use strict';
const manifest={"treatise":{"file":"content/page-templates/treatise.fragment","page":"treatise","realm":"structure","catalog":"translations/treatise.json","blocks":"book","styles":["css/pages/philosophical-treatise.css"],"scripts":["content/philosophical-treatise.js","js/philosophical-treatise-source.js","js/reading-page.js"],"close":"close"},"shahnameh":{"file":"content/page-templates/shahnameh.fragment","page":"shahnameh","realm":"continuity","catalog":"translations/shahnameh.json","styles":["css/pages/shahnameh.css"],"scripts":["content/shahnameh-series.js?v=2","js/shahnameh-series-page.js?v=2"],"close":"back"},"emergence":{"file":"content/page-templates/emergence.fragment","page":"emergence","realm":"continuity","catalog":"translations/emergence.json","styles":["css/pages/emergence.css"],"scripts":["content/emergence.js"],"close":"emergence-close"},"observation25":{"file":"content/page-templates/observation25.fragment","page":"observation25","realm":"experience","catalog":"translations/observation-25.json","scripts":["content/observation-25.js","js/observation25-page.js"],"close":"observation25-close"},"possibleMirror":{"file":"content/page-templates/possibleMirror.fragment","page":"possibleMirror","realm":"experience","catalog":"translations/possible-mirror.json","scripts":["content/possible-mirror.js","js/possible-mirror-page.js"],"close":"possible-mirror-close"},"emergence2":{"file":"content/page-templates/emergence2.fragment","page":"emergence2","realm":"experience","catalog":"translations/emergence-2.json","styles":["css/pages/emergence-2.css"],"scripts":["content/emergence-2.js","js/emergence-2-page.js"],"close":"emergence2-close"},"observation":{"file":"content/page-templates/observation.fragment","page":"observation","realm":"reference","catalog":"translations/observation.json","blocks":"book","styles":["css/pages/observation.css"],"scripts":["content/observation.js","js/observation-source.js","js/reading-page.js"],"close":"close"},"layer3":{"file":"content/page-templates/layer3.fragment","page":"layer3","realm":"reference","catalog":"translations/echo-layer3.json","styles":["css/pages/echo-layer3.css"],"scripts":["content/echo-layer3.js"],"close":"close"},"disturbedManifesto":{"file":"content/page-templates/disturbedManifesto.fragment","page":"disturbedManifesto","realm":"continuity","catalog":"translations/disturbed-manifesto.json","styles":["css/pages/disturbed-manifesto.css"],"scripts":["content/disturbed-manifesto.js","js/disturbed-manifesto-page.js"],"close":"manifesto-close"},"zero":{"file":"content/page-templates/zero.fragment","page":"zero","realm":"structure","catalog":"translations/zero.json","styles":["css/pages/zero.css"],"scripts":["content/zero.js","js/zero-page.js"],"close":"zero-back"},"five-realms":{"file":"content/page-templates/five-realms.fragment","page":"fiveRealms","catalog":"","realm":null,"styles":["css/pages/five-realms.css"],"scripts":["games/five-realms/hub.mjs"],"close":"five-realms-close"},"five-realms-cards":{"file":"content/page-templates/five-realms-cards.fragment","page":"fiveRealms","catalog":"","realm":"continuity","styles":["css/pages/five-realms.css"],"scripts":["games/five-realms/ui.mjs"],"close":"five-realms-cards-close"},"gold":{"file":"content/page-templates/gold.fragment","page":"gameHub","catalog":"","realm":null,"styles":["css/pages/five-realms.css"],"scripts":[],"close":"gold-close"},"simulation":{"file":"content/page-templates/simulation.fragment","page":"gameHub","catalog":"","realm":null,"styles":["css/pages/five-realms.css"],"scripts":[],"close":"simulation-close"},"talash":{"file":"content/page-templates/talash.fragment","page":"talash","catalog":"","realm":null,"styles":["css/pages/talash.css"],"scripts":["games/talash/ui.mjs"],"close":"talash-close"},"tadbir":{"file":"content/page-templates/tadbir.fragment","page":"tadbir","catalog":"","realm":"continuity","styles":["css/pages/tadbir.css"],"scripts":["js/tadbir-page.js"],"close":"tadbir-close"},"inventory":{"file":"content/page-templates/inventory.fragment","page":"inventory","catalog":"","styles":["css/pages/inventory.css"],"scripts":["js/inventory-page.js"],"close":"inventory-home"},"quantum-maze":{"file":"content/page-templates/quantum-maze.fragment","page":"quantumMaze","realm":null,"catalog":"","styles":["css/pages/quantum-maze.css"],"scripts":["js/quantum-maze-page.js"],"close":"quantum-maze-close"}};
const REALM_ASSETS=Object.freeze({
 structure:'adapters/ساختار تالار.jpg',
 continuity:'adapters/تداوم عالم.jpg',
 experience:'adapters/قلمرو تجربه.jpg',
 reference:'adapters/مرجع تقلید.jpg',
 share:'adapters/اقتصاد سهم.jpg'
});
const READABLE_PANELS=Object.freeze({observation:'.book-body',layer3:'.reader'});
function applyRealmBackground(element,realm,route){
 const asset=REALM_ASSETS[realm];
 if(!element||!asset)return false;
 const url=new URL(asset,document.baseURI).href;
 element.style.backgroundImage='linear-gradient(rgba(2,8,15,.38),rgba(2,8,15,.58)),url("'+url+'")';
 element.style.backgroundColor='#030a10';
 element.style.backgroundPosition='center top';
 element.style.backgroundSize='contain';
 element.style.backgroundRepeat='no-repeat';
 element.style.backgroundAttachment='scroll';
 const readablePanel=READABLE_PANELS[route]?element.querySelector(READABLE_PANELS[route]):null;
 if(readablePanel)readablePanel.style.backgroundColor='rgba(243,244,242,.86)';
 element.dataset.realmBackground=realm;
 return true;
}
window.RealmBackgrounds=Object.freeze({apply:applyRealmBackground,assets:REALM_ASSETS});
const host=document.getElementById('shared-page-host');
const app=document.getElementById('app');
if(!host||!app)return;

const roots=new Map(),loadedScripts=new Set(),styleLinks=new Map();
let activeKey=null,activeContainer=null,origin='home',pendingHistoryClose=false;
const aliases={'philosophical-treatise':'treatise','observation-25':'observation25','possible-mirror':'possibleMirror','emergence-2':'emergence2','echo-layer3':'layer3','disturbed-manifesto':'disturbedManifesto'};
function routeKey(route){const name=String(route||'').split('/').pop().replace(/\.html(?:\?.*)?$/,'');return manifest[name]?name:aliases[name]||null;}
function setMeta(name,value){let n=document.querySelector('meta[name="'+name+'"]');if(!n){n=document.createElement('meta');n.name=name;document.head.appendChild(n);}if(value)n.content=value;else n.remove();}
function syncStyles(key){for(const [name,links] of styleLinks)links.forEach(link=>link.disabled=name!==key);}
async function ensureStyles(key){if(styleLinks.has(key))return;const links=[];for(const href of manifest[key].styles||[]){const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.sharedPageStyle=key;link.disabled=false;document.head.appendChild(link);links.push(link);}styleLinks.set(key,links);await Promise.all(links.map(link=>link.sheet?Promise.resolve():new Promise(resolve=>{link.addEventListener('load',resolve,{once:true});link.addEventListener('error',resolve,{once:true});})));}
function hideAppPages(){app.querySelectorAll(':scope > .page').forEach(p=>p.classList.remove('is-active'));}
async function loadRoot(key){if(roots.has(key))return roots.get(key);const response=await fetch(manifest[key].file);if(!response.ok)throw new Error('Unable to load page template '+key);const markup=await response.text();const container=document.createElement('div');container.dataset.sharedRoute=key;container.style.position='absolute';container.style.inset='0';container.style.width='auto';container.style.height='auto';container.style.overflow='hidden';container.innerHTML=markup;container.querySelectorAll('.global-lang,.lang-switch').forEach(n=>n.remove());roots.set(key,container);return container;}
async function loadScripts(key){for(const src of manifest[key].scripts||[]){const scriptKey=key+':'+src;if(loadedScripts.has(scriptKey))continue;await new Promise((resolve,reject)=>{const script=document.createElement('script');if(src.endsWith('.mjs'))script.type='module';script.src=src;script.onload=()=>{loadedScripts.add(scriptKey);resolve();};script.onerror=()=>reject(new Error('Failed page script '+src));document.body.appendChild(script);});}}
function showOrigin(){if(activeContainer)activeContainer.remove();activeContainer=null;activeKey=null;syncStyles('');setMeta('i18n-page','home');setMeta('i18n-catalog','');setMeta('i18n-blocks','');const methods={share:'openShare',experience:'openExperience',continuity:'openContinuity',structure:'openStructure',reference:'openReference',home:'returnHome'};window.SitePages?.[methods[origin]||'returnHome']?.();window.SiteI18n?.setPage?.('home','','').catch(()=>{});history.replaceState({},'',location.pathname+location.hash);}
async function open(route,from='home',options={}){const key=routeKey(route);if(!key)return false;if(key==='quantum-maze'&&!(from==='share'&&activeKey==='five-realms'))return false;if(activeContainer)activeContainer.remove();activeContainer=null;activeKey=key;origin=from||origin||'home';hideAppPages();await ensureStyles(key);syncStyles(key);const container=await loadRoot(key);host.appendChild(container);activeContainer=container;const pageRoot=container.querySelector('.child-page,.page');if(pageRoot){pageRoot.classList.add('page','is-active');pageRoot.style.position='absolute';pageRoot.style.inset='0';pageRoot.style.width='auto';pageRoot.style.maxWidth='100%';pageRoot.style.height='auto';pageRoot.style.minHeight='0';pageRoot.style.overflowY='auto';applyRealmBackground(pageRoot,manifest[key].realm,key);}setMeta('i18n-page',manifest[key].page);setMeta('i18n-catalog',manifest[key].catalog);setMeta('i18n-blocks',manifest[key].blocks||'');await window.SiteI18n?.setPage?.(manifest[key].page,manifest[key].catalog,manifest[key].blocks||'');await loadScripts(key);if(pageRoot)window.ContentCovers?.mountShared(pageRoot,key);document.dispatchEvent(new CustomEvent('shared-page:opened',{detail:{key,origin}}));if(options.push!==false)history.pushState({sharedPage:key,origin},'',location.pathname+'?page='+encodeURIComponent(key));return true;}
function close(){if(history.state?.sharedPage&&!pendingHistoryClose){pendingHistoryClose=true;history.back();return;}showOrigin();}

document.addEventListener('click',event=>{
 const entry=event.target instanceof Element?event.target.closest('[data-five-realms-link]'):null;
 if(!entry)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 open('five-realms',document.getElementById('continuity-page')?.classList.contains('is-active')?'continuity':'share').catch(error=>console.error('[SharedPages]',error));
},true);


document.addEventListener('click',event=>{
 const entry=event.target instanceof Element?event.target.closest('[data-gold-link]'):null;
 if(!entry)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 open('gold','five-realms').catch(error=>console.error('[SharedPages]',error));
},true);

document.addEventListener('click',event=>{
 const entry=event.target instanceof Element?event.target.closest('[data-simulation-link]'):null;
 if(!entry)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 open('simulation','five-realms').catch(error=>console.error('[SharedPages]',error));
},true);

document.addEventListener('click',event=>{
 const entry=event.target instanceof Element?event.target.closest('[data-tadbir-link]'):null;
 if(!entry)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(activeKey==='five-realms'){
  open('five-realms-cards',origin).catch(error=>console.error('[SharedPages]',error));
  return;
 }
 open('tadbir',activeKey==='five-realms-cards'?origin:'continuity').catch(error=>console.error('[SharedPages]',error));
},true);

document.addEventListener('click',event=>{
 const entry=event.target instanceof Element?event.target.closest('[data-quantum-maze-link]'):null;
 if(!entry)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(activeKey!=='five-realms'||origin!=='share')return;
 open('quantum-maze',origin).catch(error=>console.error('[SharedPages]',error));
},true);

document.addEventListener('click',event=>{
 const link=event.target instanceof Element?event.target.closest('a[data-inventory-link],a.inventory-home'):null;
 if(!link)return;
 if(link.matches('[data-inventory-link]')){
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  document.getElementById('logo-viewer')?.classList.remove('open');
  open('inventory.html','home').catch(error=>console.error('[SharedPages]',error));
 }else if(activeKey==='inventory'){
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();close();
 }
},true);

host.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('button'):null;if(!button||!activeKey||button.id!==manifest[activeKey].close)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();close();},true);
window.addEventListener('popstate',event=>{pendingHistoryClose=false;const route=new URLSearchParams(location.search).get('page');if(route&&manifest[route])open(route,event.state?.origin||origin,{push:false}).catch(console.error);else if(activeKey)showOrigin();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activeKey)close();});
window.SharedPages=Object.freeze({open,close,getActive:()=>activeKey});
const initial=new URLSearchParams(location.search).get('page');if(initial&&manifest[initial])open(initial,'home',{push:false}).catch(error=>console.error('[SharedPages]',error));
})();