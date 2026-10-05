(() => {
  'use strict';

  const data = window.ShahnamehSeries;
  const elements = {
    episodeList: document.getElementById('episode-list'),
    reader: document.getElementById('reader'),
    search: document.getElementById('search'),
    filters: [...document.querySelectorAll('.filter')],
    back: document.getElementById('back'),
    episodeCount: document.getElementById('episode-count'),
    artFrame: document.getElementById('art-frame'),
    artCaption: document.getElementById('art-caption'),
    artIndex: document.getElementById('art-index'),
    visualTitle: document.getElementById('visual-title'),
    artPrevious: document.getElementById('art-prev'),
    artNext: document.getElementById('art-next')
  };

  if (!data || !elements.episodeList || !elements.reader) return;

  let filter = 'all';
  let activeEpisode = 1;

  const toPersianNumber = (value) => new Intl.NumberFormat('fa-IR').format(value);

  function getVisibleEpisodes() {
    const query = (elements.search?.value || '').trim().toLowerCase();

    return data.episodes.filter((episode) => {
      const matchesFilter = filter === 'all' || episode.section === filter;
      const matchesSearch =
        !query ||
        String(episode.id).includes(query) ||
        episode.title.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }

  function createEpisodeButton(episode) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'episode';
    if (episode.id === activeEpisode) button.classList.add('active');

    const number = document.createElement('span');
    number.className = 'n';
    number.textContent = `قسمت ${toPersianNumber(episode.id)}`;

    const title = document.createElement('span');
    title.className = 't';
    title.textContent = episode.title;

    button.append(number, title);
    button.addEventListener('click', () => {
      activeEpisode = episode.id;
      renderEpisodeList();
      renderReader();
      syncArtwork();
    });

    return button;
  }

  function renderEpisodeList() {
    elements.episodeList.replaceChildren();

    getVisibleEpisodes().forEach((episode) => {
      elements.episodeList.appendChild(createEpisodeButton(episode));
    });

    if (!elements.episodeList.children.length) {
      const empty = document.createElement('div');
      empty.className = 'placeholder';
      empty.textContent = 'قسمتی با این مشخصات پیدا نشد.';
      elements.episodeList.appendChild(empty);
    }
  }

  function syncArtwork() {
    const episode = data.getEpisode(activeEpisode);
    if (!episode || !elements.artFrame) return;

    elements.artIndex.textContent =
      `${toPersianNumber(episode.id).padStart(2, '۰')} / ۸۱`;
    elements.artCaption.textContent =
      `قسمت ${toPersianNumber(episode.id)} · ${episode.title}`;
    elements.visualTitle.textContent = episode.title;

    elements.artFrame.replaceChildren();

    const image = document.createElement('img');
    image.src = episode.image;
    image.alt = `تصویر قسمت ${toPersianNumber(episode.id)}`;
    image.loading = 'lazy';

    image.addEventListener('error', () => {
      elements.artFrame.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'art-empty';
      empty.textContent =
        `تصویر ${toPersianNumber(episode.id)} در مسیر content/${String(episode.id).padStart(2, '0')}.jpg یافت نشد.`;
      elements.artFrame.appendChild(empty);
    }, { once: true });

    elements.artFrame.appendChild(image);
  }

  function createReaderSection(title, content, className = '') {
    const section = document.createElement('section');
    section.className = `block ${className}`.trim();

    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);

    const body = document.createElement('div');
    body.className = className === 'prose' ? 'prose' : 'verse';
    body.textContent = content || '';
    section.appendChild(body);

    return section;
  }

  function move(offset) {
    const index = data.episodes.findIndex((episode) => episode.id === activeEpisode);
    const nextEpisode = data.episodes[index + offset];

    if (!nextEpisode) return;

    activeEpisode = nextEpisode.id;
    renderEpisodeList();
    renderReader();
    syncArtwork();

    const main = document.querySelector('.main');
    if (main) {
      window.scrollTo({
        top: main.offsetTop - 10,
        behavior: 'smooth'
      });
    }
  }

  function renderReader() {
    const episode = data.getEpisode(activeEpisode);
    if (!episode) return;

    elements.reader.replaceChildren();

    const header = document.createElement('header');
    header.className = 'reader-head';

    const headingGroup = document.createElement('div');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = `قسمت ${toPersianNumber(episode.id)} · ${episode.section}`;

    const title = document.createElement('h2');
    title.textContent = episode.title;
    headingGroup.append(eyebrow, title);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = episode.status === 'ready' ? 'متن کامل' : 'در صف تدوین';

    header.append(headingGroup, badge);
    elements.reader.appendChild(header);

    if (episode.status === 'ready') {
      elements.reader.append(
        createReaderSection('روایت کامل', episode.prose, 'prose'),
        createReaderSection('ابیات', episode.verse, 'verse')
      );
    } else {
      const section = document.createElement('section');
      section.className = 'block';

      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent =
        'ساختار این قسمت آماده است. متن کامل روایت و ابیات پس از تعیین و درج نسخهٔ مرجع در همین واحد قرار می‌گیرد؛ رابط خوانش برای آن از پیش آماده است.';

      section.appendChild(placeholder);
      elements.reader.appendChild(section);
    }

    const source = document.createElement('section');
    source.className = 'block';

    const sourceNote = document.createElement('p');
    sourceNote.className = 'source';
    sourceNote.textContent = `یادداشت نسخه: ${data.meta.editionNote}`;
    source.appendChild(sourceNote);
    elements.reader.appendChild(source);

    const navigation = document.createElement('div');
    navigation.className = 'navrow';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'btn';
    previous.id = 'prev';
    previous.textContent = 'قسمت پیشین';
    previous.addEventListener('click', () => move(-1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn';
    next.id = 'next';
    next.textContent = 'قسمت بعد';
    next.addEventListener('click', () => move(1));

    navigation.append(previous, next);
    elements.reader.appendChild(navigation);
  }

  function bindEvents() {
    elements.filters.forEach((button) => {
      button.addEventListener('click', () => {
        filter = button.dataset.filter || 'all';
        elements.filters.forEach((item) => item.classList.toggle('active', item === button));
        renderEpisodeList();
      });
    });

    elements.search?.addEventListener('input', renderEpisodeList);

    elements.back?.addEventListener('click', () => {
      if (history.length > 1) history.back();
      else window.location.href = 'index.html';
    });

    elements.artPrevious?.addEventListener('click', () => move(-1));
    elements.artNext?.addEventListener('click', () => move(1));
  }

  function init() {
    elements.episodeCount.textContent = toPersianNumber(data.meta.totalEpisodes);
    bindEvents();
    renderEpisodeList();
    renderReader();
    syncArtwork();
  }

  init();
})();
