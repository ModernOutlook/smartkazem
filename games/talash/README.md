# تلاش — Talash

A dependency-free browser game for SmartKazem using an ES module, Canvas, and a local simulation loop.

## Implemented rules
- The skateboard paddle moves only horizontally along the lower boundary. Pointer, touch, arrow keys, and A/D control it.
- The basketball moves in two dimensions, bounces from the left/right walls and ceiling, and gains speed after each boundary collision.
- Five-colored triangles form the upper mesh. Hitting one triangle atomically removes only its same-color connected component; other colors remain unchanged.
- Each removed triangle spawns a coin carrying the five-realm site emblem. Score increases only when the paddle catches a coin.
- Three missed balls, pause/resume, restart, accessible status announcements, and reduced-motion-friendly controls are included.
- Backgrounds `content/bk1.jpg` through `content/bk5.jpg` are reserved in realm order. Until supplied, the game uses a pure black background.

## Test
Run with Node.js and its built-in test runner: `node --test games/talash/tests/*.test.mjs`.
