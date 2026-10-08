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

1. **Triple click / triple tap anywhere within about 620 ms:** toggle Blind Accessibility Mode.
2. **Double click / double tap in Blind Mode:** repeat the last spoken announcement.
3. **Long press / long pointer hold for about 720 ms in Blind Mode:** pause/resume speech; if idle, repeat the last announcement.
4. **Escape:** cancel current speech.

The triple-click handler captures the third click before the underlying site control can activate.

## Speech and future updates
The accessibility layer uses the browser-native Web Speech API and selects an available voice matching the current document language: Persian, English, Arabic, or Chinese. This keeps the site light and lets the browser/device supply speech resources.

A versioned boundary is reserved for a future trusted voice-resource updater. Any updater must accept validated static metadata/resources from reputable free sources and must never execute downloaded JavaScript.

## Persistence and navigation
Audio preferences and accessibility mode are stored locally. Same-document navigation remains uninterrupted.

A full document navigation necessarily creates a new JavaScript realm and AudioContext. A website cannot keep a live AudioContext across that boundary, so full-page routes restore the selected mode/state on the next document. A future SPA migration can make the complete journey share one uninterrupted AudioContext.
