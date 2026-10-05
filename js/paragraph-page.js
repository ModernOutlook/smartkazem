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
    action: document.getElementById('paragraph-recognize'),
    output: document.getElementById('paragraph-output'),
    error: document.getElementById('paragraph-error'),
    source: document.getElementById('paragraph-source'),
    settings: document.getElementById('paragraph-settings'),
    key: document.getElementById('paragraph-api-key'),
    base: document.getElementById('paragraph-base-url'),
    model: document.getElementById('paragraph-model'),
    generationControls: document.getElementById('paragraph-generation-controls'),
    choices: [...document.querySelectorAll('.pm-realm-choice')],
    popover: document.getElementById('pm-judgment-popover')
  };

  let entryMode = ENTRY_MODES.EXPERIENCE;
  let currentResults = [];
  const userJudgments = Object.create(null);
  const STATUS_OPTIONS = Object.freeze([
    ['ok', 'مطابق'],
    ['warn', 'مبهم'],
    ['bad', 'متناقض']
  ]);

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

    const experienceMode = kind === ENTRY_MODES.EXPERIENCE;
    elements.input.disabled = !experienceMode;
    elements.count.disabled = !experienceMode;
    elements.mode.disabled = !experienceMode;

    if (experienceMode) {
      elements.count.removeAttribute('disabled');
      elements.mode.removeAttribute('disabled');
    } else {
      elements.count.setAttribute('disabled', '');
      elements.mode.setAttribute('disabled', '');
    }
    elements.action.textContent = getActionLabel(kind);
    elements.source.textContent = getSourceLabel(kind);

    elements.input.value = '';
    currentResults = [];
    DOMAIN_ORDER.forEach((domain) => delete userJudgments[domain]);
    elements.choices.forEach((choice) => {
      choice.classList.remove('judgment-ok', 'judgment-warn', 'judgment-bad');
      delete choice.dataset.judgment;
    });
    closeJudgmentPopover();
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
    const evaluation = paragraph.userEvaluation || '';
    const evaluationClass = evaluation ? ' pm-user-' + evaluation : '';
    const processed = window.ParagraphMachineCore.processText(paragraph.text);

    return (
      '<article class="pm-card">' +
      '<div class="pm-index">' + (index + 1) + '</div>' +
      '<div class="pm-text' + evaluationClass + '">' + escapeHtml(displayedText || processed.text) + '</div>' +
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

  function closeJudgmentPopover() {
    if (!elements.popover) return;
    elements.popover.hidden = true;
    elements.popover.replaceChildren();
  }

  function openJudgmentPopover(button) {
    const domain = button.dataset.domain;
    const name = button.querySelector('span')?.textContent || '';
    elements.popover.className = 'pm-judgment-popover pm-domain-' + domain;
    elements.popover.innerHTML =
      '<strong>' + escapeHtml(name) + '</strong>' +
      '<div class="pm-judgment-options">' +
      STATUS_OPTIONS.map(([value, label]) =>
        '<button type="button" data-status="' + value + '" class="pm-choice-' + value + '">' + label + '</button>'
      ).join('') +
      '</div>';
    elements.popover.hidden = false;
    elements.popover.querySelectorAll('[data-status]').forEach((option) => {
      option.addEventListener('click', () => {
        userJudgments[domain] = option.dataset.status;
        button.dataset.judgment = option.dataset.status;
        button.classList.remove('judgment-ok', 'judgment-warn', 'judgment-bad');
        button.classList.add('judgment-' + option.dataset.status);
        closeJudgmentPopover();
      });
    });
  }

  function evaluateUserJudgments() {
    if (!currentResults.length) throw new Error(translate('paragraphMachine.noParagraph', 'ابتدا یک پاراگراف تولید یا نمایش دهید.'));
    const missing = DOMAIN_ORDER.filter((domain) => !userJudgments[domain]);
    if (missing.length) throw new Error(translate('paragraphMachine.judgeAll', 'برای هر پنج قلمرو یک قضاوت انتخاب کنید.'));

    currentResults.forEach((paragraph) => {
      const correct = DOMAIN_ORDER.every((domain) => userJudgments[domain] === paragraph.judgment?.[domain]?.status);
      paragraph.userEvaluation = correct ? 'correct' : 'incorrect';
    });

    elements.output.innerHTML = currentResults
      .map((paragraph, index) => renderCard(paragraph, index, paragraph.displayedText))
      .join('');
    elements.source.textContent = translate(
      correctSourceKey(currentResults),
      'نتیجه قضاوت شما با قضاوت ماشین پاراگراف مقایسه شد.'
    );
  }

  function correctSourceKey(results) {
    return results.every((paragraph) => paragraph.userEvaluation === 'correct')
      ? 'paragraphMachine.recognitionCorrect'
      : 'paragraphMachine.recognitionIncorrect';
  }

  async function run() {
    elements.error.textContent = '';
    elements.output.innerHTML =
      '<div class="pm-loading">' +
      translate('paragraphMachine.processing', 'در حال پردازش...') +
      '</div>';
    elements.action.disabled = true;

    try {
      if (currentResults.length) {
        evaluateUserJudgments();
        return;
      }

      currentResults = entryMode === ENTRY_MODES.REFERENCE
        ? await evaluateReference()
        : await generateExperience();

      elements.output.innerHTML = currentResults
        .map((paragraph, index) => renderCard(paragraph, index, paragraph.displayedText))
        .join('');

      elements.source.textContent = translate(
        'paragraphMachine.judgmentReady',
        'پاراگراف آماده قضاوت پنج‌قلمرویی است.'
      );
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
  elements.choices.forEach((choice) => {
    choice.addEventListener('click', (event) => {
      event.stopPropagation();
      openJudgmentPopover(choice);
    });
  });
  document.addEventListener('click', (event) => {
    if (!elements.popover || elements.popover.hidden) return;
    if (!elements.popover.contains(event.target) && !event.target.closest('.pm-realm-choice')) {
      closeJudgmentPopover();
    }
  });
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
