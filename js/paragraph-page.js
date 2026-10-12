/* UI adapter for the shared paragraph workspace. */
(() => {
'use strict';
const ENTRY_MODES=Object.freeze({REFERENCE:'reference',EXPERIENCE:'experience'});
const DOMAIN_ORDER=Object.freeze(['S','T','E','R','C']);
const STATUS_OPTIONS=Object.freeze([['ok','مطابق'],['warn','مبهم'],['bad','متناقض']]);
const REALM_LABELS=Object.freeze({
 fa:{S:'ساختار',T:'تداوم',E:'تجربه',R:'شبیه‌سازی',C:'سهام'},
 en:{S:'Structure',T:'Continuity',E:'Experience',R:'Simulation',C:'Shares'},
 zh:{S:'结构',T:'延续',E:'体验',R:'模拟',C:'份额'},
 ar:{S:'البنية',T:'الاستمرارية',E:'التجربة',R:'المحاكاة',C:'الحصص'}
});
const elements={
 page:document.getElementById('paragraph-page'),
 primaryPanel:document.getElementById('paragraph-primary-panel'),
 input:document.getElementById('paragraph-input'),
 primaryOutput:document.getElementById('paragraph-primary-output'),
 action:document.getElementById('paragraph-recognize'),
 output:document.getElementById('paragraph-output'),
 error:document.getElementById('paragraph-error'),
 source:document.getElementById('paragraph-source'),
 settings:document.getElementById('paragraph-settings'),
 key:document.getElementById('paragraph-api-key'),
 base:document.getElementById('paragraph-base-url'),
 model:document.getElementById('paragraph-model'),
 choices:[...document.querySelectorAll('.pm-realm-choice')],
 popover:document.getElementById('pm-judgment-popover')
};
let entryMode=ENTRY_MODES.EXPERIENCE,currentResults=[];
let judgmentReturnFocus=null;
const userJudgments=Object.create(null);
function getLanguage(){const lang=window.SiteI18n?.getLanguage?.()||'fa';return REALM_LABELS[lang]?lang:'fa'}
function translate(k,f){return window.SiteI18n?.get?.(k,f)||f}
function renderHistoryList(id,values){
 const list=document.getElementById(id);if(!list)return;
 list.replaceChildren(...(Array.isArray(values)?values:[]).map(value=>{const option=document.createElement('option');option.value=value;return option}));
}
function loadSettings(){const s=window.ParagraphLLM.getSettings();elements.key.value=s.apiKey;elements.base.value=s.baseUrl;elements.model.value=s.model}
function saveSettingsAfterSuccess(){window.ParagraphLLM.saveSettings({apiKey:elements.key.value.trim(),baseUrl:elements.base.value.trim(),model:elements.model.value.trim()});loadSettings()}
function updateDirection(){elements.input.dir=['fa','ar'].includes(getLanguage())?'rtl':'ltr'}
function updateRealmLabels(){
 const lang=getLanguage(),labels=REALM_LABELS[lang];
 elements.choices.forEach(c=>{const label=labels[c.dataset.domain]||c.dataset.domain;c.setAttribute('aria-label',label);const span=c.querySelector('[data-realm-label]');if(span)span.textContent=label;const img=c.querySelector('img');if(img)img.alt=label});
 elements.popover.setAttribute('aria-label',translate('paragraphMachine.judgmentDialog','انتخاب قضاوت قلمرو'));
}
function escapeHtml(v){return String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function getActionLabel(m){return m===ENTRY_MODES.REFERENCE?translate('paragraphMachine.equivalence','هم‌سنگی'):translate('paragraphMachine.recognize','بازشناسی')}
function getSourceLabel(m){
 const lang=getLanguage();
 const labels={
  fa:{reference:'متن اصلی کاربر → معیارهای فارسی → داوری مستقل',experience:'تولید به زبان سایت → داوری مستقل با معیارهای همان زبان'},
  en:{reference:'Original user text → language-matched criteria → independent judgment',experience:'Generate in site language → independently judge using same-language criteria'},
  zh:{reference:'保留用户原文 → 使用同语言标准 → 独立判断',experience:'以网站语言生成 → 使用同语言标准独立判断'},
  ar:{reference:'نص المستخدم الأصلي ← معايير باللغة نفسها ← حكم مستقل',experience:'توليد بلغة الموقع ← حكم مستقل بمعايير اللغة نفسها'}
 };
 return labels[lang][m===ENTRY_MODES.REFERENCE?'reference':'experience'];
}
function clearRealmState(){elements.choices.forEach(c=>{c.classList.remove('judgment-ok','judgment-warn','judgment-bad','realm-output');delete c.dataset.judgment;c.removeAttribute('aria-pressed')})}
function generateRandomTargetJudgments(){
 clearRealmState();
 DOMAIN_ORDER.forEach(d=>{userJudgments[d]=STATUS_OPTIONS[Math.floor(Math.random()*STATUS_OPTIONS.length)][0]});
 elements.choices.forEach(c=>{const d=c.dataset.domain;c.dataset.target=userJudgments[d];c.classList.add('judgment-'+userJudgments[d],'realm-output');c.setAttribute('aria-pressed','true')});
}
function recognitionReady(){return entryMode===ENTRY_MODES.EXPERIENCE&&currentResults.length===1&&DOMAIN_ORDER.every(d=>Boolean(userJudgments[d]))}
function equivalenceReady(){const raw=elements.input.value.trim();if(!raw)return false;return window.ParagraphMachineCore.countWords(raw)<=144&&window.ParagraphMachineCore.countChars(raw)<=900&&window.ParagraphMachineCore.findLongWords(raw).length===0}
function updateActionState(){const ready=entryMode===ENTRY_MODES.EXPERIENCE?recognitionReady():equivalenceReady();elements.action.disabled=!ready;elements.action.classList.toggle('is-enabled',ready)}
async function generateRecognitionParagraph(){
 try{
  elements.error.textContent='';elements.primaryOutput.innerHTML='<div class="pm-loading">'+translate('paragraphMachine.processing','در حال پردازش...')+'</div>';
  currentResults=await generateExperience();
  renderPrimaryParagraphs(currentResults);
  elements.source.textContent=translate('paragraphMachine.judgmentReady','پاراگراف آماده قضاوت پنج‌قلمرویی است.');
  updateActionState();
 }catch(e){currentResults=[];elements.primaryOutput.replaceChildren();elements.error.textContent=e.message||String(e);updateActionState()}
}
function setRealmOutputState(p){const j=p?.judgment||{};elements.choices.forEach(c=>{const s=j[c.dataset.domain]?.status||'';c.classList.remove('judgment-ok','judgment-warn','judgment-bad');c.classList.toggle('realm-output',!!s);c.dataset.judgment=s;if(s)c.classList.add('judgment-'+s);c.setAttribute('aria-pressed',String(!!s))})}
function openParagraphPage(kind){
 entryMode=kind;elements.page.classList.add('open');elements.page.dataset.entry=kind;
 const ref=kind===ENTRY_MODES.REFERENCE;
 elements.primaryPanel.classList.toggle('is-input-mode',ref);elements.primaryPanel.classList.toggle('is-output-mode',!ref);
 elements.input.hidden=!ref;elements.primaryOutput.hidden=ref;
 elements.action.textContent=getActionLabel(kind);elements.action.classList.toggle('pm-action-reference',ref);elements.action.classList.toggle('pm-action-recognition',!ref);
 elements.source.textContent=getSourceLabel(kind);elements.input.value='';elements.primaryOutput.replaceChildren();elements.output.replaceChildren();elements.error.textContent='';
 elements.input.classList.remove('pm-user-correct','pm-user-incorrect');
 currentResults=[];DOMAIN_ORDER.forEach(d=>delete userJudgments[d]);clearRealmState();closeJudgmentPopover();
 elements.choices.forEach(c=>{c.classList.toggle('is-judgment-input',!ref);c.classList.toggle('is-result-output',ref)});
 loadSettings();updateDirection();
 if(ref){generateRandomTargetJudgments()}else{DOMAIN_ORDER.forEach(d=>delete userJudgments[d]);clearRealmState();generateRecognitionParagraph()}
 updateActionState();
}
function closeParagraphPage(){elements.page.classList.remove('open')}
function renderPrimaryParagraphs(results){
 elements.primaryOutput.innerHTML=results.map((p,i)=>{const x=window.ParagraphMachineCore.processText(p.displayedText??p.text),t=p.displayedText??p.text,e=p.userEvaluation||'',ec=e?' pm-user-'+e:'';return '<article class="pm-primary-card"><div class="pm-primary-index">'+(i+1)+'</div><div class="pm-primary-text'+ec+'">'+escapeHtml(t)+'</div><div class="pm-primary-meta">'+x.finalWordCount+' / 144 '+translate('paragraphMachine.words','کلمه')+' · '+x.finalCharCount+' / 900 '+translate('paragraphMachine.chars','حرف')+'</div></article>'}).join('');
}
async function evaluateReference(){
 const raw=elements.input.value;
 if(!raw.trim())throw new Error(translate('paragraphMachine.empty','متنی وارد نشده است.'));
 return [await window.ParagraphWorkspaceAdapter.evaluateText(raw,getLanguage())];
}
async function generateExperience(){
 const lang=getLanguage();
 const generated=await window.ParagraphWorkspaceAdapter.generateParagraphs(1,'mixed',lang);
 const evaluated=await Promise.all(generated.map(p=>window.ParagraphWorkspaceAdapter.evaluateText(p.text,lang)));
 return generated.map((p,i)=>({...p,judgment:evaluated[i].judgment,displayedText:p.text}));
}
function closeJudgmentPopover({restoreFocus=false}={}){
 elements.choices.forEach(choice=>choice.setAttribute('aria-expanded','false'));
 elements.popover.hidden=true;elements.popover.replaceChildren();
 if(restoreFocus&&judgmentReturnFocus?.isConnected)judgmentReturnFocus.focus({preventScroll:true});
 judgmentReturnFocus=null;
}
function evaluateRecognitionJudgments(){
 const missing=DOMAIN_ORDER.filter(d=>!userJudgments[d]);
 if(missing.length)throw new Error(translate('paragraphMachine.judgeAll','برای هر پنج قلمرو یک قضاوت انتخاب کنید.'));
 currentResults.forEach(p=>{p.userEvaluation=DOMAIN_ORDER.every(d=>userJudgments[d]===p.judgment?.[d]?.status)?'correct':'incorrect'});
 renderPrimaryParagraphs(currentResults);
 elements.source.textContent=translate(currentResults.every(p=>p.userEvaluation==='correct')?'paragraphMachine.recognitionCorrect':'paragraphMachine.recognitionIncorrect',currentResults.every(p=>p.userEvaluation==='correct'?'قضاوت شما با داوری ماشین منطبق است.':'قضاوت شما با داوری ماشین منطبق نیست.'));
}
function openJudgmentPopover(button){
 if(entryMode===ENTRY_MODES.REFERENCE)return;
 if(!elements.popover.hidden)closeJudgmentPopover();
 judgmentReturnFocus=button;
 const d=button.dataset.domain,name=button.querySelector('span')?.textContent||'';
 elements.choices.forEach(choice=>choice.setAttribute('aria-expanded',String(choice===button)));
 elements.popover.className='pm-judgment-popover pm-domain-'+d;
 elements.popover.innerHTML='<strong>'+escapeHtml(name)+'</strong><div class="pm-judgment-options">'+STATUS_OPTIONS.map(([v,l])=>'<button type="button" data-status="'+v+'" class="pm-choice-'+v+'">'+l+'</button>').join('')+'</div>';
 elements.popover.hidden=false;
 elements.popover.querySelectorAll('[data-status]').forEach(o=>o.addEventListener('click',()=>{userJudgments[d]=o.dataset.status;button.dataset.judgment=o.dataset.status;button.classList.remove('judgment-ok','judgment-warn','judgment-bad');button.classList.add('judgment-'+o.dataset.status);closeJudgmentPopover({restoreFocus:true});updateActionState()}));
 elements.popover.querySelector('[data-status]')?.focus({preventScroll:true});
}
async function run(){
 elements.error.textContent='';
 if(entryMode===ENTRY_MODES.REFERENCE)elements.input.classList.remove('pm-user-correct','pm-user-incorrect');
 try{
  if(entryMode===ENTRY_MODES.EXPERIENCE){
   if(!recognitionReady())return;
   evaluateRecognitionJudgments();saveSettingsAfterSuccess();
  }else{
   if(!equivalenceReady())return;
   const result=await evaluateReference();
   currentResults=result;
   const correct=DOMAIN_ORDER.every(d=>result[0].judgment?.[d]?.status===userJudgments[d]);
   elements.input.classList.add(correct?'pm-user-correct':'pm-user-incorrect');
   elements.source.textContent=translate(correct?'paragraphMachine.equivalenceCorrect':'paragraphMachine.equivalenceIncorrect',correct?'نوشتار شما با مجموعه داوری نمایش‌داده‌شده هم‌سنگ است.':'نوشتار شما با مجموعه داوری نمایش‌داده‌شده هم‌سنگ نیست.');
   saveSettingsAfterSuccess();
  }
 }catch(e){elements.error.textContent=e.message||String(e)}
 finally{updateActionState()}
}
elements.action.addEventListener('click',run);
elements.choices.forEach(c=>c.addEventListener('click',e=>{e.stopPropagation();if(entryMode===ENTRY_MODES.EXPERIENCE)openJudgmentPopover(c)}));
elements.input.addEventListener('input',()=>{if(entryMode===ENTRY_MODES.REFERENCE){elements.input.classList.remove('pm-user-correct','pm-user-incorrect');updateActionState()}});
document.addEventListener('click',e=>{if(elements.popover.hidden)return;if(!elements.popover.contains(e.target)&&!e.target.closest('.pm-realm-choice'))closeJudgmentPopover({restoreFocus:true})});
document.addEventListener('keydown',e=>{
 if(elements.popover.hidden)return;
 if(e.key==='Escape'){e.preventDefault();closeJudgmentPopover({restoreFocus:true});return}
 if(e.key==='Tab'){
  const controls=[...elements.popover.querySelectorAll('button:not([disabled])')];if(!controls.length)return;
  const first=controls[0],last=controls[controls.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
document.getElementById('paragraph-close').addEventListener('click',()=>window.SitePages?.closeParagraph?.());
document.addEventListener('site:languagechange',()=>{updateDirection();updateRealmLabels();if(elements.page.classList.contains('open')){elements.action.textContent=getActionLabel(entryMode);elements.source.textContent=getSourceLabel(entryMode)}});
loadSettings();updateRealmLabels();document.dispatchEvent(new CustomEvent('paragraph:settings-sync'));
window.ParagraphPage=Object.freeze({open:openParagraphPage,close:closeParagraphPage});
})();
