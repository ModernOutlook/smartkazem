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
    const translated = await window.ParagraphTranslation.fromPersianBatch(
      canonicalItems.map(item => item.id + ': ' + item.text), lang
    );
    if (!Array.isArray(translated) || translated.length !== canonicalItems.length ||
        translated.some(value => typeof value !== 'string' || !value.trim())) {
      throw new Error('ترجمهٔ معیارهای داوری کامل یا معتبر نیست؛ ارزیابی انجام نشد.');
    }
    const byId = new Map();
    translated.forEach((value, index) => {
      const expectedId = canonicalItems[index].id;
      const separator = value.indexOf(':');
      const prefix = separator >= 0 ? value.slice(0, separator).trim() : '';
      if (/^[MSTERC]\\d+$/.test(prefix) && prefix !== expectedId) {
        throw new Error('شناسهٔ معیار ترجمه‌شده با اصل مرجع مطابقت ندارد: ' + expectedId);
      }
      const cleaned = (prefix === expectedId ? value.slice(separator + 1) : value).trim();
      if (!cleaned) {
        throw new Error('ترجمهٔ معیار ' + expectedId + ' ساختار قابل‌اعتماد ندارد.');
      }
      byId.set(expectedId, cleaned);
    });
    const criteria = core.DOMAIN_ORDER.reduce((result, domain) => {
      result[domain] = core.ALL_CRITERIA[domain].map(item => byId.get(item.id));
      return result;
    }, {});
    translatedCriteriaCache.set(lang, criteria);
    return criteria;
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
            role: 'assistant',
            content: 'The previous response failed schema validation: ' + String(lastError && lastError.message || 'invalid output') + '. Return a corrected JSON judgment object only. Re-evaluate the original paragraph; do not change the paragraph.'
          });
        }
        const result = await window.ParagraphLLM.complete(messages, { temperature: 0.1 });
        const judgment = core.validateEvaluation(result);
        return { text: original, judgment };
      } catch (error) {
        lastError = error;
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
