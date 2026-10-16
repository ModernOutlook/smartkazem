import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";

const origin = "https://modernoutlook.github.io";
const env = {
  OPENROUTER_API_KEY: "test-secret-not-real",
  PM_RATE_LIMITER: { limit: async () => ({ success: true }) }
};

function request(payload) {
  return new Request("https://proxy.example.workers.dev/chat/completions", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.1"
    },
    body: JSON.stringify(payload)
  });
}

async function runWithUpstream(payload) {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init, body: init.body ? JSON.parse(init.body) : null };
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  try {
    const response = await worker.fetch(request(payload), env);
    return { response, captured };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("rejects paid models before contacting OpenRouter", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("must not be called"); };
  try {
    const response = await worker.fetch(request({ model: "openai/gpt-4o", messages: [] }), env);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "FREE_MODELS_ONLY");
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adds the free router as fallback and overrides client fallback lists", async () => {
  const { response, captured } = await runWithUpstream({
    model: "google/example:free",
    models: ["some/provider-paid-model"],
    messages: [{ role: "user", content: "test" }]
  });
  assert.equal(response.status, 200);
  assert.deepEqual(captured.body.models, ["google/example:free", "openrouter/free"]);
  assert.equal(captured.body.model, "google/example:free");
  assert.equal(captured.url, "https://openrouter.ai/api/v1/chat/completions");
});

test("allows the free router without introducing any paid fallback", async () => {
  const { response, captured } = await runWithUpstream({
    model: "openrouter/free",
    models: ["some/provider-paid-model"],
    messages: []
  });
  assert.equal(response.status, 200);
  assert.deepEqual(captured.body.models, ["openrouter/free"]);
});

test("rejects invalid JSON with a controlled client error", async () => {
  const badRequest = new Request("https://proxy.example.workers.dev/chat/completions", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
    body: "{"
  });
  const response = await worker.fetch(badRequest, env);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_JSON");
});
