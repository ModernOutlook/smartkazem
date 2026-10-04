const parts=document.getElementById('parts'),reader=document.getElementById('reader');let selected=0;
function esc(v){return String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
function render(){
 const lang=window.SiteI18n?.getLanguage?.()||'fa';
 const c=lang==='fa'?{pages:{shahnameh:shahnamehFaCatalog}}:(window.SiteI18n?.getCatalog?.()||{});
 const m=c.pages?.shahnameh||{};
 parts.innerHTML='';
 for(let i=0;i<81;i++){
   const key='part'+(i+1),p=m[key];
   const btn=document.createElement('button');btn.className='part'+(i===selected?' active':'');btn.textContent=(m.part||'Part')+' '+(i+1);btn.type='button';btn.onclick=()=>{selected=i;render()};parts.appendChild(btn);
 }
 const p=m['part'+(selected+1)];
 if(p){
   reader.innerHTML='<h2>'+esc(p.title)+'</h2><div class="block"><h3>'+esc(m.originalVerse||'Original Verse')+'</h3><p class="verse">'+esc(p.originalVerse||'')+'</p></div><div class="block"><h3>'+esc(m.prose||'Prose')+'</h3><p class="prose">'+esc(p.prose||'')+'</p></div>';
 }else{
   reader.innerHTML='<h2>'+esc((m.part||'Part')+' '+(selected+1))+'</h2><div class="block"><p class="placeholder">'+esc(m.placeholder||'Coming soon')+'</p></div>';
 }
}
document.getElementById('back').onclick=()=>{window.location.href='index.html'};
document.addEventListener('site:languagechange',render);
document.addEventListener('DOMContentLoaded',async()=>{try{if(window.SiteI18n?.setLanguage)await window.SiteI18n.setLanguage(window.SiteI18n.getLanguage())}catch(_){}render()},{once:true});