# SmartKazem — AI Architecture & Behavior Guide

> Repository: `ModernOutlook/smartkazem` · GitHub Pages · browser-native HTML/CSS/JavaScript · no framework/build step  
> Languages: `fa`, `en`, `zh`, `ar`

This README is the maintenance contract for humans and AI agents. It explains **where behavior lives, how modules communicate, which state is authoritative, and what must remain invariant**.

## 1. Core rule

> **Change the module that already owns the behavior. Preserve its contracts with neighboring modules.**

Do not fix local problems by duplicating services, moving business logic into HTML/CSS, bypassing adapters, or creating a second state/translation system. Prefer small, reversible patches.

---

# 2. Basic modular network

```text
HTML pages
   │
   ▼
Page / UI controllers
   ├──► SiteI18n ─────────► translation catalogs
   ├──► content modules ──► authoritative Persian content
   └──► Paragraph workspace
             │
             ▼
          adapter
           ├──► engine
           ├──► LLM service
           └──► translation bridge

Presentation is parallel:
css/site.css
 ├── css/desktop.css
 ├── ui/mobile/mobile.css
 └── ui/shared/layout-spec.css
        ▲
   ui/bootstrap.js
```

### Dependency direction

```text
HTML → controllers → adapters/services/engine
HTML → SiteI18n → catalogs
content → page/book renderers
```

The engine must not depend on the DOM. The generic model client must not know about a particular page.

---

# 3. Repository map

```text
/
├── index.html
├── shahnameh.html
├── observation.html
├── observation-25.html
├── possible-mirror.html
├── echo-layer3.html
├── emergence.html
├── philosophical-treatise.html
├── paragraph-machine.html
├── css/
│   ├── site.css
│   ├── desktop.css
│   ├── audio.css
│   ├── paragraph-connection.css
│   └── splash.css
├── ui/
│   ├── bootstrap.js
│   ├── mobile/mobile.css
│   └── shared/layout-spec.css
├── js/
│   ├── app.js
│   ├── pages.js
│   ├── books.js
│   ├── reading-page.js
│   ├── paragraph-page.js
│   ├── paragraph-connection.js
│   ├── shahnameh-series-page.js
│   ├── observation25-page.js
│   ├── possible-mirror-page.js
│   └── splash.js
├── engine/paragraph-engine.js
├── services/
│   ├── llm-client.js
│   └── translation-bridge.js
├── adapters/paragraph-workspace.js
├── content/
├── translations/
│   ├── fa.json
│   ├── en.json
│   ├── zh.json
│   ├── ar.json
│   ├── observation.json
│   └── i18n.js
└── .github/workflows/
    ├── quality.yml
    └── deploy.yml
```

Assets/media are not application logic.

---

# 4. Main page state network

The main application lives in `index.html`. Main states are:

```text
home
├── share
├── experience
├── continuity
├── structure
├── reference
├── book
└── paragraph
```

Owner: `js/pages.js` → `window.SitePages`.

Important API:

```text
IDS
showPage()
returnHome()
open/closeShare()
open/closeExperience()
open/closeContinuity()
open/closeStructure()
open/closeReference()
open/closeParagraph(kind)
setHomeController()
```

Paragraph origin is intentional:

```text
experience → paragraph → close → experience
reference  → paragraph → close → reference
```

Do not change this to unconditional home navigation.

Visibility uses semantic classes such as `.is-active`; application JS must not use direct `.style.display` manipulation.

---

# 5. Home controller and five realms

Owner: `js/app.js`.

It owns realm selection, selected-realm information, keyboard/Escape behavior, logo viewer, home-level opening actions, and language-change reactions. It delegates navigation to `SitePages` and books to `BookNavigation`.

Canonical realm order:

```text
S → T → E → R → C

S = ساختار تالار
T = تداوم عالم
E = قلمرو تجربه
R = مرجع تقلید
C = اقتصاد سهم
```

These identifiers are shared with Paragraph Machine. Do not rename/reorder them casually.

---

# 6. Content ownership

