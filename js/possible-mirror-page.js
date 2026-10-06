(() => {
  'use strict';

  const tabs = document.getElementById('possible-mirror-tabs');
  const body = document.getElementById('possible-mirror-body');
  const close = document.getElementById('possible-mirror-close');

  if (!tabs || !body || !close) return;

  function catalog() {
    return window.SiteI18n?.getCatalog?.()?.pages?.possibleMirror || {};
  }

  function setActiveSection(index) {
    tabs.querySelectorAll('.possible-mirror-tab').forEach((tab) => {
      const active = Number(tab.dataset.index) === index;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    body.querySelectorAll('.possible-mirror-section').forEach((section, sectionIndex) => {
      section.classList.toggle('active', sectionIndex === index);
      section.hidden = sectionIndex !== index;
    });

    body.scrollTop = 0;
  }

  function render() {
    const data = catalog();
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const contents = Array.isArray(data.contents) ? data.contents : [];

    const title = document.getElementById('possible-mirror-title');
    const subtitle = document.getElementById('possible-mirror-subtitle');

    if (title) title.textContent = data.title || '';
    if (subtitle) subtitle.textContent = data.subtitle || '';

    tabs.replaceChildren();
    body.replaceChildren();

    sections.forEach((label, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'possible-mirror-tab';
      tab.dataset.index = String(index);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(index === 0));
      tab.setAttribute('aria-controls', `possible-mirror-section-${index}`);
      tab.id = `possible-mirror-tab-${index}`;
      tab.textContent = label;
      tabs.appendChild(tab);

      const section = document.createElement('section');
      section.className = 'possible-mirror-section';
      section.id = `possible-mirror-section-${index}`;
      section.setAttribute('role', 'tabpanel');
      section.setAttribute('aria-labelledby', tab.id);
      section.hidden = index !== 0;

      const heading = document.createElement('h1');
      const badge = document.createElement('span');
      badge.className = 'section-number';
      badge.textContent = String(index + 1);

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
      body.innerHTML = '<p class="possible-mirror-empty">—</p>';
      return;
    }

    setActiveSection(0);
  }

  tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.possible-mirror-tab');
    if (!tab || !tabs.contains(tab)) return;
    setActiveSection(Number(tab.dataset.index));
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