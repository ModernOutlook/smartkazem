(() => {
  'use strict';
  const back = document.getElementById('zero-back');
  const tab = document.querySelector('.zero-tab');
  const number = tab?.querySelector('.zero-tab-number');
  const label = tab?.querySelector('.zero-tab-label');
  function updateTab() {
    const language = window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
    if (number) number.textContent = new Intl.NumberFormat(language).format(1);
    if (label) label.textContent = document.getElementById('zero-title')?.textContent?.trim() || 'Zero';
  }
  updateTab();
  document.addEventListener('site:languagechange', updateTab);
  back?.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'index.html';
  });
})();
