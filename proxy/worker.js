const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const ALLOWED_ORIGIN = "https://modernoutlook.github.io";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type":"application/json; charset=utf-8", ...corsHeaders(origin)}
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, {status:403});
      return new Response(null, {status:204, headers:corsHeaders(origin)});
    }
    if (origin !== ALLOWED_ORIGIN) return json({error:"Origin not allowed."},403,origin);
    if (!env.OPENROUTER_API_KEY) return json({error:"Proxy is not configured."},503,origin);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rate = await env.PM_RATE_LIMITER.limit({key:ip});
    if (!rate.success) return json({error:"Proxy rate limit exceeded."},429,origin);

    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/health")
      return json({ok:true,service:"paragraph-machine-proxy"},200,origin);
    if (request.method === "GET" && path === "/models")
      return forward(request, env, "/models", origin);
    if (request.method === "POST" && path === "/chat/completions")
      return forward(request, env, "/chat/completions", origin);
    return json({error:"Not found."},404,origin);
  }
};

async function forward(request, env, path, origin) {
  const headers = new Headers(request.headers);
  headers.delete("Host");
  headers.delete("Authorization");
  headers.set("Authorization", "Bearer " + env.OPENROUTER_API_KEY);
  headers.set("X-Title", "Modern Outlook - Paragraph Machine");

  const init = {method:request.method, headers, redirect:"manual"};
  if (request.method !== "GET" && request.method !== "HEAD") init.body=request.body;

  const upstream = await fetch(OPENROUTER_URL + path, init);
  const responseHeaders = new Headers(upstream.headers);
  Object.entries(corsHeaders(origin)).forEach(([k,v])=>responseHeaders.set(k,v));
  responseHeaders.delete("set-cookie");

  return new Response(upstream.body, {
    status:upstream.status,
    statusText:upstream.statusText,
    headers:responseHeaders
  });
}
