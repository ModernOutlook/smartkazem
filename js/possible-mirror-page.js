(function(){
'use strict';
const tabs=document.getElementById('possible-mirror-tabs');
const body=document.getElementById('possible-mirror-body');
const close=document.getElementById('possible-mirror-close');

function catalog(){return window.SiteI18n?.getCatalog?.()?.pages?.possibleMirror||{}}
function render(){
  const data=catalog();
  const sections=Array.isArray(data.sections)?data.sections:[];
  const title=document.getElementById('possible-mirror-title');
  const subtitle=document.getElementById('possible-mirror-subtitle');
  if(title)title.textContent=data.title||'';
  if(subtitle)subtitle.textContent=data.subtitle||'';
  tabs.innerHTML='';
  body.innerHTML='';
  sections.forEach((label,index)=>{
    const tab=document.createElement('button');
    tab.type='button';
    tab.className='possible-mirror-tab'+(index===0?' active':'');
    tab.dataset.index=String(index);
    tab.textContent=label;
    tabs.appendChild(tab);

    const section=document.createElement('section');
    section.className='possible-mirror-section'+(index===0?' active':'');
    section.id='possible-mirror-section-'+index;
    const h=document.createElement('h1');
    const badge=document.createElement('span');
    badge.className='section-number';
    badge.textContent=String(index+1);
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
      article.className='possible-mirror-content';
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
  if(!sections.length){body.innerHTML='<p class="possible-mirror-empty">—</p>';return;}
  tabs.querySelectorAll('.possible-mirror-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const index=Number(tab.dataset.index);
      tabs.querySelectorAll('.possible-mirror-tab').forEach(x=>x.classList.toggle('active',x===tab));
      body.querySelectorAll('.possible-mirror-section').forEach((x,i)=>x.classList.toggle('active',i===index));
      body.scrollTop=0;
    });
  });
}
close.addEventListener('click',()=>{if(history.length>1)history.back();else window.location.href='index.html';});
document.addEventListener('site:languagechange',render);
document.addEventListener('DOMContentLoaded',()=>setTimeout(render,0),{once:true});
})();
