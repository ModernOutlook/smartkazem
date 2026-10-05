# SmartKazem — AI Maintenance & Architecture Guide

> **Repository:** ModernOutlook/smartkazem  
> **Deployment:** GitHub Pages  
> **Runtime:** Browser-native HTML/CSS/JavaScript  
> **Framework:** None  
> **Build step:** None required  
> **Default branch:** main  
> **Languages:** fa, en, zh, ar

This README is the **engineering handoff document for future human and AI/ChatGPT maintenance**.

It describes the architecture that exists now, the boundaries that must be preserved, the known clean-code debt, and the safest procedure for making future changes.

---

## 1. Project Purpose

SmartKazem is a content-oriented, multilingual static web application built with browser-native technologies.

The project intentionally avoids a heavy framework and build pipeline. The application is served directly from the repository and must remain functional as a static GitHub Pages site.

The project contains:

- a five-realm interactive home experience;
- multilingual content and interface;
- independent secondary pages;
- book/reading experiences;
- Shahnameh reading;
- observation pages;
- the Paragraph Machine workspace;
- a Persian philosophical content model;
- browser-side model/API integration for Paragraph Machine;
- responsive mobile and desktop presentation layers.

The most important engineering principle is:

> **Preserve existing behavior and architecture while making the smallest correct change necessary.**

---

# 2. Current Architectural Status

The codebase is **substantially modularized, but not fully Clean Code**.

### What is already good

- Core processing, services, adapters, page logic, content, translations, and presentation have recognizable boundaries.
- Paragraph Machine has a clear core → service → adapter → UI flow.
- Translation is centralized in translations/i18n.js.
- Persian source content is separated from translated catalogs.
- HTML is mostly free of inline event handlers and inline scripts.
- A CI quality gate validates JavaScript syntax, JSON catalogs, HTML structure, local assets, inline scripts, and inline event handlers.
- Recent UI fixes have generally been implemented as small targeted changes.

### Known clean-code debt

1. Several modules communicate through mutable/global window.* objects.
2. Page navigation changes presentation with direct style.display operations.
3. Some page logic reads presentation state through element.style.display, coupling behavior to DOM implementation.
4. css/site.css remains a large presentation monolith, with desktop/mobile/shared layers around it.
5. JavaScript formatting is inconsistent across older and newer modules.
6. Some content and fallback translations are embedded directly in JavaScript rather than living exclusively in content/catalog data.
7. Some page modules use innerHTML for local DOM rebuilding; textContent/DOM construction should be preferred when practical.
8. Static HTML contains substantial page structure, so markup ownership and runtime behavior must remain distinct.
9. There are two overlapping GitHub Pages deployment workflows.
10. The quality workflow is useful but does not yet enforce a complete formatter/linter/type system.

**Conclusion:** describe the project as **layered and maintainable, with identified cleanup boundaries**, not as “fully Clean Code”.

---

# 3. Repository Structure

~~~text
/
├── index.html
├── shahnameh.html
├── observation.html
├── observation-25.html
├── echo-layer3.html
├── philosophical-treatise.html
├── paragraph-machine.html
│
├── css/
│   ├── site.css
│   ├── desktop.css
│   └── splash.css
│
├── ui/
│   ├── bootstrap.js
│   ├── mobile/
│   │   └── mobile.css
│   └── shared/
│       └── layout-spec.css
│
├── js/
│   ├── app.js
│   ├── pages.js
│   ├── books.js
│   ├── paragraph-page.js
│   ├── shahnameh-series-page.js
│   ├── observation25-page.js
│   ├── reading-page.js
│   └── splash.js
│
├── engine/
│   └── paragraph-engine.js
│
├── services/
│   ├── llm-client.js
│   └── translation-bridge.js
│
├── adapters/
│   └── paragraph-workspace.js
│
├── content/
│   ├── forgers.js
│   ├── human-machines.js
│   ├── shahnameh-series.js
│   ├── echo-layer3.js
│   └── images 01.jpg ... 81.jpg
│
├── translations/
│   ├── fa.json
│   ├── en.json
│   ├── zh.json
│   ├── ar.json
│   ├── observation.json
│   └── i18n.js
│
├── .github/workflows/
│   ├── quality.yml
│   ├── deploy.yml
│   └── deploy-pages.yml
│
├── site-audio.js
├── Structure.txt
└── README.md
~~~

