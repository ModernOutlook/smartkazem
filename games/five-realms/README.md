# Poker Hands — بازی کارتی اقتصاد سهم

The Five Realms entry is now a five-game directory in the SmartKazem shared-page runtime. The existing local hot-seat card game for 2–5 players remains preserved at the separate `five-realms-cards` route so its rules engine and Tadbir bank handoff remain available. Its question flow generates a paragraph and reference judgment through the existing Paragraph Machine recognition pipeline and default backend settings. Remaining author-owned card-game configuration decisions are documented below.

## Layout

- `engine/index.mjs`: deterministic RNG, deck/discard recycling, poker evaluator, turn lifecycle, badges, lucky cards, questions, exchanges, and bank rules.
- `data/config.json`: gameplay numbers, including the approved 72-badge pool per realm.
- `data/realms.json`: realm names/color/suit presentation data.
- Question generation and reference evaluation are delegated to `window.ParagraphWorkspaceAdapter`, the same adapter used by Paragraph Machine recognition; no local placeholder question bank is loaded.
- `tests/engine.test.mjs`: dependency-free Node test suite.
- `scripts/five-realms-browser-smoke.mjs`: Playwright smoke coverage for desktop, mobile portrait, and mobile landscape.

## Test

Requires a modern Node.js release with built-in `node:test` and `structuredClone`:

```sh
node --test games/five-realms/tests/*.test.mjs
```

## Open defaults and caveats

- Win condition: all badges claimed or the configured 30-round limit; most points wins, ties use owned badge value.
- Start: two to five local players, five cards each, zero points.
- **Approved badge pool (2026-10-15):** each realm has 72 badges: 12 worth 3, 24 worth 2, and 36 worth 1. Total value per realm is 120 (`10x`, with `x=12`).
- **Author-approved realm identity and color mapping (2026-10-15):** blue = Structure of the Hall (`#164E63`), yellow = Continuity of the Universe (`#B89B45`), purple = Realm of Experience (`#7542A6`), red = Simulation (`#C94F55`, Paragraph Machine realm `R`), green = Share Economy (`#218653`). The mapping is stored in `data/realms.json`.
- **Approved badge pricing decisions (2026-10-15):** purple badge base price multiplier is `0.5`, so purple badges cost half their normal base price before the owned-value discount. A player holding the blue Ace (`A-spades`) receives an additional 20% discount on the final blue badge price, after the existing base multiplier and owned-value discount are calculated. The discount is configured as `realms.blue.acePurchaseDiscount = 0.2` and the price is rounded to hundredths after applying it.
- Badge price uses additive owned-value discount `price × (1 − ownedValue / (2T))`; this is currently applied per realm's configured total value.
- Poker few-card scoring defaults to the approved `count` mode: 1→1, 2→2, 3→6, 4→16. A distinct structural scoring mode is not specified and is not selectable.
- Each question is one live-generated paragraph. The five user judgments (`S/T/E/R/C`) use the Paragraph Machine statuses: consistent/matching, ambiguous, or contradictory. Exact correctness requires all five statuses to match the independently generated reference judgment.
- Bank deposit limit uses the exact fractional points balance. The specified principal formula `2 × floor(s) − s` can be negative for deposits below one point; this is retained and flagged.
- Badge sale returns 95% of recorded purchase price, rounded half-up to hundredths.
- Implemented: lucky cards are granted on first full realm ownership, stay in the hand, survive poker scoring and wrong-answer penalties, and cannot be returned through ordinary exchange. Purple jokers remain in hand when used to take a chosen available non-joker card; only one exchange action can be made per turn, so the two jokers are used on separate turns.
- Implemented: exchange from an unowned realm into an owned realm grants one additional exchange before the turn ends; when both the returned-card realm and drawn-card realm are owned, the returned card stays in hand and two cards are drawn.
- Implemented: the question action stays inside the game page and requests one paragraph through `ParagraphWorkspaceAdapter.generateParagraphs(1, 'mixed', language)`, then independently evaluates it through `ParagraphWorkspaceAdapter.evaluateText`. The UI renders five realm judgment boxes with the same three statuses as Paragraph Machine. Exact five-realm matching determines recognition correctness; existing card rewards, wrong-answer penalties, full-ownership forgiveness, and tied-most-held-realm forgiveness remain game mechanics.
- Implemented: bank interest accrues at the start of the owner's turns for up to five turns; withdrawal stops future interest; sold badges return to the shared pool; game-over winners are selected by spendable points only, then total owned badge value. Bank principal and accrued interest do not count unless withdrawn before the game ends.
- Tadbir bank machine: deposit and withdrawal are removed from the card game's action panel and are available through the separate «تدبیر» page, launched from the five-game directory. The card game and bank state remain on the separate `five-realms-cards` route so returning from Tadbir preserves the active game and handoff state. Its adapter operates on the active player's existing in-game bank, preserves the game state while routes change, and treats a successful bank operation as the current turn's action before returning to the game for the next-player handoff.
- Question generation and reference evaluation use the existing Paragraph Machine LLM client and its default backend configuration. The game does not introduce a second LLM configuration path. Live questions require a working LLM connection; the game remains on the same page if generation or evaluation fails, and offers retry.
- The game can be launched as a mechanics demo, but it must not be presented as a finished, author-approved game until the remaining open rules/configuration decisions are resolved.

