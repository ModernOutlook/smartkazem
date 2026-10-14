# بازی ۵ قلمرو — Five Realms

Five Realms hot-seat game with a data-driven rules engine and shared-site entry point. Core gameplay mechanics are implemented on this branch; automated and browser validation are still pending.

## Layout

- `engine/index.mjs`: deterministic RNG, deck/discard recycling, poker evaluator, turn lifecycle, badges, lucky cards, questions, exchanges, and bank rules.
- `data/config.json`: gameplay numbers, including the approved 72-badge pool per realm.
- `data/realms.json`: realm names/color/suit presentation data.
- `data/questions.json`: five clearly marked placeholder question sets.
- `tests/engine.test.mjs`: dependency-free Node test suite.

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
- Implemented: bank interest accrues at the start of the owner's turns for up to five turns; withdrawal stops future interest; sold badges return to the shared pool; game-over winners are selected by points, then total owned badge value.
- Question prompts and options remain explicit `PLACEHOLDER` records. The mechanics work with the placeholder answer keys, but author-approved question content must replace them before a content-complete release.
- This is an engine foundation, not yet acceptance-ready; the test suite is a first gate, not a claim that all handoff requirements pass.

## Site integration progress

- Added `content/page-templates/five-realms.fragment` and `css/pages/five-realms.css`.
- Registered the page in `js/shared-pages.js` with the existing child-page runtime and a button in the `اقتصاد سهم` passage in `index.html`.
- Added `games/five-realms/ui.mjs` for local hot-seat setup, hand display, action controls, badges, bank, scoreboard, and pass-device handoff.
- Added centralized `pages.fiveRealms.*` strings to `translations/fa.json`, `en.json`, `ar.json`, and `zh.json`. Realm display labels and colors are read from `data/realms.json`; its mapping remains explicitly provisional.
- Emits named game events through `site:game-sound` and requests sound through the existing `SiteAudio.play(realm)` API. The site audio engine itself was not modified.
- The game is still a draft. This integration has not been run in a browser or validated on GitHub Pages. The repository connector does not provide a local browser or Node execution environment.

## Ambiguity decision log

### Level 3 — badge pool count/value contradiction (RESOLVED 2026-10-15)

**Question:** The handoff says each realm has (6x) badges with (x) badges worth 3, (2x) worth 2, and (3x) worth 1, so total badge value is (10x). The current config instead defines 12 badges per realm (2 worth 3, 4 worth 2, 6 worth 1), which totals 20 and corresponds to (x=2), not (x=12). The README's previous provisional 12-badge pool is implementation history, not an approved rule.

**Alternatives:** (A) Treat (x=2) as the intended pool: 12 badges per realm, value total 20. (B) Treat 12 as (x): 72 badges per realm, value total 120. These produce substantially different game duration, badge availability, discounts, and end-game pacing.

**Decision (user-approved 2026-10-15):** `x=12`: 72 badges per realm, distributed as 12 badges worth 3, 24 worth 2, and 36 worth 1. The total badge value `T` is 120 per realm. Updated `data/config.json` to match. Badge prices and discounts must use this approved `T=120` value; other unresolved mechanics remain open.

### Other known incomplete behavior

- Joker exchange is not yet implemented as a player-chosen card swap; the current exchange action still draws randomly.
- The extra exchange-turn chain for an unowned-to-owned realm swap is not implemented; current behavior ends the action.
- The question UI is placeholder-only and does not yet load the five question records from `data/questions.json`.
- The “wrong answer in most-held realm” forgiveness choice is not exposed in the UI.
- Lucky-card retention and realm-completion rewards are not fully implemented.
- Bank schedule and points are stored in hundredths, but deposit-limit, early withdrawal, and interest timing need full rule-level tests.
- The sound event hook is connected to the public site audio API, but event-by-event sound behavior is unverified.

Do not merge while these acceptance-critical rules remain incomplete.
