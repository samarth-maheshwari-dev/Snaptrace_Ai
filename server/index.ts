import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { z } from "zod";
import { AiUnavailableError, aiEnabled, aiModel, describeFromText, describeImage, embed } from "./gemini";
import { embeddingText } from "./matching";
import { findMatches, type Query } from "./matcher";
import {
  AuthError, GOOGLE_CLIENT_ID, MAX_IMAGE_BYTES, authConfigured, clearSessionCookie, csrfGuard, devLoginEnabled,
  emailAllowed, isAdminEmail, rateLimit, requireAdmin, requireUser, session, setSessionCookie, sniffImage,
  verifyGoogleCredential,
} from "./security";
import { JsonStore, createStore, type StoredImage } from "./store";
import { CATEGORIES, type Descriptor, type Item, type PublicItem, type SessionUser } from "./types";

const PORT = Number(process.env.PORT ?? 3000);
const isProd = process.env.NODE_ENV === "production";

const db = createStore();
const app = express();

app.disable("x-powered-by");
if (isProd) app.set("trust proxy", 1); // behind Render's proxy: real client IP for rate limits

const supabaseOrigin = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : null;
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "https://accounts.google.com/gsi/client"],
            "frame-src": ["https://accounts.google.com/gsi/"],
            "connect-src": ["'self'", "https://accounts.google.com/gsi/"],
            "img-src": ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com", ...(supabaseOrigin ? [supabaseOrigin] : [])],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com/gsi/style"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
          },
        }
      : false, // Vite dev server injects inline scripts
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Google sign-in popup
  }),
);
app.use(express.json({ limit: "8mb" })); // 5 MB image ≈ 6.7 MB as base64
app.use(cookieParser());
if (db instanceof JsonStore) {
  app.use("/uploads", express.static(db.uploadDir, { maxAge: "7d", index: false, fallthrough: false }));
}
app.use("/api", session, csrfGuard);

/** Express 4 doesn't catch async errors; forward them to the error handler. */
const ah = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res).catch(next); };

/* ---------- helpers ---------- */
function toPublic(item: Item, viewer?: SessionUser | null): PublicItem {
  const { contact_email: _e, contact_name, embedding: _v, reporter_id, ...rest } = item;
  return { ...rest, reporter: contact_name.split(" ")[0], mine: !!viewer && viewer.sub === reporter_id };
}

function badRequest(res: Response, err: z.ZodError) {
  res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input" });
}

const itemQuery = (i: Item): Query => ({
  id: i.id, title: i.title, descriptor: i.descriptor_json, embedding: i.embedding, type: i.type, date: i.date_occurred,
});
const openOpposite = async (type: Item["type"]) => (await db.items()).filter((i) => i.type !== type && i.status !== "resolved");
const loadImage = (url: string) => db.getImage(url);
const byNewest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);

/**
 * Uploaded photos live in memory for up to an hour, keyed by id AND owner, so a client
 * can't forge or borrow a descriptor. Search photos are never persisted; a photo is only
 * written to storage when it becomes part of a posted report.
 */
interface Analysed { owner: string; image: StoredImage & { ext: string }; descriptor: Descriptor | null; embedding?: number[]; at: number }
const analysed = new Map<string, Analysed>();
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [k, v] of analysed) if (v.at < cutoff) analysed.delete(k);
}, 10 * 60 * 1000).unref();

/* ---------- auth ---------- */
app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.user ?? null, googleClientId: GOOGLE_CLIENT_ID || null, devLogin: devLoginEnabled });
});

app.post("/api/auth/google", rateLimit({ windowMs: 15 * 60_000, max: 20 }), ah(async (req, res) => {
  const credential = typeof req.body?.credential === "string" ? req.body.credential : "";
  if (!credential) return res.status(400).json({ error: "Missing credential." });
  try {
    const user = await verifyGoogleCredential(credential);
    setSessionCookie(res, user);
    res.json({ user: { ...user, role: isAdminEmail(user.email) ? "admin" : "user" } });
  } catch (e) {
    res.status(401).json({ error: e instanceof AuthError ? e.message : "Sign-in failed." });
  }
}));