The `content/` layer owns authoritative data/content, including:

- `content/forgers.js`
- `content/human-machines.js`
- `content/shahnameh-series.js`

Rule:

> Controllers decide **how** content is displayed; content modules define **what** it is.

Do not move long authoritative Persian text into generic controllers.

---

# 7. Internationalization network

Supported languages:

| Code | Language | Direction |
|---|---|---|
| `fa` | Persian | RTL |
| `en` | English | LTR |
| `zh` | Chinese | LTR |
| `ar` | Arabic | RTL |

Owner: `translations/i18n.js` → `window.SiteI18n`.

It owns language validation, catalog loading, persistence, `data-i18n` rendering, document `lang/dir`, active language controls, and the event:

```text
site:languagechange
```

Flow:

```text
language control
  ↓
SiteI18n.setLanguage()
  ↓
translations/<lang>.json
  ↓
DOM lang/dir + data-i18n
  ↓
site:languagechange
  ↓
language-aware modules rerender
```

### Persian is the authoritative content language

```text
Persian source
 ├── fa → direct source
 ├── en → translated catalog
 ├── zh → translated catalog
 └── ar → translated catalog
```

Never route authoritative Persian through Persian→Persian translation. Do not duplicate large source datasets into `fa.json`.

---

# 8. Books and secondary pages

`js/books.js` owns the shared main-page book workspace: selection, tabs/chapters, source/translation display and closing.

Shahnameh is a separate page:

```text
shahnameh.html
  ↓
js/shahnameh-series-page.js
  ↓
content/shahnameh-series.js
  ↓
SiteI18n / catalogs
```

Other independent pages include:

```text
observation.html
observation-25.html
possible-mirror.html
echo-layer3.html
emergence.html
philosophical-treatise.html
paragraph-machine.html
```

Page-specific modules should own page-specific interaction. Do not move unrelated secondary-page behavior into `app.js`.

---

# 9. Presentation architecture

```text
css/site.css
 ├── css/desktop.css
 ├── ui/mobile/mobile.css
 └── ui/shared/layout-spec.css

ui/bootstrap.js
 └── document.documentElement.dataset.presentation
       mobile | desktop
```

Current breakpoint contract:

```text
≤ 1023px → mobile
≥ 1024px → desktop
```

Mobile and desktop share **the same behavior/state/content/services**. Only presentation changes.

For responsive fixes:

1. decide whether the rule is shared/mobile/desktop;
2. preserve the same interaction semantics;
3. test RTL/LTR;
4. test mobile portrait when relevant;
5. avoid global page-specific overrides.

---

# 10. Paragraph Machine network

```text
js/paragraph-page.js
        │
        ▼
adapters/paragraph-workspace.js
        ├────────► services/llm-client.js
        └────────► engine/paragraph-engine.js

services/translation-bridge.js
        ⇅
Persian processing core
```

## Engine — `engine/paragraph-engine.js`

Public runtime: `window.ParagraphMachineCore`.

Owns theory/rules, S/T/E/R/C definitions, statuses, generation modes, prompt construction, validation and text processing.

Hard limits:

```text
144 words / paragraph
34 characters / word
900 characters / paragraph
```

These are runtime invariants, not merely prompt instructions.

### Judgment contract

Every paragraph has exactly:

```text
S, T, E, R, C
```

Each has:

```text
status: ok | warn | bad
reason: non-empty string
```

Meaning:

```text
ok   = منطبق
warn = مبهم
bad  = متناقض
```

If this contract changes, update validator, adapter, renderer and dependent translations together.

---

# 11. Paragraph Machine entry modes

The same workspace deliberately has two behaviors.

## «هم‌سنگی» — reference

```text
reference realm
  ↓
SitePages.openParagraph('reference')
  ↓
ParagraphPage.open('reference')
  ↓
user text
  ↓
ParagraphTranslation.toPersian()
  ↓
ParagraphWorkspaceAdapter.evaluatePersian()
  ↓
core + LLM
  ↓
S/T/E/R/C judgment
  ↓
ParagraphTranslation.fromPersian()
  ↓
UI
```

