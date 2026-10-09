(() => {
  'use strict';

  const source = window.PhilosophicalTreatisePersianSource;
  if (!source || !Array.isArray(source.blocks)) return;

  function renderPersianSource() {
    document.querySelectorAll('[data-fa-source-index]').forEach((node) => {
      const index = Number(node.dataset.faSourceIndex);
      const block = source.blocks[index];
      if (block) node.innerHTML = block.html;
    });
  }

  renderPersianSource();
  document.addEventListener('site:languagechange', renderPersianSource);
})();
