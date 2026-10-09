# SmartKazem — AI Maintenance Guide

> Repository: ModernOutlook/smartkazem  
> Deployment: GitHub Pages · browser-native HTML/CSS/JS · no required build system  
> Languages: fa / en / zh / ar

This is the compact engineering contract for future human/AI maintenance. **Inspect the actual repository before changing it; this README is a guide, not a substitute for code inspection.**

## 1. Non-negotiable principles

1. Preserve existing behavior and architecture; make the smallest responsible change.
2. Inspect the owning HTML, controller, content/service boundary, CSS, and i18n before editing.
3. Do not refactor unrelated code during a feature or bug fix.
4. Do not introduce a framework, router, state manager, build system, or dependency without a demonstrated need.
5. Keep content, business rules, services, adapters, controllers, and presentation separate.
6. Shared-code changes require checking all callers.
7. Preserve four languages, RTL/LTR, accessibility, responsive behavior, and existing public contracts unless redesign is explicitly requested.

## 2. User-facing content model

Home → 5 primary realms → secondary surfaces.

Primary realms, in invariant order:

S → T → E → R → C

Secondary pages (current child-page inventory): **exactly 12 pages, and all 12 are books**
1. **رساله فلسفی** — book
2. **شاهنامه‌خوانی** — book
3. **فصل اول ظهور** — book
4. **سرزمین مشاهده؛ ۲۵ بار رسیدن** — book
5. **آینه‌ی ممکن‌ها** — book
6. **فصل دوم ظهور** — book
7. **سرزمین مشاهده؛ یک رود، یک جریان** — book
8. **پژواک لایه سوم** — book
9. **انسان و ماشین‌هایش** — book
10. **جاعلان تقلید** — book
11. **تباهیان** — book
12. **مانیفست آشوب‌زده** — book

`inventory.html` is a separate utility/catalog surface for the playing-card asset inventory; it is not part of the realm child-page/book inventory.\n\nThe Paragraph Machine is a **shared workspace inside `index.html`**, not a standalone page. It is reachable through both Paragraph Machine entry paths:
- **قلمرو تجربه → بازشناسی → ماشین پاراگراف**
- **مرجع تقلید → هم‌سنگی → ماشین پاراگراف**

`بازشناسی` and `هم‌سنگی` are two modes of the same shared Paragraph Machine workspace. No legacy Paragraph Machine surface is maintained.

`بازشناسی` و `هم‌سنگی` صفحهٔ فرعی نیستند؛ هر دو مسیر ورود به ماشین پاراگراف‌اند. بنابراین خارج از صفحهٔ اصلی و ۵ قلمرو، دقیقاً همین ۱۲ صفحهٔ فرعی وجود دارد و همهٔ آن‌ها کتاب‌اند. An HTML file, box, panel, overlay, card, or popup is not automatically a page/category.

## Canonical Persian sources added for two book pages

- **سرزمین مشاهده؛ ۲۵ بار رسیدن** now stores its Persian title, subtitle, section labels, notes, and 25-section prose in `content/observation-25.js`.
- **آینه‌ی ممکن‌ها** now stores its Persian title, subtitle, section labels, notes, and prose in `content/possible-mirror.js`.
- Their controllers use these sources when Persian is selected. The duplicate Persian book data was removed from `translations/fa.json`; the shared UI close labels remain there. The shared i18n runtime can use the canonical Persian source title for the browser document title when the page catalog intentionally has no duplicate title.
- The non-Persian catalogs are untouched in this pass. Translation consolidation begins only after the Persian-source inventory is complete.

## Persian-source-first migration update

Two additional long-form books now have canonical Persian content files, and their HTML pages no longer contain duplicate Persian book prose:

- **سرزمین مشاهده**: `content/observation.js` (title, subtitle, and 12 body paragraphs), rendered by `js/observation-source.js`.
- **رساله فلسفی نگرش نوین**: `content/philosophical-treatise.js` (title and 158 ordered semantic blocks, including headings, paragraphs, and its table), rendered by `js/philosophical-treatise-source.js`.

The original block order and semantic markup are preserved. The English, Chinese, and Arabic copies remain temporarily in the pages for the later translation-source pass. Persian-source consolidation is still in progress; the README status and audit inventory must not be read as a claim that all books are migrated.

## Persian-source-first migration checkpoint

