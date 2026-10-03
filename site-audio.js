/*! SiteAudio Safe 1.1 — fail-safe procedural sound, no external assets. */
(() => {
  'use strict';
  if (window.SiteAudio) return;

  const KEY = 'siteaudio:enabled';
  const defaults = { enabled: true, volume: 0.22 };
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
      if (c.state !== 'running') {
        unlock();
        return;
      }
      const now = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      const f = cue === 'back' ? 220 : cue === 'success' ? 660 : 440;
      o.type = cue === 'error' ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, now);
      o.frequency.exponentialRampToValueAtTime(f * (cue === 'back' ? 0.72 : 1.18), now + 0.12);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      o.connect(g);
      g.connect(master);
      o.start(now);
      o.stop(now + 0.18);
    } catch (_) {}
  }

  function save() {
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (_) {}
  }

  function syncButton() {
    try {
      document.querySelectorAll('[data-sound-toggle]').forEach((b) => {
        b.setAttribute('aria-pressed', String(enabled));
        b.textContent = enabled ? '🔊' : '🔇';
        b.title = enabled ? 'صدا: روشن' : 'صدا: خاموش';
      });
    } catch (_) {}
  }

  function toggle() {
    enabled = !enabled;
    save();
    if (enabled) unlock();
    syncButton();
    if (enabled) setTimeout(() => play('open'), 40);
  }

  function injectButton() {
    try {
      if (!document.body || document.querySelector('[data-sound-toggle]')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-sound-toggle', '');
      b.setAttribute('aria-label', 'صدا');
      b.setAttribute('aria-pressed', String(enabled));
      b.textContent = enabled ? '🔊' : '🔇';
      b.style.cssText = 'position:fixed;z-index:2147483000;top:12px;inset-inline-end:12px;width:42px;height:42px;border:1px solid rgba(255,255,255,.25);border-radius:50%;background:rgba(8,12,16,.72);color:#fff;cursor:pointer;font-size:18px;line-height:1;';
      document.body.appendChild(b);
    } catch (_) {}
  }

  function init() {
    try {
      injectButton();
      syncButton();

      document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
      document.addEventListener('touchstart', unlock, { capture: true, passive: true });
      document.addEventListener('click', (e) => {
        try {
          const t = e.target;
          if (!t || !t.closest) return;
          if (t.closest('[data-sound-toggle]')) { toggle(); return; }
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
    enable() { enabled = true; save(); unlock(); syncButton(); },
    disable() { enabled = false; save(); syncButton(); },
    toggle,
    get enabled() { return enabled; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