## Site integration progress

- `content/page-templates/five-realms.fragment` is the five-game directory; `games/five-realms/hub.mjs` opens Talash and the existing Tadbir page.
- The original card game is preserved in `content/page-templates/five-realms-cards.fragment` and remains implemented by `games/five-realms/ui.mjs` on the `five-realms-cards` route.
- The active card-game state, player hands, scores, badges, deck/discard piles, round, turn handoff, and Tadbir bank handoff are stored in localStorage and restored after reload. This is device/browser-profile local, not account-synced; clearing site data removes the save.
- `js/shared-pages.js` registers the directory, the preserved card game, Tadbir, and Talash with the shared-page runtime.
- Added centralized `pages.fiveRealms.*` strings to `translations/fa.json`, `en.json`, `ar.json`, and `zh.json`. Realm display labels and colors are read from `data/realms.json`; the mapping is author-confirmed.
- Emits named game events through `site:game-sound` and requests sound through the existing `SiteAudio.play(realm)` API. The site audio engine itself was not modified.
- The browser workflow starts the site over HTTP and exercises game startup, scoring, turn handoff, exchange, badge action panels, and Tadbir's active-player bank connection at desktop and mobile viewports. Final readiness still depends on passing the current CI run and resolving the open author-owned content/configuration decisions.

## Ambiguity decision log

### Level 3 — badge pool count/value contradiction (RESOLVED 2026-10-15)

**Question:** The handoff says each realm has (6x) badges with (x) badges worth 3, (2x) worth 2, and (3x) worth 1, so total badge value is (10x). The current config instead defines 12 badges per realm (2 worth 3, 4 worth 2, 6 worth 1), which totals 20 and corresponds to (x=2), not (x=12). The README's previous provisional 12-badge pool is implementation history, not an approved rule.

**Alternatives:** (A) Treat (x=2) as the intended pool: 12 badges per realm, value total 20. (B) Treat 12 as (x): 72 badges per realm, value total 120. These produce substantially different game duration, badge availability, discounts, and end-game pacing.

**Decision (user-approved 2026-10-15):** `x=12`: 72 badges per realm, distributed as 12 badges worth 3, 24 worth 2, and 36 worth 1. The total badge value `T` is 120 per realm. Updated `data/config.json` to match. Badge prices and discounts must use this approved `T=120` value; other unresolved mechanics remain open.

### Remaining release gates

- Automated validation must be checked against the latest branch commit before any merge. The browser smoke suite now includes a dedicated Five Realms interaction run; mobile/RTL/accessibility and event-by-event audio behavior still require acceptance checks.
- Realm names and colors are author-confirmed and stored data-first in `data/realms.json`; red is Simulation (`R`), matching Paragraph Machine.
- Five Realms no longer maintains a separate static question bank; the live Paragraph Machine recognition pipeline is the source of question paragraphs and reference judgments.
- **Final bank scoring (user-approved 2026-10-15, option B):** bank principal and accrued interest do not count toward final score. Winners are ranked by spendable points only, then total owned badge value. A player must withdraw the balance before game end for it to contribute to spendable points.
- Keep PR #167 in draft until automated tests and browser acceptance checks pass and the remaining configuration decisions are resolved.
