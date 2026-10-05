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
    paragraphOrigin = kind;
    showPage('paragraph');
    window.ParagraphPage?.open(kind);
    homeController.clearInfo();
  }

  function closeParagraph() {
    window.ParagraphPage?.close();
    showPage(paragraphOrigin);
  }

  function openShare() {
    showPage('share');
    homeController.clearInfo();
  }

  function closeShare() {
    returnHome();
  }

  function openExperience() {
    showPage('experience');
    homeController.clearInfo();
  }

  function closeExperience() {
    returnHome();
  }

  function openContinuity() {
    showPage('continuity');
    homeController.clearInfo();
  }

  function closeContinuity() {
    returnHome();
  }

  function openStructure() {
    window.clearTimeout(window.__structureOpenTimer);
    showPage('structure');
    homeController.clearInfo();
  }

  function closeStructure() {
    returnHome();
  }

  function openReference() {
    showPage('reference');
    homeController.clearInfo();
  }

  function closeReference() {
    returnHome();
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