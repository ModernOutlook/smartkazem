/* Paragraph Machine Core — internal language: Persian */
(function(){'use strict';
const MAX_WORDS = 144;
const MAX_WORD_LENGTH = 34;
const MAX_CHARS = 900;
const DOMAIN_ORDER = ['S', 'T', 'E', 'R', 'C'];
const DOMAIN_NAMES={S:'ساختار تالار',T:'تداوم عالم',E:'قلمرو تجربه',R:'مرجع تقلید',C:'اقتصاد سهم'};
const STATUS_LABELS={ok:'منطبق',warn:'مبهم',bad:'متناقض'};
const SYSTEM_PROMPT="تو یک ماشین تولید و سنجش پاراگراف هستی. وظیفه‌ات این است:\n\n ۱. بر اساس «رساله فلسفی نگرش نوین» که در ادامه می‌آید، پاراگراف‌هایی غیرتکرار، مستقل از هم تولید کنی.\n\n ۲. هر پاراگراف را با ماتریس داوری در ۵ قلمرو ارزیابی کنی.\n\n ## محدودیت‌های سخت (اجباری)\n\n - هر پاراگراف حداکثر 144 کلمه باشد.\n\n - هیچ کلمه‌ای در متن پاراگراف نباید بیش از 34 حرف داشته باشد.\n\n - مجموع طول متن هر پاراگراف (با احتساب فاصله‌ها) حداکثر 900 حرف باشد.\n\n - این سه محدودیت بر محتوا اولویت دارند. اگر لازم شد، محتوا را فشرده کن.\n\n ## رساله فلسفی نگرش نوین (خلاصه‌ی قواعد)\n\n اصول مشترک (M):\n\n - M1: اصالت رابطه بر شیء\n\n - M2: قانون تراکم متناسب (نشانگر ↔ نزدیکی واقعی)\n\n - M3: دوگانگی energeia/entelecheia (حضور در فرایند + محاسبه در پایان)\n\n ۱. ساختار تالار (S):\n\n - S1: تفکیک آغاز/پایان/مرکز\n\n - S2: مرکز = تقارن آغاز و پایان\n\n - S3: شتاب ∝ زاویه با محور آغاز→پایان\n\n - S4: واگرایی → رکود در فقدان (نه نیستی)\n\n ۲. تداوم عالم (T):\n\n - T1: وحدت ظرفیت، کثرت تحقق\n\n - T2: هر رویداد فضای امکان را تنگ‌تر می‌کند\n\n - T3: یقین نسبت به کل = حد، نه مالکیت\n\n - T4: جزء و کل: دور هرمنوتیکی\n\n ۳. قلمرو تجربه (E):\n\n - E1: تعادل = تقارن پویا (نه سکون)\n\n - E2: گذار نیازمند نقطه‌ی عطف\n\n - E3: برهم‌نهی: مطلق با مطلق، نسبی با نسبی\n\n - E4: شادی ≡ هم‌راستایی اراده ≡ دقت تفسیری\n\n - E5: راز/برهنگی مطلق = نقض گرادیان\n\n - E6: حقیقت ≠ واقعیت\n\n ۴. مرجع تقلید / اقتدار شبیه‌سازی (R):\n\n - R1: افق شبیه‌ساز محدود به چشم‌انداز مرجع\n\n - R2: مشروعیت اقتدار = همگرایی مرجع به کانون\n\n - R3: اصالت بر اساس هم‌راستایی، نه منشأ\n\n - R4: تکامل = تغییر قواعد تولیدکننده‌ی گزینه‌ها\n\n ۵. اقتصاد سهم (C):\n\n - C1: کثرت = میدان، فردیت = سهم\n\n - C2: کمونیسم = رازِ سهم / سرمایه‌داری = برهنگیِ سهم\n\n - C3: هر گره سهم متناسب با جایگاه حقیقی\n\n - C4: فقدان اجتماعی = واگرایی، نه نابودی\n\n ## پروتکل داوری\n\n - ✅ منطبق: پاراگراف با اصل صریح قلمرو سازگار است.\n\n - ⚠️ مبهم: پاراگراف نه تأیید صریح دارد نه رد صریح، ولی مفهومش قابل انتساب به قلمرو است. (R-ADJ-1)\n\n - ❌ متناقض: پاراگراف اصل مشخصی را نقض می‌کند.\n\n - R-ADJ-2: کلمات تعلیقی («شاید»، «ممکن است») در سطح پاراگراف، ⚠️ را به کل قلمرو تعمیم می‌دهند.\n\n - R-ADJ-3: ⚠️ وقتی رخ می‌دهد که نه تأیید صریح، نه رد صریح، ولی مفهوم قابل انتساب باشد.\n\n ## فرمت خروجی (اجباری - فقط JSON معتبر، بدون markdown)\n\n {\n\n   \"paragraphs\": [\n\n     {\n\n       \"text\": \"متن پاراگراف...\",\n\n       \"judgment\": {\n\n         \"S\": {\"status\": \"ok|warn|bad\", \"reason\": \"ارجاع به شناسه\"},\n\n         \"T\": {\"status\": \"ok|warn|bad\", \"reason\": \"...\"},\n\n         \"E\": {\"status\": \"ok|warn|bad\", \"reason\": \"...\"},\n\n         \"R\": {\"status\": \"ok|warn|bad\", \"reason\": \"...\"},\n\n         \"C\": {\"status\": \"ok|warn|bad\", \"reason\": \"...\"}\n\n       }\n\n     }\n\n   ]\n\n }\n\n فقط JSON برگردان. هیچ توضیح اضافه‌ای نده.";
const MODE_INSTRUCTIONS={mixed:'ترکیبی: در هر مجموعه ترکیبی از وضعیت‌های منطبق، مبهم و متناقض ایجاد کن.', 'all-ok':'همه‌ی پاراگراف‌ها باید کاملاً منطبق با هر ۵ قلمرو باشند (همه منطبق).','all-bad':'همه‌ی پاراگراف‌ها باید کاملاً متناقض با هر ۵ قلمرو باشند ولی درونی منسجم.','all-warn':'همه‌ی پاراگراف‌ها باید در هر ۵ قلمرو مبهم باشند.','cross':'هر پاراگراف باید در چند قلمرو منطبق و در چند قلمرو متناقض باشد.'};
function normalizeText(text) {
  return String(text || '').replace(/\r\n?/g, '\n').trim();
}
function countWords(text) {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
}
function countChars(text) { return Array.from(normalizeText(text)).length; }
function wordLength(w){return Array.from(String(w||'').replace(/[.,!?;:،؛؟»«\"'()\[\]{}]/g,'')).length}
function findLongWords(text){return normalizeText(text).split(/\s+/).filter(Boolean).filter(w=>wordLength(w)>MAX_WORD_LENGTH)}
function breakLongWords(text){return normalizeText(text).split(/\s+/).filter(Boolean).map(w=>wordLength(w)<=MAX_WORD_LENGTH?w:Array.from(w).reduce((a,c,i)=>{const n=Math.floor(i/MAX_WORD_LENGTH);(a[n]??=[]).push(c);return a},[]).map(x=>x.join('')).join(' ')).join(' ')}
function enforceWordLimit(text,maxWords){const words=normalizeText(text).split(/\s+/).filter(Boolean);return words.length<=maxWords?{text:normalizeText(text),truncated:false}:{text:words.slice(0,maxWords).join(' '),truncated:true}}
function enforceCharLimit(text,maxChars){const s=normalizeText(text);if(Array.from(s).length<=maxChars)return{text:s,truncated:false};let cut=Array.from(s).slice(0,maxChars).join('');const i=cut.lastIndexOf(' ');if(i>maxChars*.7)cut=cut.slice(0,i);return{text:cut.trim(),truncated:true}}
function processText(text){const original=normalizeText(text),lw=findLongWords(original);let processed=breakLongWords(original);const wl=enforceWordLimit(processed,MAX_WORDS);processed=wl.text;const cl=enforceCharLimit(processed,MAX_CHARS);processed=cl.text;const rem=findLongWords(processed);return{text:processed,originalWordCount:countWords(original),originalCharCount:countChars(original),finalWordCount:countWords(processed),finalCharCount:countChars(processed),longWordsFound:lw,remainingLongWords:rem,truncated:wl.truncated||cl.truncated,truncatedByWord:wl.truncated,truncatedByChar:cl.truncated,violations:{wordLimit:false,charLimit:false,wordLength:rem.length>0}}}
function validateJudgment(judgment) {
  if (!judgment || typeof judgment !== 'object') throw new Error('ساختار داوری نامعتبر است.');
  for (const domain of DOMAIN_ORDER) {
    const item = judgment[domain];
    if (!item || !['ok', 'warn', 'bad'].includes(item.status)) {
      throw new Error('داوری قلمرو ' + domain + ' نامعتبر است.');
    }
    if (typeof item.reason !== 'string' || !item.reason.trim()) {
      throw new Error('دلیل داوری قلمرو ' + domain + ' نامعتبر است.');
    }
  }
  return judgment;
}
function validateResult(parsed,expectedCount){if(!parsed||!Array.isArray(parsed.paragraphs))throw new Error('ساختار پاسخ نامعتبر است.');if(Number.isInteger(expectedCount)&&parsed.paragraphs.length!==expectedCount)throw new Error('تعداد پاراگراف‌های پاسخ با درخواست برابر نیست.');return{paragraphs:parsed.paragraphs.map(p=>{if(!p||typeof p.text!=='string'||!p.text.trim())throw new Error('متن پاراگراف نامعتبر است.');return{text:processText(p.text).text,judgment:validateJudgment(p.judgment)}})}}
function buildGenerationPrompt(options = {}) {
  const count = options.count || 1;
  const mode = options.mode || 'mixed';
  const input = options.input || '';
  const task = options.task || 'generate';
  return [
    task === 'evaluate' ? 'این متن را ارزیابی کن و پاراگراف جدید تولید نکن.' : 'پاراگراف تولید کن.',
    input ? 'متن ورودی:\n' + input : '',
    'تعداد پاراگراف: ' + count,
    MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.mixed,
    'محدودیت‌ها: هر پاراگراف حداکثر ۱۴۴ کلمه، هر کلمه حداکثر ۳۴ حرف و مجموع حروف حداکثر ۹۰۰.',
    'خروجی فقط JSON معتبر با ساختار مشخص‌شده در دستور سیستم.'
  ].filter(Boolean).join('\n\n');
}
window.ParagraphMachineCore=Object.freeze({MAX_WORDS,MAX_WORD_LENGTH,MAX_CHARS,DOMAIN_NAMES,STATUS_LABELS,SYSTEM_PROMPT,MODE_INSTRUCTIONS,normalizeText,countWords,countChars,findLongWords,processText,validateResult,buildGenerationPrompt});
})();