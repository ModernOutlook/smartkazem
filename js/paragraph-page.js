/* UI adapter for the shared paragraph workspace. */
(() => {
  'use strict';

  const ENTRY_MODES = Object.freeze({
    REFERENCE: 'reference',
    EXPERIENCE: 'experience'
  });

  const DOMAIN_ORDER = Object.freeze(['S', 'T', 'E', 'R', 'C']);

  const elements = {
    page: document.getElementById('paragraph-page'),
    input: document.getElementById('paragraph-input'),
    count: document.getElementById('paragraph-count'),
    mode: document.getElementById('paragraph-mode'),
    action: document.getElementById('paragraph-action'),
    output: document.getElementById('paragraph-output'),
    error: document.getElementById('paragraph-error'),
    source: document.getElementById('paragraph-source'),
    settings: document.getElementById('paragraph-settings'),
    key: document.getElementById('paragraph-api-key'),
    base: document.getElementById('paragraph-base-url'),
    model: document.getElementById('paragraph-model')
  };

  let entryMode = ENTRY_MODES.EXPERIENCE;

  function getLanguage() {
    return window.SiteI18n?.getLanguage?.() || 'fa';
  }

  function translate(key, fallback) {
    return window.SiteI18n?.get?.(key, fallback) || fallback;
  }

  function loadSettings() {
    const settings = window.ParagraphLLM.getSettings();
    elements.key.value = settings.apiKey;
    elements.base.value = settings.baseUrl;
    elements.model.value = settings.model;
  }

  function updateDirection() {
    elements.input.dir = ['fa', 'ar'].includes(getLanguage()) ? 'rtl' : 'ltr';
  }

  function escapeHtml(value) {
    return String(value || '').replace(
      /[&<>"]/g,
      (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
      }[character])
    );
  }

  function getActionLabel(mode) {
    return mode === ENTRY_MODES.REFERENCE
      ? translate('paragraphMachine.equivalence', 'هم‌سنگی')
      : translate('paragraphMachine.recognize', 'بازشناسی');
  }

  function getSourceLabel(mode) {
    return mode === ENTRY_MODES.REFERENCE
      ? translate(
          'paragraphMachine.referenceSource',
          'متن کاربر → ترجمه به فارسی → سنجش'
        )
      : translate(
          'paragraphMachine.experienceSource',
          'تولید فارسی → سنجش → ترجمه به زبان سایت'
        );
  }

  function openParagraphPage(kind) {
    entryMode = kind;
    elements.page.classList.add('open');
    elements.page.dataset.entry = kind;

    elements.input.disabled = kind !== ENTRY_MODES.REFERENCE;
    elements.count.disabled = kind !== ENTRY_MODES.EXPERIENCE;
    elements.mode.disabled = kind !== ENTRY_MODES.EXPERIENCE;
    elements.action.textContent = getActionLabel(kind);
    elements.source.textContent = getSourceLabel(kind);

    elements.input.value = '';
    elements.output.replaceChildren();
    elements.error.textContent = '';

    loadSettings();
    updateDirection();
  }

  function closeParagraphPage() {
    elements.page.classList.remove('open');
  }

  function renderJudgmentRows(judgment) {
    return DOMAIN_ORDER.map((domain) => {
      const item = judgment[domain];

      return (
        '<tr>' +
        '<td>' + window.ParagraphMachineCore.DOMAIN_NAMES[domain] + '</td>' +
        '<td class="pm-status pm-' + item.status + '">' +
        window.ParagraphMachineCore.STATUS_LABELS[item.status] +
        '</td>' +
        '<td>' + escapeHtml(item.reason) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderCard(paragraph, index, displayedText) {
    const processed = window.ParagraphMachineCore.processText(paragraph.text);

    return (
      '<article class="pm-card">' +
      '<div class="pm-index">' + (index + 1) + '</div>' +
      '<div class="pm-text">' + escapeHtml(displayedText || processed.text) + '</div>' +
      '<div class="pm-meta">' +
      '<span>' +
      processed.finalWordCount +
      ' / 144 ' +
      translate('paragraphMachine.words', 'کلمه') +
      '</span>' +
      '<span>' +
      processed.finalCharCount +
      ' / 900 ' +
      translate('paragraphMachine.chars', 'حرف') +
      '</span>' +
      '</div>' +
      '<table><thead><tr>' +
      '<th>' + translate('paragraphMachine.realm', 'قلمرو') + '</th>' +
      '<th>' + translate('paragraphMachine.status', 'وضعیت') + '</th>' +
      '<th>' + translate('paragraphMachine.reason', 'دلیل') + '</th>' +
      '</tr></thead><tbody>' +
      renderJudgmentRows(paragraph.judgment) +
      '</tbody></table>' +
      '</article>'
    );
  }

  async function evaluateReference() {
    const raw = elements.input.value.trim();
    if (!raw) {
      throw new Error(translate('paragraphMachine.empty', 'متنی وارد نشده است.'));
    }

    const language = getLanguage();
    const persianText = await window.ParagraphTranslation.toPersian(raw, language);
    const paragraph = await window.ParagraphWorkspaceAdapter.evaluatePersian(persianText);

    paragraph.displayedText = language === 'fa'
      ? paragraph.text
      : await window.ParagraphTranslation.fromPersian(paragraph.text, language);

    elements.source.textContent = translate(
      'paragraphMachine.referenceDone',
      'متن به فارسی منتقل و در هسته سنجیده شد.'
    );

    return [paragraph];
  }

  async function generateExperience() {
    const count = Number(elements.count.value);
    const results = await window.ParagraphWorkspaceAdapter.generatePersian(
      count,
      elements.mode.value
    );

    const language = getLanguage();
    const translated = language === 'fa'
      ? results.map((paragraph) => paragraph.text)
      : await window.ParagraphTranslation.fromPersianBatch(
          results.map((paragraph) => paragraph.text),
          language
        );

    results.forEach((paragraph, index) => {
      paragraph.displayedText = translated[index];
    });

    elements.source.textContent = translate(
      'paragraphMachine.experienceDone',
      'هسته به فارسی پردازش کرد و خروجی به زبان سایت ترجمه شد.'
    );

    return results;
  }

  async function run() {
    elements.error.textContent = '';
    elements.output.innerHTML =
      '<div class="pm-loading">' +
      translate('paragraphMachine.processing', 'در حال پردازش...') +
      '</div>';
    elements.action.disabled = true;

    try {
      const results = entryMode === ENTRY_MODES.REFERENCE
        ? await evaluateReference()
        : await generateExperience();

      elements.output.innerHTML = results
        .map((paragraph, index) => renderCard(
          paragraph,
          index,
          paragraph.displayedText
        ))
        .join('');
    } catch (error) {
      elements.error.textContent = error.message || String(error);
    } finally {
      elements.action.disabled = false;
    }
  }

  function saveSettings() {
    window.ParagraphLLM.saveSettings({
      apiKey: elements.key.value.trim(),
      baseUrl: elements.base.value.trim(),
      model: elements.model.value.trim()
    });
    elements.error.textContent = translate(
      'paragraphMachine.saved',
      'تنظیمات ذخیره شد.'
    );
  }

  elements.action.addEventListener('click', run);
  document.getElementById('paragraph-close').addEventListener(
    'click',
    () => window.SitePages?.closeParagraph?.()
  );
  document.getElementById('paragraph-settings-toggle').addEventListener(
    'click',
    () => elements.settings.classList.toggle('collapsed')
  );
  document.getElementById('paragraph-save-settings').addEventListener(
    'click',
    saveSettings
  );

  document.addEventListener('site:languagechange', () => {
    updateDirection();

    if (elements.page.classList.contains('open')) {
      elements.action.textContent = getActionLabel(entryMode);
    }
  });

  loadSettings();

  window.ParagraphPage = Object.freeze({
    open: openParagraphPage,
    close: closeParagraphPage
  });
})();
