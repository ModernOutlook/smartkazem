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
| رساله فلسفی نگرش نوین | `content/philosophical-treatise.js` | Persian prose extracted into 158 ordered semantic blocks; HTML article uses empty Persian targets. | Move embedded EN/ZH/AR prose from HTML into the shared translation reservoir; verify block alignment. |
| شاهنامه‌خوانی | `content/shahnameh-series.js` | Episode prose, verse, and the long original-verse passage for episode 1 are sourced here. | Finish translating remaining source-backed content; test 81 episode order and filters in four languages. |
| فصل اول ظهور | `content/emergence.js` | Persian episode source exists; duplicate Persian title fields removed from translation reservoir. | Verify all 19 episodes and translated catalog alignment. |
| سرزمین مشاهده؛ ۲۵ بار رسیدن | `content/observation-25.js` | Persian title, subtitle, section labels, and all 25 prose sections moved out of `translations/fa.json`. | Move target-language prose from shared catalogs into the declared translation reservoir; verify section parity. |
| آینه‌ی ممکن‌ها | `content/possible-mirror.js` | Persian title, subtitle, section labels, and all 31 prose sections moved out of `translations/fa.json`. | Move target-language prose into the shared translation reservoir; verify all sections and interaction behavior. |
| فصل دوم ظهور | `content/emergence-2.js` | Persian episode source exists; duplicate Persian title fields removed from translation reservoir. | Verify all 11 source episodes and translated catalog alignment. |
| سرزمین مشاهده؛ یک رود، یک جریان | `content/observation.js` | Persian title, subtitle, and all 12 body paragraphs extracted; HTML uses empty Persian targets. Duplicate Persian fields removed from `translations/observation.json`. | Move EN/ZH/AR prose from HTML into the shared translation reservoir. |
| پژواک لایه سوم | `content/echo-layer3.js` | Persian source exists; duplicate Persian title/part labels removed from the translation reservoir. | Verify 17 parts, chapter grouping, and all target-language content. |
| انسان و ماشین‌هایش | `content/human-machines.js` | Persian chapter prose is canonical; duplicate Persian chapter arrays removed from `translations/fa.json`. | Verify seven chapters and complete EN/ZH/AR catalog parity. |
| جاعلان تقلید | `content/forgers.js` | Persian chapter prose is canonical; embedded translations removed from the source JS; duplicate Persian chapter prose removed from `translations/fa.json`. | Verify ten chapters, moral text, and target-language catalogs. |
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

## Status

The mandatory rule has been added to `README.md` and `docs/ai-page-completion.md`. The table above is the initial source-boundary audit; it is not a claim that all listed migrations have already been implemented.


## Runtime migration checkpoint (2026-10-09)

Completed in this checkpoint:

- **جاعلان تقلید**: Persian prose is authoritative in `content/forgers.js`; EN / ZH / AR prose remains only in the shared language catalogs. Embedded translations were removed from the Persian JS source, and duplicate Persian chapter prose/moral was removed from `translations/fa.json`.
- **انسان و ماشین‌هایش**: Persian prose is authoritative in `content/human-machines.js`; duplicate Persian chapter prose was removed from `translations/fa.json`. EN / ZH / AR prose remains in the shared language catalogs.
- The shared book-reader controller now reads titles, subtitles, chapters, and the fable moral from source/catalog data rather than hardcoded parallel text fallbacks.

Not yet complete:

- The remaining book pages still require per-page migration and runtime verification.
- **تباهیان** has three Persian chapters but only two chapters in `translations/tabahian.json`; the missing translated chapter must be completed before removing all Persian duplicate fields from that reservoir.
- Do not describe the entire repository as fully migrated until the remaining inventory is verified.


## Persian-source-first checkpoint (2026-10-09)

- **سرزمین مشاهده**: extracted the Persian title, subtitle, and all 12 body paragraphs into `content/observation.js`. The HTML keeps only empty render targets for those Persian fields; `js/observation-source.js` injects the canonical source. Removed Persian title/subtitle/paragraph fields from `translations/observation.json` so the Persian prose is not duplicated there.
- Translation content for EN / ZH / AR is deliberately not being migrated in this pass; it remains for the later translation phase.
- **رساله فلسفی نگرش نوین** remains the largest uncompleted Persian-source extraction: its long-form prose is still embedded in `philosophical-treatise.html`.


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
