# Canonical Book Content Audit

This inventory tracks the migration to the mandatory single-source book architecture. It is intentionally explicit about the difference between a declared target and code that has already been migrated.

## Required target for every book

- One canonical Persian source in `content/`.
- One translation reservoir in `translations/` for EN/AR/ZH, keyed to the Persian source's item order.
- HTML contains presentation structure and empty render targets only.
- Controllers contain rendering and interaction logic only.
- Book titles, subtitles, chapter labels, and supplementary prose come from the same book catalog or the shared UI catalog when the text is genuinely interface text.
- Talk Back reads the selected-language rendered DOM; it never stores book prose independently.

## Current source-boundary inventory

| Book/surface | Canonical Persian source | Persian-source status | Translation/runtime follow-up |
|---|---|---|---|
| رساله فلسفی نگرش نوین | `content/philosophical-treatise.js` | Persian prose extracted into 158 ordered semantic blocks; HTML article uses empty Persian targets. | EN/ZH/AR prose has been moved into `translations/treatise.json` as 158 ordered blocks per language. Verify rendered block alignment and visual fidelity. |
| شاهنامه‌خوانی | `content/shahnameh-series.js` | Episode prose, verse, and the long original-verse passage for episode 1 are sourced here. | EN/ZH/AR episode titles and prose for episodes 1–81 now live in `translations/shahnameh.json`; `shahnameh.html` declares the reservoir and the reader loads it through `bookContent.shahnameh`. Global catalogs retain page UI labels/metadata only. Still test all 81 episode order and filters in four languages. |
| فصل اول ظهور | `content/emergence.js` | Persian episode source exists; duplicate Persian title fields removed from translation reservoir. | `emergence.html` declares `translations/emergence.json`; renderer prefers `bookContent.emergence`. Verify all 19 episodes and translated catalog alignment. |
| سرزمین مشاهده؛ ۲۵ بار رسیدن | `content/observation-25.js` | Persian title, subtitle, section labels, and all 25 prose sections moved out of `translations/fa.json`. | Move target-language prose from shared catalogs into the declared translation reservoir; verify section parity. |
| آینه‌ی ممکن‌ها | `content/possible-mirror.js` | Persian title, subtitle, section labels, and all 31 prose sections moved out of `translations/fa.json`. | EN/ZH/AR section labels and prose have been moved to `translations/possible-mirror.json` (31 sections per language). Verify rendered section parity and interaction behavior. |
| فصل دوم ظهور | `content/emergence-2.js` | Persian episode source exists; duplicate Persian title fields removed from translation reservoir. | `emergence-2.html` declares `translations/emergence-2.json`; renderer prefers `bookContent.emergence2`. Verify all 11 source episodes and translated catalog alignment. |
| سرزمین مشاهده؛ یک رود، یک جریان | `content/observation.js` | Persian title, subtitle, and all 12 body paragraphs extracted; HTML uses empty Persian targets. Duplicate Persian fields removed from `translations/observation.json`. | EN/ZH/AR prose has been reconciled against the existing `translations/observation.json` reservoir (12 paragraphs per language) and removed from HTML. Verify rendered language switching and paragraph fidelity. |
| پژواک لایه سوم | `content/echo-layer3.js` | Persian source contains 17 ordered parts. | EN/ZH/AR titles, subtitles, part titles, and prose load from `translations/echo-layer3.json` (17 parts per language); duplicated part titles removed from shared catalogs. |
| انسان و ماشین‌هایش | `content/human-machines.js` | Persian chapter prose is canonical; duplicate Persian chapter arrays removed from `translations/fa.json`. | EN/ZH/AR titles, subtitles, seven chapter titles, and all chapter paragraphs are centralized in `translations/human-machines.json`; global catalogs retain only UI title/subtitle metadata. |
| جاعلان تقلید | `content/forgers.js` | Persian chapter prose is canonical; embedded translations removed from the source JS; duplicate Persian chapter prose removed from `translations/fa.json`. | EN/ZH/AR titles, subtitles, ten chapter titles, all chapter paragraphs, and moral text are centralized in `translations/forgers.json`; global catalogs retain only UI metadata. |
| تباهیان | `content/tabahian.js` | Three Persian chapters are canonical in this file. | Translation catalog currently has only two chapters; translate the missing chapter after the Persian inventory is signed off. |
| مانیفست آشوب‌زده | `content/disturbed-manifesto.js` | Dedicated Persian source exists. | Remove remaining language-specific prose fallbacks and verify all 11 parts in four languages. |

