/*
 * SmartKazem presentation bootstrap.
 *
 * Mobile owns the base presentation up to 1023px.
 * Desktop is loaded through the existing desktop stylesheet at >=1024px.
 *
 * Core application state, content, translations, engines, services and
 * adapters are deliberately not duplicated here.
 */
(function () {
  const isMobilePresentation = window.matchMedia("(max-width: 1023px)");

  function syncPresentationMode() {
    document.documentElement.dataset.presentation =
      isMobilePresentation.matches ? "mobile" : "desktop";
  }

  syncPresentationMode();

  if (typeof isMobilePresentation.addEventListener === "function") {
    isMobilePresentation.addEventListener("change", syncPresentationMode);
  } else {
    isMobilePresentation.addListener(syncPresentationMode);
  }

  const bookCoverScript = document.createElement('script');
  bookCoverScript.src = 'js/book-covers.js';
  bookCoverScript.defer = true;
  document.head.appendChild(bookCoverScript);
})();