The migration is proceeding in two deliberate passes: first consolidate all Persian book content into one canonical file under `content/`; only after that inventory is complete will the EN / ZH / AR translation reservoirs be reconciled. Do not add new Persian book prose to HTML, controllers, or translation catalogs.

- **سرزمین مشاهده** now has its Persian title, subtitle, and twelve prose paragraphs in `content/observation.js`. Its HTML contains empty Persian render targets; `js/observation-source.js` renders the canonical source into them. Duplicate Persian fields were removed from `translations/observation.json`.
- The existing canonical Persian sources for **جاعلان تقلید**, **انسان و ماشین‌هایش**, **تباهیان**, **فصل اول ظهور**, **فصل دوم ظهور**, **پژواک لایه سوم**, **مانیفست آشوب‌زده**, and **شاهنامه‌خوانی** remain the source-of-truth starting points; their remaining embedded/fallback Persian copies and metadata still need to be audited and removed.
- **رساله فلسفی نگرش نوین** is still a major outstanding task because its full text is embedded in `philosophical-treatise.html`; do not mark the Persian-source pass complete until it and the other listed page shells have been migrated.

This checkpoint does not claim the Persian pass is complete. Keep the translation pass paused until every book has one verified Persian source and no duplicate Persian book prose elsewhere.

## Canonical book-content migration status

The canonical-source rule is now enforced for the **home-page book reader** for **جاعلان تقلید** and **انسان و ماشین‌هایش**:

- Persian chapter prose is read from `content/forgers.js` and `content/human-machines.js`.
- EN / ZH / AR chapters are read from the corresponding `pages.forgers` and `pages.humanMachines` entries in `translations/en.json`, `translations/zh.json`, and `translations/ar.json`.
- The duplicate Persian chapter arrays were removed from `translations/fa.json`.
- The embedded EN / ZH / AR copies were removed from `content/forgers.js`; the controller no longer carries parallel book-title or translated-moral prose fallbacks.
- The shared reader builds its chapter tabs and visible text from the selected canonical source/catalog. Talk Back continues to read the localized rendered DOM rather than maintaining a separate book-text copy.

**Migration is incremental, not complete for all 12 books.** Do not delete any remaining embedded text until the source and all four language paths are verified for chapter count, order, paragraph fidelity, language switching, and Talk Back. The audit in `docs/canonical-book-content-audit.md` records the remaining work. In particular, `translations/tabahian.json` currently has only two translated chapters while the Persian source has three; that gap must be translated before claiming four-language parity.

## 3. Two-repository content architecture

The authoritative content flow is:

Persian source repository → Translation repository → Runtime delivery

### Persian source
- Persian is the canonical source of primary content.
- User-supplied Persian material is published **exactly as supplied**: no rewriting, summarizing, polishing, reinterpretation, silent correction, or translation.
- This Persian version is the sole source for later translations.

### Translation repository
- Contains native, faithful **English, Arabic, and Chinese** translations.
- Preserve meaning, structure, terminology, narrative information, and intended style.
- Never translate one target language from another; all derive from Persian.
- Persian content may be published before translations exist. Never invent missing translations.

### Runtime

Selected language:
- fa → Persian source data
- en/ar/zh → translated data

