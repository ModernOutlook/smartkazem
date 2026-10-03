# Modern Outlook — SmartKazem

## Project Handoff & Development Contract

این فایل قرارداد فنی و نقطهٔ شروع توسعهٔ پروژه است. هر عامل توسعه‌دهنده یا ChatGPT جدید که به مخزن متصل می‌شود، باید پیش از هر تغییر، این فایل و ساختار واقعی مخزن را بررسی کند.

## 1. Repository

- Repository: `ModernOutlook/smartkazem`
- Branch: `main`
- GitHub Pages site: `https://modernoutlook.github.io/smartkazem`
- پروژه یک وب‌سایت استاتیک است؛ بنابراین معماری باید تا حد ممکن بدون وابستگی به backend اختصاصی باقی بماند.

## 2. قانون اصلی توسعه

> **Independent Components + Explicit Contracts + Shared Behavior = One Coherent System**

اجزا باید مستقل، قابل فهم و قابل نگهداری باشند، اما رفتار مشترک باید از مسیرهای روشن و قراردادهای مشخص به هم متصل شود.

### قبل از هر تغییر

1. ابتدا ساختار و فایل‌های مرتبط را بخوان.
2. وابستگی‌ها و مسیر اجرای کد را مشخص کن.
3. از بازنویسی بی‌دلیل کد موجود خودداری کن.
4. تغییر را در کوچک‌ترین لایهٔ مناسب انجام بده.
5. بعد از تغییر، syntax، asset paths، integration و رفتار وابسته را بررسی کن.
6. تغییرات را با یک commit روشن و توصیفی ثبت کن.

## 3. ساختار فعلی

```text
smartkazem/
├── index.html
├── observation.html
├── philosophical-treatise.html
├── shahnameh.html
├── modern-outlook-logo.svg
├── modern-outlook-logo.webp
├── css/site.css
├── js/
│   ├── app.js
│   ├── pages.js
│   ├── books.js
│   ├── paragraph-page.js
│   ├── reading-page.js
│   └── shahnameh-page.js
├── content/
│   └── forgers.js
├── engine/
│   └── paragraph-engine.js
├── services/
│   ├── llm-client.js
│   └── translation-bridge.js
├── adapters/
│   └── paragraph-workspace.js
├── translations/
│   ├── fa.json
│   ├── en.json
│   ├── zh.json
│   ├── ar.json
│   ├── observation.json
│   └── i18n.js
├── paragraph-machine.html
├── .nojekyll
└── .github/workflows/
    ├── deploy.yml
    └── quality.yml
```

## 4. Main Page

`index.html` هستهٔ اصلی تجربهٔ سایت است و پنج realm دارد:

- `structure` — ساختار تالار
- `continuity` — تداوم عالم
- `experience` — قلمرو تجربه
- `reference` — مرجع تقلید
- `share` — اقتصاد سهم

صفحات مستقل:

- `observation.html`
- `philosophical-treatise.html`
- `shahnameh.html`

زبان‌های فعال:

- فارسی
- انگلیسی
- چینی
- عربی

زبان باید از سیستم i18n موجود گرفته شود و از hard-code کردن متن UI پرهیز شود.

## 5. تقسیم مسئولیت فایل‌ها

### `js/app.js`

مسئول رفتار عمومی صفحه و navigation پایه است؛ از جمله:

- `currentSiteLang`
- `setInfo`
- `clearInfo`
- `selectRealm`
- `openLogoViewer`
- `closeLogoViewer`
- `realmFromPoint`
- `renderHomeFromCatalog`

### `js/pages.js`

رفتار pageها و navigation مربوط به realmها را مدیریت می‌کند؛ از جمله:

- Share
- Experience
- Continuity
- Structure
- Reference
- paragraph workspace navigation

### `js/books.js`

کاتالوگ و رفتار کتاب‌ها:

- `activeBookCatalog`
- `activeChapters`
- `buildBookTabs`
- `selectChapter`
- `openBook`
- `closeBook`

### `content/forgers.js`

دادهٔ محتوایی مربوط به forgers و محتوای ساختاری سایت.

### `css/site.css`

استایل مشترک سایت و workspaceها.

## 6. Paragraph Machine Architecture

`paragraph-machine.html` نسخهٔ اصلی/legacy ماشین پاراگراف است و در حال حاضر توسط main site لود نمی‌شود. آن را بدون دلیل حذف یا بازنویسی نکن؛ برای فهم رفتار اصلی و مقایسهٔ implementation فعلی نگهداری شده است.

