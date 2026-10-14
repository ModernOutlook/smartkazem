# بازی ۵ قلمرو — Five Realms

Five Realms is a local hot-seat card-game demo for 2–5 players, integrated into the SmartKazem shared-page runtime. The rules engine and browser smoke coverage are included. A launchable demo is not yet a content-complete release while the question bank and author-owned configuration decisions remain unresolved.

## Layout

- `engine/index.mjs`: deterministic RNG, deck/discard recycling, poker evaluator, turn lifecycle, badges, lucky cards, questions, exchanges, and bank rules.
- `data/config.json`: gameplay numbers, including the approved 72-badge pool per realm.
- `data/realms.json`: realm names/color/suit presentation data.
- `data/questions.json`: five clearly marked placeholder question sets.
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
- Realm color/name mapping in `realms.json` is provisional and must be confirmed by the author.
- Purple badge base price multiplier is provisionally 0.5 to express “purple is cheapest”; blue/Ace premium is not applied.
- Badge price uses additive owned-value discount `price × (1 − ownedValue / (2T))`; this is currently applied per realm's configured total value.
- Poker few-card scoring defaults to the approved `count` mode: 1→1, 2→2, 3→6, 4→16. A distinct structural scoring mode is not specified and is not selectable.
- Question answers are placeholders, not author-approved philosophical content.
- Bank deposit limit uses the exact fractional points balance. The specified principal formula `2 × floor(s) − s` can be negative for deposits below one point; this is retained and flagged.
- Badge sale returns 95% of recorded purchase price, rounded half-up to hundredths.
- Implemented: lucky cards are granted on first full realm ownership, stay in the hand, survive poker scoring and wrong-answer penalties, and cannot be returned through ordinary exchange. Purple jokers remain in hand when used to take a chosen available non-joker card; only one exchange action can be made per turn, so the two jokers are used on separate turns.
- Implemented: exchange from an unowned realm into an owned realm grants one additional exchange before the turn ends; when both the returned-card realm and drawn-card realm are owned, the returned card stays in hand and two cards are drawn.
- Implemented: question records load from `data/questions.json`; answers are evaluated against `answerIndex`; fully owned realm parts are free; wrong answers return a non-lucky card; the wrong answer in a most-held realm is forgiven, with a player choice if several realms tie.
- Implemented: bank interest accrues at the start of the owner's turns for up to five turns; withdrawal stops future interest; sold badges return to the shared pool; game-over winners are selected by spendable points only, then total owned badge value. Bank principal and accrued interest do not count unless withdrawn before the game ends.
- Question prompts and options remain explicit `PLACEHOLDER` records. The mechanics work with the placeholder answer keys, but author-approved question content must replace them before a content-complete release.
- The game can be launched as a mechanics demo, but it must not be presented as a finished, author-approved game until the placeholder question bank and open rules/configuration decisions are resolved.

## Site integration progress

- Added `content/page-templates/five-realms.fragment` and `css/pages/five-realms.css`.
- Registered the page in `js/shared-pages.js` with the existing child-page runtime and a button in the `اقتصاد سهم` passage in `index.html`.
- Added `games/five-realms/ui.mjs` for local hot-seat setup, hand display, action controls, badges, bank, scoreboard, and pass-device handoff.
- Added centralized `pages.fiveRealms.*` strings to `translations/fa.json`, `en.json`, `ar.json`, and `zh.json`. Realm display labels and colors are read from `data/realms.json`; its mapping remains explicitly provisional.
- Emits named game events through `site:game-sound` and requests sound through the existing `SiteAudio.play(realm)` API. The site audio engine itself was not modified.
- The browser workflow starts the site over HTTP and exercises game startup, scoring, turn handoff, exchange, and the primary action panels at desktop and mobile viewports. Final readiness still depends on passing the current CI run and resolving the open author-owned content/configuration decisions.

## Ambiguity decision log

### Level 3 — badge pool count/value contradiction (RESOLVED 2026-10-15)

**Question:** The handoff says each realm has (6x) badges with (x) badges worth 3, (2x) worth 2, and (3x) worth 1, so total badge value is (10x). The current config instead defines 12 badges per realm (2 worth 3, 4 worth 2, 6 worth 1), which totals 20 and corresponds to (x=2), not (x=12). The README's previous provisional 12-badge pool is implementation history, not an approved rule.

**Alternatives:** (A) Treat (x=2) as the intended pool: 12 badges per realm, value total 20. (B) Treat 12 as (x): 72 badges per realm, value total 120. These produce substantially different game duration, badge availability, discounts, and end-game pacing.

**Decision (user-approved 2026-10-15):** `x=12`: 72 badges per realm, distributed as 12 badges worth 3, 24 worth 2, and 36 worth 1. The total badge value `T` is 120 per realm. Updated `data/config.json` to match. Badge prices and discounts must use this approved `T=120` value; other unresolved mechanics remain open.

### Remaining release gates

- Automated validation must be checked against the latest branch commit before any merge. The browser smoke suite now includes a dedicated Five Realms interaction run; mobile/RTL/accessibility and event-by-event audio behavior still require acceptance checks.
- Realm color/name mapping remains provisional in `data/realms.json`; keep the mapping data-driven until the author confirms it.
- The five question sets remain explicit `PLACEHOLDER` records. Do not invent or rewrite the author's philosophical question content.
- **Final bank scoring (user-approved 2026-10-15, option B):** bank principal and accrued interest do not count toward final score. Winners are ranked by spendable points only, then total owned badge value. A player must withdraw the balance before game end for it to contribute to spendable points.
- Keep PR #164 in draft until automated tests and browser acceptance checks pass and the remaining content/configuration decisions are resolved.
