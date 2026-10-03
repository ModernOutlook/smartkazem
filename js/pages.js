const home=document.getElementById('home-page');
const sharePage=document.getElementById('share-page');
const experiencePage=document.getElementById('experience-page');
const continuityPage=document.getElementById('continuity-page');
const structurePage=document.getElementById('structure-page');
const referencePage=document.getElementById('reference-page');
const bookPage=document.getElementById('book-page');

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

