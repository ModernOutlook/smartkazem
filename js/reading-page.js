(() => {
  'use strict';

  const closeButton = document.getElementById('close');

  function closePage() {
    if (history.length > 1) history.back();
    else window.location.href = 'index.html';
  }

  function bindTabs() {
    document.querySelectorAll('.book-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.target;
        if (!targetId) return;

        document.querySelectorAll('.book-tab').forEach((item) => {
          item.classList.toggle('active', item === tab);
        });

        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  if (closeButton) closeButton.addEventListener('click', closePage);
  bindTabs();
})();
