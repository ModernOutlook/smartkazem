/* Orchestrates language-local generation and independent judgment. */
(() => {
  'use strict';

  const core = window.ParagraphMachineCore;
  const translatedCriteriaCache = new Map();
  const LANGUAGE_NAMES = Object.freeze({ fa: 'Persian', en: 'English', zh: 'Chinese', ar: 'Arabic' });
  const MAX_JUDGMENT_REPAIRS = 2;

  async function getCriteriaForLanguage(language) {
    const lang = LANGUAGE_NAMES[language] ? language : 'fa';
    if (lang === 'fa') {
      return core.DOMAIN_ORDER.reduce((result, domain) => {
        result[domain] = core.ALL_CRITERIA[domain].map(item => item.text);
        return result;
      }, {});
    }
    if (translatedCriteriaCache.has(lang)) return translatedCriteriaCache.get(lang);

    const canonicalItems = core.CRITERIA_TRANSLATION_ITEMS;
    let lastIssue = '';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const translated = await window.ParagraphTranslation.fromPersianBatch(
        canonicalItems.map(item => item.id + ': ' + item.text),
        lang,
        attempt > 0 ? 'A previous semantic audit flagged these issues: ' + lastIssue + '. Correct the identified meaning drift while preserving the exact logical scope, negation, and relation of each Persian source criterion.' : ''
      );
      if (!Array.isArray(translated) || translated.length !== canonicalItems.length ||
          translated.some(value => typeof value !== 'string' || !value.trim())) {
        lastIssue = 'translation count or empty item';
        continue;
      }

      const cleanItems = translated.map((value, index) => {
        const expectedId = canonicalItems[index].id;
        const prefix = value.match(/^\\s*([MSTERC]\\d+)\\s*[:：-]\\s*/);
        if (prefix && prefix[1] !== expectedId) {
          throw new Error('شناسهٔ معیار ترجمه‌شده با اصل مرجع مطابقت ندارد: ' + expectedId);
        }
        return prefix ? value.slice(prefix[0].length).trim() : value.trim();
      });
      if (cleanItems.some(value => !value)) {
        lastIssue = 'translated criterion is empty';
        continue;
      }

      let verification;
      try {
        verification = await window.ParagraphLLM.complete([
          {
            role: 'system',
            content: 'You are a strict bilingual auditor of philosophical criteria. Compare each target-language translation with its Persian source. Judge whether it preserves the complete claim, negation, modality-independent logical relation, and scope. Do not judge whether the principle is true. Return only JSON: {"checks":[{"id":"M1","faithful":true,"issue":""}]}. Include one check per input item in the same order. Set faithful=false for any omission, addition, reversal, or meaningful ambiguity.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              targetLanguage: LANGUAGE_NAMES[lang],
              items: canonicalItems.map((item, index) => ({
                id: item.id,
                sourcePersian: item.text,
                translation: cleanItems[index]
              }))
            })
          }
        ], { temperature: 0.1 });
      } catch (error) {
        lastIssue = String(error && error.message || 'translation verification failed');
        continue;
      }

      const checks = verification && verification.checks;
      const validChecks = Array.isArray(checks) && checks.length === canonicalItems.length &&
        checks.every((check, index) => check && check.id === canonicalItems[index].id && typeof check.faithful === 'boolean');
      if (validChecks && checks.every(check => check.faithful === true)) {
        const byId = new Map();
        cleanItems.forEach((value, index) => byId.set(canonicalItems[index].id, value));
        const criteria = core.DOMAIN_ORDER.reduce((result, domain) => {
          result[domain] = core.ALL_CRITERIA[domain].map(item => byId.get(item.id));
          return result;
        }, {});
        translatedCriteriaCache.set(lang, criteria);
        return criteria;
      }
      lastIssue = validChecks
        ? checks.filter(check => !check.faithful).map(check => check.id + ': ' + String(check.issue || 'meaning drift')).join('; ')
        : 'invalid criterion-verification schema';
    }
    throw new Error('ترجمهٔ معیارهای ' + LANGUAGE_NAMES[lang] + ' از نظر معنایی تأیید نشد؛ برای جلوگیری از تغییر اصول، داوری متوقف شد. ' + lastIssue);
  }

  async function evaluateText(text, language) {
    const lang = LANGUAGE_NAMES[language] ? language : 'fa';
    const original = String(text == null ? '' : text);
    if (!original.trim()) throw new Error('متنی برای ارزیابی وجود ندارد.');
    const criteria = await getCriteriaForLanguage(lang);
    const systemPrompt = core.buildSystemPrompt(criteria, LANGUAGE_NAMES[lang]);
    let lastError;
    for (let attempt = 0; attempt <= MAX_JUDGMENT_REPAIRS; attempt += 1) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: core.buildEvaluationPrompt(original) }
        ];
        if (attempt > 0) {
          messages.push({
            role: 'user',
            content: 'The previous response failed schema validation: ' + String(lastError && lastError.message || 'invalid output') + '. Return the complete corrected JSON object with both judgment and normative axes, without scores or percentages. Re-evaluate the original paragraph; do not change the paragraph.'
          });
        }
        const result = await window.ParagraphLLM.complete(messages, { temperature: 0.1 });
        const evaluation = core.validateEvaluation(result);
        return { text: original, judgment: evaluation.judgment, normative: evaluation.normative };
      } catch (error) {
        lastError = error;
        const message = String(error && error.message || '');
        const repairable = /ساختار داوری|ساختار پاسخ داوری|محور هنجاری|جهت هنجاری|دلیل محور هنجاری|شاهد محور هنجاری|داوری قلمرو|دلیل داوری|پاسخ مدل خالی|JSON معتبر برنگرداند/.test(message);
        if (!repairable) throw error;
      }
    }
    throw new Error('داوری به‌دلیل پاسخ نامعتبر مدل انجام نشد. لطفاً دوباره تلاش کنید. (' + String(lastError && lastError.message || 'invalid output') + ')');
  }

  async function evaluatePersian(text) { return evaluateText(text, 'fa'); }

  async function generateParagraphs(count, mode, language) {
    const lang = LANGUAGE_NAMES[language] ? language : 'fa';
    const result = await window.ParagraphLLM.complete([
      { role: 'system', content: 'You generate paragraphs only. Do not judge them. Follow the user instructions and return the exact JSON schema requested.' },
      { role: 'user', content: core.buildGenerationPrompt({ count, mode, language: lang }) }
    ], { temperature: 0.8 });
    return core.validateGeneratedResult(result, count).paragraphs;
  }

  async function generatePersian(count, mode) { return generateParagraphs(count, mode, 'fa'); }

  window.ParagraphWorkspaceAdapter = Object.freeze({
    evaluatePersian,
    evaluateText,
    generatePersian,
    generateParagraphs,
    getCriteriaForLanguage
  });
})();