Large binary/content assets are not application logic.

---

# 4. Layer Responsibilities

## 4.1 HTML — Structure and semantic ownership

HTML owns:

- page containers;
- stable IDs used as integration points;
- semantic controls;
- accessibility labels;
- static page structure;
- script loading order.

HTML should not own application behavior through inline JavaScript.

Do not introduce:

~~~html
onclick="..."
onchange="..."
<script>
  ...
</script>
~~~

unless there is an exceptional, documented reason.

---

## 4.2 CSS — Presentation only

### css/site.css

Primary visual system and shared site presentation.

### css/desktop.css

Desktop-specific presentation layer.

### ui/mobile/mobile.css

Mobile-specific presentation layer.

### ui/shared/layout-spec.css

Small shared layout contract.

### css/splash.css

Splash/loading presentation.

### CSS rule

Do not put business logic in CSS.

When changing layout:

1. inspect shared CSS first;
2. determine whether the rule belongs to base, desktop, mobile, or shared layout;
3. avoid duplicating the same selector across layers;
4. preserve desktop and mobile behavior;
5. test RTL and LTR.

---

# 5. JavaScript Architecture

## 5.1 js/app.js

Main home-page controller.

Responsibilities:

- five-realm selection;
- home information panel;
- keyboard interaction;
- logo viewer;
- home-level navigation bindings;
- reaction to language changes.

It should not become the place for:

- translation implementation;
- model API calls;
- Paragraph Machine business rules;
- large content datasets;
- generic CSS/layout calculations.

---

## 5.2 js/pages.js

Central page-navigation controller.

Public API:

~~~text
SitePages
├── IDS
├── showPage()
├── returnHome()
├── openParagraph()
├── closeParagraph()
├── openShare()
├── closeShare()
├── openExperience()
├── closeExperience()
├── openContinuity()
├── closeContinuity()
├── openStructure()
├── closeStructure()
├── openReference()
├── closeReference()
└── setHomeController()
~~~

This module currently changes page visibility with direct style.display. That works, but it is a known presentation coupling.

A future refactor may replace it with semantic state/classes, but do not perform that refactor as part of an unrelated UI fix.

---

## 5.3 js/books.js

Shared book navigation for the home-page reading workspace.

Responsibilities:

- book selection;
- chapter tabs;
- chapter rendering;
- book title/subtitle selection;
- Persian source selection;
- translated catalog selection;
- return navigation.

Book data should remain separate from navigation logic.

---

# 6. Internationalization Architecture

Supported languages:

| Code | Language | Direction |
|---|---|---|
| fa | Persian | RTL |
| en | English | LTR |
| zh | Chinese | LTR |
| ar | Arabic | RTL |

## 6.1 Single i18n runtime

File:

~~~text
translations/i18n.js
~~~

Public runtime:

~~~text
window.SiteI18n
~~~

Responsibilities:

- supported-language validation;
- language persistence;
- catalog loading;
- data-i18n application;
- lang / dir updates;
- active language button state;
- language-change event dispatch.

The event is:

~~~text
site:languagechange
~~~

Modules with language-sensitive runtime rendering may subscribe to it.

---

## 6.2 Language source-of-truth rule

**Persian is the authoritative source for primary philosophical/content material.**

For the main books:

~~~text
Persian source content
        │
        ├── fa → direct source display
        │
        ├── en → translated catalog
        ├── zh → translated catalog
        └── ar → translated catalog
~~~

Do not create a new translation pipeline for Persian.

Do not translate Persian into Persian.

Do not duplicate the same Persian content into translation JSON merely to make it available to the Persian UI.

---

## 6.3 Translation ownership

Use:

