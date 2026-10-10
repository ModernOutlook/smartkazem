(() => {
  'use strict';

  const catalog = window.PlayingCardsCatalog;
  const grid = document.getElementById('inventory-grid');
  if (!catalog || !grid) return;

  const groups = [
    { labelKey: 'jokers', cards: catalog.cards.slice(0, 2) },
    { labelKey: 'spades', cards: catalog.cards.slice(2, 15) },
    { labelKey: 'hearts', cards: catalog.cards.slice(15, 28) },
    { labelKey: 'clubs', cards: catalog.cards.slice(28, 41) },
    { labelKey: 'diamonds', cards: catalog.cards.slice(41, 54) },
    { labelKey: 'cardBack', cards: catalog.cards.slice(54, 55) }
  ];

  const SUITS = {
    ar: { spades: 'البستوني', hearts: 'القلوب', clubs: 'النوادي', diamonds: 'الديناري' },
    zh: { spades: '黑桃', hearts: '红桃', clubs: '梅花', diamonds: '方块' }
  };
  const RANKS = {
    ar: { ace: 'آس', jack: 'ولد', queen: 'ملكة', king: 'ملك' },
    zh: { ace: 'A', jack: 'J', queen: 'Q', king: 'K' }
  };

  function currentLanguage() {
    return window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
  }

  function translate(key, fallback = '') {
    return window.SiteI18n?.get?.('labels.' + key, fallback) || fallback;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(currentLanguage()).format(value);
  }

  function label(card) {
    const lang = currentLanguage();
    if (lang === 'fa') return card.labelFa;
    if (lang === 'en') return card.labelEn;
    if (card.suit === 'back' || card.rank === 'back') return lang === 'zh' ? '牌背' : 'ظهر البطاقة';
    if (card.suit === 'joker') {
      return lang === 'zh'
        ? (card.id === 1 ? '小丑牌一' : '小丑牌二')
        : (card.id === 1 ? 'الجوكر الأول' : 'الجوكر الثاني');
    }
    const rank = RANKS[lang]?.[card.rank] || formatNumber(Number(card.rank)) || card.rank;
    const suit = SUITS[lang]?.[card.suit] || card.suit;
    return lang === 'zh' ? suit + rank : rank + ' ' + suit;
  }

  function render() {
    grid.replaceChildren();
    groups.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'card-group';

      const heading = document.createElement('div');
      heading.className = 'card-group-head';

      const title = document.createElement('h2');
      title.textContent = translate(group.labelKey, group.labelKey);

      const count = document.createElement('span');
      count.textContent = formatNumber(group.cards.length).padStart(2, formatNumber(0));

      heading.append(title, count);

      const list = document.createElement('div');
      list.className = 'card-list';
      list.setAttribute('role', 'list');

      group.cards.forEach((card) => {
        const item = document.createElement('article');
        item.className = 'card-item';
        item.setAttribute('role', 'listitem');
        item.setAttribute('aria-label', label(card));

        const imageWrap = document.createElement('div');
        imageWrap.className = 'card-image-wrap';

        const image = document.createElement('img');
        image.className = 'card-image';
        image.src = catalog.imagePath(card);
        image.alt = label(card);
        image.loading = card.id <= 5 ? 'eager' : 'lazy';
        image.decoding = 'async';

        const number = document.createElement('span');
        number.className = 'card-number';
        number.textContent = formatNumber(card.id).padStart(2, formatNumber(0));

        imageWrap.append(image, number);

        const name = document.createElement('span');
        name.className = 'card-name';
        name.textContent = label(card);

        const id = document.createElement('span');
        id.className = 'card-id';
        id.textContent = formatNumber(card.id).padStart(2, formatNumber(0));

        item.append(imageWrap, name, id);
        list.append(item);
      });

      section.append(heading, list);
      grid.append(section);
    });
  }

  render();
  document.addEventListener('site:languagechange', render);
})();
