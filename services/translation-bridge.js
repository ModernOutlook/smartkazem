/* Translation boundary for the Persian Paragraph Machine core. */
(() => {
  'use strict';

  const TRANSLATION_TEMPERATURE = 0.15;

  function buildSystemPrompt(direction) {
    return direction === 'toPersian'
      ? 'تو مترجم دقیق هستی. متن را بدون خلاصه‌سازی، تفسیر یا افزودن معنا به فارسی ترجمه کن.'
      : 'تو مترجم دقیق هستی. هر متن فارسی را بدون خلاصه‌سازی، تفسیر یا افزودن معنا به زبان مقصد ترجمه کن. ترتیب و تعداد موارد را دقیقاً حفظ کن. خروجی JSON با کلید translations و آرایه‌ای هم‌اندازه ورودی بده.';
  }

  async function toPersian(text, sourceLanguage) {
    if (!text || sourceLanguage === 'fa') return text;

    const response = await window.ParagraphLLM.complete(
      [
        { role: 'system', content: buildSystemPrompt('toPersian') },
        {
          role: 'user',
          content: 'زبان مبدأ: ' + sourceLanguage + '\nمتن:\n' + text
        }
      ],
      { temperature: TRANSLATION_TEMPERATURE }
    );

    return String(response.translation || response.text || '').trim();
  }

  async function fromPersian(text, targetLanguage) {
    const translations = await fromPersianBatch([text], targetLanguage);
    return translations[0] || '';
  }

  async function fromPersianBatch(texts, targetLanguage) {
    if (!Array.isArray(texts) || !texts.length || targetLanguage === 'fa') {
      return texts;
    }

    const response = await window.ParagraphLLM.complete(
      [
        { role: 'system', content: buildSystemPrompt('fromPersian') },
        {
          role: 'user',
          content:
            'زبان مقصد: ' +
            targetLanguage +
            '\nمتن‌ها:\n' +
            texts.map((text, index) => '[' + index + '] ' + text).join('\n\n')
        }
      ],
      { temperature: TRANSLATION_TEMPERATURE }
    );

    const translations = Array.isArray(response.translations)
      ? response.translations
      : [];

    if (translations.length !== texts.length) {
      throw new Error('تعداد ترجمه‌ها با تعداد پاراگراف‌ها برابر نیست.');
    }

    return translations.map((translation) => String(translation || '').trim());
  }

  window.ParagraphTranslation = Object.freeze({
    toPersian,
    fromPersian,
    fromPersianBatch
  });
})();
