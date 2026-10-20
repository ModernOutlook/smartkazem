/* Paragraph Machine · Network Handshake controller */
(() => {'use strict';
const panel=document.getElementById('paragraph-connection');if(!panel||!window.ParagraphLLM)return;
const key=document.getElementById('paragraph-api-key'),keyWrap=key?.closest('.pc-input-wrap'),proxyUrl=document.getElementById('paragraph-proxy-url'),proxyWrap=document.getElementById('paragraph-proxy-url-wrap'),base=document.getElementById('paragraph-base-url'),model=document.getElementById('paragraph-model'),connect=document.getElementById('paragraph-connect'),toggle=document.getElementById('paragraph-key-toggle'),status=document.getElementById('paragraph-connection-status'),modeButtons=[...panel.querySelectorAll('[data-connection-mode]')];
function state(s){panel.dataset.state=s;status.textContent=s}
function sync(){const s=window.ParagraphLLM.getSettings();key.value=s.apiKey||'';proxyUrl.value=s.proxyUrl||'';base.value=s.baseUrl||'';model.value=s.model||''}
function setMode(mode){
  window.ParagraphLLM.setConnectionMode?.(mode);
  modeButtons.forEach(b=>b.classList.toggle('active',b.dataset.connectionMode===mode));
  const proxy=mode==='proxy';
  proxyWrap?.classList.toggle('is-active',proxy);
  key.disabled=proxy;
  keyWrap?.classList.toggle('is-disabled',proxy);
  keyWrap?.classList.toggle('is-hidden',proxy);
  if(proxy)key.value='';
}
toggle?.addEventListener('click',()=>{key.type=key.type==='password'?'text':'password';toggle.setAttribute('aria-pressed',String(key.type==='text'))});
modeButtons.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.connectionMode)));
connect?.addEventListener('click',async()=>{state('validating');connect.disabled=true;const startedAt=performance.now();try{const mode=window.ParagraphLLM.getConnectionMode?.()||'direct';const r=await window.ParagraphLLM.checkConnection({apiKey:key.value.trim(),baseUrl:base.value.trim(),model:model.value.trim(),proxyUrl:proxyUrl.value.trim()});if(!r.ok){state('error');return}const handshakeMs=Math.max(0,Math.round(performance.now()-startedAt));window.ParagraphLLM.saveSettings({apiKey:mode==='proxy'?'':key.value.trim(),baseUrl:base.value.trim(),model:model.value.trim(),proxyUrl:proxyUrl.value.trim()});state('connected');const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;window.GoldChargeMechanism?.registerFromParagraphMachine?.({handshakeMs,effectiveType:connection?.effectiveType||'unknown',rttMs:Number.isFinite(connection?.rtt)?connection.rtt:null,downlinkMbps:Number.isFinite(connection?.downlink)?connection.downlink:null,online:navigator.onLine!==false,model:r.model||model.value.trim()});document.dispatchEvent(new CustomEvent('paragraph:mechanism-registered',{detail:{mechanism:'gold-jewel-evolution',maxCharge:3600,stages:72,handshakeMs}}))}catch(_){state('error')}finally{connect.disabled=false}});
document.addEventListener('paragraph:settings-sync',sync);sync();setMode(window.ParagraphLLM.getConnectionMode?.()||'direct');state('idle');window.ParagraphConnection=Object.freeze({sync,state});
})();