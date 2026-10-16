const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const ALLOWED_ORIGIN = "https://modernoutlook.github.io";
const SERVICE_NAME = "paragraph-machine-proxy";

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (origin === ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  return headers;
}

function json(data, status, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const path = url.pathname;

    // A read-only diagnostic endpoint. It reveals only whether bindings exist,
    // never their values, and remains usable when the API secret is missing.
    if (request.method === "GET" && path === "/health") {
      return json({
        ok: true,
        service: SERVICE_NAME,
        configured: Boolean(env.OPENROUTER_API_KEY),
        rateLimiterConfigured: Boolean(env.PM_RATE_LIMITER)
      }, 200, origin);
    }

    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed." }, 403, origin);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const supportedRoute =
      (request.method === "GET" && path === "/models") ||
      (request.method === "POST" && path === "/chat/completions");

    if (!supportedRoute) return json({ error: "Not found." }, 404, origin);
    if (origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed." }, 403, origin);
    if (!env.OPENROUTER_API_KEY) {
      return json({ error: "Proxy is not configured.", code: "MISSING_API_SECRET" }, 503, origin);
    }
    if (!env.PM_RATE_LIMITER || typeof env.PM_RATE_LIMITER.limit !== "function") {
      return json({ error: "Proxy rate limiter is not configured.", code: "MISSING_RATE_LIMITER" }, 503, origin);
    }

    try {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const rate = await env.PM_RATE_LIMITER.limit({ key: ip });
      if (!rate.success) return json({ error: "Proxy rate limit exceeded.", code: "RATE_LIMITED" }, 429, origin);
    } catch (_) {
      return json({ error: "Proxy rate limiter is unavailable.", code: "RATE_LIMITER_UNAVAILABLE" }, 503, origin);
    }

    return forward(request, env, path, origin);
  }
};

function isFreeModel(model) {
  return model === "openrouter/free" || (typeof model === "string" && model.endsWith(":free"));
}

async function forward(request, env, path, origin) {
  const headers = new Headers({
    "Authorization": "Bearer " + env.OPENROUTER_API_KEY,
    "X-Title": "Modern Outlook - Paragraph Machine",
    "HTTP-Referer": "https://modernoutlook.github.io/smartkazem/"
  });
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  const accept = request.headers.get("Accept");
  if (accept) headers.set("Accept", accept);

  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method === "POST" && path === "/chat/completions") {
    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ error: "Request body must be valid JSON.", code: "INVALID_JSON" }, 400, origin);
    }

    const model = payload && payload.model;
    if (!isFreeModel(model)) {
      return json({
        error: "Only explicitly free models are permitted.",
        code: "FREE_MODELS_ONLY"
      }, 400, origin);
    }

    // Ignore client-supplied fallback lists. Every possible model is free.
    payload.models = model === "openrouter/free"
      ? ["openrouter/free"]
      : [model, "openrouter/free"];
    init.body = JSON.stringify(payload);
    init.headers.set("Content-Type", "application/json");
  }

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL + path, init);
  } catch (_) {
    return json({ error: "Unable to reach OpenRouter.", code: "UPSTREAM_NETWORK_ERROR" }, 502, origin);
  }

  const responseHeaders = new Headers(corsHeaders(origin));
  responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "application/json; charset=utf-8");
  const retryAfter = upstream.headers.get("Retry-After");
  if (retryAfter) responseHeaders.set("Retry-After", retryAfter);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}
