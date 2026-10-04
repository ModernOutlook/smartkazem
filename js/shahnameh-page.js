const parts=document.getElementById('parts'),reader=document.getElementById('reader');let selected=0;
function esc(v){return String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
function render(){
 const lang=window.SiteI18n?.getLanguage?.()||'fa';
 const m=shahnamehFaCatalog;
 const title=lang==='fa'?(m.title||'شاهنامه‌خوانی'):(window.SiteI18n?.get?.('pages.shahnameh.title', 'Shahnameh Reading')||'Shahnameh Reading');
 const partLabel=lang==='fa'?(m.part||'قسمت'):(window.SiteI18n?.get?.('pages.shahnameh.part','Part')||'Part');
 const originalLabel=lang==='fa'?(m.originalVerse||'بیت‌های اصلی'):(window.SiteI18n?.get?.('pages.shahnameh.originalVerse','Original Verse')||'Original Verse');
 const proseLabel=lang==='fa'?(m.prose||'نثر'):(window.SiteI18n?.get?.('pages.shahnameh.prose','Prose')||'Prose');
 parts.innerHTML='';
 for(let i=0;i<81;i++){
   const p=m['part'+(i+1)];
   const btn=document.createElement('button');
   btn.className='part'+(i===selected?' active':'');
   btn.textContent=partLabel+' '+(i+1);
   btn.type='button';
   btn.disabled=false;
   btn.setAttribute('aria-disabled','false');
   btn.onclick=()=>{selected=i;render()};
   parts.appendChild(btn);
 }
 const p=m['part'+(selected+1)];
 if(p){
   reader.innerHTML='<h2>'+esc(p.title)+'</h2><div class="block"><h3>'+esc(originalLabel)+'</h3><p class="verse">'+esc(p.originalVerse||'')+'</p></div><div class="block"><h3>'+esc(proseLabel)+'</h3><p class="prose">'+esc(p.prose||'')+'</p></div>';
 }else{
   reader.innerHTML='<h2>'+esc(partLabel+' '+(selected+1))+'</h2><div class="block"><p class="placeholder">'+esc(m.placeholder||'متن این قسمت هنوز افزوده نشده است.')+'</p></div>';
 }
}
document.getElementById('back').onclick=()=>{window.location.href='index.html'};
document.addEventListener('site:languagechange',render);
document.addEventListener('DOMContentLoaded',async()=>{try{if(window.SiteI18n?.setLanguage)await window.SiteI18n.setLanguage(window.SiteI18n.getLanguage())}catch(_){}render()},{once:true});