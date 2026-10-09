(() => {
  'use strict';

  const source = window.PhilosophicalTreatisePersianSource;
  if (!source || !Array.isArray(source.blocks)) return;

  function render() {
    const language = window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
    const translated = window.SiteI18n?.getCatalog?.()?.bookContent?.treatise;
    if (language !== 'fa' && !translated?.blocks) return;

    document.querySelectorAll('[data-treatise-block-index]').forEach((node) => {
      const index = Number(node.dataset.treatiseBlockIndex);
      const targetLanguage = node.dataset.treatiseLanguage;
      const block = targetLanguage === 'fa'
        ? source.blocks[index]
        : translated?.blocks?.[index];
      const content = targetLanguage === 'fa' ? block?.html : block?.[targetLanguage];
      if (content === undefined) return;
      node.innerHTML = content;
    });
  }

  render();
  document.addEventListener('site:languagechange', render);
})();
