function currentSiteLang(){return window.SiteI18n?.getLanguage?.()||'fa';}
let activeId='structure';
function emitSiteSound(cue){try{window.dispatchEvent(new CustomEvent('site:sound',{detail:cue}));}catch(_){}}

const app=document.getElementById('app');
const info=document.getElementById('info');
const infoTitle=document.getElementById('info-title');
const infoText=document.getElementById('info-text');
const realms=[...document.querySelectorAll('.realm')];
const core=document.getElementById('core');

function setInfo(id,show=true){
  activeId=id;
  realms.forEach(r=>r.classList.toggle('selected',r.dataset.id===id));
  const d=window.SiteI18n?.getCatalog?.()?.home?.realms?.[id];
  if(d){infoTitle.textContent=d.title||'';infoText.textContent=d.text||'';}
  const accents={structure:'#0879b8',continuity:'#e1b72b',experience:'#b653ff',reference:'#e94d43',share:'#1bd58a',core:'#f6fbff'};
  const selectedRealm=realms.find(r=>r.dataset.id===id);
  if(selectedRealm?.dataset.soundTheme)document.documentElement.dataset.soundTheme=selectedRealm.dataset.soundTheme;
  info.style.setProperty('--info-accent',accents[id]||accents.structure);
  info.classList.toggle('reference',id==='reference');
  if(show) info.classList.add('visible');
}

function clearInfo(){
  info.classList.remove('visible');
  realms.forEach(r=>r.classList.remove('selected'));
}

function selectRealm(id){
  if(id==='core'){
    setInfo('core');
    
    return;
  }
  const realm=realms.find(r=>r.dataset.id===id);
  if(!realm) return;
  
  setInfo(id);
  emitSiteSound('open');
  if(id==='share'){openShare();}
  if(id==='experience'){openExperience();}
  if(id==='continuity'){openContinuity();}
  if(id==='structure'){window.clearTimeout(window.__structureOpenTimer);openStructure();}
  if(id==='reference'){
    window.clearTimeout(window.__referenceOpenTimer);
    window.__referenceOpenTimer=window.setTimeout(openReference,220);
  }
}

const logoViewer=document.getElementById('logo-viewer');
const logoViewerClose=document.getElementById('logo-viewer-close');
function openLogoViewer(){clearInfo();logoViewer.classList.add('open');emitSiteSound('open');}
function closeLogoViewer(){logoViewer.classList.remove('open');emitSiteSound('back');}
core.setAttribute('tabindex','0');
core.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openLogoViewer();});
core.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openLogoViewer();}});
logoViewerClose.addEventListener('click',event=>{event.stopPropagation();closeLogoViewer();});
logoViewer.addEventListener('click',event=>{if(event.target===logoViewer)closeLogoViewer();});

const realmShare=document.getElementById('realm-share');
if(realmShare){
  realmShare.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    selectRealm(realmShare.dataset.id);
  });
  realmShare.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      selectRealm(realmShare.dataset.id);
    }
  });
}

const realmGeometry=[
  ['structure',365,445],
  ['continuity',285,365],
  ['experience',205,285],
  ['reference',125,205],
  ['share',70,125]
];
const universe=document.getElementById('universe');

function realmFromPoint(event){
  const rect=universe.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width*1000;
  const y=(event.clientY-rect.top)/rect.height*1000;
  const radius=Math.hypot(x-500,y-500);
  if(radius<=70)return 'core';
  for(const [id,inner,outer] of realmGeometry){
    if(radius>inner && radius<=outer)return id;
  }
  return null;
}
let lastSelectionAt=0;
realms.forEach(realm=>{
  realm.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    const now=performance.now();
    if(now-lastSelectionAt<90)return;
    lastSelectionAt=now;
    selectRealm(realm.dataset.id);
  });
  realm.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      selectRealm(realm.dataset.id);
    }
  });
});

