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
