# Content tab navigation audit

Branch: `feat/unified-content-section-tabs`

## Scope and inventory

| Page | Existing canonical divisions | Navigation treatment |
|---|---|---|
| رساله فلسفی | Preface, five realm sections, postscript | Seven numbered tabs; only the selected block range is visible |
| شاهنامه‌خوانی | 81 episodes plus artwork | Explicitly excluded; preserve its existing reader/artwork controls |
| فصل اول ظهور | 19 episodes | Numbered tabs with localized episode names |
| سرزمین مشاهده؛ ۲۵ بار رسیدن | 25 sections | Numbered tabs with localized section names |
| آینه‌ی ممکن‌ها | 31 sections | Numbered tabs with localized section names |
| فصل دوم ظهور | 11 episodes (source numbering 20–30) | Numbered tabs with localized episode names |
| سرزمین مشاهده؛ یک رود، یک جریان | One continuous text, 12 source paragraphs | One numbered tab for the whole work; no invented divisions |
| پژواک لایه سوم | Chapter/part structure | Numbered chapter and part tabs |
| انسان و ماشین‌هایش | Canonical book chapters | Shared numbered book tabs |
| جاعلان تقلید | Canonical book chapters | Shared numbered book tabs |
| تباهیان | Three canonical chapters | Shared numbered book tabs |
| مانیفست آشوب‌زده | 11 parts | Numbered tabs with localized part names |
| صفر | One continuous short story | One numbered tab for the whole story; no invented divisions |

The Paragraph Machine, games, inventory, and utility panels are not literary content pages and are outside this navigation rule.

## Interaction invariants

1. Every multi-section tab label contains a locale-formatted number and the canonical localized title.
2. Selecting a tab changes the active content only; the page/document scroll position is not modified.
3. No section-selection handler calls `scrollIntoView`, resets a reading panel's `scrollTop`, or focuses the reading panel with scrolling enabled.
4. Keyboard navigation updates the active tab and uses `focus({ preventScroll: true })`.
5. Tab, tablist, and tabpanel semantics include selected state, roving tabindex, and explicit control/label relationships.
6. Switching languages preserves the selected section where the content inventory is unchanged.
7. Canonical prose, paragraph order, translations, realm styling, and the site's global accessibility runtime remain the source of truth.

## Verification checklist

- [ ] Confirm each page listed above renders the expected number of tabs/sections.
- [ ] Confirm every multi-section tab contains both its number and localized title in fa/en/ar/zh.
- [ ] Select first, middle, and final sections using pointer and keyboard; verify only the reading panel's content changes.
- [ ] Record `window.scrollX` and `window.scrollY` before/after each selection; both must remain unchanged.
- [ ] Verify focus remains on the selected tab during keyboard navigation and does not cause viewport movement.
- [ ] Switch languages while a non-first section is selected; verify the same section remains selected.
- [ ] Verify RTL/LTR, desktop, mobile portrait, mobile landscape, and TalkBack/keyboard access.
- [ ] Confirm شاهنامه‌خوانی remains unchanged.
- [ ] Confirm continuous works (Observation and Zero) remain whole and are not artificially split.
- [ ] Run repository quality/security workflows and browser smoke checks before merge.

Manual real-device TalkBack verification must be reported separately; automated checks do not substitute for it.
