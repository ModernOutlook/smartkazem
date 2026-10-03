function currentSiteLang(){return window.SiteI18n?.getLanguage?.()||'fa';}
let activeId='structure';

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
function openLogoViewer(){clearInfo();logoViewer.classList.add('open');}
function closeLogoViewer(){logoViewer.classList.remove('open');}
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
    openShare();
  });
  realmShare.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      openShare();
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
      const key=id.replace('-page','');
      span.textContent=(title||'').split(' · ')[1]||title||'';
    }
    q.setAttribute('aria-label',title||'');
  });
  const refs=[['ref-forgers',pages.forgers],['ref-treatise',pages.treatise],['ref-observation',pages.observation]];
  refs.forEach(([id,v])=>{const b=document.getElementById(id);if(b&&v){const sm=b.querySelector('small');b.firstChild.textContent=v;if(sm)sm.textContent=''}});
  const hs=document.getElementById('share-human-machines');
  const hm=catalog.pages?.humanMachines;
  if(hs&&hm){hs.firstChild.textContent=hm.title||labels.share;const sm=hs.querySelector('small');if(sm)sm.textContent=hm.title||''}
  const g=document.getElementById('ref-games');
  if(g&&pages.games){g.firstChild.textContent=pages.games;const sm=g.querySelector('small');if(sm)sm.textContent=pages.gamesEn||''}
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

const home=document.getElementById('home-page');
const sharePage=document.getElementById('share-page');
const experiencePage=document.getElementById('experience-page');
const continuityPage=document.getElementById('continuity-page');
const structurePage=document.getElementById('structure-page');
const referencePage=document.getElementById('reference-page');
const bookPage=document.getElementById('book-page');
let bookReturn='home';
let activeBookKind='forgers';
const bookTabs=document.getElementById('book-tabs');
const bookBody=document.getElementById('book-body');

function activeBookCatalog(){
  try{
    const p=window.SiteI18n&&window.SiteI18n.getCatalog?window.SiteI18n.getCatalog().pages?.[activeBookKind]:null;
    if(p&&Array.isArray(p.chapters)&&p.chapters.length)return p;
  }catch(_){}
  return null;
}
function activeChapters(){
  const p=activeBookCatalog();
  if(p)return p.chapters;
  return currentSiteLang()==='fa'?bookChapters:(currentSiteLang()==='zh'?bookChaptersZh:(currentSiteLang()==='ar'?bookChaptersAr:bookChaptersEn));
}

function buildBookTabs(active=0){
  bookTabs.innerHTML='';
  activeChapters().forEach((ch,i)=>{
    const b=document.createElement('button');
    b.className='book-tab'+(i===active?' active':'');
    b.textContent=ch.title;
    b.addEventListener('click',()=>selectChapter(i));
    bookTabs.appendChild(b);
  });
}

function selectChapter(i){
  const chapters=activeChapters();
  document.querySelectorAll('.book-tab').forEach((b,n)=>b.classList.toggle('active',n===i));
  const ch=chapters[i];
  let html='';
  const bookCatalog=activeBookCatalog();
  if(i===0){
    const bookTitle=bookCatalog?.title||(activeBookKind==='humanMachines'?(currentSiteLang()==='en'?'Humanity and Its Machines':currentSiteLang()==='zh'?'人类与他们的机器':currentSiteLang()==='ar'?'الإنسان وآلاته':'انسان و ماشین‌هایش'):(currentSiteLang()==='en'?'The Forgers of Imitation':currentSiteLang()==='zh'?'《模仿的伪造者》':currentSiteLang()==='ar'?'مزوّرو التقليد':'جاعلان تقلید'));
    const bookSubtitle=bookCatalog?.subtitle||(activeBookKind==='humanMachines'?(currentSiteLang()==='en'?'Seven Parts':currentSiteLang()==='zh'?'七个部分':currentSiteLang()==='ar'?'سبعة أجزاء':'هفت بخش'):(currentSiteLang()==='en'?'Ten Chapters':currentSiteLang()==='zh'?'十章':currentSiteLang()==='ar'?'عشرة فصول':'در ده فصل'));
    html+='<h1 class="book-h1">'+bookTitle+'</h1><p class="book-sub">'+bookSubtitle+'</p>';
  }
  html+='<div class="chapter" style="--dot:'+ch.dot+'"><h2><i></i>'+ch.title+'</h2>';
  ch.paragraphs.forEach(p=>html+='<p>'+p+'</p>');
  html+='</div>';
  if(i===chapters.length-1&&activeBookKind==='forgers'){
    const moralTitle=currentSiteLang()==='en'?'Fable Wisdom':currentSiteLang()==='zh'?'寓言智慧':currentSiteLang()==='ar'?'حكمة الحكاية':'حکمت فابل';
    const moralText=bookCatalog?.moral||(currentSiteLang()==='en'?bookMoralEn:currentSiteLang()==='zh'?'展示技艺的人只能走到有观众的地方；磨炼技艺的人能走到自己能够抵达的地方。而一座人人都是观众的森林，最终除了观看本身，便再没有什么可看。':currentSiteLang()==='ar'?'من يعرض مهارة لا يذهب إلا بقدر ما لديه من متفرجين؛ ومن يمارس مهارة يذهب إلى أبعد ما يستطيع. والغابة التي يكون الجميع فيها متفرجين لا يبقى فيها في النهاية شيء يُرى سوى فعل المشاهدة نفسه.':bookMoralFa);
    html+='<div class="moral"><h2>'+moralTitle+'</h2><p>'+moralText+'</p></div>';
  }
  bookBody.classList.toggle('lang-en',currentSiteLang()==='en');
  bookBody.dir=currentSiteLang()==='en'?'ltr':'rtl';
  bookBody.innerHTML=html;
  bookBody.scrollTop=0;
}

