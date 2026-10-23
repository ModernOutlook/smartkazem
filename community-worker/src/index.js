import { verifyGoogleCredential } from "./google-auth.js";

const encoder = new TextEncoder();
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const bytesToHex = (bytes) => [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, "0")).join("");
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
async function digest(value) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
function validOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return origin === env.SITE_ORIGIN;
}
async function rateLimit(db, bucket, subject, max, seconds) {
  const stamp = Math.floor(Date.now() / 1000);
  const row = await db.prepare("SELECT count, window_started_at FROM rate_limits WHERE bucket=? AND subject=?").bind(bucket, subject).first();
  if (!row || stamp - row.window_started_at >= seconds) {
    await db.prepare("INSERT INTO rate_limits(bucket,subject,count,window_started_at) VALUES(?,?,1,?) ON CONFLICT(bucket,subject) DO UPDATE SET count=1,window_started_at=excluded.window_started_at").bind(bucket, subject, stamp).run();
    return true;
  }
  if (row.count >= max) return false;
  await db.prepare("UPDATE rate_limits SET count=count+1 WHERE bucket=? AND subject=?").bind(bucket, subject).run();
  return true;
}
function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/);
  return match ? match[1] : "";
}
async function currentUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await digest(token);
  return env.DB.prepare("SELECT u.id,u.email,u.display_name,u.email_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.disabled_at IS NULL")
    .bind(tokenHash, now()).first();
}
async function body(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 12000) throw new Error("Request too large");
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON object");
  return value;
}
function text(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
async function requireUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) return { error: json({ error: "authentication_required" }, 401) };
  if (!user.email_verified_at) return { error: json({ error: "email_verification_required" }, 403) };
  return { user };
}
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method;
  if (method === "GET" && path === "/health") return json({ ok: true, service: "smartkazem-community", version: 1 });
  if (method !== "GET" && method !== "HEAD" && !validOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403);
  if (method === "POST" && ["/auth/register","/auth/verify","/auth/login"].includes(path)) {
    return json({ error: "google_oauth_only" }, 410);
  }
  if (method === "POST" && path === "/auth/google") {
    const data = await body(request);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!(await rateLimit(env.DB, "google_auth", ip, 30, 3600))) return json({ error: "rate_limited" }, 429);
    let identity;
    try { identity = await verifyGoogleCredential(data.credential, env.GOOGLE_CLIENT_ID); }
    catch { return json({ error: "invalid_google_credential" }, 401); }
    let user = await env.DB.prepare("SELECT id,email,display_name,email_verified_at,disabled_at FROM users WHERE google_sub=?").bind(identity.sub).first();
    if (user?.disabled_at) return json({ error: "account_disabled" }, 403);
    if (!user) {
      const existing = await env.DB.prepare("SELECT id,google_sub FROM users WHERE email=? COLLATE NOCASE").bind(identity.email).first();
      if (existing) return json({ error: "account_link_required" }, 409);
      const userId = id(), stamp = now();
      const unusableHash = await digest(randomToken());
      const unusableSalt = randomToken();
      await env.DB.prepare("INSERT INTO users(id,email,display_name,password_hash,password_salt,email_verified_at,created_at,google_sub) VALUES(?,?,?,?,?,?,?,?)")
        .bind(userId, identity.email, text(identity.name, 48) || identity.email.split("@")[0], unusableHash, unusableSalt, stamp, stamp, identity.sub).run();
      user = { id: userId, email: identity.email, display_name: text(identity.name, 48) || identity.email.split("@")[0], email_verified_at: stamp };
    }
    const token = randomToken(), created = now(), expires = new Date(Date.now() + 604800000).toISOString();
    await env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)")
      .bind(id(), user.id, await digest(token), expires, created).run();
    return json({ ok: true, token, expiresAt: expires, user });
  }
  if (method === "POST" && path === "/auth/logout") {
    const token = bearerToken(request);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
    return json({ ok: true });
  }
  if (method === "GET" && path === "/auth/me") {
    const user = await currentUser(request, env);
    return user ? json({ user }) : json({ user: null });
  }

  if (method === "GET" && path === "/posts") {
    const rows = await env.DB.prepare(`SELECT p.id,p.body,p.visibility,p.created_at,u.id AS author_id,u.display_name,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL) AS comment_count,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id=p.id) AS reaction_count
      FROM posts p JOIN users u ON u.id=p.author_id
      WHERE p.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=? AND b.blocked_id=p.author_id) OR (b.blocker_id=p.author_id AND b.blocked_id=?))
      AND (p.visibility='public' OR p.author_id=? OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.followed_id=p.author_id))
      ORDER BY p.created_at DESC LIMIT 50`).bind(user.id,user.id,user.id,user.id).all();
    return json({posts:rows.results});
  }
  if (method === "POST" && path === "/posts") {
    const data=await body(request), content=text(data.body,5000), visibility=data.visibility==="followers"?"followers":"public";
    if (!content) return json({error:"empty_post"},400);
    const postId=id(), stamp=now();
    await env.DB.prepare("INSERT INTO posts(id,author_id,body,visibility,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind(postId,user.id,content,visibility,stamp,stamp).run();
    return json({post:{id:postId,body:content,visibility,created_at:stamp}},201);
  }
  const postMatch=path.match(/^\/posts\/([0-9a-f-]{36})$/);
  if (postMatch && method==="DELETE") {
    const result=await env.DB.prepare("UPDATE posts SET deleted_at=? WHERE id=? AND author_id=? AND deleted_at IS NULL").bind(now(),postMatch[1],user.id).run();
    return json({ok:result.meta.changes===1},result.meta.changes===1?200:404);
  }
  const commentMatch=path.match(/^\/posts\/([0-9a-f-]{36})\/comments$/);
  if (commentMatch && method==="GET") {
    const rows=await env.DB.prepare("SELECT c.id,c.body,c.created_at,u.id AS author_id,u.display_name FROM comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=? AND c.deleted_at IS NULL ORDER BY c.created_at LIMIT 100").bind(commentMatch[1]).all();
    return json({comments:rows.results});
  }
  if (commentMatch && method==="POST") {
    const data=await body(request), content=text(data.body,2000);
    const post=await env.DB.prepare("SELECT id FROM posts WHERE id=? AND deleted_at IS NULL").bind(commentMatch[1]).first();
    if (!post || !content) return json({error:"invalid_comment"},400);
    const commentId=id(),stamp=now();
    await env.DB.prepare("INSERT INTO comments(id,post_id,author_id,body,created_at) VALUES(?,?,?,?,?)").bind(commentId,post.id,user.id,content,stamp).run();
    return json({comment:{id:commentId,body:content,created_at:stamp}},201);
  }
  const reactionMatch=path.match(/^\/posts\/([0-9a-f-]{36})\/reaction$/);
  if (reactionMatch && method==="PUT") {
    const data=await body(request), reaction=["like","insightful","support"].includes(data.reaction)?data.reaction:null;
    if (!reaction) return json({error:"invalid_reaction"},400);
    await env.DB.prepare("INSERT INTO reactions(user_id,post_id,reaction,created_at) VALUES(?,?,?,?) ON CONFLICT(user_id,post_id) DO UPDATE SET reaction=excluded.reaction,created_at=excluded.created_at").bind(user.id,reactionMatch[1],reaction,now()).run();
    return json({ok:true});
  }
  const followMatch=path.match(/^\/users\/([0-9a-f-]{36})\/follow$/);
  if (followMatch && method==="PUT") {
    if (followMatch[1]===user.id) return json({error:"cannot_follow_self"},400);
    await env.DB.prepare("INSERT OR IGNORE INTO follows(follower_id,followed_id,created_at) VALUES(?,?,?)").bind(user.id,followMatch[1],now()).run();
    return json({ok:true});
  }
  if (followMatch && method==="DELETE") {
    await env.DB.prepare("DELETE FROM follows WHERE follower_id=? AND followed_id=?").bind(user.id,followMatch[1]).run();
    return json({ok:true});
  }
  const blockMatch=path.match(/^\/users\/([0-9a-f-]{36})\/block$/);
  if (blockMatch && method==="PUT") {
    if (blockMatch[1]===user.id) return json({error:"cannot_block_self"},400);
    await env.DB.prepare("INSERT OR IGNORE INTO blocks(blocker_id,blocked_id,created_at) VALUES(?,?,?)").bind(user.id,blockMatch[1],now()).run();
    await env.DB.prepare("DELETE FROM follows WHERE (follower_id=? AND followed_id=?) OR (follower_id=? AND followed_id=?)").bind(user.id,blockMatch[1],blockMatch[1],user.id).run();
    return json({ok:true});
  }
  if (blockMatch && method==="DELETE") {
    await env.DB.prepare("DELETE FROM blocks WHERE blocker_id=? AND blocked_id=?").bind(user.id,blockMatch[1]).run();
    return json({ok:true});
  }
  if (method==="POST" && path==="/reports") {
    const data=await body(request), type=["post","comment","user"].includes(data.targetType)?data.targetType:null, target=text(data.targetId,64), reason=text(data.reason,1000);
    if (!type || !target || reason.length<5) return json({error:"invalid_report"},400);
    await env.DB.prepare("INSERT INTO reports(id,reporter_id,target_type,target_id,reason,created_at) VALUES(?,?,?,?,?,?)").bind(id(),user.id,type,target,reason,now()).run();
    return json({ok:true},201);
  }
  return json({error:"not_found"},404);
}
export default {
  async fetch(request, env) {
    try {
      const origin = request.headers.get("Origin");
      if (request.method === "OPTIONS") {
        if (!validOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403);
        const requestedMethod = (request.headers.get("Access-Control-Request-Method") || "").toUpperCase();
        if (!["GET", "POST", "PUT", "DELETE"].includes(requestedMethod)) return json({ error: "method_not_allowed" }, 403);
        const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") || "").toLowerCase().split(",").map((v) => v.trim()).filter(Boolean);
        if (requestedHeaders.some((header) => !["authorization", "content-type"].includes(header))) return json({ error: "headers_not_allowed" }, 403);
        return new Response(null, { status: 204, headers: {
          "access-control-allow-origin": env.SITE_ORIGIN,
          "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
          "access-control-allow-headers": "Authorization, Content-Type",
          "access-control-max-age": "600",
          "vary": "Origin"
        }});
      }
      const response = await route(request, env);
      response.headers.set("x-content-type-options", "nosniff");
      response.headers.set("referrer-policy", "no-referrer");
      response.headers.set("cache-control", "no-store");
      if (origin === env.SITE_ORIGIN) {
        response.headers.set("access-control-allow-origin", env.SITE_ORIGIN);
        response.headers.set("vary", "Origin");
      }
      return response;
    } catch (error) {
      console.error("community_api_error", error?.message || "unknown");
      return json({ error: "internal_error" }, 500);
    }
  }
};
