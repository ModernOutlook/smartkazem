(() => {
  'use strict';

  const source = window.PhilosophicalTreatisePersianSource;
  const root = document.getElementById('treatise-content');
  if (!source || !Array.isArray(source.blocks) || !root) return;

  const sectionAnchors = Object.freeze({
    2: 'preface',
    17: 'r1',
    18: 's1-1',
    23: 's1-2',
    33: 's1-3',
    41: 's1-4',
    48: 'r2',
    49: 's2-1',
    52: 's2-2',
    57: 's2-3',
    65: 's2-4',
    69: 'r3',
    70: 's3-1',
    80: 's3-2',
    85: 's3-3',
    91: 's3-4',
    97: 's3-5',
    103: 'r4',
    104: 's4-1',
    108: 's4-2',
    113: 's4-3',
    121: 's4-4',
    126: 'r5',
    127: 's5-1',
    131: 's5-2',
    137: 's5-3',
    143: 's5-4',
    146: 'postscript'
  });

  function createReadingSurface() {
    const fragment = document.createDocumentFragment();
    source.blocks.forEach((block, index) => {
      const pair = document.createElement('section');
      pair.className = 'pair';
      pair.dataset.blockIndex = String(index);
      if (sectionAnchors[index]) pair.id = sectionAnchors[index];

      for (const language of ['fa', 'en', 'zh', 'ar']) {
        const slot = document.createElement('div');
        slot.dataset.treatiseBlockIndex = String(index);
        slot.dataset.treatiseLanguage = language;
        slot.lang = language;
        slot.dir = language === 'fa' || language === 'ar' ? 'rtl' : 'ltr';
        pair.appendChild(slot);
      }
      fragment.appendChild(pair);
    });
    root.replaceChildren(fragment);
  }

  function render() {
    const language = window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
    const translated = window.SiteI18n?.getCatalog?.()?.bookContent?.treatise;
    if (language !== 'fa' && !translated?.blocks) return;

    root.querySelectorAll('[data-treatise-block-index]').forEach((node) => {
      const index = Number(node.dataset.treatiseBlockIndex);
      const targetLanguage = node.dataset.treatiseLanguage;
      const block = targetLanguage === 'fa' ? source.blocks[index] : translated?.blocks?.[index];
      let content = targetLanguage === 'fa' ? block?.html : block?.[targetLanguage];
      if (content === undefined || content === null) return;
      if (index === 0 && targetLanguage !== 'fa' && !/^\s*<h1\b/i.test(content)) {
        content = '<h1>' + content + '</h1>';
      }
      node.innerHTML = content;
    });
  }

  createReadingSurface();
  render();
  document.addEventListener('site:languagechange', render);
})();