The model is instructed to evaluate the supplied text, not generate a replacement.

## «بازشناسی» — experience

```text
experience realm
  ↓
SitePages.openParagraph('experience')
  ↓
ParagraphPage.open('experience')
  ↓
count + mode
  ↓
ParagraphWorkspaceAdapter.generatePersian()
  ↓
core + LLM
  ↓
Persian paragraphs + judgment
  ↓
ParagraphTranslation.fromPersianBatch()
  ↓
UI cards
```

These modes share infrastructure but must remain behaviorally distinct.

---

# 12. Paragraph connection and model service

### Connection UI

File: `js/paragraph-connection.js`  
Runtime: `window.ParagraphConnection`

Owns the connection-settings UI and delegates transport to `ParagraphLLM`.

### Model service

File: `services/llm-client.js`  
Runtime: `window.ParagraphLLM`

Owns:

- OpenAI-compatible `/chat/completions`;
- HTTPS validation;
- direct/proxy transport;
- runtime API-key handling;
- base URL/model persistence;
- connection checks;
- timeout/retry;
- JSON parsing.

Current transport contract:

```text
timeout: 30s
max attempts: 3
retryable: 408, 425, 429, 500, 502, 503, 504
```

UI modules must not implement another model transport.

---

# 13. Paragraph translation bridge

File: `services/translation-bridge.js`  
Runtime: `window.ParagraphTranslation`

API:

```text
toPersian()
fromPersian()
fromPersianBatch()
```

Language boundary:

```text
site language ⇅ Persian core
```

Batch invariant:

```text
output count === input count
```

For Persian output, translation should be bypassed.

---

# 14. Paragraph workspace adapter

File: `adapters/paragraph-workspace.js`  
Runtime: `window.ParagraphWorkspaceAdapter`

API:

```text
evaluatePersian(text)
generatePersian(count, mode)
```

This is the UI-to-core boundary. The UI should not construct Paragraph Machine prompts or call the model directly.

---

# 15. Shared events

| Event | Owner | Purpose |
|---|---|---|
| `site:languagechange` | `SiteI18n` | notify language-aware modules |
| `paragraph:settings-sync` | Paragraph connection/workspace | synchronize connection settings UI |

When adding a cross-module event, document its emitter, payload, source of truth and consumers.

---

# 16. State ownership matrix

| State/behavior | Owner |
|---|---|
| Language | `translations/i18n.js` |
| Main page navigation | `js/pages.js` |
| Home realm selection/info | `js/app.js` |
| Book data | `content/*.js` |
| Book navigation | `js/books.js` |
| Paragraph theory/validation | `engine/paragraph-engine.js` |
| Model/network | `services/llm-client.js` |
| Paragraph translation | `services/translation-bridge.js` |
| UI ↔ Paragraph core | `adapters/paragraph-workspace.js` |
| Paragraph UI | `js/paragraph-page.js` |
| Connection UI | `js/paragraph-connection.js` |
| Presentation mode | `ui/bootstrap.js` + CSS |

If a change belongs to one of these domains, start with its owner.

---

# 17. Clean-code boundaries

The repository is modular but not a claim of perfect Clean Code.

Known debt includes:

- historical `window.*` contracts;
- large CSS modules;
- some DOM rendering with `innerHTML`;
- page controllers coupled to stable DOM IDs;
- older formatting differences;
- standalone/legacy page implementations.

These are refactoring opportunities. Do not perform broad refactors during unrelated bug fixes.

The project intentionally remains browser-native; a framework migration is not required.

---

# 18. HTML/CSS/JS rules

Prefer:

```text
HTML = structure
CSS  = presentation
JS   = behavior
```

Do not add:

- inline handlers such as `onclick=`;
- arbitrary inline `style=`;
- direct `.style.display` application logic;
- duplicate translation systems;
- duplicate model clients;
- duplicate Paragraph Machine engines.

Use semantic state classes/data attributes where possible.

---

# 19. Safe AI workflow

### 1. Identify ownership
Which existing module owns the behavior?

