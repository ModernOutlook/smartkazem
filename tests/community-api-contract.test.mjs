import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("community-worker/src/index.js", "utf8");
const verifier = fs.readFileSync("community-worker/src/google-auth.js", "utf8");
const schema = fs.readFileSync("community-worker/migrations/0001_initial.sql", "utf8");
const oauthMigration = fs.readFileSync("community-worker/migrations/0002_google_oauth.sql", "utf8");
const workflow = fs.readFileSync(".github/workflows/deploy-community.yml", "utf8");
const wrangler = fs.readFileSync("community-worker/wrangler.toml", "utf8");
const readme = fs.readFileSync("community-worker/README.md", "utf8");

test("Google ID tokens are verified cryptographically and bound to the configured client", () => {
  assert.match(worker, /verifyGoogleCredential\(data\.credential, env\.GOOGLE_CLIENT_ID\)/);
  assert.match(verifier, /RSASSA-PKCS1-v1_5/);
  assert.match(verifier, /https:\/\/www\.googleapis\.com\/oauth2\/v3\/certs/);
  assert.match(verifier, /claims\.iss/);
  assert.match(verifier, /claims\.aud/);
  assert.match(verifier, /claims\.exp <= now/);
  assert.match(verifier, /email_verified/);
  assert.match(verifier, /claims\.sub/);
});

test("sessions use opaque bearer tokens stored only as SHA-256 hashes", () => {
  assert.match(worker, /Authorization/);
  assert.match(worker, /Bearer \(\[A-Za-z0-9_-\]/);
  assert.match(worker, /token_hash/);
  assert.match(worker, /await digest\(token\)/);
  assert.match(worker, /604800000/);
  assert.doesNotMatch(worker, /set-cookie|HttpOnly|SameSite/);
});

test("browser CORS is restricted to the exact configured site origin", () => {
  assert.match(worker, /origin === env\.SITE_ORIGIN/);
  assert.match(worker, /access-control-allow-origin/);
  assert.match(worker, /access-control-allow-headers.*Authorization, Content-Type/);
  assert.match(worker, /headers_not_allowed/);
  assert.doesNotMatch(worker, /access-control-allow-origin.*\*/);
});

test("legacy email/password auth is disabled and identity is Google-subject based", () => {
  assert.match(worker, /google_oauth_only/);
  assert.match(worker, /account_link_required/);
  assert.match(worker, /WHERE google_sub=\?/);
  assert.match(oauthMigration, /ALTER TABLE users ADD COLUMN google_sub TEXT/);
  assert.match(oauthMigration, /UNIQUE INDEX.*google_sub/);
  assert.doesNotMatch(worker, /RESEND_API_KEY|MAIL_FROM|sendMail|passwordHash|captcha\(/);
});

test("social persistence retains ownership, block and report boundaries", () => {
  for (const table of ["users", "sessions", "posts", "comments", "reactions", "follows", "blocks", "reports", "rate_limits"]) {
    assert.match(schema, new RegExp("CREATE TABLE IF NOT EXISTS " + table + "\\b"));
  }
  assert.match(worker, /author_id=\? AND deleted_at IS NULL/);
  assert.match(worker, /NOT EXISTS \(SELECT 1 FROM blocks/);
  assert.match(worker, /INSERT INTO reports/);
});

test("deployment provisions Cloudflare resources without mail secrets", () => {
  assert.match(workflow, /d1\/database/);
  assert.match(workflow, /r2\/buckets/);
  assert.match(workflow, /wrangler@4\.45\.0 d1 migrations apply/);
  assert.match(workflow, /wrangler@4\.45\.0 deploy/);
  assert.match(workflow, /COMMUNITY_GOOGLE_CLIENT_ID/);
  assert.doesNotMatch(workflow, /RESEND|MAIL_FROM|TURNSTILE/);
  assert.doesNotMatch(workflow, /echo .*CLOUDFLARE_API_TOKEN/);
  assert.match(wrangler, /GOOGLE_CLIENT_ID = "REPLACE_WITH_GOOGLE_CLIENT_ID"/);
  assert.match(readme, /No Resend/);
});
