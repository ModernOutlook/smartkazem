(() => {
  'use strict';

  const PageNavigation = window.SitePages;
  const PAGE_IDS = PageNavigation.IDS;
  const BookNavigation = window.BookNavigation;

  const REALM_ORDER = Object.freeze(['structure', 'continuity', 'experience', 'reference', 'share']);
  const REALM_GEOMETRY = Object.freeze([
  ['structure', 365, 445],
  ['continuity', 285, 365],
  ['experience', 205, 285],
  ['reference', 125, 205],
  ['share', 70, 125]
]);
  const ESCAPE_HANDLERS = Object.freeze({
    book: BookNavigation.closeBook,
    paragraph: PageNavigation.closeParagraph,
    share: PageNavigation.closeShare,
    experience: PageNavigation.closeExperience,
    continuity: PageNavigation.closeContinuity,
    structure: PageNavigation.closeStructure,
    reference: PageNavigation.closeReference
  });

  let activeId = 'structure';
  let lastSelectionAt = 0;

  const info = document.getElementById('info');
  const infoTitle = document.getElementById('info-title');
  const infoText = document.getElementById('info-text');
  const realms = [...document.querySelectorAll('.realm')];
  const core = document.getElementById('core');
  const universe = document.getElementById('universe');
  const logoViewer = document.getElementById('logo-viewer');
  const logoViewerClose = document.getElementById('logo-viewer-close');

  function currentSiteLang() {
  return window.SiteI18n?.getLanguage?.() || 'fa';
}

  function setInfo(id, show = true) {
  activeId = id;

  realms.forEach((realm) => {
    realm.classList.toggle('selected', realm.dataset.id === id);
  });

  const realm = window.SiteI18n?.getCatalog?.()?.home?.realms?.[id];
  if (realm) {
    infoTitle.textContent = realm.title || '';
    infoText.textContent = realm.text || '';
  }

  info.classList.toggle('reference', id === 'reference');
  info.classList.toggle('visible', show);
}

  function clearInfo() {
  info.classList.remove('visible');
  realms.forEach((realm) => realm.classList.remove('selected'));
}

  function selectRealm(id) {
  if (id === 'core') {
    setInfo('core');
    return;
  }

  if (!realms.some((realm) => realm.dataset.id === id)) return;

  setInfo(id);

  const openers = {
    share: openShare,
    experience: openExperience,
    continuity: openContinuity,
    structure: openStructure
  };

  if (openers[id]) {
    openers[id]();
    return;
  }

  if (id === 'reference') {
    window.clearTimeout(window.__referenceOpenTimer);
    window.__referenceOpenTimer = window.setTimeout(PageNavigation.openReference, 220);
  }
}

  function openLogoViewer() {
  clearInfo();
  logoViewer.classList.add('open');
}

  function closeLogoViewer() {
  logoViewer.classList.remove('open');
}

  function handleActivation(event, callback) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  callback();
}

  function renderHomeFromCatalog() {
  const catalog = window.SiteI18n?.getCatalog?.() || {};
  const labels = catalog.labels || {};
  const pageLabels = catalog.home?.pages || {};

  [
    ['share-page', labels.share],
    ['experience-page', labels.experience],
    ['continuity-page', labels.continuity],
    ['structure-page', labels.structure],
    ['reference-page', labels.reference]
  ].forEach(([id, title]) => {
    const page = document.getElementById(id);
    if (!page) return;

    const strong = page.querySelector('strong');
    const span = page.querySelector('span');

    if (strong && title) strong.textContent = title;
    if (span) span.textContent = (title || '').split(' · ')[1] || title || '';
    page.setAttribute('aria-label', title || '');
  });

  [
    ['ref-observation', pageLabels.observation],
    ['reference-layer3', pageLabels.layer3?.title]
  ].forEach(([id, value]) => {
    const button = document.getElementById(id);
    if (!button || !value) return;

    const small = button.querySelector('small');
    button.firstChild.textContent = value;
    if (small) small.textContent = '';
  });

  const humanMachinesButton = document.getElementById('share-human-machines');
  const humanMachines = catalog.pages?.humanMachines;
  if (humanMachinesButton && humanMachines) {
    humanMachinesButton.firstChild.textContent = humanMachines.title || labels.share;
    const small = humanMachinesButton.querySelector('small');
    if (small) small.textContent = humanMachines.title || '';
  }

  const backLabel = labels.back || '';
  [
    'share-close',
    'share-human-machines',
    'experience-close',
    'continuity-close',
    'structure-close',
    'reference-close',
    'book-close',
    'logo-viewer-close'
  ].forEach((id) => {
    const button = document.getElementById(id);
    if (button && backLabel) button.setAttribute('aria-label', backLabel);
  });

  const brand = document.querySelector('.brand strong');
  const brandAlt = document.querySelector('.brand span');
  if (brand) brand.textContent = catalog.home?.brand || catalog.meta?.brand || brand.textContent;
  if (brandAlt) brandAlt.textContent = catalog.home?.brandLatin || catalog.meta?.brandLatin || brandAlt.textContent;

  const currentRealm = catalog.home?.realms?.[activeId];
  if (currentRealm) {
    infoTitle.textContent = currentRealm.title || '';
    infoText.textContent = currentRealm.text || '';
  }
}

  function handleLanguageChange() {
  renderHomeFromCatalog();

  const bookPage = document.getElementById('book-page');
  if (
    typeof BookNavigation?.buildBookTabs === 'function' &&
    bookPage?.style.display === 'block'
  ) {
    const activeTab = [...document.querySelectorAll('.book-tab')]
      .findIndex((button) => button.classList.contains('active'));
    const currentTab = Math.max(0, activeTab);
    BookNavigation.buildBookTabs(currentTab);
    BookNavigation.selectChapter(currentTab);
  }
}

  function handleEscape(event) {
  if (event.key !== 'Escape') return;

  if (logoViewer.classList.contains('open')) {
    closeLogoViewer();
    return;
  }

  const openPage = Object.keys(ESCAPE_HANDLERS).find((key) => {
    const page = document.getElementById(PAGE_IDS[key]);
    return page?.style.display === 'block';
  });

  if (openPage) {
    ESCAPE_HANDLERS[openPage]();
    return;
  }

  const index = REALM_ORDER.indexOf(activeId);
  if (['ArrowDown', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    setInfo(REALM_ORDER[(index + 1) % REALM_ORDER.length]);
  }

  if (['ArrowUp', 'ArrowLeft'].includes(event.key)) {
    event.preventDefault();
    setInfo(REALM_ORDER[(index - 1 + REALM_ORDER.length) % REALM_ORDER.length]);
  }

  if (event.key === 'Enter' && activeId === 'reference') PageNavigation.openReference();
}

core.setAttribute('tabindex', '0');
core.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  openLogoViewer();
});
core.addEventListener('keydown', (event) => handleActivation(event, openLogoViewer));

