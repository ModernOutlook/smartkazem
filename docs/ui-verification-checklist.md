# SmartKazem UI Verification Checklist

Status legend: `[x]` source declaration inspected; `[ ]` runtime/manual verification still required.

## Desktop
- [ ] At 1024px and wider: no clipped content or controls.
- [ ] Language selector remains visible and operable on every page.
- [ ] Header, close/back actions, dialogs, and overlays remain in viewport.
- [ ] Keyboard tab order follows visible reading/navigation order.
- [ ] Visible focus indicators remain clear.

## Mobile portrait
- [ ] 320px
- [ ] 360px
- [ ] 375px
- [ ] 390px
- [ ] 412px
- [ ] 430px
- [ ] No horizontal overflow, clipped controls, or overlapping interactive targets.
- [ ] All targets are reachable by touch and keyboard/accessibility focus.

## Tablet and mobile landscape
- [ ] 768px viewport
- [ ] Phone landscape at short viewport heights
- [ ] Safe-area insets and language selector do not cover page content.
- [ ] Dialogs and long book content remain scrollable within the intended region.

## Language and direction
- [ ] fa: `lang=fa`, `dir=rtl`
- [ ] en: `lang=en`, `dir=ltr`
- [ ] ar: `lang=ar`, `dir=rtl`
- [ ] zh: `lang=zh`, `dir=ltr`
- [ ] fa → en
- [ ] en → ar
- [ ] ar → zh
- [ ] zh → fa
- [x] Source scan: the Persian base catalog's shared label keys now have matching key coverage in en/ar/zh; missing shared UI labels were translated.
- [x] Source fixes: inventory shell/group/card labels, Echo Layer Three navigation labels, Shahnameh search naming, and Emergence II episode numerals/fallback text now respond to the selected language.
- [x] Source fix: home, Observation 25, Observation, and Possible Mirror language-selector accessible names now use a localized shared label.
- [x] Source scan: primary pages, realm panels, book panel/tabs, logo dialog, and chapter/section navigation now use localized accessible-name keys; no static Persian `aria-label` without a localization hook remains in the 12 inspected HTML files.
- [x] Source fixes: Observation reader and Philosophical Treatise content now use LTR for Chinese and preserve RTL for Arabic.
- [ ] Verify translated visible labels, aria-labels, placeholders, tabs, controls, headers, close/back buttons, and live regions.
- [ ] Repeat language transitions on home, all five realms, every child page, inventory, book readers, and Paragraph Machine.

## Keyboard and assistive technology
- [x] Source inspected: homepage SVG realm groups have button roles, focusability, arrow-key navigation, and Enter/Space activation; accessible names now use the shared i18n runtime.
- [x] Source inspection found and corrected an early-return bug that made the global home arrow/Enter handler unreachable; it now runs only on the home page and avoids duplicating SVG-control key handling.
- [ ] Browser/screen-reader verification of realm selection and selected-state announcement.
- [ ] Keyboard-only navigation through every primary and child surface.
- [ ] Dialog/overlay focus entry, containment where appropriate, Escape handling, and focus restoration.
- [ ] Test TalkBack on Android and VoiceOver-compatible behavior with an appropriate screen reader.
- [ ] Speech language matches current selected language.
- [ ] Accessibility reads rendered content rather than a duplicated page-specific content store.
- [ ] Dynamic book rendering and paragraph results are announced without stale or duplicate speech.

## Books and Paragraph Machine
- [ ] Every book loads canonical Persian source for fa and its declared translation reservoir for en/ar/zh.
- [ ] Verify chapter/episode counts, order, and paragraph boundaries.
- [ ] Verify tabs, next/back/close navigation, and return-focus behavior.
- [ ] Verify Paragraph Machine recognition and equivalence entry paths retain distinct behavior while using shared logic.
- [ ] Verify errors and results are accessible and localized.

## Realm navigation and visual identity
- [ ] Realm order remains S/T/E/R/C.
- [ ] Home, all five realms, and child pages retain the appropriate parent realm identity.
- [ ] Check palette, borders, shadows, glass treatment, focus, and contrast.
- [ ] Verify return from each child surface to the exact originating realm.

## Automated checks
- [x] JavaScript syntax and JSON catalog validation passed on the latest runtime/UI-fix commit (`0841908d44bc8ffb9049e3b2fb17d010d6113aaf`); later commits only updated audit documentation.
- [x] HTML structure and local asset checks passed on the latest runtime/UI-fix commit (`0841908d44bc8ffb9049e3b2fb17d010d6113aaf`); later commits only updated audit documentation.
- [x] Semantic page-state usage check passed on the latest runtime/UI-fix commit (`0841908d44bc8ffb9049e3b2fb17d010d6113aaf`); later commits only updated audit documentation.
- [ ] Complete an exhaustive four-language control/visible-string audit across every user-facing HTML file; the source scan found and fixed several concrete defects, but this does not yet cover every rendered label or long-form translation.
- [x] Security gate passed on the latest runtime/UI-fix commit (`0841908d44bc8ffb9049e3b2fb17d010d6113aaf`); later commits only updated audit documentation.
- [ ] Record browser/device, viewport, language, and result for each manual test.
