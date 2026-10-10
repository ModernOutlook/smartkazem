/* Modern Outlook — Single Source i18n Runtime */
(() => {
  'use strict';

  const SUPPORTED_LANGUAGES = Object.freeze(['fa', 'en', 'zh', 'ar']);
  const DEFAULT_LANGUAGE = 'fa';
  const STORAGE_KEY = 'modern-outlook.lang.v2';
  const LEGACY_STORAGE_KEY = 'modern-outlook.lang.v1';

  const catalogs = Object.create(null);
  let currentLanguage = DEFAULT_LANGUAGE;
  let languageRequestSerial = 0;
  let observer = null;

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  }

  function getLanguage() {
    try {
      return normalizeLanguage(
        localStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(LEGACY_STORAGE_KEY) ||
          document.documentElement.lang ||
          DEFAULT_LANGUAGE
      );
    } catch (_) {
      return normalizeLanguage(document.documentElement.lang);
    }
  }

  function get(path, fallback = '') {
    const parts = String(path || '').split('.');
    let value = catalogs[currentLanguage];

    for (const part of parts) {
      if (value == null) return fallback;
      value = value[part];
    }

    return value == null ? fallback : value;
  }

  function applyDom(catalog) {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const value = String(get(element.dataset.i18n, ''));
      if (value) element.textContent = value;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      const value = String(get(element.dataset.i18nHtml, ''));
      if (value) element.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
      const value = String(get(element.dataset.i18nAria, ''));
      if (value) element.setAttribute('aria-label', value);
    });

    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      const value = String(get(element.dataset.i18nTitle, ''));
      if (value) element.setAttribute('title', value);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const value = String(get(element.dataset.i18nPlaceholder, ''));
      if (value) element.setAttribute('placeholder', value);
    });

    document.querySelectorAll('[data-site-lang]').forEach((button) => {
      const active = button.dataset.siteLang === currentLanguage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    document.documentElement.lang = currentLanguage;
    document.documentElement.dir =
      catalog.dir || (['fa', 'ar'].includes(currentLanguage) ? 'rtl' : 'ltr');
    document.body.dataset.lang = currentLanguage;
    document.body.dataset.mode = currentLanguage;

    const isBookPage = document.querySelector(
      'meta[name="i18n-blocks"][content="book"]'
    );

    if (isBookPage) {
      document
        .querySelectorAll('.book-body .fa, .book-body .en, .book-body .zh, .book-body .ar')
        .forEach((element) => {
          const language = SUPPORTED_LANGUAGES.find((item) =>
            element.classList.contains(item)
          );
          element.hidden = language !== currentLanguage;
        });
    }
  }

  async function load(language) {
    const normalizedLanguage = normalizeLanguage(language);

    if (catalogs[normalizedLanguage]) {
      return catalogs[normalizedLanguage];
    }

    const response = await fetch(
      'translations/' + normalizedLanguage + '.json',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Translation catalog unavailable: ' + normalizedLanguage);
    }

    const data = await response.json();

    // Long-form pages may declare their own translation reservoir at the HTML
    // boundary. This keeps SiteI18n generic: adding a future page does not
    // require editing this runtime.
    const pageKey = document.querySelector('meta[name="i18n-page"]')?.content;
    const declaredCatalog = document.querySelector('meta[name="i18n-catalog"]')?.content;
    const chapterPath = declaredCatalog;

    if (pageKey && chapterPath) {
      const chapterResponse = await fetch(chapterPath, { cache: 'no-store' });
      if (!chapterResponse.ok) {
        throw new Error('Chapter translation catalog unavailable: ' + pageKey);
      }
      const chapter = await chapterResponse.json();
      data.chapters = data.chapters || {};
      data.chapters[pageKey] = chapter;
      data.bookContent = data.bookContent || {};
      data.bookContent[pageKey] = chapter;
    }

    // Home overlays can declare several dedicated book reservoirs without
    // adding page-specific fetch logic to this shared loader.
    const declaredBooks = document.querySelector('meta[name="i18n-catalogs"]')?.content;
    if (normalizedLanguage !== DEFAULT_LANGUAGE && declaredBooks) {
      const entries = declaredBooks.split(';').map((entry) => {
        const separator = entry.indexOf('=');
        if (separator < 1) return null;
        return [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
      }).filter((entry) => entry && entry[0] && entry[1]);
      data.bookContent = data.bookContent || {};
      await Promise.all(entries.map(async ([bookKey, path]) => {
        const bookResponse = await fetch(path, { cache: 'no-store' });
        if (!bookResponse.ok) {
          throw new Error('Book translation reservoir unavailable: ' + bookKey);
        }
        data.bookContent[bookKey] = await bookResponse.json();
      }));
    }

    catalogs[normalizedLanguage] = data;
    return data;
  }

  async function setLanguage(language) {
    const normalizedLanguage = normalizeLanguage(language);
    const requestSerial = ++languageRequestSerial;
    const catalog = await load(normalizedLanguage);

    if (requestSerial !== languageRequestSerial) return normalizedLanguage;

    currentLanguage = normalizedLanguage;

    try {
      localStorage.setItem(STORAGE_KEY, normalizedLanguage);
      localStorage.setItem(LEGACY_STORAGE_KEY, normalizedLanguage);
    } catch (_) {}

    applyDom(catalog);

    const pageKey = document.querySelector('meta[name="i18n-page"]')?.content;

    const canonicalPersianTitle =
      currentLanguage === DEFAULT_LANGUAGE
        ? window.SitePagePersianSources?.[pageKey]?.title
        : '';
    document.title = pageKey
      ? get('pages.' + pageKey + '.title', canonicalPersianTitle || get('home.title', document.title))
      : get('home.title', document.title);

    document.dispatchEvent(
      new CustomEvent('site:languagechange', {
        detail: { lang: normalizedLanguage, data: catalog }
      })
    );

    return normalizedLanguage;
  }

  function ensureAccessibilityRuntime(){
    if(window.SmartKazemAudio)return;

    // Reuse an explicit shared-engine script when a page already declares it.
    // This prevents a duplicate audio-engine.js load if script ordering changes.
    const existing = [...document.scripts].find((script) => {
      if (script.dataset.smartkazemAccessibility === 'true') return true;
      try {
        return new URL(script.src, document.baseURI).pathname.endsWith('/audio-engine.js');
      } catch (_) {
        return false;
      }
    });
    if(existing)return;

    const script=document.createElement('script');
    script.src='audio-engine.js';
    script.defer=true;
    script.dataset.smartkazemAccessibility='true';
    document.head.appendChild(script);
  }

  async function init() {
    ensureAccessibilityRuntime();
    const language = getLanguage();

    try {
      await setLanguage(language);
    } catch (_) {
      currentLanguage = DEFAULT_LANGUAGE;

      try {
        await setLanguage(DEFAULT_LANGUAGE);
      } catch (__) {}
    }
  }

  function installObserver() {
    if (observer || !document.body) return;

    let scheduled = false;

    observer = new MutationObserver(() => {
      const catalog = catalogs[currentLanguage];
      if (!catalog || scheduled) return;

      scheduled = true;
      observer.disconnect();

      requestAnimationFrame(() => {
        scheduled = false;
        applyDom(catalog);
        observer.observe(document.body, { subtree: true, childList: true });
      });
    });

    observer.observe(document.body, { subtree: true, childList: true });
  }

  window.SiteI18n = Object.freeze({
    SUPPORTED: SUPPORTED_LANGUAGES,
    DEFAULT: DEFAULT_LANGUAGE,
    KEY: STORAGE_KEY,
    getLanguage,
    setLanguage,
    load,
    get: (path, fallback = '') => get(path, fallback),
    getCatalog: () => catalogs[currentLanguage] || null
  });

  function installLanguageControls() {
    // Bind directly to each control rather than relying on a bubbling document
    // listener. Page-level interaction handlers may stop propagation; language
    // selection must still work consistently for every language, including RTL.
    document.querySelectorAll('[data-site-lang]').forEach((button) => {
      if (button.dataset.siteLangBound === 'true') return;
      button.dataset.siteLangBound = 'true';

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const language = normalizeLanguage(button.dataset.siteLang);

        try {
          localStorage.setItem(STORAGE_KEY, language);
          localStorage.setItem(LEGACY_STORAGE_KEY, language);
        } catch (_) {}

        setLanguage(language).catch((error) => {
          // Keep the current language usable if a catalog is temporarily
          // unavailable; expose the failure for diagnostics instead of an
          // unhandled promise rejection.
          console.error('[SiteI18n] Language switch failed:', language, error);
        });
      });
    });
  }

  document.addEventListener(
    'DOMContentLoaded',
    () => {
      installLanguageControls();
      init();
      installObserver();
    },
    { once: true }
  );
})();