**Persian pass:** canonical source files now exist for all 12 books, and the known long-form Persian duplicates identified in the initial audit have been moved out of HTML or duplicate catalog fields. Shared UI labels and navigation strings may remain in UI catalogs; they are not a second book-prose store.

**Translation pass:** not yet complete. EN/ZH/AR must be centralized and compared against these sources before claiming that every HTML page is presentation-only.
 
## Important migration safeguards

1. Do not delete embedded text until its exact content has been extracted and compared against the canonical source/reservoir.
2. Do not infer that two paragraphs are equivalent from title or length alone. If copies diverge, record the discrepancy and resolve it without silent edits.
3. Do not treat generic UI labels (for example, “Back” or “Previous”) as book prose; these belong in the shared UI catalog.
4. Do not create a separate accessibility text store. Shared Talk Back must read the visible localized content.
5. Do not mark a book migrated until the HTML/controller duplication audit and all four language modes have been verified.

## Current status

The Persian-source-first milestone is complete at the source-boundary level for all 12 books. Each has a canonical Persian file under `content/`, and the identified long-form Persian copies were moved out of HTML or duplicate catalog fields. This is not a claim that target-language translations are centralized or complete, nor that real-device TalkBack/browser testing has been completed.

Known translation-phase gap: `content/tabahian.js` has three Persian chapters, while `translations/tabahian.json` currently contains two translated chapters. Do not begin translation edits until the Persian source inventory has been reviewed; then use the Persian sources listed above as the only reference.

## Migration history

## Additional Persian source extraction (2026-10-09)

- **رساله فلسفی نگرش نوین**: extracted all 158 Persian article blocks into `content/philosophical-treatise.js`, preserving block order and the original heading/paragraph/table markup. Replaced Persian article copies in HTML with empty render targets and added `js/philosophical-treatise-source.js` to render the canonical source.
- The English, Chinese, and Arabic copies are intentionally untouched in this Persian-first pass and will be moved into the translation reservoir during the subsequent phase.


## Canonical Persian source extraction: observation 25 and possible mirror (2026-10-09)

- **سرزمین مشاهده؛ ۲۵ بار رسیدن**: moved its Persian title, subtitle, section labels, section note, and all 25 prose sections from `translations/fa.json` into `content/observation-25.js`. The page controller now reads this source when Persian is selected.
- **آینه‌ی ممکن‌ها**: moved its Persian title, subtitle, section labels, section note, and all 31 prose sections from `translations/fa.json` into `content/possible-mirror.js`. The page controller now reads this source when Persian is selected.
- Removed the duplicated Persian book fields from `translations/fa.json`; retained the UI close labels. Updated the shared i18n document-title fallback to use a canonical Persian source title when a page intentionally has no duplicate title in the Persian UI catalog.
- EN / ZH / AR catalogs were not changed in this Persian-first phase.


## Persian translation-reservoir cleanup (2026-10-09)

Removed duplicate `fa` title and chapter/part-title entries from the translation reservoirs for **تباهیان**, **فصل اول ظهور**, **فصل دوم ظهور**, and **پژواک لایه سوم**. Their Persian chapter text is supplied by their `content/` sources. No EN / ZH / AR prose was edited in this cleanup.


## Shahnameh Persian-source consolidation (2026-10-09)

Moved the full Persian original-verse passage for episode 1 from `translations/fa.json` to `content/shahnameh-series.js` (`meta.originalVerse`). Updated the reader to use that canonical source for Persian episode 1. Removed the duplicated Persian `part1`, episode-title list, section list, and subtitle fields from `translations/fa.json`; the remaining Persian catalog entries are UI labels rather than book prose.


## Consolidated status (2026-10-09)

The Persian-source-first milestone is complete at the source-boundary level for all 12 listed books. This means a canonical Persian source file exists for each book and the identified duplicate Persian long-form prose was removed from its prior HTML/catalog location. It does **not** mean translations are complete or that visual and TalkBack testing has been performed on a real device. Continue with the translation-source pass only after preserving the current Persian source files as the authoritative references.


