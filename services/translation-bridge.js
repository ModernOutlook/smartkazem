/* Dynamic translation bridge. Engine processing remains Persian. */
(function(){'use strict';
async function toPersian(text,from){if(!text||from==='fa')return text;const r=await window.ParagraphLLM.complete([{role:'system',content:'تو مترجم دقیق هستی. متن را بدون خلاصه‌سازی، تفسیر یا افزودن معنا به فارسی ترجمه کن.'},{role:'user',content:'زبان مبدأ: '+from+'\nمتن:\n'+text}],{temperature:0.15});return String(r.translation||r.text||'').trim()}
async function fromPersian(text,to){if(!text||to==='fa')return text;const r=await window.ParagraphLLM.complete([{role:'system',content:'تو مترجم دقیق هستی. متن فارسی را بدون خلاصه‌سازی، تفسیر یا افزودن معنا به زبان مقصد ترجمه کن و معنای مفهومی را حفظ کن.'},{role:'user',content:'زبان مقصد: '+to+'\nمتن فارسی:\n'+text}],{temperature:0.15});return String(r.translation||r.text||'').trim()}
window.ParagraphTranslation=Object.freeze({toPersian,fromPersian});
})();