~~~text
translations/*.json
~~~

for translated interface/content catalogs.

Use:

~~~text
content/*.js
~~~

for authoritative content datasets.

Avoid adding large translated prose directly to UI/controller modules.

---

# 7. Five Realms

The application is organized around five conceptual realms:

| Code | Realm | Paragraph Machine domain |
|---|---|---|
| S | ساختار تالار | Structure of the Hall |
| T | تداوم عالم | Continuity of the Universe |
| E | قلمرو تجربه | Realm of Experience |
| R | مرجع تقلید | Reference of Imitation |
| C | اقتصاد سهم | Share Economy |

The order is significant:

~~~text
S → T → E → R → C
~~~

Do not reorder these domains without checking Paragraph Machine, translations, UI navigation, generated judgments, and related documentation.

---

# 8. Paragraph Machine Architecture

The Paragraph Machine is deliberately separated into four layers.

~~~text
UI
│
▼
js/paragraph-page.js
│
▼
adapters/paragraph-workspace.js
│
├──► services/translation-bridge.js
│
├──► services/llm-client.js
│
▼
engine/paragraph-engine.js
~~~

The engine itself is independent of the DOM.

---

## 8.1 Engine

File:

~~~text
engine/paragraph-engine.js
~~~

Responsibilities:

- philosophical/system rules;
- five-domain judgment model;
- output validation;
- text normalization;
- word/character constraints;
- generation modes;
- prompt construction.

Hard limits:

~~~text
MAX_WORDS       = 144
MAX_WORD_LENGTH = 34
MAX_CHARS       = 900
~~~

These are application invariants. They must not be silently changed.

---

## 8.2 Five-domain judgment contract

Every result contains:

~~~text
S
T
E
R
C
~~~

Each domain has:

~~~text
status: ok | warn | bad
reason: non-empty string
~~~

Meaning:

~~~text
ok   = منطبق
warn = مبهم
bad  = متناقض
~~~

If the JSON contract changes, update all of:

1. engine validation;
2. adapter contract;
3. renderer;
4. translations;
5. documentation when the public contract changes.

---

# 9. Paragraph Machine Entry Modes

## 9.1 Reference / Equivalence — «هم‌سنگی»

Entry:

~~~text
مرجع تقلید → هم‌سنگی
~~~

Flow:

~~~text
User text
   │
   ▼
translation-bridge.toPersian()
   │
   ▼
ParagraphWorkspaceAdapter.evaluatePersian()
   │
   ▼
Paragraph Machine core
   │
   ▼
five-domain judgment
   │
   ▼
translate result to UI language
   │
   ▼
render
~~~

This path evaluates the supplied text. It must not accidentally switch to generation.

---

## 9.2 Experience / Recognition — «بازشناسی»

Entry:

~~~text
قلمرو تجربه → بازشناسی
~~~

Flow:

~~~text
count + mode
   │
   ▼
generatePersian()
   │
   ▼
Paragraph Machine core
   │
   ▼
generated Persian paragraphs
   │
   ▼
five-domain judgment
   │
   ▼
translate for UI language
   │
   ▼
render cards
~~~

This path generates paragraphs.

---

# 10. LLM Service Boundary

File:

~~~text
services/llm-client.js
~~~

This is the generic model-service boundary for Paragraph Machine.

Current responsibilities:

- OpenAI-compatible /chat/completions;
- HTTPS-only endpoint validation;
- browser-local API-key storage;
- timeout;
- retry handling;
- JSON response parsing;
- model/base URL configuration.

UI code should not call fetch() directly for the model.

Adapters should not implement their own retry logic.

Translation should not create another model client.

---

# 11. Translation Boundary for Paragraph Machine

File:

~~~text
services/translation-bridge.js
~~~

This is the language boundary around the Persian core:

~~~text
UI language
    ⇅
Persian core
~~~

Public operations:

~~~text
toPersian()
fromPersian()
fromPersianBatch()
~~~

The batch contract requires:

~~~text
number of outputs === number of inputs
~~~

Do not change this invariant without updating the UI and validation behavior together.

---

# 12. Standalone Paragraph Machine Page

File:

~~~text
paragraph-machine.html
~~~

This is a separate/legacy standalone tool.

It is not the primary implementation of the shared home-page Paragraph Machine workspace.

Primary architecture:

~~~text
engine/paragraph-engine.js
services/llm-client.js
services/translation-bridge.js
adapters/paragraph-workspace.js
js/paragraph-page.js
~~~

Do not merge standalone-page behavior into the shared workspace merely because the names are similar.

---

# 13. Content Architecture

Important authoritative content modules:

~~~text
content/forgers.js
content/human-machines.js
content/shahnameh-series.js
content/echo-layer3.js
~~~

These modules are data/content sources.

They should not become general-purpose UI controllers.

Large prose should not be copied into:

- js/app.js;
- js/pages.js;
- js/books.js;
- CSS;
- generic translation utilities.

---

# 14. Shahnameh Architecture

Primary page:

~~~text
shahnameh.html
~~~

Controller:

~~~text
js/shahnameh-series-page.js
~~~

Source content:

~~~text
content/shahnameh-series.js
~~~

Shared language runtime:

~~~text
translations/i18n.js
~~~

The page has its own reader/rendering logic but uses the shared language system.

Important rule:

> Fix Shahnameh-specific layout problems in Shahnameh-specific presentation/controller code first. Do not alter the global i18n runtime unless the defect is demonstrably global.

---

# 15. Other Standalone Pages

| Page | Primary purpose |
|---|---|
| observation.html | Observation experience |
| observation-25.html | Observation 25 experience |
| echo-layer3.html | Echo / third-layer experience |
| philosophical-treatise.html | Philosophical treatise |
| shahnameh.html | Shahnameh reading |
| paragraph-machine.html | Standalone Paragraph Machine |

Every standalone page should be treated as an independent surface with explicit dependencies.

Do not assume a script loaded on index.html is available on another page.

---

# 16. Script Loading and Dependency Rules

The home page intentionally loads scripts in dependency order.

Conceptually:

~~~text
i18n
  ↓
content
  ↓
navigation / books
  ↓
paragraph engine
  ↓
LLM service
  ↓
translation bridge
  ↓
workspace adapter
  ↓
paragraph page
  ↓
application controller
~~~

Do not reorder these scripts casually.

If a module depends on another global module, document the dependency or, preferably in a future refactor, replace the implicit dependency with a clearer module boundary.

---

# 17. Global Namespace Policy

The current static architecture exposes several services through window:

~~~text
window.SiteI18n
window.SitePages
window.BookNavigation
window.ParagraphMachineCore
window.ParagraphLLM
window.ParagraphTranslation
window.ParagraphWorkspaceAdapter
window.ParagraphPage
~~~

This is a compatibility mechanism for the no-bundler static site.

### Future rule

Do not add arbitrary new globals.

If a new shared capability is required:

1. determine whether an existing public API can be extended;
2. keep the API small;
3. expose only stable operations;
4. avoid leaking internal state;
5. document the dependency.

A future ES-module migration may reduce this global surface, but it must be a dedicated refactor.

---

# 18. Clean-Code Rules for Future AI Changes

## Rule 1 — Single responsibility

A file should have one dominant reason to change.

Bad:

~~~text
app.js
  + navigation
  + translation
  + model API
  + content dataset
  + paragraph validation
~~~

Good:

~~~text
app.js
pages.js
i18n.js
llm-client.js
paragraph-engine.js
content/*.js
~~~

## Rule 2 — Do not duplicate logic

Before creating a helper, search for an existing implementation.

Especially check:

- language handling;
- page navigation;
- DOM escaping;
- paragraph constraints;
- model calls;
- translation;
- mobile/desktop layout behavior.

## Rule 3 — Keep business rules out of UI

UI code may collect input, call an adapter, render a result, and update presentation state.

UI code should not own philosophical rules or model protocol definitions.

## Rule 4 — Keep services out of content modules

Content modules should not call the LLM, modify navigation, or manipulate page layout.

## Rule 5 — Prefer data-driven rendering

When several UI elements share a structure, prefer arrays/configuration and one rendering function over many nearly identical blocks.

## Rule 6 — Prefer explicit names

Use domain-specific names such as:

~~~text
evaluatePersian()
generatePersian()
fromPersianBatch()
renderEpisodeList()
openParagraph()
~~~

## Rule 7 — Avoid unnecessary abstraction

Do not introduce a framework, state manager, router, utility library, or build system merely because it is theoretically cleaner.

This is a static site. The simplest correct solution is preferred.

## Rule 8 — Do not refactor unrelated code during a bug fix

A UI bug fix should normally touch the affected page, its relevant CSS, and its direct controller. Shared code should change only when the defect is demonstrably shared.

---

# 19. DOM Safety Rules

Prefer:

~~~js
element.textContent = value;
element.replaceChildren(...);
element.setAttribute(...);
~~~

over dynamically assembled HTML whenever possible.

If innerHTML is unavoidable:

- ensure the source is trusted or escaped;
- never interpolate user/model text without escaping;
- document the reason when the operation is non-obvious.

The Paragraph Machine renderer uses an explicit HTML-escaping boundary for model text before inserting generated markup. Preserve that safety boundary.

---

# 20. Navigation Rules

Navigation is intentionally lightweight.

Do not introduce a client-side router unless there is a demonstrated need.

For a new page:

1. create the HTML surface;
2. define its own controller;
3. define its CSS ownership;
4. wire it through the existing navigation boundary if it belongs to the home application;
5. add translation catalog entries;
6. add validation if the page introduces a new contract.

---

# 21. Responsive Design Rules

The project supports:

~~~text
Mobile
Desktop
~~~

Desktop presentation:

~~~text
css/desktop.css
~~~

Mobile presentation:

~~~text
ui/mobile/mobile.css
~~~

Shared layout contracts:

~~~text
ui/shared/layout-spec.css
~~~

### Required testing dimensions

Any layout change should be considered in at least:

- mobile portrait;
- mobile landscape;
- desktop;
- RTL;
- LTR;
- short and long translated labels.

Do not assume English layout proves Persian layout is correct.

Language controls are particularly sensitive to long labels, RTL direction, narrow portrait widths, fixed/absolute positioning, and header title width.

---

# 22. Accessibility Rules

Preserve:

- semantic buttons;
- type="button" where appropriate;
- keyboard activation;
- aria-label;
- aria-pressed;
- aria-live for asynchronous output;
- visible focus styles;
- correct lang and dir.

The home realm SVG uses keyboard activation in addition to pointer interaction.

Do not remove keyboard behavior while changing click behavior.

---

# 23. Security Boundaries

The repository currently applies several browser-side security measures, including:

- Content Security Policy;
- HTTPS-only model endpoints;
- no object/frame embedding;
- restricted browser permissions;
- noopener/noreferrer on external target links;
- local browser storage for the Paragraph Machine API key.

Important limitation:

> A browser-side API key is never equivalent to a server-side secret.

Do not describe local API-key storage as secure secret storage.

Never commit:

- API keys;
- access tokens;
- passwords;
- private credentials;
- provider secrets.

---

# 24. CI / Quality Gate

Current quality workflow:

~~~text
.github/workflows/quality.yml
~~~

It checks:

1. JavaScript syntax with Node;
2. JSON catalog validity;
3. duplicate HTML IDs;
4. missing local HTML assets;
5. inline scripts;
6. inline event handlers.

This is a useful baseline.

It is not a complete linter or formatter.

A future quality improvement may add:

- ESLint;
- Prettier;
- HTML validation;
- CSS linting;
- accessibility checks;
- link checking;
- automated smoke tests.

Add these incrementally.

---

# 25. Deployment

The project is deployed to GitHub Pages.

Current repository state contains two deployment workflow definitions:

~~~text
.github/workflows/deploy.yml
.github/workflows/deploy-pages.yml
~~~

They overlap in purpose.

### Future cleanup recommendation

Consolidate deployment into one workflow after confirming which workflow is authoritative.

This should be a dedicated infrastructure change.

Do not delete one during an unrelated feature fix.

---

# 26. Documentation Duplication

The repository also contains:

~~~text
Structure.txt
~~~

It overlaps significantly with README-level architecture documentation.

Current policy:

- README.md is the primary AI/human engineering handoff.
- Structure.txt should not become a second competing architecture specification.
- If its information becomes obsolete, update or retire it deliberately in a documentation-only change.

---

# 27. Known Clean-Code Debt Register

| Area | Current state | Priority |
|---|---|---|
| Global window.* APIs | Functional compatibility mechanism | Medium |
| style.display page navigation | **Resolved** — semantic page-state classes | ~~Medium~~ |
| style.display used as state detection | **Resolved** — class-based state detection | ~~Medium~~ |
| Large site.css | Monolithic presentation layer | Medium |
| Inconsistent JS formatting | Readability issue | Medium |
| Inline fallback prose in JS | Data/logic mixing | Medium |
| Some innerHTML rendering | Controlled but improvable | Low/Medium |
| Duplicate deployment workflows | **Resolved** — one authoritative Pages workflow | ~~Medium~~ |
| No formatter/linter enforcement | Quality gap | Medium |
| No automated browser smoke tests | Regression risk | Medium |
| Structure.txt overlap | Documentation duplication | Low |

This register is intentionally descriptive.

**Do not attempt all of these cleanups in one change.**

---

# 28. Recommended Refactoring Order

When a future cleanup cycle is explicitly requested, use this order:

### Phase 1 — Documentation and contracts

- keep README accurate;
- document public APIs;
- document page ownership;
- remove contradictory documentation.

### Phase 2 — Formatting consistency

- normalize JavaScript formatting;
- normalize CSS formatting where safe;
- do not change runtime behavior.

### Phase 3 — Navigation state

Replace direct presentation-state coupling:

~~~text
style.display
~~~

with a stable page-state mechanism.

### Phase 4 — CSS architecture

Gradually separate:

~~~text
base
shared components
page-specific
mobile
desktop
~~~

without changing visual behavior.

### Phase 5 — Global namespace reduction

Migrate stable modules toward ES modules if the deployment environment and page structure support it.

### Phase 6 — Automated browser testing

Add smoke tests for:

- language switching;
- page opening/closing;
- book navigation;
- Paragraph Machine modes;
- mobile/desktop visibility.

### Phase 7 — Deployment cleanup

Consolidate overlapping Pages deployment workflows.

---

# 29. AI / ChatGPT Change Protocol

This is the most important section for future AI maintenance.

## Before editing

### Step A — Identify the exact surface

Determine whether the request concerns:

- home;
- one realm;
- book reader;
- Shahnameh;
- observation;
- Paragraph Machine;
- translations;
- mobile;
- desktop;
- deployment;
- documentation.

### Step B — Inspect the owning files

Do not guess.

Trace:

~~~text
HTML
→ controller
→ shared service
→ CSS
→ translation
~~~

only as far as required.

### Step C — Check shared dependencies

Before changing shared files, search for all callers.

Especially before changing:

~~~text
translations/i18n.js
js/pages.js
css/site.css
engine/paragraph-engine.js
services/llm-client.js
~~~

### Step D — Preserve invariants

Check:

- four languages;
- RTL/LTR;
- five realm order;
- Paragraph Machine limits;
- JSON output contract;
- page navigation;
- accessibility;
- mobile and desktop behavior.

---

## During editing

### Prefer the smallest patch

A good AI patch should:

- solve the requested problem;
- preserve unrelated behavior;
- avoid speculative refactoring;
- avoid copying logic;
- avoid changing public contracts unnecessarily.

### Do not rewrite working architecture merely for style

For example, do not convert the static site to React/Vue simply because component architecture would look cleaner.

That would violate the project's deployment simplicity and established architecture.

---

## After editing

Run or verify:

~~~text
JavaScript syntax
JSON validity
HTML structure
local asset references
affected page behavior
language switching
mobile layout
desktop layout
~~~

If the change touches Paragraph Machine, additionally verify:

~~~text
evaluate path
generate path
JSON validation
five-domain judgment
144-word limit
34-character word limit
900-character paragraph limit
translation boundary
~~~

---

# 30. AI Decision Rules

### “Fix this page”

Modify the page-specific implementation first.

### “Fix all pages”

Inspect shared code before duplicating a page-specific fix.

### “Fix language switching”

Start with:

~~~text
translations/i18n.js
~~~

then inspect the affected page's language-change listener and layout.

### “Fix mobile”

Start with:

~~~text
ui/mobile/mobile.css
~~~

and the affected page's own CSS before changing global layout.

### “Fix desktop”

Start with:

~~~text
css/desktop.css
~~~

and shared layout contracts before changing page-specific HTML.

### “Clean the code”

Do not perform a massive rewrite.

Use staged refactoring with explicit boundaries and preserve behavior after each stage.

### “Update translations”

Treat Persian as the authoritative source for primary content and update only the required language catalogs.

---

# 31. What Must Not Be Changed Casually

The following are architectural invariants unless the user explicitly requests a redesign:

~~~text
1. Static GitHub Pages deployment
2. No mandatory build system
3. Four supported languages: fa/en/zh/ar
4. Persian as authoritative primary content language
5. Five-domain order: S/T/E/R/C
6. Paragraph Machine Persian internal processing
7. Paragraph limits: 144 / 34 / 900
8. Shared Paragraph Machine core
9. Shared translation boundary
10. Browser-local model settings
11. Mobile + desktop responsive support
12. Keyboard accessibility
13. Existing page-specific language switching
~~~

---

# 32. Change Scope Discipline

Use these scopes where possible:

~~~text
fix:
feat:
refactor:
style:
docs:
test:
chore:
~~~

Examples:

~~~text
fix: contain language switcher on Shahnameh mobile
fix: align reference realm header
refactor: isolate page visibility state
style: normalize paragraph workspace spacing
docs: update AI maintenance guide
test: validate multilingual page contracts
chore: consolidate Pages deployment workflow
~~~

Avoid vague messages such as:

~~~text
update stuff
fix website
cleanup
changes
~~~

---

# 33. Practical Dependency Map

~~~text
HOME
│
├── js/app.js
│   ├── js/pages.js
│   ├── js/books.js
│   └── translations/i18n.js
│
├── BOOKS
│   ├── js/books.js
│   ├── content/forgers.js
│   ├── content/human-machines.js
│   └── translations/*.json
│
├── PARAGRAPH WORKSPACE
│   ├── js/paragraph-page.js
│   ├── adapters/paragraph-workspace.js
│   ├── engine/paragraph-engine.js
│   ├── services/llm-client.js
│   └── services/translation-bridge.js
│
├── SHAHNAMEH
│   ├── shahnameh.html
│   ├── js/shahnameh-series-page.js
│   ├── content/shahnameh-series.js
│   └── translations/*.json
│
└── PRESENTATION
    ├── css/site.css
    ├── css/desktop.css
    ├── ui/mobile/mobile.css
    ├── ui/shared/layout-spec.css
    └── css/splash.css
~~~

---

# 34. Final Engineering Principle

SmartKazem should evolve as a **small, explicit, understandable browser application**, not as an increasingly complicated framework.

The preferred direction is:

~~~text
clear ownership
      +
small interfaces
      +
stable contracts
      +
data/content separation
      +
shared i18n boundary
      +
isolated processing core
      +
minimal changes
      =
safe AI-assisted maintenance
~~~

When in doubt:

> **Inspect first. Change the smallest responsible layer. Preserve existing behavior. Validate the affected contracts.**

---

## Repository Reference

Canonical repository:

ModernOutlook/smartkazem

Primary branch:

main

Current architecture should always be verified against the actual repository before a future AI change. This README is a guide, **not a substitute for inspecting the current code**.

---

**Modern Outlook — SmartKazem**
