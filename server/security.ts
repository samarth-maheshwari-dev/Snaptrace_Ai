import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import type { SessionUser } from "./types";

/* ======================================================================
 * Authentication: Google Sign-In, no passwords anywhere.
 *
 *  browser ──(Google button)──► Google ──► ID token (JWT signed by Google)
 *  browser ──POST /api/auth/google {credential}──► server
 *  server: verifyIdToken() checks Google's signature, audience (our client id),
 *          issuer, expiry, and email_verified. Then it sets OUR session cookie.
 *
 * Session cookie = base64url(payload).HMAC-SHA256(payload, SESSION_SECRET)
 *   httpOnly  → JS (and any XSS) can't read it
 *   secure    → HTTPS only in production
 *   sameSite=lax + required X-Requested-With header on writes → CSRF-safe
 *
 * Admin = email listed in ADMIN_EMAILS. The role is re-derived from env on EVERY
 * request, so removing an email from the env revokes admin instantly.
 * ====================================================================== */

const isProd = process.env.NODE_ENV === "production";
export const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID ?? "").trim();

const SECRET = process.env.SESSION_SECRET ?? "";
if (isProd && SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set (32+ chars) in production.");
}
// Dev without a secret: random per boot (sessions just reset on restart).
const KEY = SECRET || crypto.randomBytes(32).toString("hex");

const csv = (v?: string) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const ADMIN_EMAILS = new Set(csv(process.env.ADMIN_EMAILS));
/** Optional: restrict sign-in to college domains, e.g. "college.edu,student.college.edu". Admins always allowed. */
const ALLOWED_DOMAINS = csv(process.env.ALLOWED_EMAIL_DOMAINS);

/** Dev-only shortcut so the app can be tried without Google OAuth set up. Impossible to enable in production. */
export const devLoginEnabled = !isProd && process.env.DEV_LOGIN === "1";

export const authConfigured = Boolean(GOOGLE_CLIENT_ID) || devLoginEnabled;

const COOKIE = "st_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sign = (payload: string) => crypto.createHmac("sha256", KEY).update(payload).digest("base64url");

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export const isAdminEmail = (email: string) => ADMIN_EMAILS.has(email.toLowerCase());

export function emailAllowed(email: string) {
  const e = email.toLowerCase();
  if (isAdminEmail(e) || ALLOWED_DOMAINS.length === 0) return true;
  const domain = e.split("@")[1] ?? "";
  return ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

type TokenBody = Omit<SessionUser, "role"> & { exp: number };

export function createSessionToken(user: Omit<SessionUser, "role">, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: now + TTL_MS } satisfies TokenBody)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()): SessionUser | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString()) as TokenBody;
    if (typeof body.exp !== "number" || body.exp < now || !body.sub || !body.email) return null;
    if (!emailAllowed(body.email)) return null;
    return { sub: body.sub, email: body.email, name: body.name, picture: body.picture, role: isAdminEmail(body.email) ? "admin" : "user" };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, user: Omit<SessionUser, "role">) {
  res.cookie(COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

/* ---------------- Google ID token verification ---------------- */
const google = new OAuth2Client();

export class AuthError extends Error {}

export async function verifyGoogleCredential(credential: string): Promise<Omit<SessionUser, "role">> {
  if (!GOOGLE_CLIENT_ID) throw new AuthError("Google sign-in is not configured on this server.");
  let payload;
  try {
    const ticket = await google.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new AuthError("Google sign-in could not be verified. Please try again.");
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new AuthError("Your Google account email is not verified.");
  }
  if (!emailAllowed(payload.email)) {
    throw new AuthError("Please sign in with your college email address.");
  }
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: payload.name ?? payload.email.split("@")[0], picture: payload.picture };
}

/* ---------------- Middleware ---------------- */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser | null;
    }
  }
}

/** Attaches req.user (or null) from the session cookie. */
export function session(req: Request, _res: Response, next: NextFunction) {
  req.user = readSessionToken(req.cookies?.[COOKIE]);
  next();
}

/**
 * CSRF defence for cookie auth: every state-changing request must carry a custom header.
 * Browsers can't add custom headers to cross-site form posts, and a cross-site fetch with
 * one triggers a CORS preflight that we never approve.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("X-Requested-With") !== "snaptrace") {
    res.status(403).json({ error: "Missing CSRF header." });
    return;
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Please sign in first." });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Please sign in first." });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Staff only." });
    return;
  }
  next();
}

/* ---------------- Rate limiting (in-memory, per user or IP) ---------------- */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; reset: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // Per account when signed in (stops one user rotating IPs), else per IP.
    const key = req.user?.sub ?? req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.reset - now) / 1000));
      res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
      return;
    }
    next();
  };
}

/* ---------------- Image validation ---------------- */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return null;
}
