const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let cachedKeys = null;
let cachedUntil = 0;

function decodePart(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(decodePart(value)));
}

async function googleKeys() {
  if (cachedKeys && Date.now() < cachedUntil) return cachedKeys;
  const response = await fetch(GOOGLE_CERTS_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("google_keys_unavailable");
  const data = await response.json();
  if (!data.keys || !Array.isArray(data.keys)) throw new Error("google_keys_invalid");
  cachedKeys = data.keys;
  const cacheControl = response.headers.get("cache-control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 300);
  cachedUntil = Date.now() + Math.min(Math.max(maxAge, 60), 3600) * 1000;
  return cachedKeys;
}

export async function verifyGoogleCredential(token, clientId) {
  if (typeof token !== "string" || token.length > 10000 || !clientId) throw new Error("invalid_google_credential");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid_google_credential");
  const header = decodeJson(parts[0]);
  const claims = decodeJson(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("invalid_google_signature");
  const key = (await googleKeys()).find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA" && candidate.alg === "RS256");
  if (!key) {
    cachedUntil = 0;
    const refreshed = await googleKeys();
    const refreshedKey = refreshed.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA" && candidate.alg === "RS256");
    if (!refreshedKey) throw new Error("unknown_google_signing_key");
    return verifyWithKey(parts, refreshedKey, claims, clientId);
  }
  return verifyWithKey(parts, key, claims, clientId);
}

async function verifyWithKey(parts, jwk, claims, clientId) {
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decodePart(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  const now = Math.floor(Date.now() / 1000);
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const audienceOk = claims.aud === clientId || (Array.isArray(claims.aud) && claims.aud.length === 1 && claims.aud[0] === clientId);
  const verifiedEmail = claims.email_verified === true || claims.email_verified === "true";
  if (!valid || !issuerOk || !audienceOk || !verifiedEmail || typeof claims.sub !== "string" || !claims.sub ||
      typeof claims.email !== "string" || !claims.email.includes("@") || !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.iat) || claims.iat > now + 60) throw new Error("invalid_google_credential");
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: typeof claims.name === "string" ? claims.name : claims.email.split("@")[0] };
}
