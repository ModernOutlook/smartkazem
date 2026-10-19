SmartKazem — REA
SmartKazem — README Logic & Algorithms (Condensed, No Omission)

---

1. Base Rules

Minimal responsible change; inspect owning HTML/controller/content-service/CSS/i18n first; no unrelated refactor; no new framework/router/state manager/build system/dependency without proven need; separation of content / business rules / services / adapters / controllers / presentation; shared-code change ⇒ audit all callers; preserve 4 languages, RTL/LTR, accessibility, responsiveness, and public contracts.

---

2. Content Model

Home → 5 primary realms → secondary levels. Fixed order: S → T → E → R → C.

Exactly 13 secondary pages (12 books + short story "Zero"): philosophical treatise, Shahnameh reading, Emergence Ch. 1, Land of Observation; 25 Times of Arrival, Mirror of Possibles, Emergence Ch. 2, Land of Observation; One River One Flow, Third-Layer Echo, Humans and Their Machines, Imitators of Imitation, The Corruptors, Manifesto of the Chaotic (book) + Zero (story).

Inventory renders from content/page-templates/inventory.fragment in shared runtime; no standalone document.

Card Algorithm (Mandatory)

Any level showing cards ⇒ window.PlayingCardsCatalog from content/playing-cards.js + PlayingCardsCatalog.imagePath(card); identify via catalog ID/rank/suit, never construct paths or separate text cards. Reference: Card Inventory and "Your Hand" in Five Realms. Prohibited: image duplication, parallel mapping, text-card substitution. Preserve: semantic/a11y labels, selection/status indicators, joker identity, responsive ratios. Adding a card level ⇒ audit all callers + verify image load in desktop/portrait/landscape.

Paragraph Machine

Shared workspace inside index.html, not a separate page. Two entry paths: Experience Realm → Recognition → Paragraph Machine, and Simulation → Co-aging → Paragraph Machine. Recognition and Co-aging are two modes of the same workspace.

Gold Gem Charge Algorithm (Gold page)

Single source of rule change: docs/paragraph-machine-philosophical-judgment.md.

Change determining logic only when user changes the judgment guide and it directly affects the generation-and-judgment process/duration.

Prohibited: rule change due to network, model/provider, settings, latency, design, UI, unrelated code.

Runtime observations (cycle duration) are measurement only; not authorization for rule/redesign.

Preserve capacity (0–3600), 72-stage contract, charge behavior, unless guide change directly requires it.

Guide ambiguity ⇒ do not infer; explain and ask user. Guide-README alignment mandatory; silent guide change for justification prohibited. This policy documents authority only; merge only with explicit user approval.

Philosophical Judgment Contract

Spec: docs/paragraph-machine-philosophical-judgment.md; Persian criteria inside engine/paragraph-engine.js = runtime source of truth; keep tests/paragraph-machine.test.js synchronized when changing criteria ID/count.

5 realms evaluated independently; ok/warn/bad = conceptual alignment only, not moral ranking. Judgment model constructs "nobler direction" separately on evidence, relational fit, capacity, avoidable harm, agency, correction, epistemic limits, distribution, feedback effects. Separate moral score claim in UI prohibited unless output contract and presentation are explicitly extended and tested.

Research: docs/paragraph-machine-research-map.md (supplementary, no download at runtime).

Precise Access Contract

Exactly two frontend paths: experience-detect → PageNavigation.openParagraph('experience') and reference-match → PageNavigation.openParagraph('reference'). Only additional programmatic/in-game access: "Question" action in ?page=five-realms-cards (from share economy → current focus → deliberation) calling ParagraphWorkspaceAdapter to generate and independently evaluate a paragraph — without opening/exposing frontend. No new entry point/consumer without explicit need. Game hub: "Experience" → ?page=quantum-maze; "Deliberation" → ?page=five-realms-cards; "Deliberation" (world-continuity realm) → ?page=tadbir.

---

```
/
├── index.html · shared shell: home + books + realms + child pages + inventory + Paragraph Machine
├── js/shared-pages.js · fragment loader, route state, page lifecycle
├── content/page-templates/*.fragment · presentation fragments
├── css/ · site, desktop, splash
├── ui/ · bootstrap, mobile, shared layout
├── js/ · page/app controllers
├── engine/ · domain core
├── services/ · model/translation boundaries
├── adapters/ · orchestration
├── content/ · authoritative datasets
├── translations/ · catalogs + i18n runtime
└── .github/workflows/ · quality/deployment
```

Layer Ownership

HTML: structure, stable IDs, semantic controls, a11y labels, script loading; no inline handler/script.

CSS: presentation only — css/site.css shared/base; css/desktop.css; ui/mobile/mobile.css; ui/shared/layout-spec.css; css/splash.css.

