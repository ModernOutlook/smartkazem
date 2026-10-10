(() => {
  'use strict';

  const tabs = document.getElementById('possible-mirror-tabs');
  const body = document.getElementById('possible-mirror-body');
  const close = document.getElementById('possible-mirror-close');

  if (!tabs || !body || !close) return;

  function catalog() {
    const language = window.SiteI18n?.getLanguage?.() || 'fa';
    const ui = window.SiteI18n?.getCatalog?.()?.pages?.possibleMirror || {};
    if (language === 'fa') return { ...(window.PossibleMirrorPersianSource || {}), close: ui.close };
    const translated = window.SiteI18n?.getCatalog?.()?.bookContent?.possibleMirror;
    if (!translated) return { ...ui, sections: [], contents: [] };
    return { title: translated.title?.[language] || ui.title || '', subtitle: translated.subtitle?.[language] || ui.subtitle || '', sectionNote: translated.sectionNote?.[language] || '', sections: translated.sections?.[language] || [], contents: translated.contents?.[language] || [], close: ui.close };
  }

  function setPageLanguage() {
    const lang = document.body.dataset.mode || document.documentElement.lang || 'fa';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' || lang === 'ar' ? 'rtl' : 'ltr';
  }

  function announce(text) {
    body.setAttribute('aria-label', text || '');
  }

  function setActiveSection(index, moveFocus = false) {
    const tabList = [...tabs.querySelectorAll('.possible-mirror-tab')];
    const sections = [...body.querySelectorAll('.possible-mirror-section')];

    tabList.forEach((tab) => {
      const active = Number(tab.dataset.index) === index;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('aria-current', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });

    sections.forEach((section, sectionIndex) => {
      const active = sectionIndex === index;
      section.classList.toggle('active', active);
      section.hidden = !active;
    });

    body.scrollTop = 0;
    const activeSection = sections[index];
    if (activeSection) {
      announce(activeSection.querySelector('h1')?.textContent || '');
    }

    if (moveFocus) {
      tabList[index]?.focus();
    }
  }

  function siteNumber(value) {
    return new Intl.NumberFormat(window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa').format(value);
  }

  function render() {
    const data = catalog();
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const contents = Array.isArray(data.contents) ? data.contents : [];

    setPageLanguage();

    const title = document.getElementById('possible-mirror-title');
    const subtitle = document.getElementById('possible-mirror-subtitle');

    if (title) title.textContent = data.title || '';
    if (subtitle) subtitle.textContent = data.subtitle || '';

    tabs.replaceChildren();
    body.replaceChildren();

    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-orientation', 'horizontal');

    sections.forEach((label, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'possible-mirror-tab';
      tab.dataset.index = String(index);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(index === 0));
      tab.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      tab.setAttribute('aria-controls', `possible-mirror-section-${index}`);
      tab.id = `possible-mirror-tab-${index}`;
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.textContent = label;
      tabs.appendChild(tab);

      const section = document.createElement('section');
      section.className = 'possible-mirror-section';
      section.id = `possible-mirror-section-${index}`;
      section.setAttribute('role', 'tabpanel');
      section.setAttribute('aria-labelledby', tab.id);
      section.tabIndex = -1;
      section.hidden = index !== 0;

      const heading = document.createElement('h1');
      const badge = document.createElement('span');
      badge.className = 'section-number';
      badge.textContent = siteNumber(index + 1);

      const headingText = document.createElement('span');
      headingText.textContent = label;
      heading.append(badge, headingText);
      section.appendChild(heading);

      const note = document.createElement('p');
      note.className = 'section-note';
      note.textContent = data.sectionNote || '';
      section.appendChild(note);

      const sectionContent = contents[index];
      if (sectionContent) {
        const article = document.createElement('div');
        article.className = 'possible-mirror-content';

        sectionContent.split(/\n\n+/).forEach((paragraph) => {
          if (!paragraph.trim()) return;
          const p = document.createElement('p');
          p.textContent = paragraph.trim();
          article.appendChild(p);
        });

        section.appendChild(article);
      }

      body.appendChild(section);
    });

    if (!sections.length) {
      const empty = document.createElement('p');
      empty.className = 'possible-mirror-empty';
      empty.textContent = '—';
      body.replaceChildren(empty);
      announce(data.title || '');
      return;
    }

    setActiveSection(0);
  }

  tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.possible-mirror-tab');
    if (!tab || !tabs.contains(tab)) return;
    setActiveSection(Number(tab.dataset.index));
  });

  tabs.addEventListener('keydown', (event) => {
    const tab = event.target.closest('.possible-mirror-tab');
    if (!tab) return;
    const items = [...tabs.querySelectorAll('.possible-mirror-tab')];
    const current = items.indexOf(tab);
    let next = current;

    if (event.key === 'ArrowRight') next = (current + 1) % items.length;
    if (event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;

    if (next !== current) {
      event.preventDefault();
      setActiveSection(next, true);
    }
  });

  close.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = 'index.html';
  });

  document.addEventListener('site:languagechange', render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();