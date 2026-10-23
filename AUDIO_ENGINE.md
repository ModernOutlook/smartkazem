# SmartKazem Audio System 3.0

SmartKazem uses one lightweight page-level Web Audio engine plus an isolated speech accessibility layer.

## Startup
- `translations/i18n.js` owns the shared language boundary and automatically bootstraps the shared `audio-engine.js` when needed. Pages that explicitly load the engine are reused rather than duplicated.
- The engine creates one `AudioContext` and one master gain graph during startup.
- No external audio files are downloaded.
- Browsers may keep the context suspended until user activation. The graph is already ready, so the first real pointer gesture can produce sound immediately.
- Same-document navigation keeps the same AudioContext alive.

## Default sound system
Five procedural cues correspond to the five realms. The engine infers the realm from the clicked element, its enclosing realm, or the active page, so rings, page controls, buttons, and navigation actions inherit the correct sound without per-button audio files.

## Blind accessibility mode
There is deliberately no visible accessibility audio button.

1. **Ctrl+Alt+Shift+A:** toggle Blind Accessibility Mode from the keyboard, without requiring a pointer gesture.
2. **Triple click / triple tap on a non-interactive area within about 620 ms:** alternate pointer/touch activation.
3. **Arrow keys:** move between headings, paragraphs, list items, quotes, table cells, links, and controls. **Home / End** move to the first / last item.
4. **Enter / Space:** read the selected text block or activate a control.
5. **P:** pause or resume speech. If speech is idle, P repeats the last announcement. **R** repeats the last speech.
6. **Double click / double tap in Blind Mode:** repeat the last spoken announcement.
7. **Long press / long pointer hold for about 720 ms in Blind Mode:** pause/resume speech; if idle, repeat the last announcement.
8. **Escape:** cancel current speech.
9. **Swipe horizontally on touch screens:** move to the next or previous navigable item.

Long articles are read in sequential chunks capped by character count, with boundaries chosen at punctuation or spaces when possible. The chunker also supports languages without spaces, including Chinese. Pressing Enter on an article reads its full visible, language-selected text; pressing Enter on a paragraph or other text block reads only that block. The triple-click handler captures the third click before the underlying site control can activate.

## Speech and future updates
The accessibility layer uses the browser-native Web Speech API and selects an available voice matching the current document language: Persian, English, Arabic, or Chinese. It reads the rendered language-selected DOM, so translated catalog text and long-form content share the same reader without maintaining a second speech-only copy. When the language changes, current speech is cancelled and the page or focused item is announced again using the newly selected language. This keeps the site light and lets the browser/device supply speech resources.

A versioned boundary is reserved for a future trusted voice-resource updater. Any updater must accept validated static metadata/resources from reputable free sources and must never execute downloaded JavaScript.

## Persistence and navigation
Audio preferences and accessibility mode are stored locally. Same-document navigation remains uninterrupted.

A full document navigation necessarily creates a new JavaScript realm and AudioContext. A website cannot keep a live AudioContext across that boundary, so full-page routes restore the selected mode/state on the next document. A future SPA migration can make the complete journey share one uninterrupted AudioContext.
