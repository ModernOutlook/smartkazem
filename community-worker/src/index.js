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
async function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 600000 }, material, 256);
  return bytesToHex(bits);
}
function cookie(token, maxAge) {
  return `sk_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function getCookie(request, name) {
  const value = request.headers.get("Cookie") || "";
  const match = value.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : "";
}
function validOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || origin === env.SITE_ORIGIN;
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
async function captcha(request, env, token) {
  if (env.TURNSTILE_ENABLED !== "true") return true;
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;
  const data = new FormData();
  data.set("secret", env.TURNSTILE_SECRET_KEY);
  data.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) data.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: data });
    return response.ok && (await response.json()).success === true;
  } catch { return false; }
}
async function sendMail(env, to, subject, html) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error("Mail service is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html })
  });
  if (!response.ok) throw new Error("Mail delivery failed");
}
async function currentUser(request, env) {
  const token = getCookie(request, "sk_session");
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
  if (!validOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403);
  if (method === "POST" && path === "/auth/register") {
    const data = await body(request);
    const email = text(data.email, 254).toLowerCase();
    const displayName = text(data.displayName, 48);
    const password = typeof data.password === "string" ? data.password : "";
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!(await rateLimit(env.DB, "register", ip, 5, 3600))) return json({ error: "rate_limited" }, 429);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || displayName.length < 2 || password.length < 12 || password.length > 128)
      return json({ error: "invalid_registration" }, 400);
    if (!(await captcha(request, env, data.turnstileToken))) return json({ error: "captcha_failed" }, 400);
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (exists) return json({ ok: true, message: "If the address is eligible, verification instructions will be sent." }, 202);
    const userId = id(), salt = randomToken(), token = randomToken(), created = now();
    const hash = await passwordHash(password, salt);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users(id,email,display_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)").bind(userId,email,displayName,hash,salt,created),
      env.DB.prepare("INSERT INTO email_verifications(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)").bind(id(),userId,await digest(token),new Date(Date.now()+86400000).toISOString(),created)
    ]);
    const verifyUrl = new URL("/?community-verify=" + encodeURIComponent(token), env.SITE_ORIGIN).toString();
    await sendMail(env,email,"Verify your SmartKazem account",`<p>Confirm your email to activate your account.</p><p><a href="${verifyUrl}">Verify email</a></p>`);
    return json({ ok: true, message: "verification_sent" }, 202);
  }
  if (method === "POST" && path === "/auth/verify") {
    const data = await body(request), token = text(data.token, 200);
    if (!token) return json({ error: "invalid_token" }, 400);
    const row = await env.DB.prepare("SELECT id,user_id FROM email_verifications WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?").bind(await digest(token),now()).first();
    if (!row) return json({ error: "invalid_or_expired_token" }, 400);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET email_verified_at=? WHERE id=?").bind(now(),row.user_id),
      env.DB.prepare("UPDATE email_verifications SET consumed_at=? WHERE id=?").bind(now(),row.id)
    ]);
    return json({ ok: true });
  }
  if (method === "POST" && path === "/auth/login") {
    const data = await body(request), email = text(data.email,254).toLowerCase(), password = typeof data.password === "string" ? data.password : "";
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!(await rateLimit(env.DB,"login",ip,12,900))) return json({ error: "rate_limited" },429);
    if (!(await captcha(request,env,data.turnstileToken))) return json({ error: "captcha_failed" },400);
    const user = await env.DB.prepare("SELECT id,password_hash,password_salt,email_verified_at,disabled_at FROM users WHERE email=?").bind(email).first();
    const candidate = user ? await passwordHash(password,user.password_salt) : await passwordHash(password || "invalid-password", "constant-work-salt");
    if (!user || user.disabled_at || candidate !== user.password_hash) return json({ error: "invalid_credentials" },401);
    if (!user.email_verified_at) return json({ error: "email_verification_required" },403);
    const token = randomToken(), created = now(), expires = new Date(Date.now()+604800000).toISOString();
    await env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)").bind(id(),user.id,await digest(token),expires,created).run();
    return json({ ok: true },200,{ "set-cookie": cookie(token,604800) });
  }
  if (method === "POST" && path === "/auth/logout") {
    const token=getCookie(request,"sk_session");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
    return json({ok:true},200,{"set-cookie":cookie("",0)});
  }
  if (method === "GET" && path === "/auth/me") {
    const user=await currentUser(request,env);
    return user ? json({user}) : json({user:null});
  }

  const auth = await requireUser(request,env);
  if (auth.error) return auth.error;
  const user = auth.user;

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
      if (request.method==="OPTIONS") return new Response(null,{status:204,headers:{"allow":"GET,POST,PUT,DELETE,OPTIONS"}});
      const response=await route(request,env);
      response.headers.set("x-content-type-options","nosniff");
      response.headers.set("referrer-policy","no-referrer");
      response.headers.set("cache-control","no-store");
      return response;
    } catch (error) {
      console.error("community_api_error", error?.message || "unknown");
      return json({error:"internal_error"},500);
    }
  }
};
