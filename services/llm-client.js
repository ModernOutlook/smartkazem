/* Provider-agnostic OpenAI-compatible client. API key remains local to this browser. */
(function(){'use strict';
const DEFAULTS={baseUrl:'https://openrouter.ai/api/v1',model:'google/gemma-4-26b-a4b-it:free'};
const REQUEST_TIMEOUT_MS=30000;
const RETRYABLE=new Set([408,425,429,500,502,503,504]);
function normalizeBaseUrl(value){
  const raw=String(value||DEFAULTS.baseUrl).trim().replace(/\/+$/,'');
  let url;
  try{url=new URL(raw)}catch(_){throw new Error('نشانی سرویس مدل نامعتبر است.')}
  if(url.protocol!=='https:')throw new Error('نشانی سرویس مدل باید HTTPS باشد.');
  if(url.username||url.password)throw new Error('نشانی سرویس مدل نباید شامل نام کاربری یا گذرواژه باشد.');
  return url.href.replace(/\/+$/,'');
}
function getSettings(){try{return{baseUrl:normalizeBaseUrl(localStorage.getItem('pgm_baseUrl')||DEFAULTS.baseUrl),model:localStorage.getItem('pgm_model')||DEFAULTS.model,apiKey:localStorage.getItem('pgm_apiKey')||''}}catch(_){return{...DEFAULTS,apiKey:''}}}
function saveSettings(s){
  const baseUrl=normalizeBaseUrl(s.baseUrl||DEFAULTS.baseUrl),model=String(s.model||DEFAULTS.model).trim();
  try{localStorage.setItem('pgm_baseUrl',baseUrl);localStorage.setItem('pgm_model',model);if(s.apiKey)localStorage.setItem('pgm_apiKey',String(s.apiKey).trim());else localStorage.removeItem('pgm_apiKey')}catch(_){}
}
async function request(url,init){
  let lastStatus=0;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const res=await fetch(url,{...init,signal:controller.signal});lastStatus=res.status;
      if(res.ok)return res;
      if(!RETRYABLE.has(res.status)||attempt===2){
        let detail='';try{detail=(await res.text()).slice(0,240)}catch(_){}
        throw new Error('خطای سرویس مدل ('+res.status+'): '+(detail||'پاسخ نامشخص'));
      }
    }catch(e){
      if(e?.name==='AbortError'){if(attempt===2)throw new Error('مهلت اتصال به سرویس مدل به پایان رسید.');}
      else if(!RETRYABLE.has(lastStatus)||attempt===2)throw e;
    }finally{clearTimeout(timer)}
    await new Promise(r=>setTimeout(r,700*(attempt+1)));
  }
  throw new Error('اتصال به سرویس مدل ناموفق بود.');
}
async function complete(messages,options={}){
  const s={...getSettings(),...options};if(!s.apiKey)throw new Error('کلید اتصال به مدل تنظیم نشده است.');
  const model=String(s.model||DEFAULTS.model).trim();
  const payload={model,messages,temperature:options.temperature??0.7,response_format:{type:'json_object'}};
  if(/^https:\/\/(?:www\.)?openrouter\.ai(?:\/|$)/i.test(normalizeBaseUrl(s.baseUrl))&&model!=='openrouter/free')payload.models=[model,'openrouter/free'];
  const res=await request(normalizeBaseUrl(s.baseUrl)+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify(payload)});
  let data;try{data=await res.json()}catch(_){throw new Error('پاسخ سرویس مدل JSON معتبر نیست.')}
  const content=data?.choices?.[0]?.message?.content;if(!content)throw new Error('پاسخ مدل خالی است.');
  try{return JSON.parse(String(content).replace(/^\`\`\`json\s*/,'').replace(/\`\`\`$/,'').trim())}catch(_){throw new Error('مدل پاسخ JSON معتبر برنگرداند.')}
}
window.ParagraphLLM=Object.freeze({DEFAULTS,REQUEST_TIMEOUT_MS,getSettings,saveSettings,complete});
})();