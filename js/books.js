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

