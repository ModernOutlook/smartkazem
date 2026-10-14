# بازی ۵ قلمرو — Five Realms

Pure rules engine foundation. No site entry point or realm navigation is wired yet.

## Layout

- `engine/index.mjs`: deterministic RNG, deck, poker evaluator, event emitter, and initial game/action APIs.
- `data/config.json`: gameplay numbers and provisional defaults.
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
- Each realm currently has 12 badges: two worth 3, four worth 2, six worth 1. The values sum to 20; the handoff's general 6x / 10x badge-value statement is not reconciled yet, so this pool is provisional.
- Realm color/name mapping in `realms.json` is provisional and must be confirmed by the author.
- Purple badge base price multiplier is provisionally 0.5 to express “purple is cheapest”; blue/Ace premium is not applied.
- Badge price uses additive owned-value discount `price × (1 − ownedValue / (2T))`; this is currently applied per realm's configured total value.
- Poker few-card scoring defaults to `count`; `structural` is documented in the handoff but not yet implemented.
- Question answers are placeholders, not author-approved philosophical content.
- Bank deposit limit uses the exact fractional points balance. The specified principal formula `2 × floor(s) − s` can be negative for deposits below one point; this is retained and flagged.
- Badge sale returns 95% of recorded purchase price, rounded half-up to hundredths.
- Lucky cards, exchange joker swaps, the extra exchange chain, fully-owned realm rewards, question-answer evaluation, complete turn validation, and sound-event coverage need further implementation/verification before gameplay is considered complete.
- This is an engine foundation, not yet acceptance-ready; the test suite is a first gate, not a claim that all handoff requirements pass.

## Site integration progress

- Added `content/page-templates/five-realms.fragment` and `css/pages/five-realms.css`.
- Registered the page in `js/shared-pages.js` with the existing child-page runtime and a button in the `اقتصاد سهم` passage in `index.html`.
- Added `games/five-realms/ui.mjs` for local hot-seat setup, hand display, action controls, badges, bank, scoreboard, and pass-device handoff.
- Added centralized `pages.fiveRealms.*` strings to `translations/fa.json`, `en.json`, `ar.json`, and `zh.json`. Realm display labels and colors are read from `data/realms.json`; its mapping remains explicitly provisional.
- Emits named game events through `site:game-sound` and requests sound through the existing `SiteAudio.play(realm)` API. The site audio engine itself was not modified.
- The game is still a draft. This integration has not been run in a browser or validated on GitHub Pages. The repository connector does not provide a local browser or Node execution environment.

## Ambiguity decision log

### Level 3 — badge pool count/value contradiction (OPEN; user decision required)

**Question:** The handoff says each realm has (6x) badges with (x) badges worth 3, (2x) worth 2, and (3x) worth 1, so total badge value is (10x). The current config instead defines 12 badges per realm (2 worth 3, 4 worth 2, 6 worth 1), which totals 20 and corresponds to (x=2), not (x=12). The README's previous provisional 12-badge pool is implementation history, not an approved rule.

**Alternatives:** (A) Treat (x=2) as the intended pool: 12 badges per realm, value total 20. (B) Treat 12 as (x): 72 badges per realm, value total 120. These produce substantially different game duration, badge availability, discounts, and end-game pacing.

**Status:** Not approved. Current config remains provisional and the badge pool, badge pricing, and completion behavior must not be described as finalized until the author decides.

### Other known incomplete behavior

- Joker exchange is not yet implemented as a player-chosen card swap; the current exchange action still draws randomly.
- The extra exchange-turn chain for an unowned-to-owned realm swap is not implemented; current behavior ends the action.
- The question UI is placeholder-only and does not yet load the five question records from `data/questions.json`.
- The “wrong answer in most-held realm” forgiveness choice is not exposed in the UI.
- Lucky-card retention and realm-completion rewards are not fully implemented.
- Bank schedule and points are stored in hundredths, but deposit-limit, early withdrawal, and interest timing need full rule-level tests.
- The sound event hook is connected to the public site audio API, but event-by-event sound behavior is unverified.

Do not merge while these acceptance-critical rules remain incomplete.