if (devLoginEnabled) {
  // Local development only (guarded in security.ts: never when NODE_ENV=production).
  app.post("/api/auth/dev", (req, res) => {
    const email = z.string().email().safeParse(req.body?.email);
    if (!email.success || !emailAllowed(email.data)) return res.status(400).json({ error: "Enter a valid allowed email." });
    const user = { sub: `dev:${email.data.toLowerCase()}`, email: email.data.toLowerCase(), name: email.data.split("@")[0] };
    setSessionCookie(res, user);
    res.json({ user: { ...user, role: isAdminEmail(user.email) ? "admin" : "user" } });
  });
}

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/* ---------- public API ---------- */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiEnabled, model: aiEnabled ? aiModel : null, auth: authConfigured, storage: db.kind });
});

const ListQuery = z.object({
  type: z.enum(["lost", "found"]).optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(["open", "claimed", "resolved"]).optional(),
  q: z.string().max(80).optional(),
  mine: z.literal("1").optional(),
});

app.get("/api/items", ah(async (req, res) => {
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { type, category, status, q, mine } = parsed.data;
  if (mine && !req.user) return res.status(401).json({ error: "Please sign in first." });
  const needle = q?.toLowerCase().trim();

  const items = (await db.items())
    .filter((i) => (!type || i.type === type) && (!category || i.category === category) && (!status || i.status === status))
    .filter((i) => !mine || i.reporter_id === req.user?.sub)
    .filter((i) => !needle || `${i.title} ${i.location} ${i.description ?? ""}`.toLowerCase().includes(needle))
    .sort(byNewest)
    .map((i) => toPublic(i, req.user));
  res.json(items);
}));

app.get("/api/items/:id", ah(async (req, res) => {
  const item = await db.item(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  // Page views use the deterministic scorer (+ cached AI verdicts) — no fresh AI cost per view.
  const matches = await findMatches(itemQuery(item), await openOpposite(item.type), {
    limit: 4, verify: false, toPublic: (i) => toPublic(i, req.user),
  });
  res.json({ item: toPublic(item, req.user), matches });
}));

/* ---------- signed-in API ---------- */
const ImageBody = z.object({ base64: z.string().min(100, "Image is empty") });

app.post("/api/images", requireUser, rateLimit({ windowMs: 60_000, max: 15 }), ah(async (req, res) => {
  const parsed = ImageBody.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  const buf = Buffer.from(parsed.data.base64, "base64");
  if (buf.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: "Image must be under 5 MB." });
  const kind = sniffImage(buf);
  if (!kind) return res.status(415).json({ error: "Only JPEG, PNG or WEBP images are allowed." });

  let descriptor: Descriptor | null = null;
  let aiError: string | null = null;
  try {
    descriptor = await describeImage(parsed.data.base64, kind.mime);
  } catch (e) {
    aiError = e instanceof AiUnavailableError ? "AI is not configured on this server." : "AI could not read this photo.";
    if (!(e instanceof AiUnavailableError)) console.error("[gemini]", e);
  }
  const embedding = descriptor ? await embed(embeddingText(descriptor)) : undefined;
  const id = crypto.randomUUID();
  analysed.set(id, { owner: req.user!.sub, image: { base64: parsed.data.base64, mime: kind.mime, ext: kind.ext }, descriptor, embedding, at: Date.now() });
  res.status(201).json({ imageId: id, descriptor, aiError });
}));

const NewItem = z.object({
  type: z.enum(["lost", "found"]),
  title: z.string().trim().min(3, "Title is too short").max(80),
  category: z.enum(CATEGORIES),
  location: z.string().trim().min(2, "Location is required").max(120),
  date_occurred: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  description: z.string().trim().max(500).optional(),
  image_id: z.string().uuid().optional(),
});

