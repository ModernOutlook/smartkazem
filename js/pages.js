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
      if (page) page.style.display = 'none';
    });

    const page = pages[pageKey];
    if (page) page.style.display = 'block';
  }

  function returnHome() {
    window.location.reload();
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
    returnHome('share');
  }

  function openExperience() {
    showPage('experience');
    homeController.clearInfo();
  }

  function closeExperience() {
    returnHome('experience');
  }

  function openContinuity() {
    showPage('continuity');
    homeController.clearInfo();
  }

  function closeContinuity() {
    returnHome('continuity');
  }

  function openStructure() {
    window.clearTimeout(window.__structureOpenTimer);
    showPage('structure');
    homeController.clearInfo();
  }

  function closeStructure() {
    returnHome('structure');
  }

  function openReference() {
    showPage('reference');
  }

  function closeReference() {
    returnHome('reference');
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
