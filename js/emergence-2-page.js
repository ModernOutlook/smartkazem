(() => {
'use strict';
const data = window.Emergence2Catalog;
if (!data || !Array.isArray(data.episodes)) throw new Error('Emergence II content unavailable.');

const list = document.getElementById('episode-list');
const reader = document.getElementById('reader');
const artFrame = document.getElementById('art-frame');
const artIndex = document.getElementById('art-index');
const artCaption = document.getElementById('art-caption');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const close = document.getElementById('emergence2-close');
let activeIndex = 0;

const faNumber = value => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderImage(episode){
  artFrame.replaceChildren();
  if (episode.image) {
    const img=document.createElement('img');
    img.src=episode.image;
    img.alt=`تصویر فصل دوم ظهور، قسمت ${faNumber(episode.number)}`;
    img.loading=episode.number <= 2 ? 'eager' : 'lazy';
    img.decoding='async';
    artFrame.appendChild(img);
  } else {
    const span=document.createElement('span');
    span.textContent='تصویر این قسمت هنوز در مخزن محتوا قرار نگرفته است.';
    artFrame.appendChild(span);
  }
}

function renderReader(episode){
  const hasText=episode.paragraphs.length>0;
  reader.innerHTML=`<header class="reader-head"><div><div class="story-label">فصل دوم ظهور</div><h2>${escapeHtml(episode.title)}</h2><p>قسمت ${faNumber(episode.number)} از ${faNumber(data.total)}</p></div></header><section class="block"><h3>متن قسمت</h3>${hasText ? episode.paragraphs.map(p=>`<p class="prose">${escapeHtml(p)}</p>`).join('') : '<div class="placeholder">متن فارسی این قسمت در مرحلهٔ تکمیل مخزن فارسی افزوده خواهد شد.</div>'}</section>`;
}

function render(){
  const episode=data.episodes[activeIndex];
  document.querySelectorAll('.episode').forEach((button,i)=>{
    const active=i===activeIndex;
    button.classList.toggle('active',active);
    button.setAttribute('aria-current',String(active));
    button.setAttribute('aria-selected',String(active));
  });
  artIndex.textContent=`${faNumber(episode.number).padStart(2,'۰')} / ${faNumber(data.total)}`;
  artCaption.textContent=episode.title;
  renderImage(episode);
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
});
render();
})();