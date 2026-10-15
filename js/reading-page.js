(() => {
  'use strict';

  const closeButton = document.getElementById('close');
  const tabs = [...document.querySelectorAll('#tabs .book-tab')];
  const body = document.getElementById('body');
  const treatiseStarts = Object.freeze([0, 17, 48, 69, 103, 126, 146]);

  function closePage() {
    if (history.length > 1) history.back();
    else window.location.href = 'index.html';
  }

  function number(value) {
    return new Intl.NumberFormat(window.SiteI18n?.getLanguage?.() || 'fa').format(value);
  }

  function applySelection(index) {
    if (!tabs.length || !body) return;
    const pairs = [...body.querySelectorAll('.pair[data-block-index]')];
    const start = treatiseStarts[index] ?? 0;
    const end = treatiseStarts[index + 1] ?? Infinity;

    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.classList.toggle('active', active);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.setAttribute('aria-controls', 'body');
      const numberNode = tab.querySelector('.tab-number');
      if (numberNode) numberNode.textContent = number(tabIndex + 1);
    });

    body.setAttribute('role', 'tabpanel');
    body.setAttribute('aria-labelledby', tabs[index]?.id || '');
    pairs.forEach((pair) => {
      const blockIndex = Number(pair.dataset.blockIndex);
      pair.hidden = !(blockIndex >= start && blockIndex < end);
    });
  }

  function select(index, moveFocus = false) {
    if (index < 0 || index >= tabs.length) return;
    applySelection(index);
    if (moveFocus) tabs[index].focus({ preventScroll: true });
  }

  if (closeButton) closeButton.addEventListener('click', closePage);

  if (tabs.length) {
    const nav = document.getElementById('tabs');
    nav?.setAttribute('role', 'tablist');
    nav?.setAttribute('aria-orientation', 'horizontal');
    tabs.forEach((tab, index) => {
      tab.id ||= `treatise-tab-${index}`;
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', (event) => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        select(next, true);
      });
    });
    applySelection(0);
    document.addEventListener('site:languagechange', () => {
      const active = Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
      applySelection(active);
    });
  }
})();
