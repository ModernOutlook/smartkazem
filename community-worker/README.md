# SmartKazem Community API

The community service is an isolated Cloudflare Worker + D1 foundation. It remains separate from the static GitHub Pages frontend and Paragraph Machine. No paid email provider, custom domain, mail sender, or application server is required for Google sign-in.

## Authentication

- Sign-in and account creation use Google Identity Services (GIS).
- The browser sends Google's signed ID credential to `POST /auth/google`.
- The Worker verifies the RS256 JWT signature against Google's published rotating JWK certificates and validates issuer, audience, expiry, issue time, subject, and verified email.
- Accounts are keyed by Google's immutable `sub`, not by email. An existing email account is never silently linked to a Google identity; it returns `account_link_required` for a separately designed, verified account-linking flow.
- The Worker creates opaque random bearer sessions. Only SHA-256 token hashes are stored in D1. Sessions expire after seven days and are revoked by `POST /auth/logout`.
- The browser must keep the bearer token in memory or `sessionStorage`, never in `localStorage`. `sessionStorage` is accessible to same-origin JavaScript, so a future frontend must apply a strict CSP and avoid unsafe HTML injection.
- Legacy email/password registration, verification, and login endpoints return HTTP 410. Resend, email delivery, Turnstile, and password authentication are not part of this design.

## API

- `GET /health`
- `POST /auth/google` with JSON `{"credential":"<Google ID token>"}`
- `GET /auth/me` with `Authorization: Bearer <session token>`
- `POST /auth/logout` with the same bearer header
- Authenticated social endpoints: posts, comments, reactions, follows, blocks, and reports.

The Worker allows browser CORS only from the exact `SITE_ORIGIN`. Preflight permits only `Authorization` and `Content-Type`; no wildcard origin and no cookie credentials are used.

## Google Cloud setup (free)

1. In Google Cloud Console, create/select a project and configure the OAuth consent screen.
2. Create an OAuth Client ID of type **Web application**.
3. Add the exact Authorized JavaScript origin: `https://modernoutlook.github.io` (or the exact Pages origin configured for this site).
4. No redirect URI and no client secret are needed for the GIS ID-token flow.
5. Put the resulting Client ID in GitHub repository **Variables** as `COMMUNITY_GOOGLE_CLIENT_ID`. It is a public identifier, not a secret; never put a private credential in frontend code.
6. Set GitHub repository variable `COMMUNITY_SITE_ORIGIN` to the exact origin, without a path, e.g. `https://modernoutlook.github.io`.

For OAuth consent-screen status **Testing**, add the Google accounts that will test the app as test users. A broader public launch may require Google's consent-screen publishing/verification steps. Google controls those eligibility requirements.

## Cloudflare and GitHub deployment

The manually dispatched workflow provisions D1 (`smartkazem-community`) and R2 (`smartkazem-community-media`), applies migrations, deploys the Worker, and checks `/health`.

Required GitHub repository secrets:
- `CLOUDFLARE_socialAPI_TOKEN` — scoped to Workers Scripts:Edit, D1:Edit, R2 Storage:Edit, and account read access needed by Wrangler.
- `CLOUDFLARE_socialACCOUNT_ID`

Required GitHub repository variables:
- `COMMUNITY_SITE_ORIGIN`
- `COMMUNITY_GOOGLE_CLIENT_ID`

No Resend, MAIL_FROM, Turnstile, Google client secret, paid plan, or billing setup is used by this authentication path. Do not paste credentials into chat, source files, commit messages, or logs.

## Release boundary

This PR establishes and tests the backend OAuth/session contract. It does not claim the full community frontend or public production launch is complete. Before public launch, complete the Google sign-in UI and community page, pagination and write quotas for every mutation, moderation queue and administrator authorization, media upload inspection/size limits, privacy/export/deletion flows, and a real deployed smoke test. Do not deploy until the owner has completed the required Google and Cloudflare configuration and explicitly requests deployment.
