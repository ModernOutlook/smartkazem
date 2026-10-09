(() => {
  'use strict';

  const source = window.ObservationPersianSource;
  if (!source) return;

  function render() {
    const language = window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
    const translated = window.SiteI18n?.getCatalog?.()?.bookContent?.observation;
    const content = language === 'fa' ? source : translated;
    if (!content) return;

    const title = document.getElementById('observation-source-title');
    const subtitle = document.getElementById('observation-source-subtitle');
    const localizedTitle = language === 'fa' ? content.title : content.title?.[language];
    const localizedSubtitle = language === 'fa' ? content.subtitle : content.subtitle?.[language];

    if (title) title.textContent = localizedTitle || '';
    if (subtitle) subtitle.textContent = localizedSubtitle || '';

    document.querySelectorAll('[data-observation-paragraph-index]').forEach((pair) => {
      const index = Number(pair.dataset.observationParagraphIndex);
      const node = pair.querySelector('[data-observation-paragraph]');
      const paragraph = language === 'fa'
        ? content.paragraphs?.[index]
        : content.paragraphs?.[language]?.[index];
      if (!node || paragraph === undefined) return;
      if (language === 'fa') node.innerHTML = paragraph;
      else node.textContent = paragraph;
      node.className = 'observation-paragraph ' + language;
      node.lang = language;
      node.dir = ['fa', 'ar'].includes(language) ? 'rtl' : 'ltr';
    });
  }

  render();
  document.addEventListener('site:languagechange', render);
})();
