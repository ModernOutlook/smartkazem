(() => {
  'use strict';

  const PAGE_IDS = Object.freeze({
    home: 'home-page',
    share: 'share-page',
    experience: 'experience-page',
    continuity: 'continuity-page',
    structure: 'structure-page',
    reference: 'reference-page',
    book: 'book-page',
    paragraph: 'paragraph-page'
  });

  const pages = Object.fromEntries(
    Object.entries(PAGE_IDS).map(([key, id]) => [key, document.getElementById(id)])
  );

  let paragraphOrigin = 'experience';
  let lastFocusElement = null;

  const PAGE_CLOSE_BUTTONS = Object.freeze({ share: 'share-close', experience: 'experience-close', continuity: 'continuity-close', structure: 'structure-close', reference: 'reference-close', paragraph: 'paragraph-close' });
  function rememberFocus() { const active = document.activeElement; lastFocusElement = active instanceof HTMLElement && active !== document.body ? active : null; }
  function focusPage(pageKey) { document.getElementById(PAGE_CLOSE_BUTTONS[pageKey])?.focus({ preventScroll: true }); }
  function restoreFocus() { const target = lastFocusElement; lastFocusElement = null; if (target?.isConnected) target.focus({ preventScroll: true }); }
  let homeController = {
    setInfo: () => {},
    clearInfo: () => {}
  };

  function showPage(pageKey) {
    Object.values(pages).forEach((page) => {
      page?.classList.remove('is-active');
    });

    pages[pageKey]?.classList.add('is-active');
  }

  function returnHome() {
    showPage('home');
    // Restore the selected realm information panel when returning home.
    homeController.setInfo();
  }

  function openParagraph(kind) {
    rememberFocus();
    paragraphOrigin = kind;
    showPage('paragraph');
    focusPage('paragraph');
    window.ParagraphPage?.open(kind);
    homeController.clearInfo();
  }

  function closeParagraph() {
    window.ParagraphPage?.close();
    showPage(paragraphOrigin);
    restoreFocus();
  }

  function openShare() {
    rememberFocus();
    showPage('share');
    focusPage('share');
    homeController.clearInfo();
  }

  function closeShare() {
    returnHome();
    restoreFocus();
  }

  function openExperience() {
    rememberFocus();
    showPage('experience');
    focusPage('experience');
    homeController.clearInfo();
  }

  function closeExperience() {
    returnHome();
    restoreFocus();
  }

  function openContinuity() {
    rememberFocus();
    showPage('continuity');
    focusPage('continuity');
    homeController.clearInfo();
  }

  function closeContinuity() {
    returnHome();
    restoreFocus();
  }

  function openStructure() {
    window.clearTimeout(window.__structureOpenTimer);
    showPage('structure');
    homeController.clearInfo();
  }

  function closeStructure() {
    returnHome();
    restoreFocus();
  }

  function openReference() {
    rememberFocus();
    showPage('reference');
    focusPage('reference');
    homeController.clearInfo();
  }

  function closeReference() {
    returnHome();
    restoreFocus();
  }

  function setHomeController(controller) {
    if (!controller) return;

    homeController = {
      setInfo: typeof controller.setInfo === 'function'
        ? controller.setInfo
        : () => {},
      clearInfo: typeof controller.clearInfo === 'function'
        ? controller.clearInfo
        : () => {}
    };
  }

  window.SitePages = Object.freeze({
    IDS: PAGE_IDS,
    showPage,
    returnHome,
    openParagraph,
    closeParagraph,
    openShare,
    closeShare,
    openExperience,
    closeExperience,
    openContinuity,
    closeContinuity,
    openStructure,
    closeStructure,
    openReference,
    closeReference,
    setHomeController
  });
})();