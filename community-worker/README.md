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

Create a D1 database named `smartkazem-community` and an R2 bucket named `smartkazem-community-media`. Replace the D1 database ID in `wrangler.toml` with the ID from the Cloudflare dashboard.

Set these Worker secrets (not repository files):

- `RESEND_API_KEY`
- `MAIL_FROM` (verified sender address)
- `TURNSTILE_SECRET_KEY`

Set `TURNSTILE_ENABLED=true` and configure the matching public Turnstile site key in the frontend. The site origin in `SITE_ORIGIN` must match the deployed Pages origin exactly.

GitHub Actions repository secrets required for deployment:

- `CLOUDFLARE_API_TOKEN` — scoped to Workers Scripts:Edit, D1:Edit, R2 Storage:Edit, and account read access needed by Wrangler.
- `CLOUDFLARE_ACCOUNT_ID`

Never put credentials in source, commit messages, workflow logs, or client-side JavaScript.

## Deploy

The workflow `.github/workflows/deploy-community.yml` is manually dispatched. It validates the GitHub secrets, installs the pinned Wrangler CLI, applies D1 migrations, deploys the Worker, and checks `/health`.

## Security and release status

This is an initial backend slice, not a claim of production readiness. Before enabling the UI or accepting public users, complete and test: password-reset flow, session revocation on password change, pagination and abuse quotas on every write route, moderation queue/admin authorization, media upload content inspection/size limits, privacy/export/deletion flows, CSP/connect-src integration, automated security tests, and actual deployment smoke tests. The Worker deliberately does not expose report contents or administrative routes publicly.