app.post("/api/items", requireUser, rateLimit({ windowMs: 60_000, max: 10 }), ah(async (req, res) => {
  const parsed = NewItem.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const { image_id, ...fields } = parsed.data;
  const user = req.user!;

  // +1 day tolerance for timezones; anything later is a typo.
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (fields.date_occurred > tomorrow) return res.status(400).json({ error: "Date can't be in the future." });

  const upload = image_id ? analysed.get(image_id) : undefined;
  if (image_id && (!upload || upload.owner !== user.sub)) return res.status(400).json({ error: "Photo expired, please upload it again." });

  // Photo descriptor is stronger evidence; the user's own words are added as extra features.
  let descriptor = upload?.descriptor ?? describeFromText(fields);
  if (upload?.descriptor && fields.description) {
    descriptor = { ...descriptor, distinctiveFeatures: [...descriptor.distinctiveFeatures, fields.description].slice(0, 8) };
  }
  const embedding = (upload?.descriptor && !fields.description ? upload.embedding : undefined) ?? (await embed(embeddingText(descriptor, fields.title)));

  const id = crypto.randomUUID();
  const image_url = upload ? await db.putImage(`${id}.${upload.image.ext}`, Buffer.from(upload.image.base64, "base64"), upload.image.mime) : undefined;

  const item: Item = {
    ...fields,
    id,
    contact_email: user.email, // from the verified Google account, not a form field
    contact_name: user.name,
    reporter_id: user.sub,
    image_url,
    descriptor_json: descriptor,
    embedding,
    status: "open",
    created_at: new Date().toISOString(),
  };
  await db.addItem(item);
  if (image_id) analysed.delete(image_id);

  const matches = await findMatches({ ...itemQuery(item), image: upload?.image }, await openOpposite(item.type), {
    limit: 3, verify: true, toPublic: (i) => toPublic(i, user), loadImage,
  });
  res.status(201).json({ item: toPublic(item, user), matches });
}));

/** SnapSearch: compare an analysed photo against found items. */
app.post("/api/search", requireUser, rateLimit({ windowMs: 60_000, max: 15 }), ah(async (req, res) => {
  const parsed = z.object({ image_id: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const upload = analysed.get(parsed.data.image_id);
  if (!upload || upload.owner !== req.user!.sub) return res.status(400).json({ error: "Photo expired, please upload it again." });
  if (!upload.descriptor) return res.status(503).json({ error: "AI is not available, so photo search can't run right now." });

  const found = (await db.items()).filter((i) => i.type === "found" && i.status !== "resolved");
  const matches = await findMatches(
    { id: `upload:${parsed.data.image_id}`, descriptor: upload.descriptor, embedding: upload.embedding, type: "lost", image: upload.image },
    found,
    { limit: 8, verify: true, toPublic: (i) => toPublic(i, req.user), loadImage },
  );
  res.json({ descriptor: upload.descriptor, matches });
}));

const NewClaim = z.object({
  item_id: z.string().min(1),
  student_id: z.string().trim().min(3, "Enter your student / staff ID").max(30),
  phone: z.string().trim().max(20).optional(),
  proof_text: z.string().trim().min(20, "Describe the item in a bit more detail (20+ characters)").max(1000),
});

app.post("/api/claims", requireUser, rateLimit({ windowMs: 10 * 60_000, max: 5 }), ah(async (req, res) => {
  const parsed = NewClaim.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const user = req.user!;
  const item = await db.item(parsed.data.item_id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.type !== "found") return res.status(400).json({ error: "Only found items can be claimed." });
  if (item.status === "resolved") return res.status(409).json({ error: "This item was already returned." });
  if (item.reporter_id === user.sub) return res.status(400).json({ error: "You reported this item yourself." });
  if ((await db.claims()).some((c) => c.item_id === item.id && c.claimer_id === user.sub && c.status === "pending")) {
    return res.status(409).json({ error: "You already have a pending claim on this item." });
  }

  await db.addClaim({
    ...parsed.data,
    id: crypto.randomUUID(),
    claimer_id: user.sub,
    claimer_name: user.name,
    claimer_email: user.email,
    status: "pending",
    created_at: new Date().toISOString(),
  });
  if (item.status === "open") await db.updateItem(item.id, { status: "claimed" });
  // Contact details are NOT returned. Staff verify the proof first.
  res.status(201).json({ ok: true });
}));

app.get("/api/claims/mine", requireUser, ah(async (req, res) => {
  const items = new Map((await db.items()).map((i) => [i.id, i]));
  res.json(
    (await db.claims())
      .filter((c) => c.claimer_id === req.user!.sub)
      .map(({ id, item_id, status, created_at }) => {
        const item = items.get(item_id);
        return { id, status, created_at, item: item ? toPublic(item, req.user) : null };
      })
      .sort(byNewest),
  );
}));

/* ---------- admin API ---------- */
const admin = express.Router();
admin.use(requireAdmin);
const withoutEmbedding = ({ embedding: _e, ...rest }: Item) => rest;

admin.get("/items", ah(async (_req, res) => {
  res.json((await db.items()).sort(byNewest).map(withoutEmbedding));
}));

admin.patch("/items/:id", ah(async (req, res) => {
  const parsed = z.object({ status: z.enum(["open", "claimed", "resolved"]) }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const item = await db.updateItem(req.params.id, { status: parsed.data.status });
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json({ ok: true });
}));

admin.delete("/items/:id", ah(async (req, res) => {
  if (!(await db.deleteItem(req.params.id))) return res.status(404).json({ error: "Item not found" });
  res.json({ ok: true });
}));

admin.get("/claims", ah(async (_req, res) => {
  const items = new Map((await db.items()).map((i) => [i.id, i]));
  res.json(
    (await db.claims())
      .map((c) => {
        const item = items.get(c.item_id);
        return { ...c, item: item ? withoutEmbedding(item) : undefined };
      })
      .sort(byNewest),
  );
}));

admin.post("/claims/:id/:decision", ah(async (req, res) => {
  const decision = req.params.decision;
  if (decision !== "approve" && decision !== "reject") return res.status(404).json({ error: "Unknown action" });
  const claim = await db.claim(req.params.id);
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  if (claim.status !== "pending") return res.status(409).json({ error: `Claim is already ${claim.status}.` });

  const siblings = (await db.claims()).filter((c) => c.item_id === claim.item_id && c.id !== claim.id && c.status === "pending");
  if (decision === "approve") {
    await db.updateClaim(claim.id, { status: "approved" });
    await db.updateItem(claim.item_id, { status: "resolved" });
    // One item, one owner: close out competing claims.
    for (const other of siblings) await db.updateClaim(other.id, { status: "rejected" });
  } else {
    await db.updateClaim(claim.id, { status: "rejected" });
    if (siblings.length === 0) await db.updateItem(claim.item_id, { status: "open" });
  }
  res.json({ ok: true });
}));

admin.get("/stats", ah(async (_req, res) => {
  const items = await db.items();
  const claims = await db.claims();
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: d.toLocaleDateString("en-IN", { weekday: "short" }), posted: items.filter((x) => x.created_at.startsWith(key)).length };
  });
  const byCategory = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => ((acc[i.category] = (acc[i.category] ?? 0) + 1), acc), {}),
  ).map(([name, value]) => ({ name, value }));
  const resolved = items.filter((i) => i.status === "resolved").length;

  res.json({
    total: items.length,
    openLost: items.filter((i) => i.type === "lost" && i.status === "open").length,
    openFound: items.filter((i) => i.type === "found" && i.status === "open").length,
    pendingClaims: claims.filter((c) => c.status === "pending").length,
    resolved,
    recoveryRate: items.length ? Math.round((resolved / items.length) * 100) : 0,
    postsLast7Days: days,
    byCategory,
  });
}));

