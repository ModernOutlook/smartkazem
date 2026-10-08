(() => {
  'use strict';

  const cards = [
    { id: 1, suit: 'joker', rank: 'joker-1', labelFa: 'جوکر اول', labelEn: 'Joker I', file: '01 joker I.png' },
    { id: 2, suit: 'joker', rank: 'joker-2', labelFa: 'جوکر دوم', labelEn: 'Joker II', file: '02 joker II.png' },

    { id: 3, suit: 'spades', rank: 'ace', labelFa: 'آس پیک', labelEn: 'Ace of Spades', file: '03 ♠Ace.png' },
    { id: 4, suit: 'spades', rank: '2', labelFa: '۲ پیک', labelEn: '2 of Spades', file: '04 ♠2.png' },
    { id: 5, suit: 'spades', rank: '3', labelFa: '۳ پیک', labelEn: '3 of Spades', file: '05 ♠3.png' },
    { id: 6, suit: 'spades', rank: '4', labelFa: '۴ پیک', labelEn: '4 of Spades', file: '06 ♠4.png' },
    { id: 7, suit: 'spades', rank: '5', labelFa: '۵ پیک', labelEn: '5 of Spades', file: '07 ♠5.png' },
    { id: 8, suit: 'spades', rank: '6', labelFa: '۶ پیک', labelEn: '6 of Spades', file: '08 ♠6.png' },
    { id: 9, suit: 'spades', rank: '7', labelFa: '۷ پیک', labelEn: '7 of Spades', file: '09 ♠7.png' },
    { id: 10, suit: 'spades', rank: '8', labelFa: '۸ پیک', labelEn: '8 of Spades', file: '10 ♠8.png' },
    { id: 11, suit: 'spades', rank: '9', labelFa: '۹ پیک', labelEn: '9 of Spades', file: '11 ♠9.png' },
    { id: 12, suit: 'spades', rank: '10', labelFa: '۱۰ پیک', labelEn: '10 of Spades', file: '12 ♠10.png' },
    { id: 13, suit: 'spades', rank: 'jack', labelFa: 'سرباز پیک', labelEn: 'Jack of Spades', file: '13 ♠Jack.png' },
    { id: 14, suit: 'spades', rank: 'queen', labelFa: 'بی‌بی پیک', labelEn: 'Queen of Spades', file: '14 ♠Queen.png' },
    { id: 15, suit: 'spades', rank: 'king', labelFa: 'شاه پیک', labelEn: 'King of Spades', file: '15 ♠King.png' },

    { id: 16, suit: 'hearts', rank: 'ace', labelFa: 'آس دل', labelEn: 'Ace of Hearts', file: '16 ♥Ace.png' },
    { id: 17, suit: 'hearts', rank: '2', labelFa: '۲ دل', labelEn: '2 of Hearts', file: '17 ♥2.png' },
    { id: 18, suit: 'hearts', rank: '3', labelFa: '۳ دل', labelEn: '3 of Hearts', file: '18 ♥3.png' },
    { id: 19, suit: 'hearts', rank: '4', labelFa: '۴ دل', labelEn: '4 of Hearts', file: '19 ♥4.png' },
    { id: 20, suit: 'hearts', rank: '5', labelFa: '۵ دل', labelEn: '5 of Hearts', file: '20 ♥5.png' },
    { id: 21, suit: 'hearts', rank: '6', labelFa: '۶ دل', labelEn: '6 of Hearts', file: '21 ♥6.png' },
    { id: 22, suit: 'hearts', rank: '7', labelFa: '۷ دل', labelEn: '7 of Hearts', file: '22 ♥7.png' },
    { id: 23, suit: 'hearts', rank: '8', labelFa: '۸ دل', labelEn: '8 of Hearts', file: '23 ♥8.png' },
    { id: 24, suit: 'hearts', rank: '9', labelFa: '۹ دل', labelEn: '9 of Hearts', file: '24 ♥9.png' },
    { id: 25, suit: 'hearts', rank: '10', labelFa: '۱۰ دل', labelEn: '10 of Hearts', file: '25 ♥10.png' },
    { id: 26, suit: 'hearts', rank: 'jack', labelFa: 'سرباز دل', labelEn: 'Jack of Hearts', file: '26 ♥Jack.png' },
    { id: 27, suit: 'hearts', rank: 'queen', labelFa: 'بی‌بی دل', labelEn: 'Queen of Hearts', file: '27 ♥Queen.png' },
    { id: 28, suit: 'hearts', rank: 'king', labelFa: 'شاه دل', labelEn: 'King of Hearts', file: '28 ♥King.png' },

    { id: 29, suit: 'clubs', rank: 'king', labelFa: 'شاه خاج', labelEn: 'King of Clubs', file: '29 ♣King.png' },
    { id: 30, suit: 'clubs', rank: 'queen', labelFa: 'بی‌بی خاج', labelEn: 'Queen of Clubs', file: '30 ♣Queen.png' },
    { id: 31, suit: 'clubs', rank: 'jack', labelFa: 'سرباز خاج', labelEn: 'Jack of Clubs', file: '31 ♣Jack.png' },
    { id: 32, suit: 'clubs', rank: '10', labelFa: '۱۰ خاج', labelEn: '10 of Clubs', file: '32 ♣10.png' },
    { id: 33, suit: 'clubs', rank: '9', labelFa: '۹ خاج', labelEn: '9 of Clubs', file: '33 ♣9.png' },
    { id: 34, suit: 'clubs', rank: '8', labelFa: '۸ خاج', labelEn: '8 of Clubs', file: '34 ♣8.png' },
    { id: 35, suit: 'clubs', rank: '7', labelFa: '۷ خاج', labelEn: '7 of Clubs', file: '35 ♣7.png' },
    { id: 36, suit: 'clubs', rank: '6', labelFa: '۶ خاج', labelEn: '6 of Clubs', file: '36 ♣6.png' },
    { id: 37, suit: 'clubs', rank: '5', labelFa: '۵ خاج', labelEn: '5 of Clubs', file: '37 ♣5.png' },
    { id: 38, suit: 'clubs', rank: '4', labelFa: '۴ خاج', labelEn: '4 of Clubs', file: '38 ♣4.png' },
    { id: 39, suit: 'clubs', rank: '3', labelFa: '۳ خاج', labelEn: '3 of Clubs', file: '39 ♣3.png' },
    { id: 40, suit: 'clubs', rank: '2', labelFa: '۲ خاج', labelEn: '2 of Clubs', file: '40 ♣2.png' },
    { id: 41, suit: 'clubs', rank: 'ace', labelFa: 'آس خاج', labelEn: 'Ace of Clubs', file: '41 ♣Ace.png' },

    { id: 42, suit: 'diamonds', rank: 'king', labelFa: 'شاه خشت', labelEn: 'King of Diamonds', file: '42 ♦King.png' },
    { id: 43, suit: 'diamonds', rank: 'queen', labelFa: 'بی‌بی خشت', labelEn: 'Queen of Diamonds', file: '43 ♦Queen.png' },
    { id: 44, suit: 'diamonds', rank: 'jack', labelFa: 'سرباز خشت', labelEn: 'Jack of Diamonds', file: '44 ♦Jack.png' },
    { id: 45, suit: 'diamonds', rank: '10', labelFa: '۱۰ خشت', labelEn: '10 of Diamonds', file: '45 ♦10.png' },
    { id: 46, suit: 'diamonds', rank: '9', labelFa: '۹ خشت', labelEn: '9 of Diamonds', file: '46 ♦9.png' },
    { id: 47, suit: 'diamonds', rank: '8', labelFa: '۸ خشت', labelEn: '8 of Diamonds', file: '47 ♦8.png' },
    { id: 48, suit: 'diamonds', rank: '7', labelFa: '۷ خشت', labelEn: '7 of Diamonds', file: '48 ♦7.png' },
    { id: 49, suit: 'diamonds', rank: '6', labelFa: '۶ خشت', labelEn: '6 of Diamonds', file: '49 ♦6.png' },
    { id: 50, suit: 'diamonds', rank: '5', labelFa: '۵ خشت', labelEn: '5 of Diamonds', file: '50 ♦5.png' },
    { id: 51, suit: 'diamonds', rank: '4', labelFa: '۴ خشت', labelEn: '4 of Diamonds', file: '51 ♦4.png' },
    { id: 52, suit: 'diamonds', rank: '3', labelFa: '۳ خشت', labelEn: '3 of Diamonds', file: '52 ♦3.png' },
    { id: 53, suit: 'diamonds', rank: '2', labelFa: '۲ خشت', labelEn: '2 of Diamonds', file: '53 ♦2.png' },
    { id: 54, suit: 'diamonds', rank: 'ace', labelFa: 'آس خشت', labelEn: 'Ace of Diamonds', file: '54 ♦Ace.png' },

    { id: 55, suit: 'back', rank: 'back', labelFa: 'پشت کارت', labelEn: 'Card Back', file: '55 BackSide.png' }
  ];

  const byId = Object.freeze(Object.fromEntries(cards.map((card) => [card.id, card])));
  const byFile = Object.freeze(Object.fromEntries(cards.map((card) => [card.file, card])));

  function normalizeSource(source) {
    if (typeof source !== 'string') return '';
    try {
      return decodeURIComponent(source).split(/[?#]/, 1)[0].split('/').pop() || '';
    } catch {
      return source.split(/[?#]/, 1)[0].split('/').pop() || '';
    }
  }

  function identify(source) {
    if (typeof source === 'number') return byId[source] || null;
    const file = normalizeSource(source);
    return byFile[file] || null;
  }

  window.PlayingCardsCatalog = Object.freeze({
    cards: Object.freeze(cards),
    byId,
    byFile,
    identify,
    isPlayingCard(source) {
      return Boolean(identify(source));
    },
    imagePath(card) {
      const entry = typeof card === 'number'
        ? byId[card]
        : typeof card === 'string'
          ? identify(card)
          : card;
      return entry && typeof entry.file === 'string'
        ? `content/${encodeURIComponent(entry.file).replace(/%2F/g, '/')}`
        : null;
    }
  });
})();
