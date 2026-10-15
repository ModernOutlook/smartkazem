(() => {
  'use strict';

  const source = window.DisturbedManifestoSource;
  const list = document.getElementById('part-list');
  const reader = document.getElementById('reader');
  const close = document.getElementById('manifesto-close');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  if (!source || !Array.isArray(source.parts) || !list || !reader || !close) {
    throw new Error('Disturbed Manifesto runtime could not initialize.');
  }

  let activeIndex = 0;

  const faNumber = (value) =>
    String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[digit]);

  const language = () => window.SiteI18n?.getLanguage?.() || 'fa';
  const siteNumber = (value) => new Intl.NumberFormat(language()).format(value);
  const catalog = () => window.SiteI18n?.getCatalog?.() || {};

  function label(key, fallback) {
    return window.SiteI18n?.get?.('labels.' + key, fallback) || fallback;
  }

  function activePart() {
    if (language() === 'fa') return source.parts[activeIndex];

    const translated = catalog()?.chapters?.disturbedManifesto?.parts?.[language()];
    return translated?.[activeIndex] || null;
  }

  function activePartForIndex(index) {
    if (language() === 'fa') return source.parts[index];
    const translated = catalog()?.chapters?.disturbedManifesto?.parts?.[language()];
    return translated?.[index] || source.parts[index];
  }

  function activeTitle() {
    if (language() === 'fa') return source.title;
    return catalog()?.chapters?.disturbedManifesto?.title?.[language()] ||
      catalog()?.pages?.disturbedManifesto?.title ||
      source.title;
  }

  function createText(tag, text, className = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function renderReader() {
    const part = activePart();
    const lang = language();

    reader.replaceChildren();
    reader.setAttribute('role', 'tabpanel');
    reader.tabIndex = 0;
    reader.setAttribute('aria-labelledby', `manifesto-tab-${activeIndex}`);

    if (!part) {
      const fallback = createText(
        'p',
        lang === 'fa'
          ? 'ترجمهٔ این بخش در دسترس نیست.'
          : 'This part is not available in the selected language.',
        'prose'
      );
      reader.appendChild(fallback);
      return;
    }

    const header = document.createElement('header');
    header.className = 'reader-head';

    const titleGroup = document.createElement('div');
    titleGroup.appendChild(createText('div', activeTitle(), 'story-label'));

    const heading = createText('h2', part.title);
    heading.id = 'manifesto-reader-heading';
    titleGroup.appendChild(heading);

    const total = siteNumber(source.total);
    const number = siteNumber(part.number);
    const partOf = label('partOf', 'Part {n} of {t}')
      .replace('{n}', number)
      .replace('{t}', total);

    titleGroup.appendChild(createText('p', partOf));
    header.appendChild(titleGroup);
    reader.appendChild(header);

    const section = document.createElement('section');
    section.className = 'block';
    section.setAttribute('aria-labelledby', 'manifesto-text-heading');
    section.appendChild(createText('h3', label('partText', 'Part text')));
    section.querySelector('h3').id = 'manifesto-text-heading';

    part.paragraphs.forEach((paragraph) => {
      section.appendChild(createText('p', paragraph, 'prose'));
    });

    reader.appendChild(section);

  }

  function applyLanguage() {
    const lang = language();
    const title = activeTitle();

    document.documentElement.lang = lang;
    document.documentElement.dir = ['fa', 'ar'].includes(lang) ? 'rtl' : 'ltr';

    if (pageTitle) pageTitle.textContent = title;

    if (pageSubtitle) {
      const subtitle = {
        fa: 'مانیفست آشوب‌زده در ۱۱ بخش.',
        en: 'Disturbed Manifesto in 11 parts.',
        ar: 'البيان المضطرب في 11 جزءًا.',
        zh: '《扰动宣言》共 11 部分。'
      };
      pageSubtitle.textContent = subtitle[lang] || subtitle.en;
    }

    document.getElementById('part-list-heading').textContent =
      label('manifestoParts', 'Manifesto parts');

    document.querySelector('section.controls nav')?.setAttribute(
      'aria-label',
      label('partNavigation', 'Part navigation')
    );

    close.setAttribute('aria-label', label('back', 'Back'));
  }

  function render() {
    const lang = language();
    const total = source.parts.length;

    document.querySelectorAll('.part').forEach((button, index) => {
      const active = index === activeIndex;
      const part = activePartForIndex(index) || source.parts[index];
      button.classList.toggle('active', active);
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      button.textContent = `${siteNumber(part.number)} · ${part.title}`;

      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');

      const number = siteNumber(source.parts[index].number);

      button.setAttribute('aria-label', `${number} · ${activePartForIndex(index)?.title || ''}`);
    });

    renderReader();
  }

  function select(index, moveFocus = false) {
    if (index < 0 || index >= source.parts.length) return;

    activeIndex = index;
    render();

    if (moveFocus) list.children[index]?.focus({ preventScroll: true });
  }

  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'horizontal');
  source.parts.forEach((part, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'part';
    button.id = `manifesto-tab-${index}`;
    button.textContent = `${siteNumber(part.number)} · ${part.title}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'reader');
    button.setAttribute('aria-selected', String(index === activeIndex));
    button.tabIndex = index === activeIndex ? 0 : -1;

    button.addEventListener('click', () => select(index));

    button.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;

      event.preventDefault();

      const rtl = document.documentElement.dir === 'rtl';
      let target = index;

      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = source.parts.length - 1;
      if (event.key === 'ArrowRight') target = rtl ? index - 1 : index + 1;
      if (event.key === 'ArrowLeft') target = rtl ? index + 1 : index - 1;

      if (target < 0) target = source.parts.length - 1;
      if (target >= source.parts.length) target = 0;

      select(target, true);
    });

    list.appendChild(button);
  });

  close.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = 'index.html';
  });

  document.addEventListener('keydown', (event) => {
    if (!list?.isConnected) return;
    if (event.key === 'Escape') close.click();
  });

  document.addEventListener('site:languagechange', () => {
    if (!list?.isConnected) return;
    applyLanguage();
    render();
  });

  applyLanguage();
  render();
})();