JS: js/app.js home; js/pages.js navigation boundary; js/books.js book nav/render; content/*.js datasets; services/* external boundary; adapters/* orchestration; engine/* DOM-independent rules.

i18n Algorithm

fa RTL, en LTR, zh LTR, ar RTL. Runtime: translations/i18n.js → window.SiteI18n.

Responsibilities: validate/persist language, load catalog, data-i18n, lang/dir, active-language state, site:languagechange.

Rules: no per-page translation engine; no Persian copy in catalog for fa; Persian primary from source, EN/AR/ZH from translation catalog; language-sensitive modules may subscribe.

Realms Algorithm

S Hall Structure · T World Continuity · E Experience Realm · R Simulation · C Share Economy. S/T/E/R/C order invariant; child-page order same as explicit realm navigation; before change: audit navigation, translations, Paragraph Machine, docs. Never build temporal/legacy-vs-new ordering rule based on code/file dates.

Original JPEG Integrity

PR #163 JPEGs byte-for-byte untouched. Dimensions/bytes from stream; SHA-256 from decoded bytes.

Paragraph Machine Algorithm

Architecture: UI → js/paragraph-page.js → adapters/paragraph-workspace.js → engine/paragraph-engine.js. Adapter also uses services/llm-client.js and services/translation-bridge.js. Engine DOM-independent.

Hard limits: MAX_WORDS=144, MAX_WORD_LENGTH=34, MAX_CHARS=900.

Judgment (per paragraph): judgment S/T/E/R/C each with status: ok|warn|bad + non-empty reason (alignment with explicit principles only); separate normative axis S/T/E/R/C with direction: nobler|harmful|mixed|indeterminate, non-empty rationale, textual evidence. Normative axis qualitative/contextual; never converted to number/percentage/total/average/unified ranking. ok=aligned, warn=ambiguous, bad=contradictory; not moral ranks. UI shows normative direction separately with rationale/evidence; never treat three-state status as moral judgment.

Entry modes: Co-aging: user original text → criteria translated to same language → independent judgment → UI (user paragraph never translated as preprocessing). Recognition: generation in selected language → independent judgment with same-language criteria → compare with user's 5 selections. Paths separate; evaluation must not become generation.

Translation bridge: toPersian(), fromPersian(), fromPersianBatch(); batch cardinality: input count = output count. llm-client.js = model-service boundary; UI must not call API directly; adapters must not duplicate retry.

paragraph-page in index.html is the only shared machine surface — not a book, not a second machine. No separate HTML.

AI Change Algorithm

Before: exact level; owning files; callers before changing shared module; affected contract/invariant; actual current code.

During: smallest patch; reuse existing API/helper; business rule outside UI, service outside content module; data-driven rendering; textContent/replaceChildren/explicit DOM API over unsafe injected HTML; preserve escaping/safety for user/model text; no speculative abstraction.

After: optional verification (JS/JSON/HTML check beyond gate, browser test, language change, navigation, mobile/desktop, RTL/LTR, a11y) only on explicit user request; quality/security is the only automated suite; presentation-only change in CSS.

Verify selector landing in portrait/landscape and RTL/LTR; confirm child pages inherit language without their own control. In every viewport and 4 languages: selector fully visible, no intersection with header. Paragraph Machine: evaluation/generation path, S/T/E/R/C judgment, 144/34/900 limits, translation boundary, batch cardinality.

Decision Rules

Fix this page → page code first. Fix all → audit shared before repeating fix. Fix language → translations/i18n.js then listener/layout. Fix mobile → ui/mobile/mobile.css + page CSS. Fix desktop → css/desktop.css + shared layout. Update translations → Persian canonical source first, then only requested target catalog. Clean code → staged refactor preserving behavior at each step.

Invariants

1. Static GitHub Pages architecture. 2. No mandatory build. 3. Four languages fa/en/zh/ar. 4. Persian primary content authoritative. 5. S/T/E/R/C order. 6. Paragraph Machine: Persian criteria source immutable; judgment in primary/selected language. 7. Limits 144/34/900. 8. Shared core/service boundary. 9. Shared i18n boundary. 10. Mobile+desktop. 11. Keyboard a11y. 12. Per-page language switching present. 13. Ownership Persian-source → translation-source. 14. Talk Back from same selected-language content.

Commit Vocabulary

Unified Visual Family System

5 realms = one composition from outer black perimeter to white center: S dark petroleum blue; T matte golden yellow; E cosmic purple; R dark coral red; C emerald green. Order invariant and part of visual identity. A page inherits dominant color family from its realm and builds its visual language from parent realm motifs — related, not identical.

Rules: shared grammar (restrained header, glass-like controls, soft depth, subtle border, controlled glow, strong negative space, shared motion language); preserve parent color/atmosphere; reuse + interpret motifs, not scene copy; hierarchy: atmosphere → title/nav → content surface → actions; Reference with architectural/concentric vocabulary from coral-red (not reduced to legacy); Paragraph Machine deliberately exceptional (functional workspace, stronger language allowed); Shahnameh flagship level — image-centric composition is not baseline for all; visual refinement must not change navigation/state/content/i18n/a11y semantics/service boundary/business rule.

Maintenance: inspect owning page + parent realm; prefer presentation-only CSS when structure/behavior suffices; new motif belongs to realm family, not unrelated sixth language.

a11y for blind users = shared runtime service, not per-page content implementation.

Core invariant: Persian source → translation reservoir → SiteI18n → rendered lo[g]
