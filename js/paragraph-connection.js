/* Paragraph Machine · Network Handshake controller */
(() => {'use strict';
const panel=document.getElementById('paragraph-connection');if(!panel||!window.ParagraphLLM)return;
const key=document.getElementById('paragraph-api-key'),base=document.getElementById('paragraph-base-url'),model=document.getElementById('paragraph-model'),connect=document.getElementById('paragraph-connect'),toggle=document.getElementById('paragraph-key-toggle'),status=document.getElementById('paragraph-connection-status'),modeButtons=[...panel.querySelectorAll('[data-connection-mode]')];
function state(s){panel.dataset.state=s;status.textContent=s}
function sync(){const s=window.ParagraphLLM.getSettings();key.value=s.apiKey||'';base.value=s.baseUrl||'';model.value=s.model||''}
function setMode(mode){window.ParagraphLLM.setConnectionMode?.(mode);modeButtons.forEach(b=>b.classList.toggle('active',b.dataset.connectionMode===mode))}
toggle?.addEventListener('click',()=>{key.type=key.type==='password'?'text':'password';toggle.setAttribute('aria-pressed',String(key.type==='text'))});
modeButtons.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.connectionMode)));
connect?.addEventListener('click',async()=>{state('validating');connect.disabled=true;try{const r=await window.ParagraphLLM.checkConnection({apiKey:key.value.trim(),baseUrl:base.value.trim(),model:model.value.trim()});if(!r.ok){state('error');return}window.ParagraphLLM.saveSettings({apiKey:key.value.trim(),baseUrl:base.value.trim(),model:model.value.trim()});state('connected')}catch(_){state('error')}finally{connect.disabled=false}});
document.addEventListener('paragraph:settings-sync',sync);sync();setMode(window.ParagraphLLM.getConnectionMode?.()||'direct');state('idle');window.ParagraphConnection=Object.freeze({sync,state});
})();