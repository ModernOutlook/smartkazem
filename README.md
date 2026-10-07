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

Secondary surfaces:
- **Book:** the normal secondary reading surface.
- **Machine:** Paragraph Machine; potentially a small number of machines.
- **Album:** a future separate surface.

An HTML file, box, panel, overlay, card, or popup is not automatically a page/category. Today, secondary content is primarily books; Paragraph Machine is a machine.

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

## 4. Repository map


/
├── index.html · home
├── shahnameh.html · book
├── observation.html · book
├── observation-25.html · book
├── echo-layer3.html · book
├── philosophical-treatise.html · book
├── paragraph-machine.html · machine
├── css/ · site, desktop, splash
├── ui/ · bootstrap, mobile, shared layout
├── js/ · page/application controllers
├── engine/ · domain core
├── services/ · model/translation boundaries
├── adapters/ · UI/service orchestration
├── content/ · authoritative content datasets
├── translations/ · language catalogs + i18n runtime
└── .github/workflows/ · quality/deployment


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

Order S/T/E/R/C is an invariant. Check navigation, translations, Paragraph Machine, and documentation before changing it.

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

paragraph-machine.html is a separate/legacy machine surface, not the shared home workspace.

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

## 13. Quality and deployment

quality.yml currently checks JavaScript syntax, JSON validity, duplicate HTML IDs, missing local HTML assets, inline scripts, and inline event handlers.

Deployment definitions currently include deploy.yml and deploy-pages.yml; their overlap is known technical debt. Consolidation is a dedicated infrastructure change.

## 14. Known technical debt

- some window.* compatibility globals
- large css/site.css
- inconsistent legacy JS formatting
- some fallback/content prose near logic
- some controlled innerHTML
- no complete formatter/linter/type system
- no full browser smoke-test suite
- overlapping deployment workflows
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
Verify as applicable: JS syntax, JSON validity, HTML structure, local assets, language switching, affected navigation, mobile/desktop, RTL/LTR, and accessibility.

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
