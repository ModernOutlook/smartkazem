# SmartKazem Audio Engine

## Purpose

SmartKazemAudio is the single page-level Web Audio subsystem. It owns one AudioContext, the master bus, ambient bus, cue bus, ducking, lifecycle recovery, and persisted audio state.

The existing SiteAudio object is only a compatibility facade. New code must use SmartKazemAudio.

## Boot contract

The tiny inline bootstrap in index.html runs before every other script. It creates the one AudioContext and the minimum bus graph, or records a silent-safe unsupported state. audio-engine.js adopts that graph rather than creating a second context.

Browsers may create the context suspended until user activation; the splash gate therefore treats graph readiness and audible playback readiness as separate states. Audio failure never blocks application startup.

## Public API

- init() — initialize once and return the current state.
- play(name, options) — play a short registered cue.
- stop() — persist position and suspend the context.
- duck(level, duration) — temporarily reduce the shared bus.
- setScene(scene, position) — select the logical ambient scene and persist its position.
- registerCue(name, renderer) — register a lightweight Web Audio cue renderer.
- getState() — return a snapshot of persisted runtime state.
- on(type, handler) / off(type, handler) — subscribe to engine events.

Additional preference controls are setVolume, setMuted, setEnabled, setReducedAudio, and setCues.

## State schema

Storage key: smartkazem.audio.v1.

Persisted fields are versioned through the key and currently include enabled, muted, volume, scene, position, reducedAudio, cues, and gesture.

## Accessibility boundary

Accessibility policy must be added through a small versioned adapter rather than embedded throughout the engine. The planned adapter contract is:

create({ engine, i18n, featureDetect }) -> { init, destroy, onState, configure }

The adapter owns assistive-technology heuristics, ARIA announcements, reduced-audio policy, and future WCAG/ARIA changes. Engine code must not acquire screen-reader-specific branching.

## Navigation and static-host limitations

The current repository still performs some full-document navigations and does not yet install a service worker. A later migration concern will move those transitions to the single-document shell where practical and add a scope-correct GitHub Pages service worker for cache recovery.

A hard reload always creates a new JavaScript realm and therefore cannot preserve an AudioContext; the current engine instead restores its persisted state immediately and keeps startup failure-safe. Cache-backed asset recovery and cross-tab single-instance arbitration are intentionally deferred to the next concerns.

## Maintenance rule

Future AI-generated audio changes should treat this document and the public API above as the architectural boundary. Engine internals may change without touching page modules; page modules should call the public API only.
