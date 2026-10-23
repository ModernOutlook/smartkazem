(() => {
  'use strict';

  const catalog = window.PlayingCardsCatalog;
  if (!catalog) return;

  const STORAGE_KEY = 'smartkazem.card-collection.v1';
  const PLAYABLE_CARDS = catalog.cards.filter(card => card.suit !== 'back');
  const playableIds = new Set(PLAYABLE_CARDS.map(card => card.id));

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const ownedIds = Array.isArray(saved?.ownedIds)
        ? [...new Set(saved.ownedIds.filter(id => Number.isInteger(id) && playableIds.has(id)))]
        : [];
      return { version: 1, ownedIds };
    } catch (_) {
      return { version: 1, ownedIds: [] };
    }
  }

  let state = readState();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      return false;
    }
  }

  function emit(detail) {
    document.dispatchEvent(new CustomEvent('site:card-collection-change', {
      detail: { ...detail, ownedIds: state.ownedIds.slice(), count: state.ownedIds.length }
    }));
  }

  function randomItem(items) {
    return items.length ? items[Math.floor(Math.random() * items.length)] : null;
  }

  function applyOutcome(correct) {
    const owned = new Set(state.ownedIds);
    if (correct) {
      const available = PLAYABLE_CARDS.filter(card => !owned.has(card.id));
      const card = randomItem(available);
      if (!card) return { changed: false, reason: 'deck-empty', count: owned.size };
      owned.add(card.id);
      state.ownedIds = [...owned];
      if (!save()) {
        state.ownedIds = [...owned].filter(id => id !== card.id);
        return { changed: false, reason: 'storage-unavailable', count: state.ownedIds.length };
      }
      emit({ outcome: 'gain', cardId: card.id });
      return { changed: true, outcome: 'gain', cardId: card.id, count: state.ownedIds.length };
    }

    if (!owned.size) return { changed: false, reason: 'inventory-empty', count: 0 };
    const ownedCards = PLAYABLE_CARDS.filter(card => owned.has(card.id));
    // Future user-defined decision-mechanism biases can select from the current owned cards.
    // Until those biases are specified, loss is uniformly random.
    let selectedId = null;
    try {
      selectedId = window.ParagraphDecisionMechanism?.selectCardToLose?.({
        ownedCards: ownedCards.slice(),
        ownedIds: ownedCards.map(card => card.id),
        random: Math.random
      });
    } catch (_) {}
    const selected = ownedCards.find(card => card.id === selectedId) || randomItem(ownedCards);
    owned.delete(selected.id);
    state.ownedIds = [...owned];
    if (!save()) {
      state.ownedIds = [...owned, selected.id];
      return { changed: false, reason: 'storage-unavailable', count: state.ownedIds.length };
    }
    emit({ outcome: 'loss', cardId: selected.id });
    return { changed: true, outcome: 'loss', cardId: selected.id, count: state.ownedIds.length };
  }

  window.CardCollection = Object.freeze({
    cards: PLAYABLE_CARDS,
    getState: () => ({ version: 1, ownedIds: state.ownedIds.slice(), count: state.ownedIds.length }),
    isOwned: id => state.ownedIds.includes(Number(id)),
    applyOutcome,
    storageKey: STORAGE_KEY
  });
})();