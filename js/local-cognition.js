(() => {
  'use strict';

  const logoViewer = document.getElementById('logo-viewer');
  if (!logoViewer || logoViewer.dataset.localCognitionReady === 'true') return;

  const copy = {
    fa: {
      button: 'شناخت محلی', title: 'شناخت محلی', subtitle: 'The Military Multilingual Cabinet of Reading in view of Modern Outlook',
      back: 'بازگشت به لوگو', repos: 'دو مخزن هسته‌ای', knowledge: 'کتابخانه دانش ثبت‌شده', neural: 'مدل عصبی محلی', providers: 'تغذیه‌کنندگان تولید متن',
      gptMeta: 'ModernOutlook / GPT · خصوصی · dependency & model asset cache', kMeta: 'ModernOutlook / K-ZEM-MOQADDAM · خصوصی · local retrieval & runtime',
      gptText: 'مخزن دارایی‌های نسخه‌بندی‌شده، مدل‌های تأییدشده و روتر دوگانهٔ تولید متن.', kText: 'لایهٔ اجرایی شناخت محلی، بازیابی معنایی چندزبانه و قراردادهای نگهداری دانش.',
      open: 'باز کردن مخزن', router: 'مشخصات روتر', map: 'نقشه دانش', seed: '۷۶ واحد دانشیِ curated', fallback: 'fallback قطعی مفهومی/واژگانی',
      model: 'Xenova / multilingual-e5-small', modelMeta: 'بازیابی معنایی محلی · opt-in · همان‌مبدأ · حدود ۱۴۰٫۵ MB برای دریافت نخست',
      google: 'Google Gemini', groq: 'Groq', slot1: 'Slot 1', slot2: 'Slot 2', routeNote: 'ترتیب عملیاتی: Google Gemini → Groq. کلیدها فقط در سمت مخزن/CI نگهداری می‌شوند و هرگز وارد مرورگر نمی‌شوند.',
      architecture: 'بازیابی عصبی از تولید متن جداست؛ شباهت معنایی به‌تنهایی حکم حقیقت یا قضاوت نیست.'
    },
    en: {
      button: 'local cognition', title: 'local cognition', subtitle: 'The Military Multilingual Cabinet of Reading in view of Modern Outlook',
      back: 'Back to logo', repos: 'Core repositories', knowledge: 'Registered knowledge library', neural: 'Local neural model', providers: 'Text-generation providers',
      gptMeta: 'ModernOutlook / GPT · private · dependency & model asset cache', kMeta: 'ModernOutlook / K-ZEM-MOQADDAM · private · local retrieval & runtime',
      gptText: 'Version-pinned dependencies, verified model assets, and the two-slot text-generation router.', kText: 'Local cognition runtime, multilingual semantic retrieval, and the knowledge-maintenance boundary.',
      open: 'Open repository', router: 'Router specification', map: 'Knowledge map', seed: '76 curated knowledge units', fallback: 'deterministic conceptual/lexical fallback',
      model: 'Xenova / multilingual-e5-small', modelMeta: 'local semantic retrieval · opt-in · same-origin · about 140.5 MB on first download',
      google: 'Google Gemini', groq: 'Groq', slot1: 'Slot 1', slot2: 'Slot 2', routeNote: 'Operational order: Google Gemini → Groq. Keys stay in repository/CI configuration and never enter browser code.',
      architecture: 'Neural retrieval is separate from text generation; semantic similarity alone is not truth or judgment.'
    },
    zh: {
      button: '本地认知', title: '本地认知', subtitle: 'The Military Multilingual Cabinet of Reading in view of Modern Outlook',
      back: '返回标志', repos: '核心仓库', knowledge: '已登记知识库', neural: '本地神经模型', providers: '文本生成提供方',
      gptMeta: 'ModernOutlook / GPT · 私有 · 依赖与模型资产缓存', kMeta: 'ModernOutlook / K-ZEM-MOQADDAM · 私有 · 本地检索与运行时',
      gptText: '保存固定版本依赖、经过验证的模型资产，以及双槽文本生成路由器。', kText: '本地认知运行时、多语言语义检索与知识维护边界。',
      open: '打开仓库', router: '路由器规范', map: '知识地图', seed: '76 个精选知识单元', fallback: '确定性的概念/词法回退',
      model: 'Xenova / multilingual-e5-small', modelMeta: '本地语义检索 · 用户选择启用 · 同源 · 首次下载约 140.5 MB',
      google: 'Google Gemini', groq: 'Groq', slot1: '槽位 1', slot2: '槽位 2', routeNote: '运行顺序：Google Gemini → Groq。密钥仅保存在仓库/CI 配置中，不进入浏览器代码。',
      architecture: '神经检索与文本生成相互独立；语义相似度本身不是事实或判断。'
    },
    ar: {
      button: 'الإدراك المحلي', title: 'الإدراك المحلي', subtitle: 'The Military Multilingual Cabinet of Reading in view of Modern Outlook',
      back: 'العودة إلى الشعار', repos: 'المستودعان الأساسيان', knowledge: 'مكتبة المعرفة المسجّلة', neural: 'النموذج العصبي المحلي', providers: 'مزودا توليد النص',
      gptMeta: 'ModernOutlook / GPT · خاص · مخزن الاعتماديات وأصول النماذج', kMeta: 'ModernOutlook / K-ZEM-MOQADDAM · خاص · الاسترجاع المحلي ووقت التشغيل',
      gptText: 'اعتماديات مثبتة الإصدار، أصول نماذج موثقة، وموجّه توليد نصي بموضعين.', kText: 'طبقة الإدراك المحلي، الاسترجاع الدلالي متعدد اللغات، وحدود صيانة المعرفة.',
      open: 'فتح المستودع', router: 'مواصفات الموجّه', map: 'خريطة المعرفة', seed: '٧٦ وحدة معرفة منتقاة', fallback: 'بديل مفاهيمي/معجمي حتمي',
      model: 'Xenova / multilingual-e5-small', modelMeta: 'استرجاع دلالي محلي · اختياري · من نفس المصدر · نحو 140.5 MB عند التنزيل الأول',
      google: 'Google Gemini', groq: 'Groq', slot1: 'الموضع 1', slot2: 'الموضع 2', routeNote: 'الترتيب التشغيلي: Google Gemini ← Groq. تبقى المفاتيح في إعدادات المستودع/CI ولا تدخل كود المتصفح.',
      architecture: 'الاسترجاع العصبي منفصل عن توليد النص؛ التشابه الدلالي وحده ليس حقيقة ولا حكماً.'
    }
  };

  const getLang = () => window.SiteI18n?.getLanguage?.() || document.documentElement.lang || 'fa';
  const t = () => copy[getLang()] || copy.fa;
  const link = (href, label) => `<a class="local-cognition-action" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;

  function ensurePanel() {
    if (document.getElementById('local-cognition-panel')) return document.getElementById('local-cognition-panel');
    const panel = document.createElement('section');
    panel.id = 'local-cognition-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    logoViewer.appendChild(panel);
    return panel;
  }

  function renderPanel() {
    const panel = ensurePanel();
    const c = t();
    const lang = getLang();
    panel.dir = lang === 'en' ? 'ltr' : lang === 'zh' ? 'ltr' : 'rtl';
    panel.lang = lang;
    panel.innerHTML = `
      <div class="local-cognition-shell">
        <header class="local-cognition-head">
          <div>
            <div class="eyebrow">LOCAL COGNITION · GPT × K-ZEM-MOQADDAM</div>
            <h2>${c.title}</h2>
            <p>${c.subtitle}</p>
          </div>
          <button class="local-cognition-back" type="button" aria-label="${c.back}" title="${c.back}">×</button>
        </header>
        <div class="local-cognition-body">
          <div class="local-cognition-grid">
            <article class="local-cognition-card">
              <h3>${c.repos}</h3>
              <div class="meta">GPT</div>
              <p>${c.gptText}</p>
              <div class="meta">${c.gptMeta}</div>
              <div class="local-cognition-actions">
                ${link('https://github.com/ModernOutlook/GPT', c.open)}
                ${link('https://github.com/ModernOutlook/GPT/blob/main/LLM-ROUTER-SETUP.md', c.router)}
              </div>
            </article>
            <article class="local-cognition-card">
              <h3>K-ZEM-MOQADDAM</h3>
              <div class="meta">${c.kMeta}</div>
              <p>${c.kText}</p>
              <div class="local-cognition-actions">
                ${link('https://github.com/ModernOutlook/K-ZEM-MOQADDAM', c.open)}
                ${link('https://github.com/ModernOutlook/K-ZEM-MOQADDAM/blob/main/docs/paragraph-machine-research-map.md', c.map)}
              </div>
            </article>
            <article class="local-cognition-card wide">
              <h3>${c.knowledge}</h3>
              <div class="meta">K-ZEM-MOQADDAM · five-realm knowledge registry</div>
              <p>${c.seed} · ${c.fallback}</p>
              <div class="local-cognition-note">${c.architecture}</div>
            </article>
            <article class="local-cognition-card">
              <h3>${c.neural}</h3>
              <p><strong>${c.model}</strong></p>
              <div class="meta">${c.modelMeta}</div>
            </article>
            <article class="local-cognition-card">
              <h3>${c.providers}</h3>
              <div class="local-cognition-flow">
                <div class="local-cognition-node"><strong>${c.google}</strong><span>${c.slot1}</span></div>
                <div class="local-cognition-arrow">→</div>
                <div class="local-cognition-node"><strong>${c.groq}</strong><span>${c.slot2}</span></div>
                <div class="local-cognition-arrow">→</div>
                <div class="local-cognition-node"><strong>GPT router</strong><span>controlled failover</span></div>
              </div>
              <div class="local-cognition-note">${c.routeNote}</div>
            </article>
          </div>
        </div>
      </div>`;
    panel.querySelector('.local-cognition-back').addEventListener('click', close);
  }

  function open() {
    const panel = ensurePanel();
    renderPanel();
    panel.classList.add('is-open');
    const back = panel.querySelector('.local-cognition-back');
    back?.focus({ preventScroll: true });
  }

  function close() {
    const panel = document.getElementById('local-cognition-panel');
    if (!panel) return;
    panel.classList.remove('is-open');
    logoViewer.querySelector('.local-cognition-trigger')?.focus({ preventScroll: true });
  }

  function reset() {
    document.getElementById('local-cognition-panel')?.classList.remove('is-open');
  }

  function init() {
    logoViewer.dataset.localCognitionReady = 'true';
    const logoArt = logoViewer.querySelector('.logo-art');
    const inventory = logoViewer.querySelector('.inventory-link');
    if (!logoArt || !inventory) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'inventory-link local-cognition-trigger';
    trigger.setAttribute('data-local-cognition', 'true');
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      open();
    });
    logoArt.insertBefore(trigger, inventory.nextSibling);

    document.addEventListener('site:languagechange', () => {
      const c = t();
      trigger.textContent = c.button;
      trigger.setAttribute('aria-label', c.button);
      if (document.getElementById('local-cognition-panel')?.classList.contains('is-open')) renderPanel();
    });

    trigger.textContent = t().button;
    trigger.setAttribute('aria-label', t().button);

    document.getElementById('logo-viewer-close')?.addEventListener('click', reset);
  }

  init();
})();
