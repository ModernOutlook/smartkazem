/* Paragraph Machine Core — canonical criteria in Persian; judgments are language-local. */
(function () {
  'use strict';

  const MAX_WORDS = 144;
  const MAX_WORD_LENGTH = 34;
  const MAX_CHARS = 900;
  const DOMAIN_ORDER = ['S', 'T', 'E', 'R', 'C'];
  const DOMAIN_NAMES = Object.freeze({ S: 'ساختار', T: 'تداوم', E: 'تجربه', R: 'شبیه‌سازی', C: 'سهام' });
  const STATUS_LABELS = Object.freeze({ ok: 'مطابق', warn: 'مبهم', bad: 'متناقض' });

  // This Persian set is the immutable semantic source of truth. Keep principle IDs stable.
  const COMMON_CRITERIA = Object.freeze([
    { id: 'M1', text: 'معنا و هویت یک چیز را نمی‌توان مستقل از روابط آن با چیزهای دیگر به‌طور کامل توضیح داد.' },
    { id: 'M2', text: 'تراکم و شدت نشانگرها باید با نزدیکی واقعی به کانون تناسب داشته باشد.' },
    { id: 'M3', text: 'کانون در سراسر فرایند حضور راهنما دارد و صورت کامل آن پس از تکمیل آرایش قابل محاسبه است.' }
  ]);
  const REALM_CRITERIA = Object.freeze({
    S: Object.freeze([
      { id: 'S1', text: 'آغاز، پایان و مرکز موقعیت‌هایی متمایزند و نباید یکی فرض شوند.' },
      { id: 'S2', text: 'مرکز با تقارن آغاز و پایان تعریف می‌شود، نه با یکسان بودن با آغاز یا پایان.' },
      { id: 'S3', text: 'شتاب با زاویه نسبت به محور جهت‌دار آغاز به پایان ارتباط دارد.' },
      { id: 'S4', text: 'واگرایی از جهت کلی می‌تواند به رکود یا فقدان بینجامد، بی‌آنکه گره نابود شود.' },
      { id: 'S5', text: 'موقعیت یک نقطه باید با روابطش در کل آرایش سنجیده شود، نه فقط با ویژگی‌های منفرد آن.' },
      { id: 'S6', text: 'تغییر موقعیت نسبت به آغاز، پایان یا مرکز می‌تواند معنای ساختاری را تغییر دهد.' }
    ]),
    T: Object.freeze([
      { id: 'T1', text: 'وحدت ظرفیت با کثرت تحقق‌های آن سازگار است.' },
      { id: 'T2', text: 'هر رخداد شبکه را تغییر می‌دهد و فضای امکان‌های آینده را محدود یا بازآرایی می‌کند.' },
      { id: 'T3', text: 'یقین نسبت به کل حد شناختی و جهت‌نماست، نه مالکیت کل به‌وسیله بخشی محدود.' },
      { id: 'T4', text: 'فهم جزء و کل به‌طور متقابل به یکدیگر وابسته است.' },
      { id: 'T5', text: 'وضعیت اکنون را نمی‌توان به‌طور کامل جدا از تاریخ علّی، زمانی و رابطه‌ای آن توضیح داد.' },
      { id: 'T6', text: 'تحقق یک امکان به معنای تحقق هم‌زمان همه امکان‌های ناسازگار با آن نیست.' }
    ]),
    E: Object.freeze([
      { id: 'E1', text: 'تعادل تقارن پویاست، نه سکون مطلق.' },
      { id: 'E2', text: 'گذار ساختاری به نقطه عطف نیاز دارد.' },
      { id: 'E3', text: 'برهم‌نهی باید در سطح مناسب رخ دهد: مطلق با مطلق و نسبی با نسبی.' },
      { id: 'E4', text: 'شادی با هم‌راستایی اراده در خواست، اندیشه، احساس، تصمیم و عمل و نیز با دقت تفسیری پیوند دارد.' },
      { id: 'E5', text: 'راز مطلق و برهنگی مطلق دو حد افراطی‌اند که گرادیان تناسب را نقض می‌کنند.' },
      { id: 'E6', text: 'حقیقت با واقعیت یکی نیست: حقیقت ساختار رابطه‌ای است و واقعیت صورت تجربه‌شده از جایگاه شناختی است.' },
      { id: 'E7', text: 'جایگاه مشاهده‌گر بر تجربه اثر می‌گذارد؛ تفاوت تجربه‌ها به‌تنهایی تکثر حقیقت را اثبات نمی‌کند.' },
      { id: 'E8', text: 'برای اثبات گذار ساختاری، نقش نقطه عطف باید نشان داده شود؛ صرف تغییر به‌تنهایی کافی نیست.' }
    ]),
    R: Object.freeze([
      { id: 'R1', text: 'افق شبیه‌سازی به چشم‌انداز مرجع محدود است.' },
      { id: 'R2', text: 'مشروعیت اقتدار شبیه‌سازی‌شده با همگرایی مرجع به کانون سنجیده می‌شود.' },
      { id: 'R3', text: 'اصالت بر اساس هم‌راستایی و انسجام سنجیده می‌شود، نه صرفاً منشأ.' },
      { id: 'R4', text: 'تکامل بنیادی شامل تغییر قواعد تولیدکننده گزینه‌هاست، نه فقط انتخاب از میان گزینه‌های موجود.' },
      { id: 'R5', text: 'چند چشم‌انداز شناختی می‌توانند با یک حقیقت نسبت داشته باشند؛ تکثر تفسیر به‌تنهایی تکثر حقیقت را ثابت نمی‌کند.' },
      { id: 'R6', text: 'شبیه‌سازی می‌تواند گذرگاهی برای شناخت و تکامل باشد، اما بازتولید الگوها با تغییر قواعد مولد یکی نیست.' },
      { id: 'R7', text: 'در شبیه‌سازی کامل، تشخیص کارکردی دو الگو ممکن است در سطح تجربه دشوار یا ناممکن باشد، بی‌آنکه هویت خالق آن‌ها یکسان باشد.' }
    ]),
    C: Object.freeze([
      { id: 'C1', text: 'کثرت میدان را می‌سازد و فردیت سهم متمایز هر گره در آن میدان است.' },
      { id: 'C2', text: 'حذف سهم فردی به سوی راز مطلق سهم می‌رود؛ جداکردن سهم از زمینه رابطه‌ای به سوی برهنگی مطلق سهم می‌رود.' },
      { id: 'C3', text: 'سهم هر گره باید با جایگاه حقیقی آن در شبکه تناسب داشته باشد.' },
      { id: 'C4', text: 'رابطه هر جزء با کل باید حفظ شود؛ پیوند ناکافی می‌تواند رکود یا فقدان ایجاد کند و ادعای سهم یا پیوندِ بی‌تناسب می‌تواند به بی‌نظمی و واگرایی بینجامد.' },
      { id: 'C5', text: 'مالکیت نشانگری از سهم در ساختار مشترک است، نه هدف نهایی و نه امری ذاتاً منفی.' },
      { id: 'C6', text: 'فقدان اجتماعی ناشی از واگرایی به معنای نابودی گره نیست؛ گره ممکن است باقی بماند اما نتواند ظرفیت خود را در کل محقق کند.' },
      { id: 'C7', text: 'نظم درست میان دو قطب، میانگین عددی دلخواه نیست؛ بازگشت به تناسب حقیقی جزء و کل است.' }
    ])
  });

  const ALL_CRITERIA = Object.freeze(DOMAIN_ORDER.reduce((all, domain) => {
    all[domain] = Object.freeze([...COMMON_CRITERIA, ...REALM_CRITERIA[domain]]);
    return all;
  }, {}));
  const CRITERIA_TRANSLATION_ITEMS = Object.freeze([
    ...COMMON_CRITERIA.map(item => ({ id: item.id, text: item.text })),
    ...DOMAIN_ORDER.flatMap(domain => REALM_CRITERIA[domain].map(item => ({ id: item.id, text: item.text })))
  ]);
  const MODE_INSTRUCTIONS = Object.freeze({
    mixed: 'Create a varied paragraph: its meaning should explicitly align with some principles, leave others unaddressed, and where natural directly conflict with a specific principle. Do not attach or predict judgment labels.',
    'all-ok': 'Write a paragraph that explicitly supports the principles in all five realms and violates none.',
    'all-bad': 'Write a coherent paragraph that explicitly and definitely violates at least one principle in each realm.',
    'all-warn': 'Write a paragraph that does not explicitly confirm or definitely violate any realm principle.',
    cross: 'Write a paragraph whose meaning aligns with some realms and definitely violates at least one principle in other realms.'
  });

  function normalizeText(text) { return String(text || '').replace(/\r\n?/g, '\n').trim(); }
  function countWords(text) { const s = normalizeText(text); return s ? s.split(/\s+/).filter(Boolean).length : 0; }
  function countChars(text) { return Array.from(normalizeText(text)).length; }
  function wordLength(word) { return Array.from(String(word || '').replace(/[.,!?;:،؛؟»«"\u0027()\[\]{}]/g, '')).length; }
  function findLongWords(text) { return normalizeText(text).split(/\s+/).filter(Boolean).filter(word => wordLength(word) > MAX_WORD_LENGTH); }
  function breakLongWords(text) {
    return normalizeText(text).split(/\s+/).filter(Boolean).map(word => wordLength(word) <= MAX_WORD_LENGTH ? word :
      Array.from(word).reduce((parts, char, index) => { const part = Math.floor(index / MAX_WORD_LENGTH); (parts[part] ||= []).push(char); return parts; }, []).map(part => part.join('')).join(' ')).join(' ');
  }
  function enforceWordLimit(text, maxWords) { const words = normalizeText(text).split(/\s+/).filter(Boolean); return words.length <= maxWords ? { text: normalizeText(text), truncated: false } : { text: words.slice(0, maxWords).join(' '), truncated: true }; }
  function enforceCharLimit(text, maxChars) {
    const s = normalizeText(text); if (Array.from(s).length <= maxChars) return { text: s, truncated: false };
    let cut = Array.from(s).slice(0, maxChars).join(''); const index = cut.lastIndexOf(' '); if (index > maxChars * .7) cut = cut.slice(0, index);
    return { text: cut.trim(), truncated: true };
  }
  function processText(text) {
    const original = normalizeText(text), longWords = findLongWords(original);
    let processed = breakLongWords(original);
    const wordResult = enforceWordLimit(processed, MAX_WORDS); processed = wordResult.text;
    const charResult = enforceCharLimit(processed, MAX_CHARS); processed = charResult.text;
    const remaining = findLongWords(processed);
    return { text: processed, originalWordCount: countWords(original), originalCharCount: countChars(original),
      finalWordCount: countWords(processed), finalCharCount: countChars(processed), longWordsFound: longWords,
      remainingLongWords: remaining, truncated: wordResult.truncated || charResult.truncated,
      truncatedByWord: wordResult.truncated, truncatedByChar: charResult.truncated,
      violations: { wordLimit: countWords(processed) > MAX_WORDS, charLimit: countChars(processed) > MAX_CHARS, wordLength: remaining.length > 0 } };
  }
  function validateJudgment(judgment) {
    if (!judgment || typeof judgment !== 'object' || Array.isArray(judgment)) throw new Error('ساختار داوری نامعتبر است.');
    for (const domain of DOMAIN_ORDER) {
      const item = judgment[domain];
      if (!item || !['ok', 'warn', 'bad'].includes(item.status)) throw new Error('داوری قلمرو ' + domain + ' نامعتبر است.');
      if (typeof item.reason !== 'string' || !item.reason.trim()) throw new Error('دلیل داوری قلمرو ' + domain + ' نامعتبر است.');
    }
    return judgment;
  }
  function validateEvaluation(parsed) {
    return validateJudgment(parsed && parsed.judgment);
  }
  function validateGeneratedResult(parsed, expectedCount) {
    if (!parsed || !Array.isArray(parsed.paragraphs)) throw new Error('ساختار پاسخ تولید نامعتبر است.');
    if (Number.isInteger(expectedCount) && parsed.paragraphs.length !== expectedCount) throw new Error('تعداد پاراگراف‌های پاسخ با درخواست برابر نیست.');
    return { paragraphs: parsed.paragraphs.map(item => {
      if (!item || typeof item.text !== 'string' || !item.text.trim()) throw new Error('متن پاراگراف نامعتبر است.');
      const original = normalizeText(item.text);
      if (countWords(original) > MAX_WORDS || countChars(original) > MAX_CHARS || findLongWords(original).length) {
        throw new Error('پاراگراف محدودیت‌های سخت را نقض می‌کند.');
      }
      return { text: original };
    }) };
  }
  function buildSystemPrompt(criteriaByDomain, language) {
    const criteria = DOMAIN_ORDER.map(domain => {
      const items = criteriaByDomain && criteriaByDomain[domain];
      if (!Array.isArray(items) || items.length !== ALL_CRITERIA[domain].length) throw new Error('معیارهای قلمرو ' + domain + ' ناقص یا نامعتبرند.');
      return domain + ' (' + DOMAIN_NAMES[domain] + '):\n' + items.map((item, index) => '- ' + ALL_CRITERIA[domain][index].id + ': ' + item).join('\n');
    }).join('\n\n');
    return [
      'You are the independent judgment engine for Paragraph Machine. Evaluate only the supplied paragraph against the explicit criteria below. Do not use general world knowledge or external philosophical assumptions as judging standards.',
      'Paragraph language: ' + language + '. The criteria below have been translated into that same language. Interpret the paragraph in its original language; never translate or rewrite the paragraph as a preprocessing step.',
      'Canonical criteria are the Persian source principles translated faithfully. Their IDs are stable. Evaluate each realm independently, including shared M1-M3 wherever semantically relevant.',
      'Status protocol for each realm: ok means at least one principle is explicitly confirmed and no principle in that realm is violated; bad means at least one specific principle is explicitly and definitely violated; warn means no explicit confirmation and no definite violation. A definite violation overrides confirmations of other principles in the same realm. Silence, partial reference, overlap, or deferral is warn. Uncertainty is warn.',
      'Modal words such as “perhaps” or “possibly” do not automatically cause warn: evaluate the proposition content independently of the modal word. Words equivalent to “only” or “same” are signals, not decisions by themselves. A contradiction must identify a specific principle and a definite conflict.',
      'Return exactly one JSON object: {"judgment":{"S":{"status":"ok|warn|bad","reason":"..."},"T":{"status":"ok|warn|bad","reason":"..."},"E":{"status":"ok|warn|bad","reason":"..."},"R":{"status":"ok|warn|bad","reason":"..."},"C":{"status":"ok|warn|bad","reason":"..."}}}. Reasons must cite principle IDs and be written in the paragraph language. Do not add keys or prose.',
      'Canonical criteria, with language-local renderings:',
      criteria
    ].join('\n\n');
  }
  function buildGenerationPrompt(options = {}) {
    const count = options.count || 1;
    const mode = options.mode || 'mixed';
    const language = options.language || 'fa';
    return [
      'Generate ' + count + ' distinct paragraph(s) in the language whose code is "' + language + '".',
      MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.mixed,
      'Do not generate judgments or status labels. The independent evaluator will judge the finished paragraph later.',
      'Hard limits for each paragraph: at most 144 words, no word longer than 34 characters, and at most 900 characters including spaces.',
      'Return only valid JSON: {"paragraphs":[{"text":"..."}]}. No markdown or extra keys.'
    ].join('\n\n');
  }
  function buildEvaluationPrompt(text) {
    return 'Evaluate the following original-language paragraph using only the system criteria. Preserve its meaning; do not generate, translate, summarize, or rewrite it. Return only the judgment JSON schema specified in the system instructions.\n\nPARAGRAPH:\n' + text;
  }

  window.ParagraphMachineCore = Object.freeze({
    MAX_WORDS, MAX_WORD_LENGTH, MAX_CHARS, DOMAIN_ORDER, DOMAIN_NAMES, STATUS_LABELS,
    COMMON_CRITERIA, REALM_CRITERIA, ALL_CRITERIA, CRITERIA_TRANSLATION_ITEMS, MODE_INSTRUCTIONS,
    normalizeText, countWords, countChars, findLongWords, processText, validateJudgment,
    validateEvaluation, validateGeneratedResult, buildSystemPrompt, buildGenerationPrompt, buildEvaluationPrompt
  });
})();
