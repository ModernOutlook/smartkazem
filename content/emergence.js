(() => {
'use strict';
const episodes=Array.from({length:19},(_,i)=>({number:i+1,title:`قسمت ${i+1}`,paragraphs:[]}));
const list=document.getElementById('episode-list'),reader=document.getElementById('reader'),artIndex=document.getElementById('art-index'),artCaption=document.getElementById('art-caption');let current=0;
const faNumber=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
function renderList(){list.innerHTML='';episodes.forEach((ep,i)=>{const b=document.createElement('button');b.className='episode'+(i===current?' active':'');b.type='button';b.setAttribute('aria-label',ep.title);b.innerHTML=`<span class="n">${faNumber(ep.number)}</span>`;b.addEventListener('click',()=>{current=i;render()});list.appendChild(b)})}
function render(){const ep=episodes[current];document.title=`${ep.title} — فصل اول ظهور`;artIndex.textContent=`${faNumber(ep.number)} / ۱۹`;artCaption.textContent=ep.title;const body=ep.paragraphs.length?ep.paragraphs.map(p=>`<p class="prose">${p}</p>`).join(''):'<div class="placeholder">این قسمت هنوز در مخزن فارسی وارد نشده است.<br>متن هر قسمت در ادامهٔ انتشار رمان، در همین صفحه قرار می‌گیرد.</div>';reader.innerHTML=`<div class="reader-head"><div><div class="story-label">فصل اول ظهور</div><h2>${ep.title}</h2><p>روایتی دربارهٔ ترس، حقیقت و انتخاب</p></div></div><div class="block">${body}</div>`;renderList()}
document.getElementById('prev').addEventListener('click',()=>{current=(current+18)%19;render()});document.getElementById('next').addEventListener('click',()=>{current=(current+1)%19;render()});render();
})();