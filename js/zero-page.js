(() => {
  'use strict';
  const back = document.getElementById('zero-back');
  back?.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'index.html';
  });
})();
