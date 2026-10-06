/* UI adapter for the shared paragraph workspace. */
(() => {
'use strict';
const ENTRY_MODES=Object.freeze({REFERENCE:'reference',EXPERIENCE:'experience'});
const DOMAIN_ORDER=Object.freeze(['S','T','E','R','C']);
const STATUS_OPTIONS=Object.freeze([['ok','مطابق'],['warn','مبهم'],['bad','متناقض']]);
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
const userJudgments=Object.create(null);
function getLanguage(){return window.SiteI18n?.getLanguage?.()||'fa'}
function translate(k,f){return window.SiteI18n?.get?.(k,f)||f}
function renderHistoryList(id,values){
 const list=document.getElementById(id);
 if(!list)return;
 list.replaceChildren(...(Array.isArray(values)?values:[]).map(value=>{
   const option=document.createElement('option');
   option.value=value;
   return option;
 }));
}
function loadSettings(){
 const s=window.ParagraphLLM.getSettings();
 elements.key.value=s.apiKey;
 elements.base.value=s.baseUrl;
 elements.model.value=s.model;
}
function saveSettingsAfterSuccess(){
 window.ParagraphLLM.saveSettings({
   apiKey:elements.key.value.trim(),
   baseUrl:elements.base.value.trim(),
   model:elements.model.value.trim()
 });
 loadSettings();
}
function updateDirection(){elements.input.dir=['fa','ar'].includes(getLanguage())?'rtl':'ltr'}
function escapeHtml(v){return String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function getActionLabel(m){return m===ENTRY_MODES.REFERENCE?translate('paragraphMachine.equivalence','هم‌سنگی'):translate('paragraphMachine.recognize','بازشناسی')}
function getSourceLabel(m){return m===ENTRY_MODES.REFERENCE?translate('paragraphMachine.referenceSource','متن کاربر → ترجمه به فارسی → سنجش'):translate('paragraphMachine.experienceSource','تولید فارسی → سنجش → ترجمه به زبان سایت')}
function clearRealmState(){elements.choices.forEach(c=>{c.classList.remove('judgment-ok','judgment-warn','judgment-bad','realm-output');delete c.dataset.judgment;c.removeAttribute('aria-pressed')})}
function generateRandomTargetJudgments(){clearRealmState();DOMAIN_ORDER.forEach(d=>{userJudgments[d]=STATUS_OPTIONS[Math.floor(Math.random()*STATUS_OPTIONS.length)][0]});elements.choices.forEach(c=>{const d=c.dataset.domain;c.dataset.target=userJudgments[d];c.classList.add('judgment-'+userJudgments[d],'realm-output');c.setAttribute('aria-pressed','true')})}
function recognitionReady(){return entryMode===ENTRY_MODES.EXPERIENCE&&currentResults.length===1&&DOMAIN_ORDER.every(d=>Boolean(userJudgments[d]))}
function equivalenceReady(){const raw=elements.input.value.trim();if(!raw)return false;return window.ParagraphMachineCore.countWords(raw)<=144&&window.ParagraphMachineCore.countChars(raw)<=900&&window.ParagraphMachineCore.findLongWords(raw).length===0}
function updateActionState(){const ready=entryMode===ENTRY_MODES.EXPERIENCE?recognitionReady():equivalenceReady();elements.action.disabled=!ready;elements.action.classList.toggle('is-enabled',ready)}
async function generateRecognitionParagraph(){try{elements.primaryOutput.innerHTML='<div class="pm-loading">'+translate('paragraphMachine.processing','در حال پردازش...')+'</div>';currentResults=await generateExperience();renderPrimaryParagraphs(currentResults);elements.source.textContent=translate('paragraphMachine.judgmentReady','پاراگراف آماده قضاوت پنج‌قلمرویی است.');updateActionState()}catch(e){elements.error.textContent=e.message||String(e)}}
function setRealmOutputState(p){const j=p?.judgment||{};elements.choices.forEach(c=>{const s=j[c.dataset.domain]?.status||'';c.classList.remove('judgment-ok','judgment-warn','judgment-bad');c.classList.toggle('realm-output',!!s);c.dataset.judgment=s;if(s)c.classList.add('judgment-'+s);c.setAttribute('aria-pressed',String(!!s))})}
function openParagraphPage(kind){
 entryMode=kind;elements.page.classList.add('open');elements.page.dataset.entry=kind;
 const ref=kind===ENTRY_MODES.REFERENCE;
 elements.primaryPanel.classList.toggle('is-input-mode',ref);elements.primaryPanel.classList.toggle('is-output-mode',!ref);
 elements.input.hidden=!ref;elements.primaryOutput.hidden=ref;
  elements.action.textContent=getActionLabel(kind);elements.action.classList.toggle('pm-action-reference',ref);elements.action.classList.toggle('pm-action-recognition',!ref);
 elements.source.textContent=getSourceLabel(kind);elements.input.value='';elements.primaryOutput.replaceChildren();elements.output.replaceChildren();elements.error.textContent='';
 currentResults=[];DOMAIN_ORDER.forEach(d=>delete userJudgments[d]);clearRealmState();closeJudgmentPopover();
 elements.choices.forEach(c=>{c.classList.toggle('is-judgment-input',!ref);c.classList.toggle('is-result-output',ref)});
 loadSettings();updateDirection();if(ref){generateRandomTargetJudgments()}else{DOMAIN_ORDER.forEach(d=>delete userJudgments[d]);clearRealmState();generateRecognitionParagraph()}updateActionState();
}
function closeParagraphPage(){elements.page.classList.remove('open')}
function renderPrimaryParagraphs(results){elements.primaryOutput.innerHTML=results.map((p,i)=>{const x=window.ParagraphMachineCore.processText(p.text),t=p.displayedText||x.text,e=p.userEvaluation||'',ec=e?' pm-user-'+e:'';return '<article class="pm-primary-card"><div class="pm-primary-index">'+(i+1)+'</div><div class="pm-primary-text'+ec+'">'+escapeHtml(t)+'</div><div class="pm-primary-meta">'+x.finalWordCount+' / 144 '+translate('paragraphMachine.words','کلمه')+' · '+x.finalCharCount+' / 900 '+translate('paragraphMachine.chars','حرف')+'</div></article>'}).join('')}
async function evaluateReference(){const raw=elements.input.value.trim();if(!raw)throw new Error(translate('paragraphMachine.empty','متنی وارد نشده است.'));const l=getLanguage(),ptext=await window.ParagraphTranslation.toPersian(raw,l),p=await window.ParagraphWorkspaceAdapter.evaluatePersian(ptext);p.displayedText=l==='fa'?p.text:await window.ParagraphTranslation.fromPersian(p.text,l);return[p]}
async function generateExperience(){const r=await window.ParagraphWorkspaceAdapter.generatePersian(1,'mixed'),l=getLanguage(),t=l==='fa'?r.map(p=>p.text):await window.ParagraphTranslation.fromPersianBatch(r.map(p=>p.text),l);r.forEach((p,i)=>p.displayedText=t[i]);return r}
function closeJudgmentPopover(){elements.popover.hidden=true;elements.popover.replaceChildren()}
function evaluateRecognitionJudgments(){const missing=DOMAIN_ORDER.filter(d=>!userJudgments[d]);if(missing.length)throw new Error(translate('paragraphMachine.judgeAll','برای هر پنج قلمرو یک قضاوت انتخاب کنید.'));currentResults.forEach(p=>{p.userEvaluation=DOMAIN_ORDER.every(d=>userJudgments[d]===p.judgment?.[d]?.status)?'correct':'incorrect'});renderPrimaryParagraphs(currentResults);elements.source.textContent=translate(currentResults.every(p=>p.userEvaluation==='correct')?'paragraphMachine.recognitionCorrect':'paragraphMachine.recognitionIncorrect',currentResults.every(p=>p.userEvaluation==='correct')?'قضاوت شما با داوری ماشین منطبق است.':'قضاوت شما با داوری ماشین منطبق نیست.')}

function openJudgmentPopover(button){
 if(entryMode===ENTRY_MODES.REFERENCE)return;
 const d=button.dataset.domain,name=button.querySelector('span')?.textContent||'';
 elements.popover.className='pm-judgment-popover pm-domain-'+d;
 elements.popover.innerHTML='<strong>'+escapeHtml(name)+'</strong><div class="pm-judgment-options">'+STATUS_OPTIONS.map(([v,l])=>'<button type="button" data-status="'+v+'" class="pm-choice-'+v+'">'+l+'</button>').join('')+'</div>';
 elements.popover.hidden=false;
 elements.popover.querySelectorAll('[data-status]').forEach(o=>o.addEventListener('click',()=>{userJudgments[d]=o.dataset.status;button.dataset.judgment=o.dataset.status;button.classList.remove('judgment-ok','judgment-warn','judgment-bad');button.classList.add('judgment-'+o.dataset.status);closeJudgmentPopover()}))
}
async function run(){
 elements.error.textContent='';
 try{
  if(entryMode===ENTRY_MODES.EXPERIENCE){
   if(!recognitionReady())return;
   evaluateRecognitionJudgments();
   saveSettingsAfterSuccess();
  }else{
   if(!equivalenceReady())return;
   currentResults=await evaluateReference();
   const correct=DOMAIN_ORDER.every(d=>currentResults[0].judgment?.[d]?.status===userJudgments[d]);
   elements.input.classList.remove('pm-user-correct','pm-user-incorrect');
   elements.input.classList.add(correct?'pm-user-correct':'pm-user-incorrect');
   elements.source.textContent=translate(correct?'paragraphMachine.equivalenceCorrect':'paragraphMachine.equivalenceIncorrect',correct?'نوشتار شما با مجموعه داوری نمایش‌داده‌شده هم‌سنگ است.':'نوشتار شما با مجموعه داوری نمایش‌داده‌شده هم‌سنگ نیست.');
   saveSettingsAfterSuccess();
  }
 }catch(e){elements.error.textContent=e.message||String(e)}
 finally{updateActionState()}
}
elements.action.addEventListener('click',run);
elements.choices.forEach(c=>c.addEventListener('click',e=>{e.stopPropagation();if(entryMode===ENTRY_MODES.EXPERIENCE)openJudgmentPopover(c)}));
elements.input.addEventListener('input',()=>{if(entryMode===ENTRY_MODES.REFERENCE)updateActionState()});
document.addEventListener('click',e=>{if(elements.popover.hidden)return;if(!elements.popover.contains(e.target)&&!e.target.closest('.pm-realm-choice'))closeJudgmentPopover()});
document.getElementById('paragraph-close').addEventListener('click',()=>window.SitePages?.closeParagraph?.());
document.addEventListener('site:languagechange',()=>{updateDirection();if(elements.page.classList.contains('open'))elements.action.textContent=getActionLabel(entryMode)});
loadSettings();
document.dispatchEvent(new CustomEvent('paragraph:settings-sync'));
window.ParagraphPage=Object.freeze({open:openParagraphPage,close:closeParagraphPage});
})();
