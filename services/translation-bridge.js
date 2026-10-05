/* Translation boundary for the Persian Paragraph Machine core. */
(() => {
  'use strict';

  const TRANSLATION_TEMPERATURE = 0.15;

  function buildSystemPrompt(direction) {
    if (direction === 'toPersian') {
      return [
        'تو مترجم دقیق فارسی هستی.',
        'متن را بدون خلاصه‌سازی، تفسیر، حذف یا افزودن معنا به فارسی ترجمه کن.',
        'خروجی فقط JSON معتبر باشد و دقیقاً با این ساختار برگردد:',
        '{"translation":"متن ترجمه‌شده"}',
        'هیچ کلید یا متن دیگری اضافه نکن.'
      ].join('\n');
    }

    return [
      'تو مترجم دقیق هستی.',
      'هر متن فارسی را بدون خلاصه‌سازی، تفسیر، حذف یا افزودن معنا به زبان مقصد ترجمه کن.',
      'ترتیب و تعداد موارد را دقیقاً حفظ کن.',
      'خروجی فقط JSON معتبر باشد و دقیقاً با این ساختار برگردد:',
      '{"translations":["ترجمه ۱","ترجمه ۲"]}',
      'تعداد عناصر آرایه translations باید دقیقاً برابر تعداد متن‌های ورودی باشد.',
      'هیچ کلید یا متن دیگری اضافه نکن.'
    ].join('\n');
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

    const translation = String(response?.translation || '').trim();

    if (!translation) {
      throw new Error('ترجمه به فارسی خالی یا نامعتبر است.');
    }

    return translation;
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
            '\nتعداد متن‌ها: ' +
            texts.length +
            '\nمتن‌ها:\n' +
            texts.map((text, index) => '[' + index + '] ' + text).join('\n\n')
        }
      ],
      { temperature: TRANSLATION_TEMPERATURE }
    );

    const translations = Array.isArray(response?.translations)
      ? response.translations
      : [];

    if (translations.length !== texts.length) {
      throw new Error('تعداد ترجمه‌ها با تعداد پاراگراف‌ها برابر نیست.');
    }

    return translations.map((translation) => {
      const value = String(translation || '').trim();
      if (!value) {
        throw new Error('یکی از ترجمه‌های خروجی خالی است.');
      }
      return value;
    });
  }

  window.ParagraphTranslation = Object.freeze({
    toPersian,
    fromPersian,
    fromPersianBatch
  });
})();
