(() => {
  'use strict';
  if (window.LocalCognitionCache) return;

  const copy = {
    fa: { title: 'دریافت اولیه و ذخیرهٔ آفلاین', downloading: 'در حال دریافت', complete: 'دریافت کامل شد', partial: 'دریافت کامل نشد؛ دوباره تلاش می‌شود', close: 'بستن', unknown: 'حجم نامشخص' },
    en: { title: 'Initial download & offline storage', downloading: 'Downloading', complete: 'Download complete', partial: 'Some resources failed; they will be retried', close: 'Close', unknown: 'Unknown size' },
    zh: { title: '首次下载与离线存储', downloading: '正在下载', complete: '下载完成', partial: '部分资源失败，将再次尝试', close: '关闭', unknown: '大小未知' },
    ar: { title: 'التنزيل الأولي والتخزين دون اتصال', downloading: 'جارٍ التنزيل', complete: 'اكتمل التنزيل', partial: 'تعذر تنزيل بعض الموارد؛ ستتم إعادة المحاولة', close: 'إغلاق', unknown: 'الحجم غير معروف' }
  };
  const lang = () => { const value = window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa'; return copy[value] ? value : 'fa'; };
  const mb = (value) => Number.isFinite(value) && value >= 0 ? (value / 1048576).toFixed(value >= 10485760 ? 1 : 2) : '0.00';
  let styleReady = false;
  function styles() {
    if (styleReady || document.getElementById('local-cognition-cache-ui-style')) return;
    styleReady = true;
    const s = document.createElement('style'); s.id = 'local-cognition-cache-ui-style';
    s.textContent = '.local-cognition-cache-progress{margin:0 0 16px;padding:14px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(4,10,19,.68);color:inherit}.local-cognition-cache-progress[hidden]{display:none}.local-cognition-cache-progress h3{margin:0;font-size:1rem}.local-cognition-cache-head{display:flex;justify-content:space-between;gap:12px}.local-cognition-cache-bar{height:8px;margin:10px 0;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.local-cognition-cache-bar span{display:block;height:100%;width:0;background:currentColor;transition:width .2s}.local-cognition-cache-meta{display:flex;justify-content:space-between;gap:12px;font-size:.85rem;opacity:.82}.local-cognition-cache-close{display:none;margin-top:9px;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:5px 9px;background:rgba(255,255,255,.08);color:inherit;font:inherit}.local-cognition-cache-progress.is-complete .local-cognition-cache-close{display:inline-block}';
    document.head.appendChild(s);
  }
  function panel(host) {
    if (!host) return null;
    let p = host.querySelector(':scope > .local-cognition-cache-progress');
    if (p) return p;
    styles(); p = document.createElement('section'); p.className = 'local-cognition-cache-progress'; p.setAttribute('role', 'status'); p.setAttribute('aria-live', 'polite'); host.prepend(p); return p;
  }
  function render(p, detail) {
    const c = copy[lang()];
    const total = Number(detail.totalBytes) || 0, downloaded = Number(detail.downloadedBytes) || 0;
    const percent = total > 0 ? Math.min(100, Math.round(downloaded / total * 100)) : (detail.status === 'complete' ? 100 : 0);
    const size = total > 0 ? `${mb(downloaded)} / ${mb(total)} MB` : `${mb(downloaded)} MB / ${c.unknown}`;
    p.hidden = false; p.classList.toggle('is-complete', detail.status === 'complete' || detail.status === 'partial'); p.dir = lang() === 'en' || lang() === 'zh' ? 'ltr' : 'rtl';
    p.innerHTML = `<div class="local-cognition-cache-head"><h3>${c.title}</h3><strong>${percent}%</strong></div><div class="local-cognition-cache-bar"><span style="width:${percent}%"></span></div><div class="local-cognition-cache-meta"><span>${detail.status === 'complete' ? c.complete : detail.status === 'partial' ? c.partial : c.downloading}</span><span>${size}</span></div><button type="button" class="local-cognition-cache-close">${c.close}</button>`;
    p.querySelector('.local-cognition-cache-close').addEventListener('click', () => { p.hidden = true; });
  }
  function ensurePackages(packageIds, host) {
    const ids = [...new Set(packageIds || [])]; if (!ids.length || !host || !('serviceWorker' in navigator)) return Promise.resolve(null);
    const p = panel(host); if (!p) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then((registration) => {
      const worker = registration.active || navigator.serviceWorker.controller; if (!worker) return null;
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => { const data = event.data || {}; if (data.type === 'LOCAL_COGNITION_CACHE_PROGRESS') render(p, data); if (data.type === 'LOCAL_COGNITION_CACHE_RESULT') { render(p, {...data, status: data.failed?.length ? 'partial' : 'complete'}); resolve(data); } };
        worker.postMessage({ type: 'CACHE_LOCAL_COGNITION', packages: ids }, [channel.port2]);
      });
    }).catch(() => null);
  }
  const started = new WeakSet();
  function start(ids, host) { if (!host || started.has(host)) return; started.add(host); void ensurePackages(ids, host); }
  function observe() {
    const scan = () => { const page = document.getElementById('paragraph-page'); if (page?.classList.contains('open')) start(['paragraph-machine'], page); };
    new MutationObserver(scan).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] }); scan();
    document.addEventListener('click', (event) => { const q = event.target.closest?.('#five-realms-game [data-action="question"]'); if (q) start(['five-realms-cards'], document.getElementById('five-realms-game')); }, true);
  }
  window.LocalCognitionCache = Object.freeze({ ensurePackages });
  observe();
})();
