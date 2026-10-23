# SmartKazem Community API

This is an isolated Cloudflare Worker service. It does not add a framework, build step, server, or dependency to the GitHub Pages site, and it does not alter Paragraph Machine entry points.

## Current API surface

- Account registration with email verification, login/logout, and session inspection.
- PBKDF2-SHA-256 password derivation (600,000 iterations); random opaque session tokens are stored only as SHA-256 hashes.
- Secure, HttpOnly, SameSite=Lax session cookie; verified-email requirement for social actions.
- Public/follower-only posts, comments, reactions, follows, blocks, and user-generated reports.
- Turnstile verification and per-IP registration/login rate limits.
- D1 relational persistence and R2 media binding reserved for the next media-upload slice.

## Required Cloudflare resources and secrets

The deployment workflow provisions a D1 database named `smartkazem-community` and an R2 bucket named `smartkazem-community-media` when they do not already exist. It injects the discovered D1 ID into the checked-out Wrangler config at runtime; no resource ID is committed.

The workflow provisions the D1 database and R2 bucket, then transfers the mail and Turnstile credentials into Worker secrets without writing their values to repository files. The deployed Worker URL is read from Wrangler's deployment output for the health check.

- `RESEND_API_KEY`
- `MAIL_FROM` (verified sender address)
- `TURNSTILE_SECRET_KEY`

Set the matching public Turnstile site key in the frontend before enabling registration. The current UI integration and public-site-key wiring are still outstanding. The site origin in `SITE_ORIGIN` must match the deployed Pages origin exactly.

GitHub Actions repository secrets required for deployment:

- `CLOUDFLARE_API_TOKEN` — scoped to Workers Scripts:Edit, D1:Edit, R2 Storage:Edit, and account read access needed by Wrangler.
- `CLOUDFLARE_ACCOUNT_ID`
- `RESEND_API_KEY`
- `MAIL_FROM` (a verified sender)
- `TURNSTILE_SECRET_KEY`

Never put credentials in source, commit messages, workflow logs, or client-side JavaScript.

## Deploy

The workflow `.github/workflows/deploy-community.yml` is manually dispatched. It validates the GitHub secrets, installs the pinned Wrangler CLI, applies D1 migrations, deploys the Worker, and checks `/health`.

## Security and release status

This is an initial backend slice, not a claim of production readiness. Before enabling the UI or accepting public users, complete and test: password-reset flow, session revocation on password change, pagination and abuse quotas on every write route, moderation queue/admin authorization, media upload content inspection/size limits, privacy/export/deletion flows, CSP/connect-src integration, automated security tests, and actual deployment smoke tests. The Worker deliberately does not expose report contents or administrative routes publicly.