function renderHomeFromCatalog(){
  const catalog=window.SiteI18n?.getCatalog?.()||{};
  const labels=catalog.labels||{};
  const pages=catalog.home?.pages||{};
  [['share-page',labels.share],['experience-page',labels.experience],['continuity-page',labels.continuity],['structure-page',labels.structure],['reference-page',labels.reference]].forEach(([id,title])=>{
    const q=document.getElementById(id); if(!q)return;
    const ss=q.querySelectorAll('.share-title strong,.experience-title strong,.continuity-title strong,.structure-title strong,.reference-title strong');
    const strong=q.querySelector('strong'), span=q.querySelector('span');
    if(strong&&title)strong.textContent=title;
    if(span){
      // Keep the secondary bilingual subtitle authored in the page markup.
      // The primary heading is localized through SiteI18n and its catalog.
    }
    q.setAttribute('aria-label',title||'');
  });
  const refs=[['ref-forgers',pages.forgers],['ref-treatise',pages.treatise],['ref-observation',pages.observation]];
  refs.forEach(([id,v])=>{const b=document.getElementById(id);if(b&&v){const sm=b.querySelector('small');b.firstChild.textContent=v;if(sm)sm.textContent=''}});
  const hs=document.getElementById('share-human-machines');
  const hm=catalog.pages?.humanMachines;
  if(hs&&hm){hs.firstChild.textContent=hm.title||labels.share;const sm=hs.querySelector('small');if(sm)sm.textContent=hm.title||''}
  const back=labels.back||'';
  ['share-close','share-human-machines','experience-close','continuity-close','structure-close','reference-close','book-close','logo-viewer-close'].forEach(id=>{const b=document.getElementById(id);if(b&&back)b.setAttribute('aria-label',back)});
  const brand=document.querySelector('.brand strong'), brandAlt=document.querySelector('.brand span');
  if(brand)brand.textContent=catalog.home?.brand||catalog.meta?.brand||brand.textContent;
  if(brandAlt)brandAlt.textContent=catalog.home?.brandLatin||catalog.meta?.brandLatin||brandAlt.textContent;
  const current=catalog.home?.realms?.[activeId];
  if(current){infoTitle.textContent=current.title||'';infoText.textContent=current.text||'';}
}
document.addEventListener('site:languagechange',()=>{
  renderHomeFromCatalog();
  if(typeof buildBookTabs==='function'&&typeof bookPage!=='undefined'&&bookPage.style.display==='block'){
    const currentTab=Math.max(0,[...document.querySelectorAll('.book-tab')].findIndex(b=>b.classList.contains('active')));
    buildBookTabs(currentTab); selectChapter(currentTab);
  }
});

document.getElementById('share-close').addEventListener('click',closeShare);
document.getElementById('experience-close').addEventListener('click',closeExperience);
document.getElementById('continuity-close').addEventListener('click',closeContinuity);
document.getElementById('continuity-shahnameh').addEventListener('click',()=>{window.location.href='shahnameh.html';});
document.getElementById('structure-close').addEventListener('click',closeStructure);
document.getElementById('reference-close').addEventListener('click',closeReference);
document.getElementById('ref-forgers').addEventListener('click',()=>openBook('reference','forgers'));document.getElementById('share-human-machines').addEventListener('click',()=>openBook('share','humanMachines'));
document.getElementById('ref-treatise').addEventListener('click',()=>{window.location.href='philosophical-treatise.html';});
document.getElementById('ref-observation').addEventListener('click',()=>{window.location.href='observation.html';});
document.getElementById('ref-equivalence').addEventListener('click',()=>openParagraph('reference'));
document.getElementById('experience-detect').addEventListener('click',()=>openParagraph('experience'));
document.getElementById('book-close').addEventListener('click',closeBook);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&logoViewer.classList.contains('open')){closeLogoViewer();return;}
  if(e.key==='Escape'&&bookPage.style.display==='block')closeBook();
  if(e.key==='Escape'&&paragraphPage.style.display==='block'){closeParagraph();return;}
  if(e.key==='Escape'&&sharePage.style.display==='block')closeShare();
  if(e.key==='Escape'&&experiencePage.style.display==='block')closeExperience();
  if(e.key==='Escape'&&continuityPage.style.display==='block')closeContinuity();
  if(e.key==='Escape'&&structurePage.style.display==='block')closeStructure();
  if(e.key==='Escape'&&referencePage.style.display==='block')closeReference();
  if(logoViewer.classList.contains('open')||bookPage.style.display==='block'||paragraphPage.style.display==='block'||referencePage.style.display==='block'||structurePage.style.display==='block'||continuityPage.style.display==='block'||experiencePage.style.display==='block'||sharePage.style.display==='block')return;
  const order=['structure','continuity','experience','reference','share'];
  const idx=order.indexOf(activeId);
  if(['ArrowDown','ArrowRight'].includes(e.key)){e.preventDefault();setInfo(order[(idx+1)%order.length])}
  if(['ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();setInfo(order[(idx-1+order.length)%order.length])}
  if(e.key==='Enter'&&activeId==='reference')openReference();
});

// Language state is owned exclusively by translations/i18n.js.
setInfo('structure');
