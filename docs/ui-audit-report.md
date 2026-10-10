# SmartKazem UI Audit Report

Date: 2026-10-10
Scope: repository source inspection against the UI Audit & Fix Mission.
Base inspected: `main`.

## Summary

This is a source-level audit, not a completed real-browser/device certification. The repository is static HTML/CSS/JavaScript and declares shared i18n and accessibility boundaries. Several README statements conflict internally, and multiple required runtime checks cannot be proven from source inspection alone.

## Mobile Issues Found

- `ui/mobile/mobile.css` sets a 320px minimum width and hides horizontal overflow on the document. This may suppress visible horizontal scrolling without proving that content or controls fit; check each target width and inspect focusable controls.
- Responsive styles exist for the mobile layer and shared layout contract, but source presence does not verify portrait/landscape behavior at 320, 360, 375, 390, 412, 430, and 768px.
- No browser/device screenshots or automated viewport results were available during this source inspection. Overlap, clipping, touch target reachability, and landscape behavior remain unverified.
- `inventory.html` is a separate utility surface and must be included in the responsive audit.

## RTL/LTR Issues Found

- `translations/i18n.js` declares the supported language set `fa/en/zh/ar`; README defines fa/ar as RTL and en/zh as LTR.
- The shared CSS files inspected use some physical padding declarations in mobile CSS. These may be intentional symmetric padding, but should be reviewed in context before conversion; blind replacement could change layout.
- Repository-wide direction transitions (fa → en → ar → zh → fa) have not been executed in a browser. Header placement, tabs, close/back controls, overlays, inventory, and paragraph workspace are not certified.
- Child HTML inspected declares Persian/RTL as the initial document state. Dynamic `lang`/`dir` synchronization must be verified after language changes on every page.

## Translation Issues Found

- The README’s 13-item content inventory (12 books plus the short story `صفر`) and its 12 secondary-book-page count are compatible when the story is treated separately; this is not by itself a defect.
- The README previously described a standalone legacy Paragraph Machine file despite the actual route structure using only the shared `paragraph-page` workspace in `index.html`. This wording was corrected on the audit branch; both realm entry paths still route to the same workspace.
- Several inspected standalone child HTML files rely on external page controllers/catalog metadata, as intended, but a complete visible-string scan of all pages and all translation JSON catalogs remains outstanding. A concrete Shahnameh counter localization defect was found and fixed on this branch; full four-language review of all page counters and controls is still pending.
- No claim is made that all book translations are complete; README itself records incomplete translation alignment for some reservoirs.

## Accessibility Issues Found

- `audio-engine.js` contains a shared audio/accessibility runtime; `translations/i18n.js` is the shared language runtime. This supports the intended architecture, but does not by itself prove that speech always consumes the currently rendered DOM.
- The dynamic rendering lifecycle for books, paragraph results, language changes, and overlays requires runtime testing for live-region announcements, focus restoration, and speech language.
- Homepage realm navigation uses SVG-based interactive elements. The five realm groups already have button roles, keyboard focus, and arrow/Enter/Space handlers, but their accessible names were hard-coded in Persian. The central core also had a hard-coded Persian accessible name. The page now marks these names for the shared i18n runtime (`data-i18n-aria`) so the names follow the selected language.
- TalkBack/VoiceOver compatibility has not been tested on real devices in this pass.

## Realm Identity Issues Found

- `js/app.js` declares realm order as structure, continuity, experience, reference, share, corresponding to S/T/E/R/C.
- The README specifies the intended identities: S deep petroleum blue, T golden yellow, E cosmic purple, R coral red, C emerald green. A complete computed-style comparison across home, all five realms, and every child page has not been performed.
- No palette rewrite or token extraction was made because duplication and drift must be demonstrated before introducing a new token layer.

## Fixed Issues

- README Paragraph Machine documentation now accurately describes the single shared workspace and no longer claims a separate standalone HTML surface is maintained.
- Minimal accessibility fix: the homepage SVG realm controls and center core now expose localized accessible names through the existing shared i18n runtime; no new translation engine or visual redesign was introduced.
- Shahnameh artwork counter: episode numbers and the total count previously mixed hard-coded Persian digits with active-language episode labels. The counter now formats the episode number, zero-padding character, and total through the existing locale-aware number formatter.
- The README’s page-count language distinguishes 13 content entries (12 books plus the short story `صفر`) from 12 secondary book pages; that count alone is not a contradiction. The Paragraph Machine wording inconsistency identified during the audit has been corrected on this branch: the README now documents `paragraph-page` in `index.html` as the single shared machine surface, with both realm entry paths leading to it.
- This report separates source observations from unverified behavior. The verification checklist is provided separately.

## Remaining Risks

1. Browser/device viewport checks at all required widths, portrait and landscape.
2. Full RTL/LTR transition stress test on all user-facing pages.
3. Complete scan of visible hard-coded UI strings against i18n catalogs.
4. Real keyboard and TalkBack/VoiceOver checks for SVG navigation, overlays, dynamic book rendering, and paragraph workspace.
5. Visual realm color/shadow/glass comparison across all parent and child surfaces.
6. Run repository quality/security workflows on the audit branch and resolve any failures before merging.
7. Reconcile README and `Structure.txt` contradictions only after confirming canonical behavior from actual routes and page controllers.
