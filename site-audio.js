/*! SiteAudio Safe 1.1 — fail-safe procedural sound, no external assets. */
(() => {
  'use strict';
  if (window.SiteAudio) return;

  const KEY = 'siteaudio:enabled';
  const defaults = { enabled: true, volume: 0.42 };
  let enabled = defaults.enabled;
  let ctx = null;
  let master = null;
  let unlocked = false;

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === '0') enabled = false;
    if (saved === '1') enabled = true;
  } catch (_) {}

  function getContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = defaults.volume;
      master.connect(ctx.destination);
      return ctx;
    } catch (_) {
      ctx = null;
      master = null;
      return null;
    }
  }

  function unlock() {
    if (!enabled) return;
    const c = getContext();
    if (!c) return;
    try {
      const p = c.resume();
      if (p && typeof p.then === 'function') {
        p.then(() => { unlocked = c.state === 'running'; }).catch(() => {});
      } else {
        unlocked = c.state === 'running';
      }
    } catch (_) {}
  }

  function play(cue) {
    if (!enabled) return;
    const c = getContext();
    if (!c || !master) return;
    try {
      if (c.state !== 'running') { unlock(); return; }

      const now = c.currentTime;
      const profiles = {
        tap:   { notes: [196, 293.66], length: 0.24, peak: 0.16 },
        open:  { notes: [174.61, 261.63, 392.00], length: 0.72, peak: 0.13 },
        back:  { notes: [293.66, 220.00, 146.83], length: 0.38, peak: 0.15 },
        success: { notes: [261.63, 329.63, 392.00, 523.25], length: 0.58, peak: 0.14 },
        error: { notes: [155.56, 130.81], length: 0.32, peak: 0.12 }
      };
      const p = profiles[cue] || profiles.tap;

      p.notes.forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        const filter = c.createBiquadFilter();

        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.setValueAtTime(freq, now);
        if (cue === 'error') o.frequency.exponentialRampToValueAtTime(freq * 0.82, now + p.length);
        else o.frequency.exponentialRampToValueAtTime(freq * 0.985, now + p.length);

        filter.type = 'lowpass';
        filter.frequency.value = cue === 'open' ? 1800 : 2600;
        filter.Q.value = 0.7;

        const delay = i * 0.045;
        const start = now + delay;
        const end = start + p.length;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(p.peak, start + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, end);

        o.connect(filter);
        filter.connect(g);
        g.connect(master);
        o.start(start);
        o.stop(end + 0.03);
      });

      if (cue === 'open' || cue === 'success') {
        const shimmer = c.createOscillator();
        const sg = c.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(1046.5, now + 0.12);
        sg.gain.setValueAtTime(0.0001, now + 0.12);
        sg.gain.exponentialRampToValueAtTime(0.035, now + 0.18);
        sg.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        shimmer.connect(sg);
        sg.connect(master);
        shimmer.start(now + 0.12);
        shimmer.stop(now + 1.18);
      }
    } catch (_) {}
  }

  function init() {
    try {
      document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
      document.addEventListener('touchstart', unlock, { capture: true, passive: true });
      document.addEventListener('click', (e) => {
        try {
          const t = e.target;
          if (!t || !t.closest) return;
          const el = t.closest('button,a,[role="button"],summary');
          if (el && !el.disabled && el.getAttribute('aria-disabled') !== 'true') play(el.dataset.sound || 'tap');
        } catch (_) {}
      }, true);
      document.addEventListener('visibilitychange', () => {
        try {
          if (!ctx || !enabled) return;
          if (document.hidden) ctx.suspend().catch(() => {});
          else ctx.resume().catch(() => {});
        } catch (_) {}
      });
    } catch (_) {}
  }

  window.SiteAudio = {
    play,
    enable() { enabled = true; unlock(); },
    disable() { enabled = false; },
    get enabled() { return enabled; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
