/*! SmartKazem Audio Engine 2.0 — Web Audio, single-instance core. */
(() => {
  'use strict';

  if (window.SmartKazemAudio) return;

  const STORAGE_KEY = 'smartkazem.audio.v1';
  const DEFAULT_STATE = Object.freeze({
    enabled: true,
    muted: false,
    volume: 0.18,
    scene: 'ambient',
    position: 0,
    reducedAudio: false,
    cues: false,
    gesture: false
  });

  const bootstrap = window.__SmartKazemAudioBootstrap || null;
  const listeners = new Map();
  const cues = new Map();
  let state = { ...DEFAULT_STATE };
  let ctx = bootstrap?.context || null;
  let master = bootstrap?.master || null;
  let ambient = bootstrap?.ambient || null;
  let cueBus = bootstrap?.cues || null;
  let duck = bootstrap?.duck || null;
  let initialized = false;
  let duckTimer = 0;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') state = { ...DEFAULT_STATE, ...saved };
    } catch (_) {}
    state.volume = Math.min(1, Math.max(0, Number(state.volume) || DEFAULT_STATE.volume));
    state.position = Math.max(0, Number(state.position) || 0);
    state.enabled = state.enabled !== false;
    state.muted = state.muted === true;
    state.reducedAudio = state.reducedAudio === true;
    state.cues = state.cues === true;
    state.gesture = state.gesture === true;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function emit(type, detail = {}) {
    const set = listeners.get(type);
    if (set) set.forEach((fn) => { try { fn(detail); } catch (_) {} });
    document.dispatchEvent(new CustomEvent('audio:' + type, { detail }));
  }

  function ensureGraph() {
    if (ctx && master && ambient && cueBus && duck) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    try {
      ctx ||= new AC();
      master ||= ctx.createGain();
      ambient ||= ctx.createGain();
      cueBus ||= ctx.createGain();
      duck ||= ctx.createGain();

      ambient.connect(duck);
      cueBus.connect(duck);
      duck.connect(master);
      master.connect(ctx.destination);

      ambient.gain.value = 1;
      cueBus.gain.value = state.cues && !state.reducedAudio ? 1 : 0;
      duck.gain.value = 1;
      master.gain.value = state.enabled && !state.muted ? state.volume : 0;

      ctx.addEventListener?.('statechange', handleContextState);
      return true;
    } catch (_) {
      ctx = null;
      master = ambient = cueBus = duck = null;
      return false;
    }
  }

  function handleContextState() {
    const current = ctx?.state || 'unavailable';
    emit('statechange', { state: current });
    if (current === 'running') {
      state.gesture = true;
      saveState();
      emit('ready', getState());
    }
  }

  async function resume() {
    if (!state.enabled || state.muted) return false;
    if (!ensureGraph() || !ctx) return false;

    try {
      if (ctx.state !== 'running') await ctx.resume();
      const running = ctx.state === 'running';
      if (running) {
        state.gesture = true;
        saveState();
        emit('resume', getState());
      }
      return running;
    } catch (_) {
      emit('resumeerror', { state: ctx.state, error: 'resume-rejected' });
      return false;
    }
  }

  async function suspend() {
    if (!ctx || ctx.state === 'closed') return;
    try { await ctx.suspend(); } catch (_) {}
  }

  function setVolume(value) {
    state.volume = Math.min(1, Math.max(0, Number(value) || 0));
    if (master && ctx) {
      master.gain.setTargetAtTime(
        state.enabled && !state.muted ? state.volume : 0,
        ctx.currentTime,
        0.03
      );
    }
    saveState();
    emit('volume', { value: state.volume });
  }

  function setMuted(value) {
    state.muted = Boolean(value);
    if (state.muted) state.enabled = true;
    setVolume(state.volume);
    emit('mute', { muted: state.muted });
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    if (!state.enabled) state.muted = true;
    if (state.enabled && state.muted) state.muted = false;
    setVolume(state.volume);
    saveState();
    emit('enabled', { enabled: state.enabled });
  }

  function setReducedAudio(value) {
    state.reducedAudio = Boolean(value);
    if (cueBus) cueBus.gain.value = state.cues && !state.reducedAudio ? 1 : 0;
    saveState();
    emit('reducedaudio', { reducedAudio: state.reducedAudio });
  }

  function setCues(value) {
    state.cues = Boolean(value);
    if (cueBus) cueBus.gain.value = state.cues && !state.reducedAudio ? 1 : 0;
    saveState();
    emit('cues', { cues: state.cues });
  }

  function duckTo(level = 0.35, duration = 0.18) {
    if (!duck || !ctx) return;
    const target = Math.min(1, Math.max(0, Number(level) || 0));
    const seconds = Math.max(0.01, Number(duration) || 0.18);
    duck.gain.cancelScheduledValues(ctx.currentTime);
    duck.gain.setTargetAtTime(target, ctx.currentTime, seconds);
    window.clearTimeout(duckTimer);
    duckTimer = window.setTimeout(() => {
      if (duck && ctx) duck.gain.setTargetAtTime(1, ctx.currentTime, seconds);
    }, Math.round(seconds * 1000));
  }

  function registerCue(name, renderer) {
    if (!name || typeof renderer !== 'function') return false;
    cues.set(String(name), renderer);
    return true;
  }

  function play(name = 'tap', options = {}) {
    if (!state.enabled || state.muted || state.reducedAudio || !state.cues) return false;
    if (!ensureGraph() || !ctx || ctx.state !== 'running' || !cueBus) return false;

    const custom = cues.get(name);
    if (custom) {
      try { custom({ context: ctx, bus: cueBus, options, state: getState() }); return true; }
      catch (_) { return false; }
    }

    const profiles = {
      tap: { notes: [196, 293.66], length: 0.24, peak: 0.10 },
      open: { notes: [174.61, 261.63, 392], length: 0.72, peak: 0.08 },
      back: { notes: [293.66, 220, 146.83], length: 0.38, peak: 0.09 },
      success: { notes: [261.63, 329.63, 392, 523.25], length: 0.58, peak: 0.08 },
      error: { notes: [155.56, 130.81], length: 0.32, peak: 0.07 }
    };
    const profile = profiles[name] || profiles.tap;

    try {
      const now = ctx.currentTime;
      profile.notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const start = now + index * 0.045;
        const end = start + profile.length;

        oscillator.type = index === 0 ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency * (name === 'error' ? 0.82 : 0.985),
          end
        );

        filter.type = 'lowpass';
        filter.frequency.value = name === 'open' ? 1800 : 2600;
        filter.Q.value = 0.7;

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(profile.peak, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(cueBus);
        oscillator.start(start);
        oscillator.stop(end + 0.03);
      });
      duckTo(0.55, 0.08);
      emit('play', { cue: name });
      return true;
    } catch (_) {
      return false;
    }
  }

  function stop() {
    state.position = ctx?.currentTime || state.position;
    saveState();
    suspend();
    emit('stop', getState());
  }

  function setScene(scene, position = state.position) {
    state.scene = String(scene || 'ambient');
    state.position = Math.max(0, Number(position) || 0);
    saveState();
    emit('scene', { scene: state.scene, position: state.position });
  }

  function getState() {
    return Object.freeze({ ...state, supported: Boolean(ctx) });
  }

  function on(type, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
    return () => off(type, handler);
  }

  function off(type, handler) {
    listeners.get(type)?.delete(handler);
  }

  function wireLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) suspend();
      else if (state.gesture && state.enabled && !state.muted) resume();
    });

    window.addEventListener('pagehide', () => {
      state.position = ctx?.currentTime || state.position;
      saveState();
    });

    window.addEventListener('pageshow', () => {
      if (state.gesture && state.enabled && !state.muted) resume();
    });

    document.addEventListener('pointerdown', () => { resume(); }, { capture: true, passive: true });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') resume();
    }, { capture: true });

    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.('[data-sound-cue]');
      if (target) play(target.dataset.soundCue || 'tap');
    }, true);
  }

  function wireControls() {
    const controls = document.getElementById('audio-controls');
    if (!controls) return;

    const toggle = controls.querySelector('[data-audio-toggle]');
    const stopButton = controls.querySelector('[data-audio-stop]');
    const muteButton = controls.querySelector('[data-audio-mute]');
    const volume = controls.querySelector('[data-audio-volume]');

    const sync = () => {
      const current = getState();
      if (toggle) toggle.setAttribute('aria-pressed', String(current.enabled && !current.muted));
      if (muteButton) muteButton.setAttribute('aria-pressed', String(current.muted));
      if (volume) volume.value = String(Math.round(current.volume * 100));
    };

    toggle?.addEventListener('click', () => {
      const current = getState();
      setEnabled(!current.enabled || current.muted);
      if (getState().enabled) resume();
      sync();
    });

    stopButton?.addEventListener('click', () => {
      stop();
      sync();
    });

    muteButton?.addEventListener('click', () => {
      setMuted(!getState().muted);
      if (!getState().muted) resume();
      sync();
    });

    volume?.addEventListener('input', (event) => {
      setVolume(Number(event.target.value) / 100);
      if (getState().volume > 0 && getState().muted) setMuted(false);
      sync();
    });

    on('volume', sync);
    on('mute', sync);
    on('enabled', sync);
    sync();
  }

  function label(path, fallback) {
    return window.SiteI18n?.get?.(path, fallback) || fallback;
  }

  function wireSplashGate() {
    const splash = document.getElementById('splash');
    if (!splash) return;

    const enable = splash.querySelector('[data-audio-enable]');
    const skip = splash.querySelector('[data-audio-continue]');
    const status = splash.querySelector('[data-audio-status]');
    let gateOpen = true;

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const hide = () => {
      if (!gateOpen) return;
      gateOpen = false;
      splash.classList.add('is-ready');
      splash.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => { splash.hidden = true; }, 360);
    };

    const attempt = () => resume().then((ok) => {
      if (ok) {
        hide();
        setStatus('');
      } else {
        splash.classList.add('audio-blocked');
        splash.setAttribute('aria-hidden', 'false');
        if (enable) enable.hidden = false;
        setStatus(label('labels.audio.resumeFailed', 'Sound could not be enabled automatically.'));
      }
      return ok;
    });

    if (enable) enable.addEventListener('click', attempt);
    if (skip) skip.addEventListener('click', () => {
      state.muted = true;
      state.gesture = true;
      saveState();
      hide();
      emit('muted', getState());
    });

    if (state.gesture && state.enabled && !state.muted) attempt();
    else {
      splash.classList.add('audio-blocked');
      splash.setAttribute('aria-hidden', 'false');
      if (enable) enable.hidden = false;
    }

    splash.addEventListener('click', (event) => {
      if (event.target?.closest?.('button')) return;
      attempt();
    });
    splash.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        attempt();
      }
    });
  }

  function init() {
    if (initialized) return getState();
    initialized = true;
    loadState();

    if (!ensureGraph()) {
      emit('ready', getState());
      return getState();
    }

    emit('ready', getState());
    wireLifecycle();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wireControls, { once: true });
    } else {
      wireControls();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wireSplashGate, { once: true });
    } else {
      wireSplashGate();
    }

    return getState();
  }

  const api = {
    VERSION: '2.0.0',
    init,
    resume,
    play,
    stop,
    duck: duckTo,
    setScene,
    registerCue,
    getState,
    on,
    off,
    setVolume,
    setMuted,
    setEnabled,
    setReducedAudio,
    setCues
  };

  window.SmartKazemAudio = Object.freeze(api);
  window.SiteAudio = Object.freeze({
    play,
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    get enabled() { return getState().enabled; }
  });

  init();
})();