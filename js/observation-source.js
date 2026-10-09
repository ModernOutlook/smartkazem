(() => {
  'use strict';

  const source = window.ObservationPersianSource;
  if (!source) return;

  function renderPersianSource() {
    document.querySelectorAll('[data-fa-source-field]').forEach((node) => {
      const field = node.dataset.faSourceField;
      if (field === 'title' || field === 'subtitle') node.textContent = source[field] || '';
    });

    document.querySelectorAll('[data-fa-source-index]').forEach((node) => {
      const index = Number(node.dataset.faSourceIndex);
      if (Number.isInteger(index) && source.paragraphs[index] !== undefined) {
        node.innerHTML = source.paragraphs[index];
      }
    });
  }

  renderPersianSource();
  document.addEventListener('site:languagechange', renderPersianSource);
})();
