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
  let catalog = null;

  const getPage = () => catalog?.pages?.shahnameh || {};
  const getUi = () => getPage().ui || {};
  const getLanguage = () => window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';

  const translate = (path, fallback = '') => {
    const pageCatalog = getPage();
    const ui = getUi();
    const value =
      ui?.[path] ??
      pageCatalog?.[path] ??
      catalog?.[path] ??
      catalog?.labels?.[path];
    return value == null ? fallback : value;
  };

  const localizedSection = (section) =>
    getPage().sections?.[section] || section;

  const localizedTitle = (episode) =>
    getPage().titles?.[episode.id - 1] || episode.title;

  const getLocalizedEpisode = (episode) => {
    if (!episode) return null;
    const page = getPage();
    const localized = page.episodes?.[String(episode.id)] || (episode.id === 1 ? page.part1 : null);
    return {
      ...episode,
      title: localized?.title || localizedTitle(episode),
      section: localizedSection(episode.section),
      prose: localized?.prose || episode.prose,
      verse: localized?.originalVerse || episode.verse
    };
  };

  function getEpisodeView(episode) {
    return getLocalizedEpisode(episode);
  }

  const toSiteNumber = (value) => {
    try {
      return new Intl.NumberFormat(getLanguage()).format(value);
    } catch (_) {
      return String(value);
    }
  };

  function getVisibleEpisodes() {
    const query = (elements.search?.value || '').trim().toLowerCase();

    return data.episodes.filter((episode) => {
      const localized = getLocalizedEpisode(episode);
      const matchesFilter = filter === 'all' || episode.section === filter;
      const matchesSearch =
        !query ||
        String(episode.id).includes(query) ||
        localized.title.toLowerCase().includes(query) ||
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
    number.textContent = `${translate('part', 'قسمت')} ${toSiteNumber(episode.id)}`;

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
      empty.textContent = translate('labels.empty', 'قسمتی با این مشخصات پیدا نشد.');
      elements.episodeList.appendChild(empty);
    }
  }

  function syncArtwork() {
    const episode = getEpisodeView(data.getEpisode(activeEpisode));
    if (!episode || !elements.artFrame) return;

    elements.artIndex.textContent =
      `${toSiteNumber(episode.id).padStart(2, '۰')} / ۸۱`;
    elements.artCaption.textContent =
      `${translate('part', 'قسمت')} ${toSiteNumber(episode.id)} · ${episode.title}`;
    elements.visualTitle.textContent = episode.title;

    elements.artFrame.replaceChildren();

    const image = document.createElement('img');
    image.src = episode.image;
    image.alt = `${translate('part', 'قسمت')} ${toSiteNumber(episode.id)}`;
    image.loading = 'lazy';

    image.addEventListener('error', () => {
      elements.artFrame.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'art-empty';
      empty.textContent =
        `تصویر ${toSiteNumber(episode.id)} در مسیر content/${String(episode.id).padStart(2, '0')}.jpg یافت نشد.`;
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
    const episode = getEpisodeView(data.getEpisode(activeEpisode));
    if (!episode) return;

    elements.reader.replaceChildren();

    const header = document.createElement('header');
    header.className = 'reader-head';

    const headingGroup = document.createElement('div');
    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = `${translate('part', 'قسمت')} ${toSiteNumber(episode.id)} · ${episode.section}`;

    const title = document.createElement('h2');
    title.textContent = episode.title;
    headingGroup.append(eyebrow, title);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = episode.status === 'ready' ? translate('labels.ready', 'متن کامل') : translate('labels.pending', 'در صف تدوین');

    header.append(headingGroup, badge);
    elements.reader.appendChild(header);

    if (episode.status === 'ready') {
      elements.reader.append(
        createReaderSection(translate('labels.prose', 'روایت کامل'), episode.prose, 'prose'),
        createReaderSection(translate('labels.verse', 'ابیات'), episode.verse, 'verse')
      );
    } else {
      const section = document.createElement('section');
      section.className = 'block';

      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent =
        translate('placeholder', 'ساختار این قسمت آماده است. متن کامل روایت و ابیات پس از تعیین و درج نسخهٔ مرجع در همین واحد قرار می‌گیرد؛ رابط خوانش برای آن از پیش آماده است.');

      section.appendChild(placeholder);
      elements.reader.appendChild(section);
    }

    const source = document.createElement('section');
    source.className = 'block';

    const sourceNote = document.createElement('p');
    sourceNote.className = 'source';
    sourceNote.textContent = `${translate('labels.editionNote', 'یادداشت نسخه')}: ${data.meta.editionNote}`;
    source.appendChild(sourceNote);
    elements.reader.appendChild(source);

    const navigation = document.createElement('div');
    navigation.className = 'navrow';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'btn';
    previous.id = 'prev';
    previous.textContent = translate('labels.previous', 'قسمت پیشین');
    previous.addEventListener('click', () => move(-1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn';
    next.id = 'next';
    next.textContent = translate('labels.next', 'قسمت بعد');
    next.addEventListener('click', () => move(1));

    navigation.append(previous, next);
    elements.reader.appendChild(navigation);
  }

  function applyLanguage() {
    catalog = window.SiteI18n?.getCatalog?.() || null;
    if (!catalog) return;

    const labels = catalog?.labels || {};
    const page = getPage();
    const ui = getUi();

    document.title = labels.shahnameh || document.title;

    const title = document.querySelector('.title h1');
    const subtitle = document.querySelector('.title p');
    const heroTitle = document.querySelector('.hero-card h2');
    const heroText = document.querySelector('.hero-card p');
    const findTitle = document.querySelector('.controls h3');
    const search = elements.search;
    const visualLabel = document.querySelector('.visual .story-label');
    const storyLabel = document.querySelector('.story-card .story-label');
    const back = elements.back;
    const stats = document.querySelectorAll('.stat span');
    const visualStats = document.querySelectorAll('.visual-stats span');
    const eyebrow = document.querySelector('.title .eyebrow');

    if (eyebrow) eyebrow.textContent = page.eyebrow || eyebrow.textContent;
    if (title) title.textContent = labels.shahnameh || title.textContent;
    if (subtitle) subtitle.textContent = page.subtitle || subtitle.textContent;
    if (heroTitle) heroTitle.textContent = page.heroTitle || heroTitle.textContent;
    if (heroText) heroText.textContent = page.heroText || heroText.textContent;
    if (findTitle) findTitle.textContent = page.findTitle || findTitle.textContent;
    if (search) search.placeholder = page.searchPlaceholder || search.placeholder;
    if (visualLabel) visualLabel.textContent = page.visualLabel || visualLabel.textContent;
    if (storyLabel) storyLabel.textContent = page.visualAlbum || storyLabel.textContent;
    if (back) back.textContent = labels.back || back.textContent;

    elements.filters.forEach((button) => {
      const key = button.dataset.filter;
      button.textContent = key === 'all' ? (ui.all || 'All') : localizedSection(key);
    });

    const statSpans = document.querySelectorAll('.stat span');
    if (statSpans[0]) statSpans[0].textContent = ui.episodeCount || statSpans[0].textContent;
    if (statSpans[1]) statSpans[1].textContent = ui.readingUnit || statSpans[1].textContent;
    if (statSpans[2]) statSpans[2].textContent = ui.referenceSource || statSpans[2].textContent;

    if (visualStats[0]) visualStats[0].textContent = ui.mainEpisodes || visualStats[0].textContent;
    if (visualStats[1]) visualStats[1].textContent = ui.adaptations || visualStats[1].textContent;
    if (visualStats[2]) visualStats[2].textContent = ui.aspectRatio || visualStats[2].textContent;

    renderEpisodeList();
    renderReader();
    syncArtwork();
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
    catalog = window.SiteI18n?.getCatalog?.() || null;
    elements.episodeCount.textContent = toSiteNumber(data.meta.totalEpisodes);
    bindEvents();
    document.addEventListener('site:languagechange', applyLanguage);
    renderEpisodeList();
    renderReader();
    syncArtwork();
  }

  init();
})();
