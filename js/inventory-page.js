(() => {
  'use strict';

  const catalog = window.PlayingCardsCatalog;
  const grid = document.getElementById('inventory-grid');
  if (!catalog || !grid) return;

  const groups = [
    { titleFa: 'جوکرها', titleEn: 'Jokers', cards: catalog.cards.slice(0, 2) },
    { titleFa: 'خال پیک', titleEn: 'Spades · Ace → King', cards: catalog.cards.slice(2, 15) },
    { titleFa: 'خال دل', titleEn: 'Hearts · Ace → King', cards: catalog.cards.slice(15, 28) },
    { titleFa: 'خال خاج', titleEn: 'Clubs · King → Ace', cards: catalog.cards.slice(28, 41) },
    { titleFa: 'خال خشت', titleEn: 'Diamonds · King → Ace', cards: catalog.cards.slice(41, 54) },
    { titleFa: 'پشت کارت', titleEn: 'Card Back', cards: catalog.cards.slice(54, 55) }
  ];

  function label(card) {
    const lang = document.documentElement.lang;
    return lang === 'fa' || lang === 'ar' ? card.labelFa : card.labelEn;
  }

  function render() {
    grid.replaceChildren();
    groups.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'card-group';

      const heading = document.createElement('div');
      heading.className = 'card-group-head';

      const title = document.createElement('h2');
      title.textContent = document.documentElement.lang === 'fa'
        ? group.titleFa
        : group.titleEn;

      const count = document.createElement('span');
      count.textContent = String(group.cards.length).padStart(2, '0');

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
        number.textContent = String(card.id).padStart(2, '0');

        imageWrap.append(image, number);

        const name = document.createElement('span');
        name.className = 'card-name';
        name.textContent = label(card);

        const id = document.createElement('span');
        id.className = 'card-id';
        id.textContent = String(card.id).padStart(2, '0');

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
