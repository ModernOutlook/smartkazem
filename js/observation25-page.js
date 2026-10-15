(function () {
  'use strict';
  const tabs = document.getElementById('observation25-tabs');
  const body = document.getElementById('observation25-body');
  const close = document.getElementById('observation25-close');
  let activeIndex = 0;

  function catalog() {
    const language = window.SiteI18n?.getLanguage?.() || 'fa';
    const ui = window.SiteI18n?.getCatalog?.()?.pages?.observation25 || {};
    if (language === 'fa') return { ...(window.Observation25PersianSource || {}), close: ui.close };
    const translated = window.SiteI18n?.getCatalog?.()?.bookContent?.observation25;
    if (!translated) return { ...ui, sections: [], contents: [] };
    return {
      title: translated.title?.[language] || ui.title || '',
      subtitle: translated.subtitle?.[language] || ui.subtitle || '',
      sectionNote: translated.sectionNote?.[language] || '',
      sections: translated.sections?.[language] || [],
      contents: translated.contents?.[language] || [],
      close: ui.close
    };
  }

  const siteNumber = value => new Intl.NumberFormat(window.SiteI18n?.getLanguage?.() || 'fa').format(value);

  function select(index, moveFocus = false) {
    const tabItems = [...tabs.querySelectorAll('.observation25-tab')];
    const sections = [...body.querySelectorAll('.observation25-section')];
    if (index < 0 || index >= tabItems.length) return;
    activeIndex = index;
    tabItems.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    sections.forEach((section, i) => {
      section.classList.toggle('active', i === index);
      section.hidden = i !== index;
    });
    if (moveFocus) tabItems[index].focus({ preventScroll: true });
  }

  function render() {
    const data = catalog();
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const title = document.getElementById('observation25-title');
    const subtitle = document.getElementById('observation25-subtitle');
    if (title) title.textContent = data.title || '';
    if (subtitle) subtitle.textContent = data.subtitle || '';

    tabs.replaceChildren();
    body.replaceChildren();
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-orientation', 'horizontal');
    body.setAttribute('aria-live', 'polite');

    const contents = Array.isArray(data.contents) ? data.contents : [];
    sections.forEach((label, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'observation25-tab';
      tab.dataset.index = String(index);
      tab.id = `observation25-tab-${index}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `observation25-section-${index}`);
      tab.textContent = `${siteNumber(index + 1)} · ${label}`;
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', event => {
        const items = [...tabs.querySelectorAll('.observation25-tab')];
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % items.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else return;
        event.preventDefault();
        select(next, true);
      });
      tabs.appendChild(tab);

      const section = document.createElement('section');
      section.className = 'observation25-section';
      section.id = `observation25-section-${index}`;
      section.setAttribute('role', 'tabpanel');
      section.setAttribute('aria-labelledby', tab.id);
      section.tabIndex = 0;
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
      if (contents[index]) {
        const article = document.createElement('div');
        article.className = 'observation25-content';
        contents[index].split(/\n\n+/).forEach(paragraph => {
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
      empty.className = 'observation25-empty';
      empty.textContent = '—';
      body.replaceChildren(empty);
      return;
    }
    activeIndex = Math.min(activeIndex, sections.length - 1);
    select(activeIndex);
  }

  close.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = 'index.html';
  });
  document.addEventListener('site:languagechange', () => {
    if (tabs?.isConnected) render();
  });
  render();
})();
