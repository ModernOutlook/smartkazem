/* Provider-agnostic OpenAI-compatible client. API credentials remain in runtime memory only. */
(function(){'use strict';

const DEFAULTS = Object.freeze({
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'google/gemma-4-26b-a4b-it:free'
});

const PRESET_CONNECTIONS = Object.freeze([
  {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-26b-a4b-it:free',
    label: 'Google Gemma 4 26B A4B'
  },
  {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-31b-it:free',
    label: 'Google Gemma 4 31B'
  },
  {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'qwen/qwen3.8-27b:free',
    label: 'Qwen 3.8 27B'
  }
]);

const HISTORY_KEYS = Object.freeze({
  baseUrl: 'pgm_baseUrl_history',
  model: 'pgm_model_history'
});
const CONNECTION_MODE_KEY = 'pgm_connection_mode';
const PROXY_URL_KEY = 'pgm_proxy_url';
const DEFAULT_PROXY_URL = '';
let runtimeApiKey = '';
let connectionMode = 'direct';
const MAX_HISTORY = 12;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 700;
const RETRYABLE_STATUSES = new Set([408,425,429,500,502,503,504]);

function normalizeOptionalProxyUrl(value) {
  const raw=String(value||'').trim();
  if(!raw)return '';
  return normalizeBaseUrl(raw);
}

function normalizeBaseUrl(value) {
  const raw=String(value||DEFAULTS.baseUrl).trim().replace(/\/+$/,'');
  let url;
  try { url=new URL(raw); } catch (_) { throw new Error('نشانی سرویس مدل نامعتبر است.'); }
  if(url.protocol!=='https:') throw new Error('نشانی سرویس مدل باید HTTPS باشد.');
  if(url.username||url.password) throw new Error('نشانی سرویس مدل نباید شامل نام کاربری یا گذرواژه باشد.');
  return url.href.replace(/\/+$/,'');
}

function readHistory(key){
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(parsed)?parsed.filter(v=>typeof v==='string'&&v.trim()).slice(0,MAX_HISTORY):[];
  }catch(_){return []}
}

function writeHistory(key,values){
  try{localStorage.setItem(key,JSON.stringify(values.slice(0,MAX_HISTORY)))}catch(_){}
}

function rememberValue(key,value){
  const v=String(value||'').trim();
  if(!v)return;
  const history=readHistory(key).filter(item=>item!==v);
  history.unshift(v);
  writeHistory(key,history);
}

function ensurePresetHistory(){
  const baseHistory=readHistory(HISTORY_KEYS.baseUrl);
  const modelHistory=readHistory(HISTORY_KEYS.model);
  PRESET_CONNECTIONS.slice().reverse().forEach(p=>{
    const base=normalizeBaseUrl(p.baseUrl);
    const model=String(p.model).trim();
    if(!baseHistory.includes(base))baseHistory.push(base);
    if(!modelHistory.includes(model))modelHistory.push(model);
  });
  writeHistory(HISTORY_KEYS.baseUrl,baseHistory);
  writeHistory(HISTORY_KEYS.model,modelHistory);
}

function getSettings(){
  ensurePresetHistory();
  try{
    return {
      baseUrl:normalizeBaseUrl(localStorage.getItem('pgm_baseUrl')||DEFAULTS.baseUrl),
      model:localStorage.getItem('pgm_model')||DEFAULTS.model,
      proxyUrl:normalizeOptionalProxyUrl(localStorage.getItem(PROXY_URL_KEY)||DEFAULT_PROXY_URL),
      apiKey:runtimeApiKey,
      history:{
        baseUrl:readHistory(HISTORY_KEYS.baseUrl),
        model:readHistory(HISTORY_KEYS.model)
      }
    };
  }catch(_){
    return {
      ...DEFAULTS,
      apiKey:runtimeApiKey,
      proxyUrl:'',
      history:{baseUrl:[DEFAULTS.baseUrl],model:[DEFAULTS.model]}
    };
  }
}

function saveSettings(settings){
  const baseUrl=normalizeBaseUrl(settings.baseUrl||DEFAULTS.baseUrl);
  const model=String(settings.model||DEFAULTS.model).trim();
  const apiKey=String(settings.apiKey||'').trim();
  const proxyUrl=normalizeOptionalProxyUrl(settings.proxyUrl||'');

  try{
    localStorage.setItem('pgm_baseUrl',baseUrl);
    localStorage.setItem('pgm_model',model);
    localStorage.setItem(PROXY_URL_KEY,proxyUrl);
    runtimeApiKey=apiKey;
  }catch(_){}

  rememberValue(HISTORY_KEYS.baseUrl,baseUrl);
  rememberValue(HISTORY_KEYS.model,model);
  runtimeApiKey=apiKey;
}

async function request(url,init){
  let lastStatus=0;
  for(let attempt=0;attempt<MAX_ATTEMPTS;attempt+=1){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(url,{...init,signal:controller.signal});
      lastStatus=response.status;
      if(response.ok)return response;
      if(!RETRYABLE_STATUSES.has(response.status)||attempt===MAX_ATTEMPTS-1){
        let detail='';
        try{detail=(await response.text()).slice(0,240)}catch(_){}
        throw new Error('خطای سرویس مدل ('+response.status+'): '+(detail||'پاسخ نامشخص'));
      }
    }catch(error){
      if(error?.name==='AbortError'){
        if(attempt===MAX_ATTEMPTS-1)throw new Error('مهلت اتصال به سرویس مدل به پایان رسید.');
      }else if(!RETRYABLE_STATUSES.has(lastStatus)||attempt===MAX_ATTEMPTS-1){
        throw error;
      }
    }finally{clearTimeout(timer)}
    await new Promise(resolve=>setTimeout(resolve,RETRY_DELAY_MS*(attempt+1)));
  }
  throw new Error('اتصال به سرویس مدل ناموفق بود.');
}

