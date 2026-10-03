/*! SiteAudio 1.0 — procedural "metaphysical" sound system.
 *  Zero audio files, zero dependencies (Web Audio API). Framework-agnostic.
 *
 *  Drop-in:   <script src="/site-audio.js" defer></script>
 *  Optional:  window.SiteAudioConfig = { ... }   (define BEFORE the script tag)
 */
(() => {
  'use strict';
  if (window.SiteAudio) return;

  /* ───────────── Config ───────────── */
  const CFG = Object.assign({
    storageKey: 'siteaudio:enabled',
    defaultEnabled: false,          // true → new visitors get sound on their first gesture
    master: 0.7, ambient: 0.18, cues: 0.55,
    duckTo: 0.25,                   // ambient level while other media plays
    glide: 2.4,                     // seconds, theme crossfade
    maxVoices: 8, minGap: 45,       // polyphony cap / per-cue throttle (ms)
    autoCue: 'tap',                 // cue for any button/link without data-sound ('' = off)
    toggle: true,                   // inject a floating toggle if the page has none
    labels: { fa: 'صدا', en: 'Sound' }
  }, window.SiteAudioConfig || {});

  /* ───────────── Registries (extendable at any time) ─────────────
   * Theme = drone root (Hz) + 4 intervals (semitones) + filter brightness. */
  const THEMES = {
    default: { root: 110.0,  mode: [0, 7, 12, 19], cutoff: 800 },
    blue:    { root: 98.0,   mode: [0, 7, 12, 16], cutoff: 700 },
    yellow:  { root: 130.81, mode: [0, 7, 14, 16], cutoff: 1400 },
    purple:  { root: 87.31,  mode: [0, 7, 10, 15], cutoff: 900 },
    red:     { root: 73.42,  mode: [0, 7, 12, 15], cutoff: 650 },
    green:   { root: 123.47, mode: [0, 7, 9, 14],  cutoff: 1000 }
  };

  /* Cue = (t, theme) => void. Cues inherit the active theme's pitch set. */
  const note = (th, i, oct) => th.root * 2 ** oct * 2 ** ((th.mode[i % th.mode.length] % 12) / 12);
  const CUES = {
    hover:   (t, th) => tone(t, note(th, 2, 3), 'sine', 0.05, 0.01, 0.14),
    tap:     (t, th) => bell(t, note(th, 2, 2), 0.22, 0.5),
    select:  (t, th) => { bell(t, note(th, 0, 2), 0.22, 0.9); bell(t + 0.09, note(th, 1, 2), 0.2, 1.1); },
    open:    (t, th) => { air(t, 0.55, 300, 2400, 0.12); bell(t + 0.25, note(th, 3, 2), 0.18, 1); },
    back:    (t, th) => { air(t, 0.4, 1800, 260, 0.1); tone(t, note(th, 0, 1), 'sine', 0.16, 0.01, 0.4); },
    success: (t, th) => [0, 1, 2].forEach((d, i) => bell(t + i * 0.08, th.root * 4 * 2 ** (th.mode[d] / 12), 0.16, 0.8)),
    error:   (t, th) => { const f = note(th, 0, 1); tone(t, f, 'triangle', 0.14, 0.01, 0.3); tone(t, f * 1.06, 'triangle', 0.12, 0.01, 0.3); }
  };

  /* ───────────── State ───────────── */
  const state = { enabled: false };
  const ducks = new Set();
  const last = {};
  let theme = 'default', voices = 0, warned = false;
  let ctx, master, ambBus, cueBus, noiseBuf, amb;

  const store = {
    get() { try { return localStorage.getItem(CFG.storageKey); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(CFG.storageKey, v ? '1' : '0'); } catch (e) { /* private mode */ } }
  };

  /* ───────────── Audio graph ───────────── */
  function impulse(sec, decay) {
    const n = (ctx.sampleRate * sec) | 0, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** decay;
    }
    return b;
  }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return false; }

    const comp = ctx.createDynamicsCompressor();       // gentle safety limiter
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = CFG.master;
    master.connect(comp); comp.connect(ctx.destination);

    const verb = ctx.createConvolver(); verb.buffer = impulse(2.4, 2.8);   // generated space, no asset
    const wet = ctx.createGain(); wet.gain.value = 0.45;
    verb.connect(wet); wet.connect(master);

    const bus = (send) => {
      const g = ctx.createGain(), s = ctx.createGain();
      s.gain.value = send; g.connect(master); g.connect(s); s.connect(verb);
      return g;
    };
    ambBus = bus(0.8); ambBus.gain.value = 0;
    cueBus = bus(0.35); cueBus.gain.value = CFG.cues;

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  /* Building blocks */
  function tone(t, f, type, g, attack, decay) {
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.type = type; o.frequency.value = f;
    v.gain.setValueAtTime(0.0001, t);
    v.gain.linearRampToValueAtTime(g, t + attack);
    v.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(v); v.connect(cueBus);
    o.start(t); o.stop(t + attack + decay + 0.05);
  }
  function bell(t, f, g, decay) {
    [[1, 1, 1], [2.76, 0.32, 0.55], [5.4, 0.12, 0.3]].forEach(([r, a, d]) => tone(t, f * r, 'sine', g * a, 0.004, decay * d));
  }
  function air(t, dur, from, to, g) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), v = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.linearRampToValueAtTime(g, t + dur * 0.4);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(v); v.connect(cueBus);
    s.start(t); s.stop(t + dur + 0.05);
  }

  /* Ambient drone: 4 detuned partials → low-pass → reverb, slowly breathing */
  function startAmbient() {
    if (amb || !ctx) return;
    const th = THEMES[theme];
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6; lp.frequency.value = th.cutoff;
    lp.connect(ambBus);
    const lfoA = ctx.createOscillator(), lfoB = ctx.createOscillator(), cut = ctx.createGain();
    lfoA.frequency.value = 0.07; lfoB.frequency.value = 0.043; cut.gain.value = 220;
    lfoA.connect(cut); cut.connect(lp.frequency);
    const osc = [0, 1, 2, 3].map((i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), d = ctx.createGain();
      o.type = i === 1 ? 'triangle' : 'sine';
      o.frequency.value = th.root * 2 ** (th.mode[i % th.mode.length] / 12);
      g.gain.value = [0.5, 0.22, 0.3, 0.12][i];
      d.gain.value = 5 + i * 2;                                  // ± cents of drift
      lfoB.connect(d); d.connect(o.detune);
      o.connect(g); g.connect(lp); o.start();
      return o;
    });
    lfoA.start(); lfoB.start();
    amb = { lp, osc };
  }
  function applyTheme(glide) {
    if (!ctx || !amb) return;
    const th = THEMES[theme], t = ctx.currentTime, k = (glide == null ? CFG.glide : glide) / 3;
    amb.osc.forEach((o, i) => o.frequency.setTargetAtTime(th.root * 2 ** (th.mode[i % th.mode.length] / 12), t, k));
    amb.lp.frequency.setTargetAtTime(th.cutoff, t, k);
  }
  function level(tc) {
    if (!ctx) return;
    const v = state.enabled ? CFG.ambient * (ducks.size ? CFG.duckTo : 1) : 0;
    ambBus.gain.setTargetAtTime(v, ctx.currentTime, tc);
  }

  /* ───────────── Public behaviour ───────────── */
  function play(name, force) {
    if (!state.enabled || !ctx || ctx.state !== 'running') return;
    let fn = CUES[name];
    if (!fn) {
      if (!warned) { warned = true; console.warn('[SiteAudio] unknown cue "' + name + '", using fallback'); }
      fn = CUES[CFG.autoCue] || CUES.tap;
    }
    const now = performance.now();
    if (!force && (now - (last[name] || 0) < CFG.minGap || voices >= CFG.maxVoices)) return;
    last[name] = now; voices++;
    setTimeout(() => { voices--; }, 1400);
    try { fn(ctx.currentTime + 0.005, THEMES[theme]); } catch (e) { /* audio must never break the site */ }
  }

  function setTheme(name) {
    if (!THEMES[name]) name = 'default';
    if (name === theme) return;
    theme = name;
    applyTheme();
    const root = document.documentElement;
    if (root.dataset.soundTheme !== name) root.dataset.soundTheme = name;
  }

  function duck(key, on) {
    if (on) ducks.add(key); else ducks.delete(key);
    level(0.4);
  }

  function unlock() {
    if (!state.enabled) return;
    if (!ctx && !build()) return;
    ctx.resume().then(() => {
      if (ctx.state !== 'running') return armUnlock();
      startAmbient(); applyTheme(0.1); level(1.5);
    }).catch(() => {});
  }
  const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'];
  const onGesture = () => { GESTURES.forEach((t) => removeEventListener(t, onGesture, true)); unlock(); };
  function armUnlock() { GESTURES.forEach((t) => addEventListener(t, onGesture, true)); }

  function enable() {
    state.enabled = true; store.set(true);
    if (!ctx && !build()) return syncUI();
    ctx.resume().then(() => {
      if (ctx.state !== 'running') return armUnlock();
      startAmbient(); applyTheme(0.1); level(1.2); play('open', true);
    }).catch(armUnlock);
    syncUI();
  }
  function disable() {
    state.enabled = false; store.set(false);
    level(0.25);
    if (ctx) setTimeout(() => { if (!state.enabled && ctx) ctx.suspend().catch(() => {}); }, 1200);
    syncUI();
  }
  const toggle = () => (state.enabled ? disable() : enable());

  /* ───────────── Toggle UI (i18n-aware via <html lang>) ───────────── */
  const ICON = (on) => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>' +
    (on ? '<circle cx="12" cy="12" r="6.2"/><circle cx="12" cy="12" r="10" opacity=".55"/>' : '<circle cx="12" cy="12" r="6.2" opacity=".4"/><path d="M4.5 4.5l15 15"/>') + '</svg>';

  function syncUI() {
    const lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    const label = CFG.labels[lang] || CFG.labels.en;
    document.querySelectorAll('[data-sound-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(state.enabled));
      b.dataset.state = state.enabled ? 'on' : 'off';
      if (b.dataset.saInjected) { b.setAttribute('aria-label', label); b.title = label; b.innerHTML = ICON(state.enabled); }
    });
  }

  function injectToggle() {
    if (!CFG.toggle || document.querySelector('[data-sound-toggle]')) return;
    const css = document.createElement('style');
    css.textContent =
      '.sa-toggle{position:fixed;z-index:1000;top:calc(env(safe-area-inset-top,0px) + var(--sa-top,12px));inset-inline-end:var(--sa-inline,12px);' +
      'width:44px;height:44px;display:grid;place-items:center;padding:0;border:1px solid rgba(255,255,255,.22);border-radius:50%;' +
      'background:rgba(10,10,20,.45);color:var(--sa-color,#fff);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
      'cursor:pointer;opacity:.75;transition:opacity .25s,border-color .25s}' +
      '.sa-toggle:hover,.sa-toggle:focus-visible{opacity:1}.sa-toggle[data-state=on]{border-color:var(--sa-color,#fff)}' +
      '.sa-toggle:focus-visible{outline:2px solid currentColor;outline-offset:3px}' +
      '@media (prefers-reduced-motion:reduce){.sa-toggle{transition:none}}';
    document.head.appendChild(css);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sa-toggle';
    b.setAttribute('data-sound-toggle', ''); b.setAttribute('data-sound', 'none');
    b.dataset.saInjected = '1'; b.translate = false;
    document.body.appendChild(b);
  }

  /* ───────────── Auto-integration (works for anything added later) ───────────── */
  const CLICKABLE = '[data-sound],[data-sound-theme]:not(html),button,a[href],[role="button"],summary';

  function init() {
    const saved = store.get();
    state.enabled = saved === null ? !!CFG.defaultEnabled : saved === '1';
    injectToggle(); syncUI();

    // One delegated listener: new buttons/links/components are covered automatically.
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('[data-sound-toggle]')) return toggle();
      const el = t.closest(CLICKABLE);
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      if (el.dataset.soundTheme) setTheme(el.dataset.soundTheme);
      const cue = el.dataset.sound != null && el.dataset.sound !== '' ? el.dataset.sound : CFG.autoCue;
      if (cue && cue !== 'none') play(cue);
    });

    if (matchMedia('(hover: hover)').matches) {
      document.addEventListener('pointerover', (e) => {
        const el = e.target.closest && e.target.closest('[data-sound-hover]');
        if (el && !el.contains(e.relatedTarget)) play(el.dataset.soundHover || 'hover');
      });
    }

    // Single source of theme truth: <html data-sound-theme="…"> (also reacts to <html lang>).
    new MutationObserver((list) => list.forEach((r) => {
      if (r.attributeName === 'lang') syncUI();
      else setTheme(document.documentElement.dataset.soundTheme);
    })).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-sound-theme'] });
    if (document.documentElement.dataset.soundTheme) setTheme(document.documentElement.dataset.soundTheme);

    // Coordinate with the rest of the site: duck under audio/video, pause when tab is hidden.
    const media = (on) => (e) => { if (e.target instanceof HTMLMediaElement && !(on && e.target.muted)) duck(e.target, on); };
    document.addEventListener('playing', media(true), true);
    ['pause', 'ended', 'emptied'].forEach((t) => document.addEventListener(t, media(false), true));
    document.addEventListener('visibilitychange', () => {
      if (!ctx || !state.enabled) return;
      (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {});
    });

    // Decoupled bus: any module can trigger sound without importing anything.
    addEventListener('site:sound', (e) => play(typeof e.detail === 'string' ? e.detail : e.detail && e.detail.cue));
    addEventListener('site:sound-theme', (e) => setTheme(typeof e.detail === 'string' ? e.detail : e.detail && e.detail.theme));

    if (state.enabled) armUnlock();   // browsers need a gesture before audio can start
  }

  window.SiteAudio = {
    play, setTheme, duck, enable, disable, toggle,
    registerTheme(name, def) {
      THEMES[name] = Object.assign({ root: 110, mode: [0, 7, 12, 19], cutoff: 900 }, def);
      if (name === theme) applyTheme();
    },
    registerCue(name, fn) { CUES[name] = fn; },
    helpers: { tone, bell, air, note },
    get enabled() { return state.enabled; },
    get theme() { return theme; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
