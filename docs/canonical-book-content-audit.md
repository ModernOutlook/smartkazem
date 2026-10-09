# Canonical Book Content Audit

This inventory tracks the migration to the mandatory single-source book architecture. It is intentionally explicit about the difference between a declared target and code that has already been migrated.

## Required target for every book

- One canonical Persian source in `content/`.
- One translation reservoir in `translations/` for EN/AR/ZH, keyed to the Persian source's item order.
- HTML contains presentation structure and empty render targets only.
- Controllers contain rendering and interaction logic only.
- Book titles, subtitles, chapter labels, and supplementary prose come from the same book catalog or the shared UI catalog when the text is genuinely interface text.
- Talk Back reads the selected-language rendered DOM; it never stores book prose independently.

## First-pass findings from the current repository

| Book/surface | Current observed content boundary | Work required |
|---|---|---|
| رساله فلسفی (`philosophical-treatise.html`) | Long-form Persian, English, Chinese, and Arabic text is embedded directly in HTML. | Extract Persian prose to a canonical `content/` source, move EN/AR/ZH to a dedicated translation reservoir, and render into an HTML shell. |
| سرزمین مشاهده؛ یک رود، یک جریان (`observation.html`) | HTML contains multilingual prose; `translations/observation.json` also contains localized paragraphs. | Reconcile the two copies, keep Persian in `content/`, keep EN/AR/ZH in the translation reservoir, and remove embedded prose from HTML. |
| سرزمین مشاهده؛ ۲۵ بار رسیدن (`observation-25.html`) | HTML is mostly a shell, but its content source is tied to global language/page catalogs rather than a clearly declared dedicated Persian source. | Declare a canonical source/reservoir pair and make the renderer use them exclusively. |
| آینه‌ی ممکن‌ها (`possible-mirror.html`) | HTML is mostly a shell; source data is currently represented through shared language catalogs. | Declare dedicated source/reservoir paths and make the page spec/runtime use those paths. |
| شاهنامه‌خوانی (`shahnameh.html`) | Episode data is in `content/shahnameh-series.js`; page-level title/subtitle and filter UI strings also appear in HTML or controller fallbacks. | Keep episode prose in the source/reservoir; move book metadata and localized filter labels to catalogs; leave only controls and render targets in HTML. |
| فصل اول ظهور (`emergence.html`) | Persian episode source is in `content/emergence.js`, translations in `translations/emergence.json`; page specs exist. | Audit for remaining controller/HTML fallback prose and ensure every language resolves exclusively from the declared catalogs. |
| فصل دوم ظهور (`emergence-2.html`) | Persian episode source is in `content/emergence-2.js`; translation data is in `translations/emergence-2.json`; page specs exist. | Audit language-specific controller fallbacks and ensure no duplicate episode text outside the catalogs. |
| پژواک لایه سوم (`echo-layer3.html`) | Persian source and translations exist as dedicated files. | Verify the page renderer and metadata use only those files; eliminate any duplicated fallback prose. |
| جاعلان تقلید (`index.html` book reader) | Chapter prose is in `content/forgers.js`, but titles, chapter counts, and fable moral translations are also hard-coded in `js/books.js`. | Move all book-specific text/metadata to the canonical source and translation catalogs; keep `js/books.js` presentation/navigation logic only. |
| انسان و ماشین‌هایش (`index.html` book reader) | Chapter prose is in `content/human-machines.js`; title/count metadata are hard-coded in `js/books.js`. | Move metadata to catalogs and verify the source/translation structure is aligned. |
| تباهیان (`index.html` book reader) | Persian chapters are in `content/tabahian.js`; localized book data is in `translations/tabahian.json`; `js/books.js` also hard-codes titles/counts. The translation catalog currently declares two chapters while the expected book structure is three. | Reconcile the actual Persian source count first; complete translations only from confirmed Persian chapters; remove hard-coded metadata and validate chapter alignment. |
| مانیفست آشوب‌زده (`disturbed-manifesto.html`) | Dedicated source/translation files exist, but the controller includes fallback text. | Remove prose fallbacks and require catalog-backed localized content, with a clear missing-translation state. |

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
