(() => {
'use strict';
const source=window.DisturbedManifestoSource;
if(!source||!Array.isArray(source.parts)) throw new Error('Disturbed Manifesto source unavailable.');
const list=document.getElementById('part-list'),reader=document.getElementById('reader'),close=document.getElementById('manifesto-close'),pageTitle=document.getElementById('page-title'),pageSubtitle=document.getElementById('page-subtitle');
let activeIndex=0;
const faNumber=v=>String(v).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>window.SiteI18n?.getLanguage?.()||'fa';
const catalog=()=>window.SiteI18n?.getCatalog?.()||{};
const localized=()=>lang()==='fa'?source.parts[activeIndex]:(catalog()?.chapters?.disturbedManifesto?.parts?.[lang()]?.[activeIndex]||source.parts[activeIndex]);
const chapterTitle=()=>lang()==='fa'?source.title:(catalog()?.chapters?.disturbedManifesto?.title?.[lang()]||source.title);
const ui={
fa:{list:'بخش‌های مانیفست',nav:'انتخاب بخش',text:'متن بخش',back:'بازگشت',prev:'پیشین',next:'پسین',go:'رفتن به بخش ',of:'بخش {n} از {t}'},
en:{list:'Manifesto parts',nav:'Part selection',text:'Part text',back:'Back',prev:'Previous',next:'Next',go:'Go to part ',of:'Part {n} of {t}'},
ar:{list:'أجزاء البيان',nav:'اختيار الجزء',text:'نص الجزء',back:'رجوع',prev:'السابق',next:'التالي',go:'الانتقال إلى الجزء ',of:'الجزء {n} من {t}'},
zh:{list:'宣言部分',nav:'选择部分',text:'正文',back:'返回',prev:'上一部分',next:'下一部分',go:'前往第 ',of:'第 {n} / {t} 部分'}
};
function renderReader(){
 const l=lang(),u=ui[l]||ui.en,ep=localized(),n=ep.number,t=source.total;
 reader.setAttribute('aria-labelledby','manifesto-reader-heading');
 reader.innerHTML='<header class="reader-head"><div><div class="story-label">'+escapeHtml(chapterTitle())+'</div><h2 id="manifesto-reader-heading">'+escapeHtml(ep.title)+'</h2><p>'+escapeHtml(u.of.replace('{n}',l==='fa'?faNumber(n):n).replace('{t}',l==='fa'?faNumber(t):t))+'</p></div></header><section class="block" aria-labelledby="manifesto-text-heading"><h3 id="manifesto-text-heading">'+escapeHtml(u.text)+'</h3>'+ep.paragraphs.map(p=>'<p class="prose">'+escapeHtml(p)+'</p>').join('')+'</section><div class="navrow" aria-label="'+escapeHtml(u.nav)+'"><button class="btn" id="prev-bottom" type="button" '+(activeIndex===0?'disabled':'')+'>'+u.prev+'</button><button class="btn" id="next-bottom" type="button" '+(activeIndex===t-1?'disabled':'')+'>'+u.next+'</button></div></section>';
 document.getElementById('prev-bottom')?.addEventListener('click',()=>select(activeIndex-1,true));
 document.getElementById('next-bottom')?.addEventListener('click',()=>select(activeIndex+1,true));
}
function applyLanguage(){
 const l=lang(),u=ui[l]||ui.en;
 document.documentElement.lang=l; document.documentElement.dir=['fa','ar'].includes(l)?'rtl':'ltr';
 if(pageTitle)pageTitle.textContent=chapterTitle();
 if(pageSubtitle)pageSubtitle.textContent={fa:'مانیفست آشوب‌زده در ۱۱ بخش.',en:'Disturbed Manifesto in 11 parts.',ar:'البيان المضطرب في 11 جزءًا.',zh:'《扰动宣言》共 11 部分。'}[l];
 document.getElementById('part-list-heading').textContent=u.list;
 document.querySelector('section.controls nav')?.setAttribute('aria-label',u.nav);
 if(close)close.setAttribute('aria-label',u.back);
}
function render(){
 const l=lang(),u=ui[l]||ui.en;
 document.querySelectorAll('.part').forEach((b,i)=>{const a=i===activeIndex;b.classList.toggle('active',a);if(a)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.setAttribute('aria-label',u.go+(l==='fa'?faNumber(source.parts[i].number):source.parts[i].number));});
 renderReader();
}
function select(index,moveFocus=false){if(index<0||index>=source.parts.length)return;activeIndex=index;render();if(moveFocus)reader.focus({preventScroll:false});}
source.parts.forEach((part,index)=>{const b=document.createElement('button');b.type='button';b.className='part';b.textContent=faNumber(part.number);b.setAttribute('aria-controls','reader');b.addEventListener('click',()=>select(index));b.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const rtl=document.documentElement.dir==='rtl';let target=index;if(e.key==='Home')target=0;if(e.key==='End')target=source.parts.length-1;if(e.key==='ArrowRight')target=rtl?index-1:index+1;if(e.key==='ArrowLeft')target=rtl?index+1:index-1;if(target<0)target=source.parts.length-1;if(target>=source.parts.length)target=0;select(target,true);});list.appendChild(b);});
close.addEventListener('click',()=>{if(history.length>1)history.back();else window.location.href='index.html';});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close.click();});
document.addEventListener('site:languagechange',()=>{applyLanguage();render();});
applyLanguage();render();
})();