معماری فعلی به لایه‌های مستقل تقسیم شده است:

### Core

`engine/paragraph-engine.js`

هستهٔ deterministic و فارسی سیستم.

قواعد:

- حداکثر 144 کلمه
- حداکثر 34 حرف برای هر کلمه
- حداکثر 900 کاراکتر

Domains:

- `S` — ساختار تالار
- `T` — تداوم عالم
- `E` — قلمرو تجربه
- `R` — مرجع تقلید
- `C` — اقتصاد سهم

Statuses:

- `ok` — منطبق
- `warn` — مبهم
- `bad` — متناقض

Core باید همیشه ورودی/پردازش داخلی را به فارسی انجام دهد.

### LLM Service

`services/llm-client.js`

یک client عمومی OpenAI-compatible است.

پیش‌فرض فعلی:

- Base URL: OpenRouter API
- Model: یک مدل free سازگار با OpenRouter

ویژگی‌های فعلی:

- HTTPS اجباری
- جلوگیری از URL دارای username/password
- timeout حدود 30 ثانیه
- retry محدود برای خطاهای transient
- بررسی JSON
- fallback مدل در OpenRouter در صورت نیاز

کلید API در repository قرار نمی‌گیرد.

### Translation Bridge

`services/translation-bridge.js`

مسئول translation بین زبان UI و فارسی داخلی است:

- `toPersian(text, from)`
- `fromPersian(text, to)`
- `fromPersianBatch(texts, to)`

### Workspace Adapter

`adapters/paragraph-workspace.js`

تنها adapter مستقیم بین UI workspace و core است.

مسئول:

- `evaluatePersian(text)`
- `generatePersian(count, mode)`
- enforce کردن تعداد دقیق خروجی
- اعتبارسنجی resultها

### Page Adapter

`js/paragraph-page.js`

فقط behavior مربوط به UI صفحهٔ مشترک را مدیریت می‌کند.

دو entry mode دارد:

#### Reference

ورود از «مرجع تقلید»:

- input فعال است
- generation controls غیرفعال هستند
- action = «هم‌سنگی»
- اگر input غیر فارسی باشد، ابتدا به فارسی ترجمه می‌شود
- core روی متن فارسی ارزیابی انجام می‌دهد
- در صورت نیاز نتیجه به زبان انتخاب‌شدهٔ سایت ترجمه می‌شود

#### Experience

ورود از «قلمرو تجربه»:

- input غیرفعال است
- count و generation mode فعال هستند
- action = «بازشناسی»
- paragraphهای فارسی تولید می‌شوند
- core آن‌ها را ارزیابی می‌کند
- خروجی‌ها در صورت نیاز به زبان انتخاب‌شدهٔ سایت ترجمه می‌شوند

هر دو مسیر از یک workspace و یک core استفاده می‌کنند.

## 7. Shared Workspace UI

workspace مشترک در `index.html` با id زیر قرار دارد:

`paragraph-page`

اجزای اصلی:

- source/context
- input
- count
- generation mode
- action button
- connection settings
- output
- error area

دکمه‌های ورودی:

- Experience → `بازشناسی`
- Reference → `هم‌سنگی`

navigation مربوط به آن در `js/pages.js` قرار دارد.

## 8. Internationalization

سیستم ترجمه از این فایل‌ها تشکیل شده است:

- `translations/i18n.js`
- `translations/fa.json`
- `translations/en.json`
- `translations/zh.json`
- `translations/ar.json`

کلیدهای Paragraph Machine در namespace زیر هستند:

`paragraphMachine`

از جمله:

- `recognize`
- `equivalence`
- `internal`
- `input`
- `count`
- `mode`
- `settings`
- `apiKey`
- `baseUrl`
- `model`
- `save`
- `words`
- `chars`
- `realm`
- `status`
- `reason`

هنگام تغییر زبان، متن UI و action labelها باید از catalog ترجمه خوانده شوند.

## 9. Security

این پروژه static است. در نتیجه:

- secret نباید در GitHub commit شود.
- API key فعلی در browser localStorage نگهداری می‌شود.
- این روش برای prototype/static deployment قابل استفاده است، اما secret protection در سطح production محسوب نمی‌شود.
- معماری امن‌تر آینده:

```text
Browser
   ↓
Secure Gateway
   ↓
LLM Provider
```