The deployed translations/*.json files are runtime artifacts, not alternative sources of truth. translations/i18n.js is the runtime language boundary and must not translate Persian at display time.

### Talk Back
Talk Back is a parallel presentation/service layer over the same language-selected content. It may own audio processing, voice selection, caching, and playback, but **must not create an independent Persian/translation content authority**.
- Accessibility/Talk Back is **off by default** on a fresh installation.
- Its only global on/off gesture is a **triple primary-pointer click/tap anywhere on the site**; the state may persist across reloads once the user has chosen it.
- The gesture uses the browser's click sequence and a short global timing window; keyboard/programmatic clicks do not toggle accessibility.
- Double-click is not an accessibility toggle. While accessibility is active, double-click may repeat the last spoken announcement.
- Touch uses the shared Pointer Events path; the document uses `touch-action: manipulation` so browser double-tap zoom does not steal the triple-tap gesture while normal panning remains available.
- Long-press remains an in-accessibility reading-control gesture (pause/resume/repeat) and is inactive while Talk Back is off.
- The accessibility navigator can select and read the currently displayed article/book content in the active language; article text is derived from the visible localized DOM, never from a duplicate accessibility content store.

### Tabahian integration rule
- «تباهیان» is a child book of **اقتصاد سهم**, not a separate repository or a new content system.
- Its canonical Persian content is managed through the same Persian source workflow as other site content; the site's deployable source file is `content/tabahian.js`.
- Its translated runtime catalog stays in the existing shared `translations/` directory as `translations/tabahian.json`, loaded by `translations/i18n.js` alongside the site's normal language catalogs.
- It uses `BookNavigation`, the shared language selector, and the existing global Talk Back/accessibility bootstrap. Do not add page-specific accessibility scripts or an independent audio/content store.
- The current translation catalog has EN/AR/ZH for only two chapters; chapter three must be translated and validated before this page is marked complete or merged to production.

## Canonical book-content boundary (mandatory)

Every book has exactly one canonical Persian content source and one derived translation reservoir. At runtime, the selected language chooses the data source:

- `fa`: render the canonical Persian content from its declared source in `content/`.
- `en`, `ar`, or `zh`: render the matching language from the book's declared file in `translations/`.
- The page HTML is a presentation shell only: structure, stable IDs, semantic controls, and script/style references. It must not contain book prose, chapter/episode text, translated copies, or static content placeholders that duplicate a source.
- Page controllers render the selected source into the shell. They may contain rendering/navigation logic, but no book prose, chapter titles, subtitles, morals, or language-specific fallback copies.
- Translation catalogs may contain the translations and UI labels for their declared purpose; they must not be used as a second Persian source for long-form book content.
- Never duplicate a book's prose between HTML, controller JavaScript, a global UI catalog, and a content dataset. When the same text appears in multiple places, remove the non-authoritative copy after wiring and verifying the canonical path.
- Book cards, home listings, search indexes, accessible reading, and page views must all derive titles and text from the same declared catalog; no parallel hard-coded book metadata.
- Each book must declare these paths in `page-specs/<book>.json`: Persian source, translation reservoir, presentation shell, renderer/controller, and language selection contract.
- A book is not compliant merely because its current display looks correct. Verify every language, chapter/episode count and order, paragraph boundaries, navigation, Talk Back, RTL/LTR, and responsive behavior after migration.

**Migration rule:** move content without summarizing, rewriting, reordering, or silently correcting it. Preserve exact source wording and paragraph structure. If two copies differ, do not choose one by guess; compare them and record the discrepancy for resolution before deleting either copy.

## 4. Repository map

The repository is organized by ownership: HTML defines structure, CSS defines presentation, JS/controllers coordinate pages, and content/services/adapters/engine keep business and integration logic out of presentation.

The current user-facing surfaces are Home, the five realms, 12 book pages, and the Paragraph Machine machine surface. **Navigation order is defined only by the site's route hierarchy and canonical DOM order; it is never inferred from file age, commit history, creation time, or which implementation was written first.** `بازشناسی` and `هم‌سنگی` are entry paths/modes, not additional pages.



/
├── index.html · home + dynamic book pages + shared Paragraph Machine workspace
├── shahnameh.html · شاهنامه‌خوانی book
├── observation.html · سرزمین مشاهده؛ یک رود، یک جریان book
├── observation-25.html · سرزمین مشاهده؛ ۲۵ بار رسیدن book
├── possible-mirror.html · آینه‌ی ممکن‌ها book
├── emergence.html · فصل اول ظهور book
├── emergence-2.html · فصل دوم ظهور book
├── echo-layer3.html · پژواک لایه سوم book
├── philosophical-treatise.html · رساله فلسفی book
├── shared paragraph workspace in index.html · shared Paragraph Machine workspace (machine)
├── inventory.html · playing-card inventory utility surface
├── css/ · site, desktop, splash
├── ui/ · bootstrap, mobile, shared layout
├── js/ · page/application controllers
├── engine/ · domain core
├── services/ · model/translation boundaries
├── adapters/ · UI/service orchestration
├── content/ · authoritative content datasets
├── translations/ · language catalogs + i18n runtime
└── .github/workflows/ · quality/deployment


### Presentation enforcement

The architecture is enforced, not only documented:
- user-facing HTML pages must not contain inline `<style>` blocks or inline event handlers;
- the shared language contract requires four language controls (`fa/en/zh/ar`) on each user-facing page;
- every user-facing HTML document must declare its language;
- page presentation belongs in external CSS layers (`css/`, `ui/mobile/`, or page-specific CSS under `css/pages/`);
- dynamic UI should prefer `textContent`, `replaceChildren()`, and explicit DOM APIs over avoidable dynamic HTML injection;
- security checks cover every HTML page, including legacy surfaces.

The GitHub Actions quality/security gates are part of the maintenance contract. A change that violates these contracts is incomplete even if the page appears visually correct.

### Desktop/mobile ownership

Desktop and mobile are presentation layers, not separate application architectures. They must reuse the same content, translation, engine, service, adapter, and business logic.

## 5. Layer ownership

**HTML:** structure, stable IDs, semantic controls, accessibility labels, script loading. Avoid inline event handlers/scripts.

**CSS:** presentation only.
- css/site.css → shared/base
- css/desktop.css → desktop
- ui/mobile/mobile.css → mobile
- ui/shared/layout-spec.css → shared layout contract
- css/splash.css → splash

**JS:**
- js/app.js → home controller
- js/pages.js → page navigation boundary
- js/books.js → shared book navigation/rendering
- content/*.js → content datasets
- services/* → external/service boundaries
- adapters/* → orchestration
- engine/* → DOM-independent business rules

## 6. Internationalization contract

Supported languages:
- fa → RTL
- en → LTR
- zh → LTR
- ar → RTL

Runtime boundary: translations/i18n.js → window.SiteI18n.

Responsibilities: language validation/persistence, catalog loading, data-i18n, lang/dir, active-language state, and site:languagechange.

Rules:
- No per-page translation engines.
- Do not duplicate Persian into translation catalogs merely for fa.
- Primary Persian content comes from the Persian source; EN/AR/ZH come from translated catalogs.
- Language-sensitive modules may subscribe to site:languagechange.

## 7. Five realms

| Code | Realm |
|---|---|
| S | ساختار تالار |
| T | تداوم عالم |
| E | قلمرو تجربه |
| R | مرجع تقلید |
| C | اقتصاد سهم |

Order S/T/E/R/C is an invariant. Child-page order is likewise the order explicitly defined by the site's realm navigation. Check navigation, translations, Paragraph Machine, and documentation before changing it. **Never introduce a chronological/legacy-vs-new ordering rule based on code history or file age.**

## 8. Paragraph Machine contract

Architecture:

UI → js/paragraph-page.js → adapters/paragraph-workspace.js → engine/paragraph-engine.js

The adapter also uses services/llm-client.js and services/translation-bridge.js. The engine is DOM-independent.

Hard limits:
- MAX_WORDS = 144
- MAX_WORD_LENGTH = 34
- MAX_CHARS = 900

Judgment contract:
- domains: S / T / E / R / C
- status: ok | warn | bad
- reason: non-empty string
- ok = منطبق; warn = مبهم; bad = متناقض

Entry modes:
- **هم‌سنگی:** user text → toPersian → evaluatePersian → core → judgment → translated result → UI.
- **بازشناسی:** count/mode → generatePersian → core → judgment → translated result → UI.

These are distinct paths: evaluation must not accidentally become generation.

Translation bridge public operations: toPersian(), fromPersian(), fromPersianBatch(). Batch cardinality must remain input count = output count.

llm-client.js is the model-service boundary. UI must not call the model API directly; adapters must not duplicate retry logic.

shared paragraph workspace in index.html is a separate/legacy **machine surface**, not a book and not the shared home workspace. It belongs to the same Paragraph Machine category reached through both **قلمرو تجربه → بازشناسی → ماشین پاراگراف** and **مرجع تقلید → هم‌سنگی → ماشین پاراگراف** paths. The shared current workspace is still the `paragraph-page` surface in `index.html`; the standalone file is maintained as a legacy compatibility surface.

## 9. Content and reading ownership

Authoritative content belongs in content/*.js or the defined Persian/translation source repositories, not in controllers, CSS, or generic utilities.

Shahnameh ownership:

shahnameh.html → js/shahnameh-series-page.js → content/shahnameh-series.js → translations/i18n.js

Fix Shahnameh-specific defects in its own surface first; change global i18n only when the defect is demonstrably global.

## 10. Globals and dependencies

Current compatibility globals include:

window.SiteI18n, window.SitePages, window.BookNavigation, window.ParagraphMachineCore, window.ParagraphLLM, window.ParagraphTranslation, window.ParagraphWorkspaceAdapter, window.ParagraphPage

Do not add arbitrary globals. Extend an existing public API when appropriate, keep interfaces small, and avoid leaking internal state.

Script order has intentional dependencies. Do not reorder casually. ES-module migration is a dedicated refactor.

## 11. Responsive and accessibility contract

Every layout change must consider:
- mobile portrait
- mobile landscape
- desktop
- RTL and LTR
- short and long translated labels

Preserve semantic buttons, type="button", keyboard interaction, appropriate aria-label/aria-pressed/aria-live, visible focus, and correct lang/dir.

Language controls are especially sensitive to narrow portrait widths, RTL/LTR, long labels, and header positioning.

## 12. Security

Preserve existing CSP and browser security constraints, including HTTPS-only model endpoints and restricted embedding/navigation behavior.

A browser-side API key is not a server-side secret. Never commit keys, tokens, passwords, or provider secrets.

## 13. Quality, security, and deployment

`quality.yml` enforces the maintenance contract: JavaScript syntax, JSON validity, duplicate HTML IDs, missing local HTML assets, inline-script/event-handler restrictions, externalized presentation CSS, document language, and the four-button shared language contract.

`security.yml` checks every HTML page for the browser-security metadata contract, insecure `http://` URLs, `javascript:` URLs, and likely committed credentials. The legacy Paragraph Machine is not exempt.

Browser security is intentionally implemented within static GitHub Pages constraints. Do not assume arbitrary server response headers are available. Keep CSP, referrer, and Permissions-Policy metadata synchronized with the actual page requirements.

`css/visual-security.css` is presentation-only: it may improve visual focus, contrast, illumination, and control affordances, but must not acquire navigation, state, content, i18n, engine, service, or adapter logic.

`deploy.yml` is the current deployment workflow. Do not introduce or document a second deployment workflow without first inspecting the actual workflow tree.

## 14. Known technical debt

- some window.* compatibility globals
- large css/site.css
- inconsistent legacy JS formatting
- some fallback/content prose near logic
- some legacy compatibility globals
- no complete formatter/linter/type system
- no full browser smoke-test suite
- some legacy HTML/CSS may still require staged cleanup as the repository evolves
- Structure.txt overlaps README

These are boundaries, not reasons for opportunistic rewrites.

## 15. AI change protocol

### Before editing
1. Identify the exact user-facing surface.
2. Find its owning files.
3. Search callers before changing shared modules.
4. Identify affected contracts/invariants.
5. Inspect actual current code.

### During editing
- Prefer the smallest patch.
- Reuse existing APIs/helpers.
- Keep business rules out of UI and services out of content modules.
- Prefer data-driven rendering.
- Prefer textContent/replaceChildren/explicit DOM APIs over unsafe dynamic HTML.
- Preserve existing escaping/safety boundaries for user/model text.
- Avoid speculative abstraction.

### After editing
Verify as applicable: JS syntax, JSON validity, HTML structure, local assets, language switching, affected navigation, mobile/desktop, RTL/LTR, accessibility, and the quality/security gates. If a presentation change can be made without touching behavior, keep it in CSS.

For every user-facing page, explicitly verify the shared language selector in portrait/landscape and RTL/LTR before considering the change complete.

For Paragraph Machine also verify evaluation/generation paths, S/T/E/R/C judgment, 144/34/900 limits, translation boundary, and batch cardinality.

## 16. Decision rules

- **Fix this page:** modify page-specific code first.
- **Fix all pages:** inspect shared code before duplicating a fix.
- **Fix language switching:** start at translations/i18n.js, then inspect the affected page listener/layout.
- **Fix mobile:** start at ui/mobile/mobile.css and affected-page CSS.
- **Fix desktop:** start at css/desktop.css and shared layout contracts.
- **Update translations:** obtain the canonical Persian source first; update only requested target catalogs.
- **Clean the code:** use staged refactoring; preserve behavior after each stage.

## 17. Invariants not to change casually

1. Static GitHub Pages architecture.
2. No mandatory build step.
3. Four languages: fa/en/zh/ar.
4. Persian as authoritative primary content.
5. Realm order: S/T/E/R/C.
6. Paragraph Machine Persian internal processing.
7. Paragraph limits: 144 / 34 / 900.
8. Shared Paragraph Machine core/service boundaries.
9. Shared i18n boundary.
10. Mobile + desktop support.
11. Keyboard accessibility.
12. Existing page-specific language switching.
13. Persian-source → translation-source content ownership.
14. Talk Back consumes the same language-selected content.

## 18. Commit/change vocabulary

Prefer: fix: / feat: / refactor: / style: / docs: / test: / chore:

## Final rule

> **Inspect first. Identify the smallest responsible layer. Change only what is necessary. Preserve contracts. Validate the affected surface.**

## 19. Repeatable AI page-completion system

Long-form content pages use a machine-detectable **page-completion package** so future ChatGPT maintenance can recognize the workflow instead of inventing a new one.

Reference protocol: `docs/ai-page-completion.md`  
Machine-readable manifest: `page-specs/<page>.json`

The standard flow is:

`Persian source → translation reservoir (EN/AR/ZH) → shared i18n/runtime → accessibility derived from content + interaction model → verification`

For a new page, ChatGPT should inspect the repository first and request only missing inputs: page identity, canonical Persian source, translation target/path, runtime page/path, and any page-specific accessibility requirements. It should then reconcile source and translations, complete translations from Persian, derive the accessibility layer, run the quality gate, and perform real browser/screen-reader testing when that capability is available.

The **Persian source remains authoritative**. Translation cardinality and ordering must match it. Accessibility is not a separate content source; it is a contract derived from the actual translated content and controls. The reference implementation is `emergence`.

This protocol does not replace page-specific inspection. It makes the expected relationship explicit and repeatable.


## 20. Unified visual-family system

The five realms form one visual composition from the outer black perimeter toward the white center:

1. **S — ساختار تالار:** deep petroleum blue
2. **T — تداوم عالم:** matte golden yellow
3. **E — قلمرو تجربه:** cosmic purple
4. **R — مرجع تقلید:** dark coral red
5. **C — اقتصاد سهم:** emerald green

The palette order is invariant and is part of the site's visual identity. A page opened from a realm should inherit that realm's dominant color family, while it may develop its own visual language from the parent realm's background motifs. Child surfaces are therefore **related, not identical**.

### Visual design rules
- Shared page grammar: restrained header, glass-like control surfaces, soft depth, fine borders, controlled glow, strong negative space, and a common motion language.
- Realm identity: preserve the parent realm's dominant color and atmospheric character.
- Child identity: reuse one or more motifs from the parent realm's background, then reinterpret them rather than copying the parent scene literally.
- Visual hierarchy: atmosphere → title/navigation → content surface → actions.
- The Reference realm uses an architectural/concentric vocabulary derived from its coral-red identity; it should not be visually reduced to the simpler legacy treatment.
- Paragraph Machine remains a deliberately exceptional machine surface. Its stronger visual language is allowed because it is a functional workspace, not a normal child page.
- Shahnameh remains a flagship visual surface; its image-rich composition is not a baseline that every page must imitate.
- Visual refinement must not alter navigation, state, content, i18n, accessibility semantics, service boundaries, or business rules.

### Maintenance rule
When improving a visual surface, inspect both the owning page and its parent realm. Prefer a presentation-only CSS change when structure and behavior already satisfy the contract. New visual motifs should belong to the realm family rather than becoming an unrelated sixth design language.


## §21 Accessibility data-flow contract — future-proof by default

The blind-user accessibility system is a **shared runtime service**, not a per-page content implementation.

### Core invariant

Future content updates must follow this one-way data flow:

`Persian source → translation reservoir → SiteI18n → rendered localized DOM → shared Talk Back/accessibility runtime`

Accessibility never owns a second copy of page prose. It reads the **currently rendered, language-selected content** from the page at runtime.

Therefore:

> **Updating authoritative Persian content and its EN/AR/ZH translations automatically updates the Talk Back content, without editing the accessibility engine.**

### What future pages MUST NOT do

- Do not create a page-specific Talk Back engine.
- Do not create an accessibility translation catalog.
- Do not duplicate Persian/English/Arabic/Chinese prose for screen readers.
- Do not hard-code page titles, paragraphs, episode text, or navigation prose inside `audio-engine.js`.
- Do not add a page-specific accessibility script merely because a new book/section was added.
- Do not connect Talk Back directly to the Persian repository or a target translation repository from page code. The runtime path is always through the shared i18n/rendered-DOM boundary.
- Do not require a future content editor to update accessibility text separately.

### What the shared runtime guarantees

`audio-engine.js` is responsible for behavior, not content. When accessibility is active it:

1. discovers semantic/navigable elements from the current DOM;
2. derives accessible names from native semantics, ARIA labels, i18n labels, and visible text;
3. reads the currently rendered article/book content;
4. uses `document.documentElement.lang` / `SiteI18n` to select the active speech language;
5. reacts to `site:languagechange`;
6. observes DOM/content mutations and resynchronizes its navigation model;
7. announces dynamically replaced content through the shared live region;
8. supports keyboard, touch, focus, previous/next, item selection, and long-form reading without knowing the page's prose.

The runtime therefore remains stable while the content and translation repositories evolve.

### Content contract for automatic accessibility

Every future user-facing content surface must expose its content through the existing shared runtime:

- Persian content is authoritative.
- EN/AR/ZH are structurally aligned translations.
- `translations/i18n.js` selects and renders the active language.
- Book/article content is present in the DOM or is rendered into the DOM from the same source/translation model.
- Interactive controls use native HTML semantics and existing i18n labels where labels are language-sensitive.
- Dynamic content must be inserted through the page's existing rendering boundary so the shared MutationObserver can discover it.
- No hidden duplicate accessibility-only content is permitted.

### Automatic update rule

For a new or changed content item:

`update Persian → update EN/AR/ZH → render → Talk Back sees the new DOM`

No accessibility-engine change is expected.

A change to `audio-engine.js` is justified only when the **interaction model itself** changes, such as introducing a genuinely new accessibility gesture, control type, or reading behavior. A normal new page, chapter, episode, paragraph, title, translation, or button label is a **content/data change**, not an accessibility-engine change.

### Page manifests and accessibility

`page-specs/<page>.json` may declare page-specific accessibility requirements when the interaction model genuinely needs them. Such declarations describe **requirements and verification**, not a second implementation.

If a page uses only standard book/article navigation, it should inherit the shared accessibility contract rather than adding custom accessibility code.

### Definition of automatic accessibility completeness

A page is accessibility-complete when:

- its Persian source is complete;
- EN/AR/ZH translations are complete and structurally aligned;
- the shared i18n runtime can render every language;
- the resulting DOM uses semantic controls and landmarks;
- `audio-engine.js` is loaded by the shared page shell/runtime;
- Talk Back can discover the rendered content and controls without page-specific accessibility prose;
- quality/security gates pass.

This means **content synchronization and accessibility synchronization are the same runtime operation**: accessibility consumes the current rendered content rather than maintaining an independent copy.


### §21.2 Bootstrap and coverage safeguards

The automatic bootstrap is defensive as well as convenient:

- `translations/i18n.js` first reuses an already loaded `window.SmartKazemAudio` instance.
- If the page already declares `audio-engine.js`, the i18n runtime reuses that script instead of injecting a second copy.
- Otherwise the shared engine is injected once and initialized idempotently.
- This means script-order differences between legacy and newer pages must not create duplicate accessibility engines.
- The accessibility contract applies to every user-facing HTML surface that follows the shared i18n contract, including books, the home/realm surface, inventory, and the legacy Paragraph Machine surface.
- Page-specific manifests may describe verification requirements, but they do not create separate accessibility implementations.

When validating a future page, check the shared runtime rather than adding page-specific accessibility code:

1. Fresh/local state → accessibility is off.
2. Triple primary-pointer click/tap anywhere → toggles accessibility.
3. A second triple click/tap → toggles it back off.
4. While off → accessibility gestures do nothing.
5. While on → the current localized DOM is what is announced/read.
6. Changing language → accessibility follows the new rendered language.
7. Dynamic content replacement → the shared navigation model resynchronizes.
8. No duplicate `audio-engine.js` instance is created.

### §21.1 Automatic runtime bootstrap

`translations/i18n.js` is the shared language boundary and also bootstraps `audio-engine.js` when the accessibility runtime is not already present. This is intentional: a future page that follows the normal site i18n contract inherits Talk Back automatically instead of needing a page-specific accessibility script tag.

The resulting runtime chain is:

`Persian source → translation reservoir → SiteI18n → localized DOM → auto-bootstrapped shared Talk Back`

The page still owns its semantic HTML and interaction model; the accessibility engine owns only the generic behavior. Existing explicit `audio-engine.js` inclusions remain safe because the engine is idempotent.
