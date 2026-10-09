(() => {
  'use strict';

  const splash = document.getElementById('splash');
  const logoViewer = document.getElementById('logo-viewer');

  function loadLogoViewerStyles() {
    if (document.querySelector('link[data-logo-viewer-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/logo-viewer.css';
    link.dataset.logoViewerStyle = 'true';
    document.head.appendChild(link);
  }

  async function loadLogoViewerLanguage(language) {
    const normalized = ['fa', 'en', 'zh', 'ar'].includes(language) ? language : 'fa';
    try {
      const response = await fetch(`translations/logo-viewer/${normalized}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Logo viewer translation unavailable');
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  async function localizeLogoViewer(language) {
    if (!logoViewer) return;

    const data = await loadLogoViewerLanguage(language);
    if (!data) return;

    let slogan = logoViewer.querySelector('.logo-slogan');
    if (!slogan) {
      slogan = document.createElement('p');
      slogan.className = 'logo-slogan';
      logoViewer.prepend(slogan);
    }
    slogan.textContent = data.slogan || '';

    const logoArt = logoViewer.querySelector('.logo-art');
    const logoImage = logoViewer.querySelector('.logo-art img');
    const inventory = logoViewer.querySelector('.inventory-link');

    logoViewer.setAttribute('aria-label', data.dialog || '');
    if (logoArt) logoArt.setAttribute('aria-label', data.logo || '');
    if (logoImage) logoImage.setAttribute('alt', data.logoAlt || data.logo || '');
    if (inventory) inventory.textContent = data.inventory || '';
  }

  function initLogoViewerLocalization() {
    if (!logoViewer) return;
    loadLogoViewerStyles();

    const apply = () => {
      const language = window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
      localizeLogoViewer(language);
    };

    document.addEventListener('site:languagechange', (event) => {
      localizeLogoViewer(event.detail?.lang || window.SiteI18n?.getLanguage?.() || 'fa');
    });

    apply();
  }

  function initSplash() {
    initLogoViewerLocalization();
  }

  const waitForDom = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSplash, { once: true });
    } else {
      initSplash();
    }
  };

  waitForDom();

  if (!splash) return;

  const root = document.documentElement;
  const waitForApp = root.hasAttribute('data-splash-wait');

  let domReady = false;
  let windowReady = false;
  let imagesTotal = 0;
  let imagesLoaded = 0;
  let progress = 0;
  let finished = false;
  let appReady = false;

  function paint() {
    if (finished) return;

    const imageProgress = imagesTotal
      ? imagesLoaded / imagesTotal
      : 1;

    let nextProgress =
      0.15 * Number(domReady) +
      0.25 * Number(windowReady) +
      (domReady ? 0.6 * imageProgress : 0);

    nextProgress = Math.min(1, Math.max(progress, nextProgress));
    progress = nextProgress;
    splash.style.opacity = String(1 - progress);

    if (progress >= 0.999) finish();
  }

  function finish() {
    if (finished) return;

    finished = true;
    splash.style.opacity = '0';

    const remove = () => splash.remove();
    splash.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 700);
  }

  function trackImages() {
    const splashImage = splash.querySelector('img');
    const images = [...document.images].filter((image) => {
      const lazy = image.loading?.toLowerCase?.() === 'lazy';
      return image !== splashImage && !lazy;
    });

    imagesTotal = images.length;
    imagesLoaded = images.filter((image) => image.complete).length;

    images.forEach((image) => {
      if (image.complete) return;

      const markLoaded = () => {
        imagesLoaded += 1;
        paint();
      };

      image.addEventListener('load', markLoaded, { once: true });
      image.addEventListener('error', markLoaded, { once: true });
    });

    paint();
  }

  function handleDomReady() {
    if (domReady) return;
    domReady = true;
    trackImages();
    paint();
  }

  function handleWindowReady() {
    if (windowReady) return;

    const fontsReady = document.fonts?.ready || Promise.resolve();
    fontsReady.then(() => {
      windowReady = true;
      if (!waitForApp || appReady) paint();
    });
  }

  document.addEventListener('DOMContentLoaded', handleDomReady, { once: true });
  window.addEventListener('load', handleWindowReady, { once: true });

  document.addEventListener('app-ready', () => {
    appReady = true;
    if (windowReady) paint();
  });

  if (document.readyState !== 'loading') handleDomReady();
  if (document.readyState === 'complete') handleWindowReady();

  window.setTimeout(finish, 15000);
})();
