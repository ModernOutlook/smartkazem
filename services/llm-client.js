/* Provider-agnostic OpenAI-compatible client. API key remains local to this browser. */
(function(){'use strict';
const DEFAULTS = Object.freeze({
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'google/gemma-4-26b-a4b-it:free'
});
const REQUEST_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 700;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULTS.baseUrl).trim().replace(/\/+$/, '');
  let url;

  try {
    url = new URL(raw);
  } catch (_) {
    throw new Error('نشانی سرویس مدل نامعتبر است.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('نشانی سرویس مدل باید HTTPS باشد.');
  }

  if (url.username || url.password) {
    throw new Error('نشانی سرویس مدل نباید شامل نام کاربری یا گذرواژه باشد.');
  }

  return url.href.replace(/\/+$/, '');
}

function getSettings(){try{return{baseUrl:normalizeBaseUrl(localStorage.getItem('pgm_baseUrl')||DEFAULTS.baseUrl),model:localStorage.getItem('pgm_model')||DEFAULTS.model,apiKey:localStorage.getItem('pgm_apiKey')||''}}catch(_){return{...DEFAULTS,apiKey:''}}}
function saveSettings(settings) {
  const baseUrl = normalizeBaseUrl(settings.baseUrl || DEFAULTS.baseUrl);
  const model = String(settings.model || DEFAULTS.model).trim();

  try {
    localStorage.setItem('pgm_baseUrl', baseUrl);
    localStorage.setItem('pgm_model', model);

    if (settings.apiKey) {
      localStorage.setItem('pgm_apiKey', String(settings.apiKey).trim());
    } else {
      localStorage.removeItem('pgm_apiKey');
    }
  } catch (_) {}
}

async function request(url, init) {
  let lastStatus = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      lastStatus = response.status;

      if (response.ok) return response;

      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS - 1) {
        let detail = '';
        try { detail = (await response.text()).slice(0, 240); } catch (_) {}
        throw new Error(
          'خطای سرویس مدل (' + response.status + '): ' +
          (detail || 'پاسخ نامشخص')
        );
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        if (attempt === MAX_ATTEMPTS - 1) {
          throw new Error('مهلت اتصال به سرویس مدل به پایان رسید.');
        }
      } else if (!RETRYABLE_STATUSES.has(lastStatus) || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
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