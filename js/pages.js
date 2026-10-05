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

function showPage(pageKey) {
  Object.values(pages).forEach((page) => {
    if (page) page.style.display = 'none';
  });

  const page = pages[pageKey];
  if (page) page.style.display = 'block';
}

function returnHome(realmId) {
  showPage('home');
  setInfo(realmId);
}

function openParagraph(kind) {
  paragraphOrigin = kind;
  showPage('paragraph');
  window.ParagraphPage?.open(kind);
  clearInfo();
}

function closeParagraph() {
  window.ParagraphPage?.close();
  returnHome(paragraphOrigin);
}

function openShare() {
  showPage('share');
  clearInfo();
}

function closeShare() {
  returnHome('share');
}

function openExperience() {
  showPage('experience');
  clearInfo();
}

function closeExperience() {
  returnHome('experience');
}

function openContinuity() {
  showPage('continuity');
  clearInfo();
}

function closeContinuity() {
  returnHome('continuity');
}

function openStructure() {
  window.clearTimeout(window.__structureOpenTimer);
  showPage('structure');
  clearInfo();
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