logoViewerClose.addEventListener('click', (event) => {
  event.stopPropagation();
  closeLogoViewer();
});
logoViewer.addEventListener('click', (event) => {
  if (event.target === logoViewer) closeLogoViewer();
});

realms.forEach((realm) => {
  realm.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const now = performance.now();
    if (now - lastSelectionAt < 90) return;

    lastSelectionAt = now;
    selectRealm(realm.dataset.id);
  });

  realm.addEventListener('keydown', (event) => {
    handleActivation(event, () => selectRealm(realm.dataset.id));
  });
});

document.addEventListener('site:languagechange', handleLanguageChange);

document.getElementById('share-close').addEventListener('click', PageNavigation.closeShare);
document.getElementById('experience-close').addEventListener('click', PageNavigation.closeExperience);
document.getElementById('continuity-close').addEventListener('click', PageNavigation.closeContinuity);
document.getElementById('structure-close').addEventListener('click', PageNavigation.closeStructure);
document.getElementById('reference-close').addEventListener('click', PageNavigation.closeReference);
document.getElementById('book-close').addEventListener('click', BookNavigation.closeBook);

document.getElementById('continuity-shahnameh').addEventListener('click', () => {
  window.location.href = 'shahnameh.html';
});
document.getElementById('structure-treatise').addEventListener('click', () => {
  window.location.href = 'philosophical-treatise.html';
});
document.getElementById('share-human-machines').addEventListener('click', () => BookNavigation.openBook('share', 'humanMachines'));
document.getElementById('share-forgers').addEventListener('click', () => BookNavigation.openBook('share', 'forgers'));
document.getElementById('ref-observation').addEventListener('click', () => {
  window.location.href = 'observation.html';
});
document.getElementById('reference-layer3').addEventListener('click', () => {
  window.location.href = 'echo-layer3.html';
});
document.getElementById('experience-observation25').addEventListener('click', () => {
  window.location.href = 'observation-25.html';
});
document.getElementById('experience-detect').addEventListener('click', () => PageNavigation.openParagraph('experience'));
document.getElementById('reference-match').addEventListener('click', () => PageNavigation.openParagraph('reference'));

document.addEventListener('keydown', handleEscape);

// Language state is owned exclusively by translations/i18n.js.
PageNavigation.setHomeController({ setInfo, clearInfo });
  setInfo('structure');


})();