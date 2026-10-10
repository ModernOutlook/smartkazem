(function(){
'use strict';
const tabs=document.getElementById('observation25-tabs');
const body=document.getElementById('observation25-body');
const close=document.getElementById('observation25-close');

function catalog(){
  const language=window.SiteI18n?.getLanguage?.()||'fa';
  const ui=window.SiteI18n?.getCatalog?.()?.pages?.observation25||{};
  if(language==='fa') return {...(window.Observation25PersianSource||{}),close:ui.close};
  const translated=window.SiteI18n?.getCatalog?.()?.bookContent?.observation25;
  if(!translated) return {...ui,sections:[],contents:[]};
  return {title:translated.title?.[language]||ui.title||'',subtitle:translated.subtitle?.[language]||ui.subtitle||'',sectionNote:translated.sectionNote?.[language]||'',sections:translated.sections?.[language]||[],contents:translated.contents?.[language]||[],close:ui.close};
}
function siteNumber(value){return new Intl.NumberFormat(window.SiteI18n?.getLanguage?.()||document.documentElement.lang||'fa').format(value);}
function render(){
  const data=catalog();
  const sections=Array.isArray(data.sections)?data.sections:[];
  const title=document.getElementById('observation25-title');
  const subtitle=document.getElementById('observation25-subtitle');
  if(title)title.textContent=data.title||'';
  if(subtitle)subtitle.textContent=data.subtitle||'';
  tabs.replaceChildren();
  body.replaceChildren();
  sections.forEach((label,index)=>{
    const tab=document.createElement('button');
    tab.type='button';
    tab.className='observation25-tab'+(index===0?' active':'');
    tab.dataset.index=String(index);
    tab.textContent=label;
    tabs.appendChild(tab);

    const section=document.createElement('section');
    section.className='observation25-section'+(index===0?' active':'');
    section.id='observation25-section-'+index;
    const h=document.createElement('h1');
    const badge=document.createElement('span');
    badge.className='section-number';
    badge.textContent=siteNumber(index+1);
    const text=document.createElement('span');
    text.textContent=label;
    h.appendChild(badge); h.appendChild(text);
    section.appendChild(h);
    const note=document.createElement('p');
    note.className='section-note';
    note.textContent=data.sectionNote||'';
    section.appendChild(note);

    const contents=Array.isArray(data.contents)?data.contents:[];
    const sectionContent=contents[index];
    if(sectionContent){
      const article=document.createElement('div');
      article.className='observation25-content';
      sectionContent.split(/\n\n+/).forEach(paragraph=>{
        if(!paragraph.trim()) return;
        const p=document.createElement('p');
        p.textContent=paragraph.trim();
        article.appendChild(p);
      });
      section.appendChild(article);
    }
    body.appendChild(section);
  });
  if(!sections.length){
    const empty=document.createElement('p');
    empty.className='observation25-empty';
    empty.textContent='—';
    body.replaceChildren(empty);
    return;
  }
  tabs.querySelectorAll('.observation25-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const index=Number(tab.dataset.index);
      tabs.querySelectorAll('.observation25-tab').forEach(x=>x.classList.toggle('active',x===tab));
      body.querySelectorAll('.observation25-section').forEach((x,i)=>x.classList.toggle('active',i===index));
      body.scrollTop=0;
    });
  });
}
close.addEventListener('click',()=>{if(history.length>1) history.back(); else window.location.href='index.html';});
document.addEventListener('site:languagechange',render);
document.addEventListener('DOMContentLoaded',()=>setTimeout(render,0),{once:true});
})();