app.use("/api/admin", admin);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Last-resort error handler: log details server-side, never leak them to clients.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode;
  if (status && status >= 400 && status < 500) {
    // e.g. missing upload file, malformed JSON body: a client error, not a crash.
    if (!res.headersSent) res.status(status).json({ error: status === 404 ? "Not found" : "Bad request" });
    return;
  }
  console.error("[error]", err);
  if (!res.headersSent) res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

/* ---------- startup ---------- */
/** Seed/old items have no embeddings yet; fill them in the background when AI is on. */
async function backfillEmbeddings() {
  if (!aiEnabled) return;
  for (const item of await db.items()) {
    if (item.embedding || !item.descriptor_json) continue;
    const v = await embed(embeddingText(item.descriptor_json, item.title));
    if (!v) return; // API problem: stop, retry next boot
    await db.updateItem(item.id, { embedding: v });
  }
}

async function start() {
  await db.init();
  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve("dist");
    app.use(express.static(dist, { index: false }));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.listen(PORT, () => {
    console.log(`SnapTrace on http://localhost:${PORT}`);
    console.log(`  Storage: ${db.kind}`);
    console.log(`  AI: ${aiEnabled ? aiModel : "off (set GEMINI_API_KEY)"}`);
    console.log(`  Auth: ${GOOGLE_CLIENT_ID ? "Google" : devLoginEnabled ? "DEV LOGIN (local only)" : "off (set GOOGLE_CLIENT_ID)"}`);
  });
  backfillEmbeddings().catch((e) => console.error("[backfill]", e));
}

start().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
