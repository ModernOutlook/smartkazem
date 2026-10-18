(() => {
  'use strict';

  const SHARED_COVERS = Object.freeze({
    treatise: ['philosophical-treatise.jpg', 'رساله فلسفی'],
    emergence: ['emergence-1.jpg', 'فصل اول ظهور'],
    observation25: ['observation-25.jpg', 'سرزمین مشاهده؛ ۲۵ بار رسیدن'],
    possibleMirror: ['possible-mirror.jpg', 'آینه‌ی ممکن‌ها'],
    emergence2: ['emergence-2.jpg', 'فصل دوم ظهور'],
    observation: ['observation-river.jpg', 'سرزمین مشاهده؛ یک رود، یک جریان'],
    layer3: ['echo-layer-3.jpg', 'پژواک لایه سوم'],
    disturbedManifesto: ['disturbed-manifesto.jpg', 'مانیفست آشوب‌زده'],
    zero: ['zero.jpg', 'صفر']
  });

  const SHARED_COVER_TARGETS = Object.freeze({
    observation: '.book-body',
    observation25: '.observation25-body',
    possibleMirror: '.possible-mirror-body',
    layer3: '.reader'
  });

  const BOOK_COVERS = Object.freeze({
    humanMachines: ['human-and-its-machines.jpg', 'انسان و ماشین‌هایش'],
    forgers: ['forgers-of-imitation.jpg', 'جاعلان تقلید'],
    tabahian: ['tabahian.jpg', 'تباهیان']
  });

  function activeTitle(root, fallback) {
    const heading = root.querySelector('h1, [data-content-title], .head-title, .observation25-title strong, .possible-mirror-title strong');
    return heading?.textContent?.trim() || fallback;
  }

  function mount(root, filename, title, target) {
    if (!root || !filename) return null;
    root.querySelectorAll('[data-content-cover]').forEach((node) => node.remove());

    const figure = document.createElement('figure');
    figure.className = 'content-cover';
    figure.dataset.contentCover = filename;
    if (title) figure.setAttribute('aria-label', title);

    const image = document.createElement('img');
    image.src = new URL('content/page-templates/' + filename, document.baseURI).href;
    image.alt = title || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 900;
    image.height = 1200;
    figure.appendChild(image);

    const parent = target || root;
    parent.appendChild(figure);
    return figure;
  }

  function mountShared(root, route) {
    const cover = SHARED_COVERS[route];
    if (!cover) return null;
    const target = root.querySelector(SHARED_COVER_TARGETS[route] || '') || root;\n    return mount(root, cover[0], activeTitle(root, cover[1]), target);
  }

  function mountBook(root, kind, title, target) {
    const cover = BOOK_COVERS[kind];
    if (!cover) return null;
    return mount(root, cover[0], title || cover[1], target || root);
  }

  window.ContentCovers = Object.freeze({ mountShared, mountBook });
})();
