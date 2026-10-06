(() => {
'use strict';
const sourceData = window.Emergence2Catalog;
const data = sourceData;
if (!data || !Array.isArray(data.episodes)) throw new Error('Emergence II content unavailable.');

const list = document.getElementById('episode-list');
const reader = document.getElementById('reader');
const artIndex = document.getElementById('art-index');
const artCaption = document.getElementById('art-caption');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const close = document.getElementById('emergence2-close');
let activeIndex = 0;

const faNumber = value => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getLocalizedEpisode(index){
  const lang = window.SiteI18n?.getLanguage?.() || 'fa';
  const catalog = window.SiteI18n?.getCatalog?.();
  const translated = catalog?.chapters?.emergence2?.episodes?.[index];
  if (!translated || lang === 'fa') return sourceData.episodes[index];
  return { number: translated.number, title: translated.title, paragraphs: translated.paragraphs || [] };
}

function renderReader(episode){
  const hasText=episode.paragraphs.length>0;
  reader.innerHTML=`<header class="reader-head"><div><div class="story-label">فصل دوم ظهور</div><h2>${escapeHtml(episode.title)}</h2><p>قسمت ${faNumber(episode.number)} از ${faNumber(data.total)}</p></div></header><section class="block"><h3>متن قسمت</h3>${hasText ? episode.paragraphs.map(p=>`<p class="prose">${escapeHtml(p)}</p>`).join('') : '<div class="placeholder">متن فارسی این قسمت در مرحلهٔ تکمیل مخزن فارسی افزوده خواهد شد.</div>'}</section><div class="navrow reader-nav" aria-label="پیمایش قسمت‌ها"><button class="btn" id="prev-bottom" aria-label="رفتن به قسمت پیشین">پیشین</button><button class="btn" id="next-bottom" aria-label="رفتن به قسمت پسین">پسین</button></div>`;document.getElementById("prev-bottom")?.addEventListener("click",()=>select(activeIndex-1));document.getElementById("next-bottom")?.addEventListener("click",()=>select(activeIndex+1));
}

function render(){
  const episode=getLocalizedEpisode(activeIndex);
  document.querySelectorAll('.episode').forEach((button,i)=>{
    const active=i===activeIndex;
    button.classList.toggle('active',active);
    button.setAttribute('aria-current',String(active));
    button.setAttribute('aria-selected',String(active));
  });
  artIndex.textContent=`${faNumber(episode.number).padStart(2,'۰')} / ${faNumber(data.total)}`;
  artCaption.textContent=episode.title;
  renderReader(episode);
  prev.disabled=activeIndex===0;
  next.disabled=activeIndex===data.episodes.length-1;
  const activeButton=list.children[activeIndex];
  activeButton?.scrollIntoView({block:'nearest',inline:'nearest'});
}

function select(index, moveFocus=false){
  if(index<0||index>=data.episodes.length)return;
  activeIndex=index;
  render();
  if(moveFocus) list.children[index]?.focus({preventScroll:true});
}

data.episodes.forEach((episode,index)=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='episode';
  button.textContent=faNumber(episode.number);
  button.setAttribute('aria-label',`رفتن به قسمت ${faNumber(episode.number)}`);
  button.setAttribute('aria-controls','reader');
  button.setAttribute('role','tab');
  button.addEventListener('click',()=>select(index));
  button.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();
    let target=index;
    if(event.key==='ArrowRight')target=(index+1)%data.episodes.length;
    if(event.key==='ArrowLeft')target=(index-1+data.episodes.length)%data.episodes.length;
    if(event.key==='Home')target=0;
    if(event.key==='End')target=data.episodes.length-1;
    select(target,true);
  });
  list.appendChild(button);
});
prev.addEventListener('click',()=>select(activeIndex-1));
next.addEventListener('click',()=>select(activeIndex+1));
close.addEventListener('click',()=>history.back());
document.addEventListener('site:languagechange',()=>{
  document.documentElement.lang=window.SiteI18n?.getLanguage?.()||'fa';
  document.documentElement.dir=['ar','fa'].includes(window.SiteI18n?.getLanguage?.())?'rtl':'ltr';
  render();
});
render();
})();