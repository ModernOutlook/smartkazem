(() => {
  'use strict';

  const REALM_IDS = Object.freeze([
    'structure',
    'continuity',
    'experience',
    'reference',
    'share'
  ]);

  const info = document.getElementById('info');
  const infoTitle = document.getElementById('info-title');
  const infoText = document.getElementById('info-text');
  const realms = [...document.querySelectorAll('.realm')];

  let activeId = null;

  function isRealm(id) {
    return REALM_IDS.includes(id);
  }

  function render(id = activeId, show = true) {
    if (!isRealm(id)) {
      clear();
      return;
    }

    activeId = id;
    realms.forEach((item) => item.classList.toggle('selected', item.dataset.id === id));

    const realm = window.SiteI18n?.getCatalog?.()?.home?.realms?.[id];
    if (!realm) return;

    infoTitle.textContent = realm.title || '';
    infoText.textContent = realm.text || '';

    info.classList.remove(
      'realm-structure',
      'realm-continuity',
      'realm-experience',
      'realm-reference',
      'realm-share',
      'realm-core'
    );
    info.classList.add('realm-' + id);
    info.dataset.realm = id;
    info.classList.toggle('reference', id === 'reference');
    info.classList.toggle('visible', show);
  }

  function clear() {
    info.classList.remove('visible');
  }

  function refresh() {
    render(activeId, info.classList.contains('visible'));
  }

  document.addEventListener('site:languagechange', refresh);

  window.HomeRealmInfo = Object.freeze({
    setInfo: render,
    clearInfo: clear,
    refresh,
    getActiveId: () => activeId
  });

  clear();
})();
