import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("community-worker/src/index.js", "utf8");
const schema = fs.readFileSync("community-worker/migrations/0001_initial.sql", "utf8");
const workflow = fs.readFileSync(".github/workflows/deploy-community.yml", "utf8");

test("community worker keeps credentials out of browser-readable storage", () => {
  assert.match(worker, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(worker, /SHA-256/);
  assert.match(worker, /iterations: 600000/);
  assert.match(worker, /token_hash/);
  assert.doesNotMatch(worker, /Access-Control-Allow-Origin/);
});

test("state-changing requests require the configured exact origin", () => {
  assert.match(worker, /origin === env\.SITE_ORIGIN/);
  assert.match(worker, /method !== "GET" && method !== "HEAD" && !validOrigin/);
});

test("social persistence has ownership, block and report boundaries", () => {
  for (const table of ["users", "sessions", "posts", "comments", "reactions", "follows", "blocks", "reports", "rate_limits"]) {
    assert.match(schema, new RegExp("CREATE TABLE IF NOT EXISTS " + table + "\\b"));
  }
  assert.match(worker, /author_id=\? AND deleted_at IS NULL/);
  assert.match(worker, /NOT EXISTS \(SELECT 1 FROM blocks/);
  assert.match(worker, /INSERT INTO reports/);
});

test("deployment provisions Cloudflare resources without printing secret values", () => {
  assert.match(workflow, /d1\/database/);
  assert.match(workflow, /r2\/buckets/);
  assert.match(workflow, /wrangler@4\.45\.0 d1 migrations apply/);
  assert.match(workflow, /wrangler@4\.45\.0 deploy/);
  assert.doesNotMatch(workflow, /echo .*CLOUDFLARE_API_TOKEN/);
});