### 2. Trace dependencies
Follow the smallest relevant chain:

```text
HTML → controller → adapter/service/engine → content/catalog
```

### 3. Inspect consumers
Before changing a public function, DOM ID/class, translation key, JSON contract or event, find its consumers.

### 4. Patch minimally
Do not combine unrelated cleanup with the requested change.

### 5. Preserve invariants
Especially:

- S/T/E/R/C order;
- 144/34/900 Paragraph Machine limits;
- Persian processing core;
- translation batch cardinality;
- Paragraph origin navigation;
- language persistence;
- responsive semantics.

### 6. Validate
Run the existing quality gate and manually test the affected behavior.

---

# 20. Common anti-patterns

| Avoid | Use instead |
|---|---|
| UI → `fetch()` to model | UI → adapter → `ParagraphLLM` |
| page-specific translation system | `SiteI18n` / `ParagraphTranslation` |
| Paragraph theory in UI | `paragraph-engine.js` |
| Persian → translator → Persian | direct authoritative Persian source |
| JS used to reposition UI | correct CSS layer |
| broad refactor for local bug | ownership-aligned small patch |

---

# 21. Quality and deployment

Quality workflow: `.github/workflows/quality.yml`.

It validates:

- JavaScript syntax;
- JSON catalogs;
- semantic page-state usage;
- duplicate HTML IDs;
- local asset references;
- inline scripts;
- inline event handlers.

Deployment: `.github/workflows/deploy.yml`.

The site is deployed as a static GitHub Pages artifact.

Do not alter deployment configuration during ordinary UI/content work.

---

# 22. Change matrix

| Request | Start here |
|---|---|
| Home realm behavior | `js/app.js` |
| Main page open/close | `js/pages.js` |
| Language runtime | `translations/i18n.js` |
| Translation catalogs | `translations/*.json` |
| Persian book content | `content/*.js` |
| Book navigation | `js/books.js` |
| Shahnameh | `js/shahnameh-series-page.js` |
| Paragraph UI | `js/paragraph-page.js` |
| Connection UI | `js/paragraph-connection.js` |
| Paragraph rules/validation | `engine/paragraph-engine.js` |
| Model/API transport | `services/llm-client.js` |
| Paragraph translation | `services/translation-bridge.js` |
| UI ↔ core boundary | `adapters/paragraph-workspace.js` |
| Mobile layout | `ui/mobile/mobile.css` |
| Desktop layout | `css/desktop.css` |
| Shared layout | `ui/shared/layout-spec.css` |
| General styling | `css/site.css` |
| Possible Mirror | `js/possible-mirror-page.js` |
| Observation-25 | `js/observation25-page.js` |
| Audio | `site-audio.js` / `css/audio.css` |

---

# 23. Final AI contract

Before modifying SmartKazem, preserve these facts:

1. It is a static browser application.
2. HTML owns structure; CSS owns presentation; JavaScript owns behavior.
3. Main navigation is owned by `SitePages`.
4. Home realm behavior is owned by `app.js`.
5. Language state is owned by `SiteI18n`.
6. Persian is authoritative for primary philosophical content.
7. Paragraph Machine processes Persian internally.
8. Paragraph Machine has exactly S/T/E/R/C.
9. Model calls go through `ParagraphLLM`.
10. Paragraph UI reaches the core through `ParagraphWorkspaceAdapter`.
11. Paragraph translation goes through `ParagraphTranslation`.
12. Hard limits remain 144 words, 34 characters/word and 900 characters.
13. «هم‌سنگی» and «بازشناسی» remain distinct.
14. Closing Paragraph Machine returns to its recorded origin realm.
15. Mobile and desktop share behavior; only presentation differs.
16. Do not introduce direct `.style.display`, inline handlers or duplicate service logic.
17. Prefer small ownership-aligned patches.
18. Update this README when architecture/contracts materially change.

The goal is to make the next AI able to understand **where a behavior lives, what it depends on, what it may change, and what must not be broken**.

**SmartKazem — Modern Outlook**
