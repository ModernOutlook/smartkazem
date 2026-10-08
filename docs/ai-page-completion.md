# AI Page Completion Protocol

This document defines the repeatable workflow for completing a user-facing content page from its authoritative Persian source, its translation reservoir, and the accessibility contract.

## 1. Machine-detectable page package

Each completed long-form page should have a manifest under `page-specs/<page>.json` using schema `page-completion/v1`.

Required relationships:

```text
Persian source
  ↓
translation reservoir (EN / AR / ZH)
  ↓
page runtime + shared i18n
  ↓
accessibility derived from both content structures
  ↓
verification
```

The Persian source is authoritative. Translation files are derived from Persian and must not become a second source of truth.

## 2. What ChatGPT should request

When the user asks to complete a new page using this system, first inspect the repository. Only ask for inputs that are genuinely missing.

The minimum input set is:

1. **Page identity**
   - page name / slug
   - visible Persian title
2. **Persian source**
   - canonical content file/path, or the Persian content itself
   - episode/item count if not inferable
3. **Translation reservoir**
   - target languages
   - translation file/path if one exists
   - otherwise the instruction to create it from Persian
4. **Page runtime**
   - HTML/page path if it already exists
   - otherwise create the page using the repository's existing page architecture
5. **Accessibility intent**
   - any page-specific interaction or special requirement

Do not ask the user to repeat information already discoverable in the repository.

## 3. Standard completion algorithm

### Phase A — inspect

Identify:

- authoritative Persian source
- translation reservoir
- page HTML
- page controller/content renderer
- shared i18n boundary
- relevant CSS/mobile layout
- existing accessibility patterns
- existing `page-specs/*.json` manifest

Search callers before changing shared modules.

### Phase B — reconcile Persian source

Treat Persian as canonical.

Check:

- item/episode sequence
- titles
- paragraph structure
- source cardinality
- empty or placeholder entries
- accidental offsets between source and translation sequence

Never silently rewrite or summarize the Persian source.

### Phase C — complete translation reservoir

For every source item, maintain matching EN/AR/ZH structure.

Rules:

- translate from Persian, never from another target language
- preserve meaning, narrative information, paragraph boundaries, and style
- do not shorten content merely to make it easier to translate
- keep item numbering aligned exactly with Persian
- do not invent missing source content
- verify no target entry is empty unless the Persian source itself is intentionally empty

For page UI strings, use the same translation reservoir rather than creating duplicate page-local language buttons or ad-hoc translation logic.

### Phase D — derive the accessibility layer

Accessibility is derived from the actual Persian/translation content model and the page interaction model.

At minimum, check:

- semantic landmarks and headings
- native buttons/links for interactive controls
- meaningful accessible names for every control
- `aria-current` or equivalent state for the active item
- explicit previous/next accessible names
- visible keyboard focus
- correct `lang` and `dir` after language changes
- live-region behavior for dynamically replaced reading content
- reduced-motion behavior
- no duplicated language selectors
- long translated labels at mobile widths
- RTL and LTR layout integrity

Do not add ARIA where native HTML semantics already provide the correct behavior.

### Phase E — verify

Run the repository quality gate.

Then verify the affected surface across:

- keyboard-only navigation
- screen-reader interaction
- desktop
- mobile portrait
- mobile landscape
- RTL
- LTR
- language switching
- previous/next and item selection
- dynamic content announcement

Automated checks are necessary but do not by themselves prove WCAG conformance or real screen-reader usability.

## 4. Definition of done

A page is considered complete only when all applicable layers agree:

| Layer | Required result |
|---|---|
| Persian source | authoritative, ordered, complete |
| Translation reservoir | EN/AR/ZH aligned to Persian |
| Runtime i18n | one shared language boundary |
| Page UI | no duplicate language mechanism |
| Accessibility | semantic, keyboard, screen-reader, focus, motion, RTL/LTR |
| Responsive | desktop + portrait + landscape |
| Manifest | `page-specs/<page>.json` describes the relationships |
| Quality gate | passing |
| Browser/screen-reader | actually tested when the environment provides that capability |

## 5. How future work should be recognized

If a repository contains:

- `content/<page>.js` (or another declared Persian source),
- `translations/<page>.json`,
- a page HTML/runtime,
- and `page-specs/<page>.json`,

then ChatGPT should recognize the page as a **page-completion package**.

For a new package, ChatGPT should:

1. inspect the source and existing translation structure;
2. determine missing inputs rather than asking for everything;
3. reconcile source and translations;
4. complete the translation reservoir from Persian;
5. derive/complete accessibility from the resulting content and interaction model;
6. run the quality gate;
7. perform real browser/screen-reader verification when available;
8. report any verification that could not actually be performed instead of claiming it was done.

## 6. Current reference implementation

`emergence` is the reference implementation of this protocol:

- Persian source: `content/emergence.js`
- translation reservoir: `translations/emergence.json`
- runtime: `emergence.html` + `translations/i18n.js`
- manifest: `page-specs/emergence.json`

Use it as the pattern for future pages, while still inspecting the target page rather than copying blindly.


## 7. Permanent accessibility rule for future content

The accessibility layer is derived at runtime from the rendered localized DOM. It is not a third content repository.

The permanent pipeline is:

`Persian source → EN/AR/ZH translation reservoir → SiteI18n → localized DOM → shared Talk Back`

### Consequence

When a new chapter, episode, paragraph, article, title, button label, or other content item is added:

1. update the authoritative Persian source;
2. complete the corresponding EN/AR/ZH translation entries;
3. render the content through the existing page/i18n boundary;
4. the shared accessibility runtime automatically discovers and reads the new content.

**No separate accessibility-content update is required.**

### Shared runtime responsibilities

The shared accessibility runtime must remain content-agnostic. It derives:

- accessible names from semantic HTML and language-aware i18n labels;
- navigation targets from the live DOM;
- long-form reading text from the currently visible active-language content;
- speech language from the current site language;
- navigation announcements from current control state;
- dynamic navigation updates from DOM mutations;
- language updates from `site:languagechange`.

A new page should therefore not add a custom Talk Back reader merely because it contains new prose.

### When a page-specific accessibility change is legitimate

Only add page-specific accessibility behavior when the interaction model is genuinely new and cannot be expressed through existing semantic HTML/shared runtime behavior.

Examples include a new custom interaction pattern, a new gesture, or a specialized non-standard reading/navigation mechanism.

New content alone is never a reason to modify the shared accessibility engine.

### Future-page completion decision rule

For every future page, ChatGPT should ask:

> **Is this a content change or an interaction-model change?**

- **Content change:** update Persian → translations → runtime; accessibility follows automatically.
- **Interaction-model change:** inspect the shared accessibility contract first; extend the shared runtime only if necessary, then verify all existing pages/callers.

This rule is mandatory for future page completion.