function openShare(){home.style.display='none';referencePage.style.display='none';bookPage.style.display='none';structurePage.style.display='none';continuityPage.style.display='none';experiencePage.style.display='none';sharePage.style.display='block';clearInfo();}
function closeShare(){sharePage.style.display='none';home.style.display='block';setInfo('share');}
function openExperience(){home.style.display='none';referencePage.style.display='none';bookPage.style.display='none';structurePage.style.display='none';continuityPage.style.display='none';experiencePage.style.display='block';clearInfo();}
function closeExperience(){experiencePage.style.display='none';home.style.display='block';setInfo('experience');}
function openContinuity(){home.style.display='none';referencePage.style.display='none';bookPage.style.display='none';structurePage.style.display='none';experiencePage.style.display='none';continuityPage.style.display='block';clearInfo();}
function closeContinuity(){continuityPage.style.display='none';home.style.display='block';setInfo('continuity');}
function openStructure(){window.clearTimeout(window.__structureOpenTimer);home.style.display='none';referencePage.style.display='none';bookPage.style.display='none';continuityPage.style.display='none';structurePage.style.display='block';clearInfo();}
function closeStructure(){structurePage.style.display='none';home.style.display='block';setInfo('structure');}
function openReference(){home.style.display='none';bookPage.style.display='none';referencePage.style.display='block';}
function closeReference(){referencePage.style.display='none';home.style.display='block';setInfo('reference');}
function openBook(from='home',kind='forgers'){bookReturn=from;activeBookKind=kind;
  const meta=window.SiteI18n?.getCatalog?.().pages?.[activeBookKind];
  const bt=document.getElementById('book-title');
  if(bt&&meta?.title)bt.textContent='📖 '+meta.title+' — '+meta.subtitle;
  home.style.display='none';
  referencePage.style.display='none';
  bookPage.style.display='block';
  buildBookTabs(0);
  selectChapter(0);
  
}

function closeBook(){bookPage.style.display='none';if(bookReturn==='reference'){referencePage.style.display='block';}else if(bookReturn==='share'){sharePage.style.display='block';}else{home.style.display='block';setInfo('reference');}}

document.getElementById('share-close').addEventListener('click',closeShare);
document.getElementById('experience-close').addEventListener('click',closeExperience);
document.getElementById('continuity-close').addEventListener('click',closeContinuity);
document.getElementById('continuity-shahnameh').addEventListener('click',()=>{window.location.href='shahnameh.html';});
document.getElementById('structure-close').addEventListener('click',closeStructure);
document.getElementById('reference-close').addEventListener('click',closeReference);
document.getElementById('ref-forgers').addEventListener('click',()=>openBook('reference','forgers'));document.getElementById('share-human-machines').addEventListener('click',()=>openBook('share','humanMachines'));
document.getElementById('ref-treatise').addEventListener('click',()=>{window.location.href='philosophical-treatise.html';});
document.getElementById('ref-observation').addEventListener('click',()=>{window.location.href='observation.html';});
document.getElementById('ref-games').addEventListener('click',()=>{});
document.getElementById('book-close').addEventListener('click',closeBook);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&logoViewer.classList.contains('open')){closeLogoViewer();return;}
  if(e.key==='Escape'&&bookPage.style.display==='block')closeBook();
  if(e.key==='Escape'&&sharePage.style.display==='block')closeShare();
  if(e.key==='Escape'&&experiencePage.style.display==='block')closeExperience();
  if(e.key==='Escape'&&continuityPage.style.display==='block')closeContinuity();
  if(e.key==='Escape'&&structurePage.style.display==='block')closeStructure();
  if(e.key==='Escape'&&referencePage.style.display==='block')closeReference();
  if(logoViewer.classList.contains('open')||bookPage.style.display==='block'||referencePage.style.display==='block'||structurePage.style.display==='block'||continuityPage.style.display==='block'||experiencePage.style.display==='block'||sharePage.style.display==='block')return;
  const order=['structure','continuity','experience','reference','share'];
  const idx=order.indexOf(activeId);
  if(['ArrowDown','ArrowRight'].includes(e.key)){e.preventDefault();setInfo(order[(idx+1)%order.length])}
  if(['ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();setInfo(order[(idx-1+order.length)%order.length])}
  if(e.key==='Enter'&&activeId==='reference')openReference();
});

// Language state is owned exclusively by translations/i18n.js.
setInfo('structure');
