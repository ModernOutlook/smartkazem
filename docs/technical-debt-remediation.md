# Technical debt remediation plan

This is a staged maintenance plan, not authorization for a rewrite. The README is the canonical contributor guide; this document tracks the debt-remediation sequence and acceptance criteria.

## Constraints

- Preserve the static GitHub Pages deployment and avoid a mandatory build step.
- Keep Persian as the authoritative source for Persian content; preserve the `fa`, `en`, `zh`, and `ar` language paths and RTL/LTR behavior.
- Preserve the S/T/E/R/C order, public runtime contracts, card-catalog image mapping, and Paragraph Machine limits and service boundaries.
- Do not remove a compatibility global until every consumer has been migrated and the supported load order is verified.
- Avoid broad CSS rewrites and formatting-only churn mixed with behavioral changes.

## Staged work

### 1. Establish a baseline

- Run the existing quality workflow and record failures before changing code.
- Inventory global exports and consumers, including dynamically loaded fragments and standalone pages.
- Inventory current CSS ownership and existing browser smoke coverage.
- Identify fallback strings adjacent to state transitions, validation, network requests, and business rules.

### 2. Add consistent tooling without forcing a build

- Select and pin a formatter and linter compatible with the repository's browser-native JavaScript and existing module styles.
- Introduce configuration and CI checks in warning/report-only mode first where legacy violations are numerous.
- Format files in small, reviewable batches; do not combine formatting with behavior changes.
- Add type checking only for a bounded module boundary if it proves useful; do not introduce a repository-wide type migration as a prerequisite.

### 3. Reduce compatibility globals safely

- Document each global's owner, consumers, load-order requirements, and removal criteria.
- Prefer explicit module APIs for new or changed code where the current deployment architecture supports them.
- Migrate one consumer group at a time and add regression coverage before removing an export.
- Keep intentional browser integration points documented; do not mechanically replace every `window.*` access.

### 4. Refine fallback behavior

- Keep user-facing fallback copy at presentation boundaries.
- Do not convert missing required dependencies, invalid model responses, failed translations, or failed requests into apparently successful default states.
- Preserve accessible error/status messages and existing language selection.
- Add tests for the failure path before changing each fallback.

### 5. Split CSS and clean legacy markup incrementally

- Move a rule only after identifying its owning page/component and checking cascade and specificity dependencies.
- Preserve responsive breakpoints, focus visibility, reduced-motion behavior, and RTL/LTR layouts.
- Prefer small component/page slices over a wholesale rewrite of `css/site.css`.
- Remove legacy markup/styles only after confirming no runtime fragment, selector, or standalone page depends on them.

### 6. Expand browser smoke tests

- Reuse the existing Playwright smoke-test conventions and pin/install browser tooling only where the repository's CI can support it.
- Cover critical navigation, language switching, browser-console errors, failed local assets, card artwork, and key desktop/mobile viewports.
- Add targeted tests for RTL and LTR and for each changed interaction.
- Keep browser tests deterministic and avoid relying on live model/API credentials in CI.

### 7. Consolidate documentation

- Keep README as the primary contributor guide and index of invariants.
- Retain `Structure.txt` while it contains unique architecture and content-source contracts; remove duplication in a separate documentation-only change after comparing the complete documents.
- Never delete or paraphrase authoritative Persian-content ownership, translation, accessibility, or service-boundary rules merely to shorten documentation.

## Definition of done

- Existing quality checks pass, or pre-existing failures are explicitly recorded and separated from regressions.
- Each behavior change has relevant regression coverage.
- No unexpected changes to language behavior, navigation, content, accessibility, or deployment.
- Browser smoke tests cover the affected interaction at desktop and mobile sizes where applicable.
- Every removed compatibility API has no remaining consumers.
- CSS moves and documentation consolidation are independently reviewable.
- The final report distinguishes executed checks from checks that could not be run.