async function complete(messages,options={}){
  const s={...getSettings(),...options};
  if(!s.apiKey)throw new Error('کلید اتصال به مدل تنظیم نشده است.');
  const model=String(s.model||DEFAULTS.model).trim();
  const proxy = getConnectionMode()==='proxy';
  const endpoint = proxy ? normalizeOptionalProxyUrl(s.proxyUrl||'') : normalizeBaseUrl(s.baseUrl);
  if(proxy && !endpoint)throw new Error('نشانی پروکسی تنظیم نشده است.');
  const payload={model,messages,temperature:options.temperature??0.7,response_format:{type:'json_object'}};
  if(/^https:\/\/(?:www\.)?openrouter\.ai(?:\/|$)/i.test(normalizeBaseUrl(s.baseUrl))&&model!=='openrouter/free'){
    payload.models=[model,'openrouter/free'];
  }
  const res=await request(
    endpoint+'/chat/completions',
    {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify(payload)}
  );
  let data;
  try{data=await res.json()}catch(_){throw new Error('پاسخ سرویس مدل JSON معتبر نیست.')}
  const content=data?.choices?.[0]?.message?.content;
  if(!content)throw new Error('پاسخ مدل خالی است.');
  try{
    return JSON.parse(String(content).replace(/^\`\`\`json\s*/,'').replace(/\`\`\`$/,'').trim());
  }catch(_){throw new Error('مدل پاسخ JSON معتبر برنگرداند.')}
}

async function checkConnection(settings={}){
  const mode=getConnectionMode();
  const apiKey=String(settings.apiKey||runtimeApiKey).trim();
  const model=String(settings.model||DEFAULTS.model).trim();
  const endpoint=mode==='proxy' ? normalizeOptionalProxyUrl(settings.proxyUrl||'') : normalizeBaseUrl(settings.baseUrl||DEFAULTS.baseUrl);
  if(!endpoint)return {ok:false,variant:'network_failed'};
  if(mode==='direct' && !apiKey)return {ok:false,variant:'auth_failed'};
  try{
    const res=await request(mode==='proxy'?endpoint+'/health':endpoint+'/models',{method:'GET',headers:mode==='proxy'?{}:{Authorization:'Bearer '+apiKey}});
    return {ok:res.ok,variant:res.ok?'connected':'network_failed',model};
  }catch(error){
    if(/HTTPS|نشانی/.test(error.message||''))return {ok:false,variant:'insecure_transport'};
    if(/401|403/.test(error.message||''))return {ok:false,variant:'auth_failed'};
    return {ok:false,variant:'network_failed'};
  }
}
function setConnectionMode(mode){connectionMode=mode==='proxy'?'proxy':'direct';try{localStorage.setItem(CONNECTION_MODE_KEY,connectionMode)}catch(_){} }
function getConnectionMode(){try{return localStorage.getItem(CONNECTION_MODE_KEY)==='proxy'?'proxy':connectionMode}catch(_){return connectionMode}}
window.ParagraphLLM=Object.freeze({
  DEFAULTS,
  PRESET_CONNECTIONS,
  REQUEST_TIMEOUT_MS,
  getSettings,
  saveSettings,
  checkConnection,
  setConnectionMode,
  getConnectionMode,
  DEFAULT_PROXY_URL,
  complete
});
})();