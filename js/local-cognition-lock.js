(() => {
  'use strict';

  const logoViewer = document.getElementById('logo-viewer');
  if (!logoViewer || document.documentElement.dataset.localCognitionLockReady === 'true') return;
  document.documentElement.dataset.localCognitionLockReady = 'true';

  // UI-side gate: the credential is never stored in plaintext in the repository.
  const PASSWORD_SHA256 = 'cdc99cbc4a4041a4ec523b0c7b36e4c5565d3cda68a3843bdfecc32d21c5a94c';
  let unlocked = false;
  let activeDialog = null;
  let cacheCheckPromise = null;
  let cacheWarmPromise = null;

  const copy = {
    fa: {
      title: 'قفل شناخت محلی', prompt: 'برای ورود به این رابط، رمز عبور را وارد کنید.',
      password: 'رمز عبور', enter: 'ورود', cancel: 'انصراف', invalid: 'رمز عبور نادرست است.',
      close: 'بستن', protected: 'این بخش با قفل ورود محافظت می‌شود.'
    },
    en: {
      title: 'Local Cognition Lock', prompt: 'Enter the password to access this interface.',
      password: 'Password', enter: 'Enter', cancel: 'Cancel', invalid: 'Incorrect password.',
      close: 'Close', protected: 'This interface is protected by an entry lock.'
    },
    zh: {
      title: '本地认知锁', prompt: '请输入密码以访问此界面。',
      password: '密码', enter: '进入', cancel: '取消', invalid: '密码不正确。',
      close: '关闭', protected: '此界面受入口锁保护。'
    },
    ar: {
      title: 'قفل الإدراك المحلي', prompt: 'أدخل كلمة المرور للوصول إلى هذه الواجهة.',
      password: 'كلمة المرور', enter: 'دخول', cancel: 'إلغاء', invalid: 'كلمة المرور غير صحيحة.',
      close: 'إغلاق', protected: 'هذه الواجهة محمية بقفل دخول.'
    }
  };

  const getLang = () => window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
  const t = () => copy[getLang()] || copy.fa;

  function installStyles() {
    if (document.getElementById('local-cognition-lock-style')) return;
    const style = document.createElement('style');
    style.id = 'local-cognition-lock-style';
    style.textContent = `
      #local-cognition-lock {
        position: absolute; inset: 0; z-index: 10020; display: grid; place-items: center;
        padding: clamp(18px, 4vw, 42px); background: rgba(3, 9, 18, .76); backdrop-filter: blur(8px);
      }
      #local-cognition-lock[hidden] { display: none; }
      .local-cognition-lock-card {
        width: min(430px, 100%); padding: 28px; border: 1px solid rgba(255,255,255,.22);
        border-radius: 18px; background: rgba(9, 18, 31, .94); color: #fff;
        box-shadow: 0 24px 80px rgba(0,0,0,.48); text-align: start;
      }
      .local-cognition-lock-card h2 { margin: 0 0 10px; font-size: clamp(1.25rem, 3vw, 1.65rem); }
      .local-cognition-lock-card p { margin: 0 0 18px; line-height: 1.7; opacity: .86; }
      .local-cognition-lock-card label { display: block; margin-bottom: 7px; font-weight: 600; }
      .local-cognition-lock-card input {
        width: 100%; box-sizing: border-box; padding: 12px 13px; border-radius: 10px;
        border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.08); color: #fff;
        outline: none; font: inherit;
      }
      .local-cognition-lock-card input:focus { border-color: rgba(255,255,255,.6); box-shadow: 0 0 0 3px rgba(255,255,255,.08); }
      .local-cognition-lock-error { min-height: 1.5em; margin: 8px 0 0; color: #ffb8b8; font-size: .9rem; }
      .local-cognition-lock-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
      .local-cognition-lock-actions button {
        border: 1px solid rgba(255,255,255,.22); border-radius: 10px; padding: 10px 15px;
        color: #fff; background: rgba(255,255,255,.1); cursor: pointer; font: inherit;
      }
      .local-cognition-lock-actions button[type="submit"] { background: rgba(255,255,255,.2); }
    `;
    document.head.appendChild(style);
  }

  function bufferToHex(buffer) {
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return bufferToHex(await crypto.subtle.digest('SHA-256', data));
  }

  async function warmOfflineCache() {
    try {
      if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
      if (!('serviceWorker' in navigator)) return null;

      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active || navigator.serviceWorker.controller;
      if (!worker) return null;

      return await new Promise((resolve) => {
        const channel = new MessageChannel();
        const timeout = window.setTimeout(() => {
          channel.port1.close();
          resolve(null);
        }, 30 * 60 * 1000);
        channel.port1.onmessage = (event) => {
          const message = event.data || {};
          if (message.type === 'LOCAL_COGNITION_CACHE_PROGRESS') {
            document.dispatchEvent(new CustomEvent('local-cognition-cache-progress', { detail: message }));
            return;
          }
          if (message.type === 'LOCAL_COGNITION_CACHE_RESULT') {
            window.clearTimeout(timeout);
            channel.port1.close();
            document.dispatchEvent(new CustomEvent('local-cognition-cache-result', { detail: message }));
            resolve(message);
          }
        };
        worker.postMessage({ type: 'CACHE_LOCAL_COGNITION' }, [channel.port2]);
      });
    } catch (_) {
      return null;
    }
  }

  async function checkBrowserCache() {
    if (cacheCheckPromise) return cacheCheckPromise;
    cacheCheckPromise = (async () => {
      if (!('serviceWorker' in navigator)) return { ready: false, unavailable: true };
      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active || navigator.serviceWorker.controller;
      if (!worker) return { ready: false, unavailable: true };
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        const timeout = window.setTimeout(() => {
          channel.port1.close();
          resolve({ ready: false, unavailable: true });
        }, 15000);
        channel.port1.onmessage = (event) => {
          window.clearTimeout(timeout);
          channel.port1.close();
          resolve(event.data || { ready: false, unavailable: true });
        };
        worker.postMessage({ type: 'CHECK_LOCAL_COGNITION_CACHE' }, [channel.port2]);
      });
    })().finally(() => { cacheCheckPromise = null; });
    return cacheCheckPromise;
  }

  async function ensureParagraphPackages() {
    const check = await checkBrowserCache();
    if (check.ready) return check;
    if (check.unavailable) return check;
    window.LocalCognitionPanel?.open();
    if (!cacheWarmPromise) {
      cacheWarmPromise = warmOfflineCache().finally(() => { cacheWarmPromise = null; });
    }
    const result = await cacheWarmPromise;
    return result || check;
  }

  function removeDialog() {
    activeDialog?.remove();
    activeDialog = null;
  }

  function showDialog() {
    if (activeDialog) return;
    installStyles();
    const c = t();
    const dialog = document.createElement('div');
    dialog.id = 'local-cognition-lock';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'local-cognition-lock-title');
    dialog.dir = getLang() === 'en' || getLang() === 'zh' ? 'ltr' : 'rtl';
    dialog.innerHTML = `
      <form class="local-cognition-lock-card" novalidate>
        <h2 id="local-cognition-lock-title">${c.title}</h2>
        <p>${c.prompt}</p>
        <label for="local-cognition-lock-password">${c.password}</label>
        <input id="local-cognition-lock-password" type="password" autocomplete="current-password" spellcheck="false" required>
        <div class="local-cognition-lock-error" aria-live="polite"></div>
        <div class="local-cognition-lock-actions">
          <button type="button" data-lock-cancel>${c.cancel}</button>
          <button type="submit">${c.enter}</button>
        </div>
      </form>`;

    const form = dialog.querySelector('form');
    const input = dialog.querySelector('input');
    const error = dialog.querySelector('.local-cognition-lock-error');
    const cancel = dialog.querySelector('[data-lock-cancel]');

    const close = () => {
      removeDialog();
      logoViewer.querySelector('.local-cognition-trigger')?.focus({ preventScroll: true });
    };

    cancel.addEventListener('click', close);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close();
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      try {
        const digest = await sha256(input.value);
        if (digest !== PASSWORD_SHA256) {
          error.textContent = c.invalid;
          input.select();
          return;
        }
        unlocked = true;
        removeDialog();
        logoViewer.querySelector('.local-cognition-trigger')?.click();
        void warmOfflineCache();
      } catch (_) {
        error.textContent = c.invalid;
      }
    });

    activeDialog = dialog;
    logoViewer.appendChild(dialog);
    input.focus({ preventScroll: true });
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('.local-cognition-trigger');
    if (!trigger || unlocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showDialog();
  }, true);

  document.addEventListener('paragraph-machine:turn', () => {
    void ensureParagraphPackages();
  });

  document.addEventListener('site:languagechange', () => {
    if (!activeDialog) return;
    removeDialog();
    showDialog();
  });

  document.getElementById('logo-viewer-close')?.addEventListener('click', () => {
    unlocked = false;
    removeDialog();
  });
})();