## Translation-source pass started (2026-10-09)

- **رساله فلسفی نگرش نوین**: extracted 158 EN / ZH / AR blocks from the previous HTML presentation and centralized them in `translations/treatise.json`. Each target language has 158 indexed blocks; the page now has 158 render targets for each of fa/en/zh/ar. Persian blocks are loaded from `content/philosophical-treatise.js`.
- **سرزمین مشاهده؛ یک رود، یک جریان**: compared the 12 embedded paragraphs per target language against `translations/observation.json`; EN, ZH, and AR each matched exactly in order and text. Removed the duplicate multilingual paragraphs from HTML. The renderer now uses `content/observation.js` for Persian and `translations/observation.json` for EN / ZH / AR.
- Updated the shared i18n loader to expose declared book translation reservoirs through `bookContent`, so page renderers use the same language-selection pipeline.
- Translation-source pass remains in progress for the other books. No new translation prose was authored in this step; existing target-language text was centralized and checked for exact alignment.


## Additional translation reservoirs (2026-10-09)

- **سرزمین مشاهده؛ ۲۵ بار رسیدن**: moved EN / ZH / AR titles, subtitles, section labels, notes, and 25 prose sections per language from the global catalogs into `translations/observation-25.json`. Removed the duplicated section/prose fields from `translations/en.json`, `translations/zh.json`, and `translations/ar.json`. The page loads the dedicated reservoir via its declared `i18n-catalog` and renders from `bookContent.observation25`.
- **آینه‌ی ممکن‌ها**: moved EN / ZH / AR titles, subtitles, section labels, notes, and 31 prose sections per language into `translations/possible-mirror.json`. Removed the duplicated section/prose fields from the global catalogs. The page now reads the declared translation reservoir through the shared i18n boundary.


## Generic declared-catalog wiring (2026-10-09)

- Added explicit `i18n-catalog` declarations to the two Emergence pages.
- Removed the legacy page-key-to-catalog filename map from `translations/i18n.js`. Dedicated book catalogs are now fetched through the same declaration-based mechanism for Emergence I/II, Echo Layer Three, and Disturbed Manifesto.
- This is a runtime boundary cleanup, not a translation-completeness claim. Emergence episode/paragraph alignment and the missing third Tabahian chapter remain audit items.


## Share Economy translation reservoirs (2026-10-09)

- Extracted all existing EN / ZH / AR content for **جاعلان تقلید** from the global language catalogs into `translations/forgers.json`: 10 chapters per language, with paragraph counts aligned across the three target languages, plus the localized moral text.
- Extracted all existing EN / ZH / AR content for **انسان و ماشین‌هایش** into `translations/human-machines.json`: 7 chapters per language, with paragraph counts aligned across the three target languages.
- Removed duplicated long-form chapter arrays from `translations/en.json`, `translations/zh.json`, and `translations/ar.json`; their page entries keep the title/subtitle metadata needed by the home UI.
- Added a generic `i18n-catalogs` manifest on `index.html`. The shared loader now loads multiple declared reservoirs into `bookContent`, and `js/books.js` localizes chapter metadata and prose from that boundary. The book renderer still uses the canonical Persian `content/` source when Persian is selected.
- The new reservoirs were assembled from existing translated content; no translated prose was summarized or rewritten during extraction.


## Shahnameh translation reservoir (2026-10-09)

- Extracted translated episode titles, section labels, episode prose, and episode-1 translated prose from the EN / ZH / AR global catalogs into `translations/shahnameh.json`: 81 titles, 13 section labels, episode 1 plus episodes 2–81 per language.
- Removed duplicate `part1`, `titles`, `sections`, and `episodes` long-form fields from the global language catalogs. The page keeps UI-specific labels, search labels, and visual metadata in the global catalog.
- The Shahnameh reader now gets translated titles and prose from `bookContent.shahnameh`; original Persian verse falls back to the canonical `content/shahnameh-series.js` source rather than duplicated fields in EN / ZH / AR catalogs.
- This extraction preserves existing target-language strings; full fidelity review and manual visual testing remain pending.
