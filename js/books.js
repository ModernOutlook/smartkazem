(() => {
  'use strict';

  const BOOK_KINDS = Object.freeze({
  FORGERS: 'forgers',
  HUMAN_MACHINES: 'humanMachines'
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
  }
});

  const FABLE_TITLES = Object.freeze({
  fa: 'حکمت فابل',
  en: 'Fable Wisdom',
  zh: '寓言智慧',
  ar: 'حكمة الحكاية'
});

  let bookReturn = 'home';
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
    if (
      activeBookKind === BOOK_KINDS.HUMAN_MACHINES &&
      Array.isArray(window.HumanMachinesCatalog?.chapters)
    ) {
      return window.HumanMachinesCatalog.chapters;
    }
  }

  const catalog = activeBookCatalog();
  if (catalog) return catalog.chapters;

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

  activeChapters().forEach((chapter, index) => {
    const button = createElement(
      'button',
      `book-tab${index === activeIndex ? ' active' : ''}`,
      chapter.title
    );

    button.type = 'button';
    button.addEventListener('click', () => selectChapter(index));
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
    button.classList.toggle('active', buttonIndex === index);
  });

  const fragment = renderBookHeader(index, chapter);
  if (index === chapters.length - 1) {
    const moral = renderFableWisdom(activeBookCatalog());
    if (moral) fragment.appendChild(moral);
  }

  bookBody.classList.toggle('lang-en', getCurrentLanguage() === 'en');
  bookBody.dir = getCurrentLanguage() === 'en' ? 'ltr' : 'rtl';
  bookBody.replaceChildren(fragment);
  bookBody.scrollTop = 0;
}

function openBook(from = 'home', kind = BOOK_KINDS.FORGERS) {
  bookReturn = from;
  activeBookKind = kind;

  const catalog = window.SiteI18n?.getCatalog?.()?.pages?.[activeBookKind];
  if (catalog?.title) {
    bookTitle.textContent = `📖 ${catalog.title} — ${catalog.subtitle || ''}`;
  } else {
    const { title, subtitle } = getBookTitle();
    bookTitle.textContent = `📖 ${title} — ${subtitle}`;
  }

  window.SitePages?.showPage('book');
  buildBookTabs(0);
  selectChapter(0);
}

function closeBook() {
  if (bookReturn === 'reference') {
    window.SitePages?.showPage('reference');
    return;
  }

  if (bookReturn === 'share') {
    window.SitePages?.showPage('share');
    return;
  }

  window.SitePages?.returnHome('reference');
}

  window.BookNavigation = Object.freeze({ buildBookTabs, selectChapter, openBook, closeBook });
})();
