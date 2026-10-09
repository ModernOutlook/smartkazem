(() => {
  'use strict';

  const STANDALONE_BOOK_PAGES = new Set([
    'philosophical-treatise', 'shahnameh', 'emergence', 'observation25',
    'possibleMirror', 'emergence2', 'observation', 'layer3'
  ]);
  const DYNAMIC_BOOK_PAGE_ID = 'book-page';

  const getLanguage = () => window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
  const isBookPage = () => STANDALONE_BOOK_PAGES.has(
    document.querySelector('meta[name="i18n-page"]')?.getAttribute('content') || ''
  ) || Boolean(document.getElementById(DYNAMIC_BOOK_PAGE_ID));

  function loadStyles() {
    if (document.querySelector('link[data-book-cover-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'ui/shared/book-cover.css';
    link.dataset.bookCoverStyle = 'true';
    document.head.appendChild(link);
  }

  async function loadLabels(language) {
    const normalized = ['fa', 'en', 'zh', 'ar'].includes(language) ? language : 'fa';
    try {
      const response = await fetch('translations/book-cover.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Book-cover translation unavailable');
      const catalog = await response.json();
      return catalog[normalized] || catalog.fa || null;
    } catch (_) {
      return null;
    }
  }

  function currentTitle() {
    const dynamicTitle = document.getElementById('book-title');
    if (dynamicTitle?.textContent.trim()) return dynamicTitle.textContent.replace(/^📖\s*/, '').trim();
    return document.querySelector('.child-page .top h1')?.textContent.trim() || '';
  }

  async function renderCover(language = getLanguage()) {
    if (!isBookPage()) return;
    loadStyles();
    const labels = await loadLabels(language);
    if (!labels) return;

    let section = document.querySelector('.book-cover-slot');
    if (!section) {
      section = document.createElement('section');
      section.className = 'book-cover-slot';
      section.setAttribute('aria-labelledby', 'book-cover-heading');

      const heading = document.createElement('h2');
      heading.id = 'book-cover-heading';
      heading.className = 'book-cover-label';

      const frame = document.createElement('div');
      frame.className = 'book-cover-frame';
      frame.setAttribute('role', 'img');

      const placeholder = document.createElement('div');
      placeholder.className = 'book-cover-placeholder';
      frame.appendChild(placeholder);
      section.append(heading, frame);

      const dynamicPage = document.getElementById(DYNAMIC_BOOK_PAGE_ID);
      if (dynamicPage) {
        const shell = dynamicPage.querySelector('.book-shell');
        const tabs = document.getElementById('book-tabs');
        shell?.insertBefore(section, tabs || shell.firstChild);
      } else {
        const shell = document.querySelector('.child-page .shell');
        const controls = shell?.querySelector('.controls, .visual, .main, .book-body');
        shell?.insertBefore(section, controls || shell.firstChild);
      }
    }

    const title = currentTitle();
    section.querySelector('.book-cover-label').textContent = labels.heading || '';
    section.querySelector('.book-cover-frame').setAttribute(
      'aria-label', title ? `${labels.altPrefix || labels.heading}: ${title}` : (labels.heading || '')
    );
    section.querySelector('.book-cover-placeholder').textContent = labels.placeholder || '';
  }

  function init() {
    if (!isBookPage()) return;
    renderCover();
    document.addEventListener('site:languagechange', (event) => {
      renderCover(event.detail?.lang || getLanguage());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
