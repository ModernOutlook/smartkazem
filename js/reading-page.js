const body=document.body;
const treatiseTabs={fa:['پیش‌گفتار','ساختار تالار','تداوم عالم','تجربه','اقتدار شبیه‌سازی','اقتصاد سهم‌ها','پس‌گفتار'],en:['Preface','Hall Structure','Continuity of the World','Experience','The Authority of Simulation','Share Economy','Postscript'],zh:['序言','结构殿堂','世界的延续','经验','模拟的权威','份额经济','后记'],ar:['المقدمة','بنية القاعة','استمرارية العالم','التجربة','سلطة المحاكاة','اقتصاد الحصص','الخاتمة']};
function renderTreatiseTabs(){const lang=window.SiteI18n?.getLanguage?.()||'fa';document.querySelectorAll('#tabs .book-tab').forEach((b,i)=>{b.textContent=treatiseTabs[lang]?.[i]||treatiseTabs.fa[i]||''});}
document.getElementById('close').onclick=()=>{if(history.length>1)history.back();else location.href='index.html'};
document.querySelectorAll('.book-tab').forEach(b=>b.onclick=()=>{const id=b.dataset.target;if(id){document.querySelectorAll('.book-tab').forEach(x=>x.classList.toggle('active',x===b));const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}});
document.addEventListener('site:languagechange',renderTreatiseTabs);
renderTreatiseTabs();
