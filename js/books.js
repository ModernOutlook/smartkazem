(() => {
  'use strict';

  const BOOK_KINDS = Object.freeze({
  FORGERS: 'forgers',
  HUMAN_MACHINES: 'humanMachines',
  TABAHIAN: 'tabahian'
});

  const BOOK_TITLES = Object.freeze({
  [BOOK_KINDS.FORGERS]: {
    fa: ['جاعلان تقلید', 'در ده فصل'],
    en: ['The Forgers of Imitation', 'Ten Chapters'],
    zh: ['《模仿的伪造者》', '十章'],
    ar: ['مزوّرو التقليد', 'عشرة فصول']
  },
  [BOOK_KINDS.HUMAN_MACHINES]: {
    fa: ['انسان و ماشین‌هایش', 'هفت بخش'],
    en: ['Humanity and Its Machines', 'Seven Parts'],
    zh: ['人类与他们的机器', '七个部分'],
    ar: ['الإنسان وآلاته', 'سبعة أجزاء']
  },
  [BOOK_KINDS.TABAHIAN]: {
    fa: ['تباهیان', 'سه فصل'],
    en: ['The Corrupted', 'Three Chapters'],
    zh: ['腐化者', '三章'],
    ar: ['الفاسدون', 'ثلاثة فصول']
  }
});

  const FABLE_TITLES = Object.freeze({
  fa: 'حکمت فابل',
  en: 'Fable Wisdom',
  zh: '寓言智慧',
  ar: 'حكمة الحكاية'
});

  let bookReturn = 'home';
  let bookReturnFocus = null;
  let activeBookKind = BOOK_KINDS.FORGERS;

  const bookTabs = document.getElementById('book-tabs');
  const bookBody = document.getElementById('book-body');
  const bookTitle = document.getElementById('book-title');

  function getCurrentLanguage() {
    return window.SiteI18n?.getLanguage?.() || 'fa';
  }

  function activeBookCatalog() {
  if (getCurrentLanguage() === 'fa') return null;

  try {
    const catalog = window.SiteI18n?.getCatalog?.()?.pages?.[activeBookKind];
    return catalog?.chapters?.length ? catalog : null;
  } catch (_) {
    return null;
  }
}

function activeChapters() {
  if (getCurrentLanguage() === 'fa') {
    if (activeBookKind === BOOK_KINDS.FORGERS) return window.ForgersCatalog;
    if (activeBookKind === BOOK_KINDS.TABAHIAN) return window.TabahianCatalog?.chapters || [];
    if (
      activeBookKind === BOOK_KINDS.HUMAN_MACHINES &&
      Array.isArray(window.HumanMachinesCatalog?.chapters)
    ) {
      return window.HumanMachinesCatalog.chapters;
    }
  }

  const catalog = activeBookCatalog();
  if (catalog) return catalog.chapters;

  if (activeBookKind === BOOK_KINDS.TABAHIAN) return [];

  const catalogsByLanguage = {
    zh: window.ForgersCatalogZh,
    ar: window.ForgersCatalogAr,
    en: window.ForgersCatalogEn
  };

  return catalogsByLanguage[getCurrentLanguage()] || window.ForgersCatalogEn;
}

function getBookTitle() {
  const language = getCurrentLanguage();
  const fallback = BOOK_TITLES[activeBookKind]?.[language] || BOOK_TITLES[activeBookKind].fa;
  const catalog = activeBookCatalog();

  return {
    title: catalog?.title || fallback[0],
    subtitle: catalog?.subtitle || fallback[1]
  };
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function buildBookTabs(activeIndex = 0) {
  bookTabs.replaceChildren();
  bookTabs.setAttribute('role', 'tablist');
  bookTabs.setAttribute('aria-orientation', 'horizontal');

  activeChapters().forEach((chapter, index) => {
    const button = createElement(
      'button',
      `book-tab${index === activeIndex ? ' active' : ''}`,
      chapter.title
    );

    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.id = `book-tab-${index}`;
    button.setAttribute('aria-selected', String(index === activeIndex));
    button.setAttribute('aria-controls', 'book-body');
    button.tabIndex = index === activeIndex ? 0 : -1;
    button.addEventListener('click', () => selectChapter(index));
    button.addEventListener('keydown', (event) => {
      const count = activeChapters().length;
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % count;
      if (event.key === 'ArrowLeft') next = (index - 1 + count) % count;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = count - 1;
      const target = bookTabs.children[next];
      target?.focus({ preventScroll: true });
      selectChapter(next);
    });
    bookTabs.appendChild(button);
  });
}

function renderBookHeader(chapterIndex, chapter) {
  const fragment = document.createDocumentFragment();

  if (chapterIndex === 0) {
    const { title, subtitle } = getBookTitle();
    fragment.append(
      createElement('h1', 'book-h1', title),
      createElement('p', 'book-sub', subtitle)
    );
  }

  const chapterElement = createElement('div', 'chapter');
  chapterElement.style.setProperty('--dot', chapter.dot);

  const heading = createElement('h2');
  heading.appendChild(createElement('i'));
  heading.appendChild(document.createTextNode(chapter.title));
  chapterElement.appendChild(heading);

  chapter.paragraphs.forEach((paragraph) => {
    chapterElement.appendChild(createElement('p', '', paragraph));
  });

  fragment.appendChild(chapterElement);
  return fragment;
}

function renderFableWisdom(catalog) {
  if (activeBookKind !== BOOK_KINDS.FORGERS) return null;

  const language = getCurrentLanguage();
  const moralTextByLanguage = {
    fa: bookMoralFa,
    en: bookMoralEn,
    zh: '展示技艺的人只能走到有观众的地方；磨炼技艺的人能走到自己能够抵达的地方。而一座人人都是观众的森林，最终除了观看本身，便再没有什么可看。',
    ar: 'من يعرض مهارة لا يذهب إلا بقدر ما لديه من متفرجين؛ ومن يمارس مهارة يذهب إلى أبعد ما يستطيع. والغابة التي يكون الجميع فيها متفرجين لا يبقى فيها في النهاية شيء يُرى سوى فعل المشاهدة نفسها.'
  };

  const moral = createElement('div', 'moral');
  moral.appendChild(createElement('h2', '', FABLE_TITLES[language] || FABLE_TITLES.fa));
  moral.appendChild(createElement('p', '', catalog?.moral || moralTextByLanguage[language] || moralTextByLanguage.fa));
  return moral;
}

function selectChapter(index) {
  const chapters = activeChapters();
  const chapter = chapters[index];
  if (!chapter) return;

  document.querySelectorAll('.book-tab').forEach((button, buttonIndex) => {
    const active = buttonIndex === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });

  const fragment = renderBookHeader(index, chapter);
  if (index === chapters.length - 1) {
    const moral = renderFableWisdom(activeBookCatalog());
    if (moral) fragment.appendChild(moral);
  }

  bookBody.setAttribute('role', 'tabpanel');
  bookBody.setAttribute('aria-labelledby', `book-tab-${index}`);
  bookBody.classList.toggle('lang-en', getCurrentLanguage() === 'en');
  bookBody.dir = getCurrentLanguage() === 'en' ? 'ltr' : 'rtl';
  bookBody.replaceChildren(fragment);
  bookBody.scrollTop = 0;
}

function openBook(from = 'home', kind = BOOK_KINDS.FORGERS) {
  bookReturn = from;
  bookReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeBookKind = kind;

  const catalog = window.SiteI18n?.getCatalog?.()?.pages?.[activeBookKind];
  if (catalog?.title) {
    bookTitle.textContent = `📖 ${catalog.title} — ${catalog.subtitle || ''}`;
  } else {
    const { title, subtitle } = getBookTitle();
    bookTitle.textContent = `📖 ${title} — ${subtitle}`;
  }

  window.SitePages?.showPage('book');
  document.getElementById('book-close')?.focus({ preventScroll: true });
  buildBookTabs(0);
  selectChapter(0);
}

function closeBook() {
  if (bookReturn === 'reference') window.SitePages?.showPage('reference');
  else if (bookReturn === 'share') window.SitePages?.showPage('share');
  else window.SitePages?.returnHome('reference');
  if (bookReturnFocus?.isConnected) bookReturnFocus.focus({ preventScroll: true });
  bookReturnFocus = null;
}

  window.BookNavigation = Object.freeze({ buildBookTabs, selectChapter, openBook, closeBook });
})();