تا زمانی که gateway واقعی ساخته نشده، ادعا نکن که secret architecture امن production شده است.

CSP برای صفحات اصلی و صفحات مستقل تنظیم شده و از inline script تا حد ممکن جلوگیری می‌شود.

## 10. Validation

Core باید resultهای نامعتبر را رد کند.

`validateResult(parsed, expectedCount)` باید:

- array بودن result را بررسی کند
- در صورت تعیین expectedCount، تعداد دقیق را بررسی کند
- paragraph خالی را رد کند
- judgmentها را validate کند
- محدودیت‌های text processing را enforce کند

هر تغییر در generation باید با validation سازگار بماند.

## 11. GitHub Actions

### Quality Gate

`.github/workflows/quality.yml`

موارد اصلی:

- Node syntax check برای JS
- parse کردن JSON
- بررسی duplicate HTML IDs
- بررسی وجود assetهای local
- بررسی accidental inline script

### Deployment

`.github/workflows/deploy.yml`

با push به `main` و workflow دستی اجرا می‌شود و GitHub Pages را deploy می‌کند.

بعد از تغییرات مهم، وضعیت Quality Gate و Deployment را بررسی کن.

## 12. Legacy Code

`paragraph-machine.html` legacy/reference است.

صفحات:

- `observation.html`
- `philosophical-treatise.html`
- `shahnameh.html`

از shared behaviorهای استخراج‌شده استفاده می‌کنند:

- `js/reading-page.js`
- `js/shahnameh-page.js`

این فایل‌ها را فقط در صورت نیاز و با توجه به dependency graph تغییر بده.

## 13. What Not To Do

- کل `index.html` را بدون نیاز دوباره monolithic نکن.
- logic هسته را داخل UI قرار نده.
- translation را داخل core قرار نده.
- API key را commit نکن.
- متن‌های چندزبانه را خارج از i18n hard-code نکن مگر اینکه واقعاً محتوای غیر UI باشند.
- برای یک behavior مشترک، implementationهای موازی نساز.

### Site audio — mandatory integration rule

Every new page, realm, ring, component, or interaction must integrate with the existing `site-audio.js` system and follow [AUDIO.md](AUDIO.md). Use standard semantic `<button>` and `<a href="…">` elements; use `data-sound` or the `site:sound` event for UI cues; use `data-sound-theme` and the existing realm-selection logic for theme changes; and register any new color/realm theme with `SiteAudio.registerTheme`. Keep the toggle label in the site's translation catalogs. **Never create a separate `AudioContext` or `<audio>` tag for UI sounds, and never edit `site-audio.js` directly** (extend only through `registerTheme`/`registerCue`). Audio failures must never interrupt site functionality.
- فایل legacy را بدون بررسی حذف نکن.
- قبل از تغییر، dependencyها را نخوانده refactor نکن.
- موفقیت deploy را بدون بررسی workflow فرض نکن.

## 14. Development Workflow

برای هر feature:

1. **Understand** — فایل‌ها و مسیر اجرای مرتبط را بخوان.
2. **Map** — مشخص کن feature در کدام layer قرار می‌گیرد.
3. **Change** — کمترین تغییر لازم را اعمال کن.
4. **Validate** — syntax، data، integration و behavior را بررسی کن.
5. **Commit** — یک commit با پیام روشن ایجاد کن.
6. **Deploy Check** — Quality Gate و deployment را بررسی کن.
7. **Report** — خلاصهٔ دقیق تغییرات، فایل‌ها و نتیجهٔ validation را ارائه بده.

## 15. Current Baseline

نسخهٔ فعلی نتیجهٔ چند مرحله refactor، modularization، paragraph-machine integration، security hardening و quality checks است.

نقطهٔ شروع توسعه باید **وضعیت واقعی branch `main`** باشد، نه فرضیات قبلی.

اگر وضعیت repository با این README متفاوت بود:

> **Repository state wins.**

یعنی کد واقعی، dependencyها، workflowها و تست‌های موجود مرجع نهایی هستند و این README باید در صورت تغییر معماری به‌روزرسانی شود.

## 16. Design Principle

این پروژه فقط مجموعه‌ای از فایل‌های مستقل نیست.

هدف این است:

```text
Clear Components
      +
Explicit Contracts
      +
Shared Core
      +
Consistent i18n
      +
Validated Integration
      =
One Coherent System
```

هر توسعه‌دهندهٔ جدید باید ابتدا این مدل ذهنی را درک کند و سپس کد بزند.
