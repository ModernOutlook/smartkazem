# Site audio integration

The site uses `site-audio.js` as its single, dependency-free UI sound engine. The module is provided as-is: do not rewrite or edit it. Extend it only through the public `SiteAudio.registerTheme(name, definition)` and `SiteAudio.registerCue(name, fn)` APIs when needed.

## Loading

This repository uses static HTML pages rather than a shared template. Load the engine exactly once in the `<head>` of each active page:

```html
<script src="site-audio.js" defer></script>
```

Do not load it again from a page-specific JavaScript file.

## Themes and realm colors

- Put the page's initial theme on the root element: `<html data-sound-theme="blue">`.
- Add `data-sound-theme` to each selectable ring/realm, using the same color mapping as the existing realm accent.
- Current home-ring mapping: Structure → `blue`, Continuity → `yellow`, Experience → `purple`, Reference → `red`, Share → `green`.
- The root `data-sound-theme` is the active theme source of truth. When selection can occur through keyboard or programmatic flows, synchronize the root attribute from the existing realm selection logic; do not create a parallel theme state.
- Current built-in themes are `default`, `blue`, `yellow`, `purple`, `red`, and `green`. Register a new theme with `SiteAudio.registerTheme` before using a new name.

## Cues and events

Use a semantic `<button>` or `<a href="…">` for interactive controls. Use `data-sound` to specify an explicit cue:

- `tap` — ordinary activation (also the automatic fallback)
- `select` — selection
- `open` — opening a page, panel, or dialog
- `back` — closing or returning
- `success` / `error` — result feedback
- `none` — suppress the automatic cue for that control (use when the flow emits its own cue)

The engine automatically supplies a subtle tap cue for ordinary buttons and links unless `data-sound` overrides it. Use `data-sound-hover="hover"` only when hover feedback is appropriate.

For programmatic flows, dispatch the decoupled event instead of coupling a component to the audio implementation:

```js
window.dispatchEvent(new CustomEvent('site:sound', { detail: 'success' }));
window.dispatchEvent(new CustomEvent('site:sound-theme', { detail: 'purple' }));
```

The detail may also be an object, such as `{ cue: 'error' }` or `{ theme: 'red' }`.

## Toggle and i18n

- Add one `<button data-sound-toggle>` to the page header.
- It must remain at least 44 × 44 CSS pixels, be keyboard-accessible, and avoid overlapping other controls on mobile.
- Source its accessible label/title and any visible text from the site's existing i18n catalog using `labels.sound` and `data-i18n`, `data-i18n-aria`, and/or `data-i18n-title`.
- Add `labels.sound` to every supported translation catalog so switching languages updates the label.
- The module persists the enabled state under `siteaudio:enabled` in local storage. Do not add a second preference or parallel toggle state.

## Reliability and constraints

- Never create a separate `AudioContext` or an `<audio>` element for UI sounds.
- Do not add audio files or dependencies for this sound system.
- Sound is optional. A missing/blocked Web Audio API, autoplay restriction, storage failure, or cue failure must never break navigation, forms, selection, translation, or any other site behavior.
- Keep audio failure handling isolated from application logic. Do not modify `site-audio.js`; if a defect is found, report it and use only the supported registration APIs for extensions.
- Every new page, realm, ring, component, or interaction must follow these conventions before it is considered complete.
