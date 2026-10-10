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
- [ ] Verify translated visible labels, aria-labels, placeholders, tabs, controls, headers, close/back buttons, and live regions.
- [ ] Repeat language transitions on home, all five realms, every child page, inventory, book readers, and Paragraph Machine.

## Keyboard and assistive technology
- [ ] Homepage SVG realm selector: semantic role/name, focusability, Enter/Space activation, and selected-state announcement.
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
- [ ] Run JavaScript syntax and JSON validation.
- [ ] Run duplicate HTML ID and missing local asset checks.
- [ ] Run inline-script/event-handler and document-language checks.
- [ ] Run four-language control contract checks on all user-facing HTML files.
- [ ] Run security workflow checks.
- [ ] Record browser/device, viewport, language, and result for each manual test.
