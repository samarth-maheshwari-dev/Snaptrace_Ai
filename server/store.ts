import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSeedItems } from "./seed";
import type { Claim, Item } from "./types";

/**
 * Persistence behind one interface:
 *   - SupabaseStore: Postgres tables + Storage bucket (production / live).
 *   - JsonStore:     ./data/db.json + ./data/uploads (local dev, zero setup).
 * Routes only ever talk to `Store`, so swapping backends touches nothing else.
 */
export interface StoredImage { base64: string; mime: string }

export interface Store {
  readonly kind: "supabase" | "json";
  init(): Promise<void>;
  items(): Promise<Item[]>;
  item(id: string): Promise<Item | undefined>;
  addItem(item: Item): Promise<void>;
  updateItem(id: string, patch: Partial<Item>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  claims(): Promise<Claim[]>;
  claim(id: string): Promise<Claim | undefined>;
  addClaim(claim: Claim): Promise<void>;
  updateClaim(id: string, patch: Partial<Claim>): Promise<void>;
  /** Saves an item photo, returns the URL to store on the item. */
  putImage(name: string, buf: Buffer, mime: string): Promise<string>;
  /** Loads a stored photo (for AI verification). Undefined for seed SVGs / missing files. */
  getImage(url: string): Promise<StoredImage | undefined>;
}

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const mimeOf = (url: string) => MIME[path.extname(url.split("?")[0]).slice(1).toLowerCase()];

/** Postgres returns null for empty columns; our types use undefined. */
function clean<T extends object>(row: T): T {
  for (const k of Object.keys(row) as (keyof T)[]) if (row[k] === null) delete row[k];
  return row;
}

/* ============================== Supabase ============================== */
const BUCKET = "item-images";

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  private sb: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    // Service-role key bypasses RLS. It lives ONLY on the server; tables have RLS on with
    // no policies, so the public anon key can read nothing even if someone finds it.
    this.sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private check<T>(r: { data: T; error: { message: string } | null }, what: string): T {
    if (r.error) throw new Error(`[supabase] ${what}: ${r.error.message}`);
    return r.data;
  }

  async init() {
    // A real (non-HEAD) query so connection/key/table problems surface with a readable message.
    const { data, error } = await this.sb.from("items").select("id").limit(1);
    if (error) {
      const hint = /relation|does not exist|schema cache/i.test(error.message)
        ? "Tables missing: run supabase/schema.sql in the Supabase SQL Editor."
        : /invalid api key|jwt|unauthor/i.test(error.message)
          ? "Key rejected: SUPABASE_SERVICE_ROLE_KEY must be the project's SECRET key."
          : "Check SUPABASE_URL is the Project URL (https://<ref>.supabase.co).";
      throw new Error(`[supabase] ${error.message}\n  → ${hint}`);
    }
    if (!data?.length) {
      this.check(await this.sb.from("items").insert(buildSeedItems()), "seed");
      console.log("  Seeded demo items into Supabase.");
    }
  }

  async items() {
    return (this.check(await this.sb.from("items").select("*"), "list items") as Item[]).map(clean);
  }
  async item(id: string) {
    const row = this.check(await this.sb.from("items").select("*").eq("id", id).maybeSingle(), "get item") as Item | null;
    return row ? clean(row) : undefined;
  }
  async addItem(item: Item) {
    this.check(await this.sb.from("items").insert(item), "insert item");
  }
  async updateItem(id: string, patch: Partial<Item>) {
    const row = this.check(await this.sb.from("items").update(patch).eq("id", id).select().maybeSingle(), "update item") as Item | null;
    return row ? clean(row) : undefined;
  }
  async deleteItem(id: string) {
    const item = await this.item(id);
    if (!item) return false;
    this.check(await this.sb.from("items").delete().eq("id", id), "delete item"); // claims cascade in SQL
    if (item.image_url?.includes(`/${BUCKET}/`)) {
      await this.sb.storage.from(BUCKET).remove([item.image_url.split(`/${BUCKET}/`)[1]]);
    }
    return true;
  }
  async claims() {
    return (this.check(await this.sb.from("claims").select("*"), "list claims") as Claim[]).map(clean);
  }
  async claim(id: string) {
    const row = this.check(await this.sb.from("claims").select("*").eq("id", id).maybeSingle(), "get claim") as Claim | null;
    return row ? clean(row) : undefined;
  }
  async addClaim(claim: Claim) {
    this.check(await this.sb.from("claims").insert(claim), "insert claim");
  }
  async updateClaim(id: string, patch: Partial<Claim>) {
    this.check(await this.sb.from("claims").update(patch).eq("id", id), "update claim");
  }
  async putImage(name: string, buf: Buffer, mime: string) {
    const { error } = await this.sb.storage.from(BUCKET).upload(name, buf, { contentType: mime, upsert: false });
    if (error) throw new Error(`[supabase] upload: ${error.message}`);
    return this.sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  }
  async getImage(url: string) {
    const mime = mimeOf(url);
    if (!mime || !url.includes(`/${BUCKET}/`)) return undefined;
    const { data } = await this.sb.storage.from(BUCKET).download(url.split(`/${BUCKET}/`)[1]);
    return data ? { base64: Buffer.from(await data.arrayBuffer()).toString("base64"), mime } : undefined;
  }
}

/* ============================== Local JSON ============================== */
interface DbShape { items: Item[]; claims: Claim[] }

export class JsonStore implements Store {
  readonly kind = "json" as const;
  private data: DbShape = { items: [], claims: [] };
  private file: string;
  readonly uploadDir: string;

  constructor(dir: string) {
    this.file = path.join(dir, "db.json");
    this.uploadDir = path.join(dir, "uploads");
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async init() {
    if (fs.existsSync(this.file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.file, "utf-8"));
        return;
      } catch (e) {
        console.error(`[store] ${this.file} is corrupt, starting from seed`, e);
      }
    }
    this.data = { items: buildSeedItems(), claims: [] };
    this.write();
  }

  /** Atomic: write temp file then rename, so a crash can't corrupt the db. */
  private write() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  async items() { return this.data.items; }
  async item(id: string) { return this.data.items.find((i) => i.id === id); }
  async addItem(item: Item) { this.data.items.push(item); this.write(); }
  async updateItem(id: string, patch: Partial<Item>) {
    const item = this.data.items.find((i) => i.id === id);
    if (!item) return undefined;
    Object.assign(item, patch);
    this.write();
    return item;
  }
  async deleteItem(id: string) {
    const before = this.data.items.length;
    const url = this.data.items.find((i) => i.id === id)?.image_url;
    if (url?.startsWith("/uploads/")) fs.rmSync(path.join(this.uploadDir, path.basename(url)), { force: true });
    this.data.items = this.data.items.filter((i) => i.id !== id);
    this.data.claims = this.data.claims.filter((c) => c.item_id !== id);
    this.write();
    return this.data.items.length < before;
  }
  async claims() { return this.data.claims; }
  async claim(id: string) { return this.data.claims.find((c) => c.id === id); }
  async addClaim(claim: Claim) { this.data.claims.push(claim); this.write(); }
  async updateClaim(id: string, patch: Partial<Claim>) {
    const c = this.data.claims.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
    this.write();
  }
  async putImage(name: string, buf: Buffer) {
    fs.writeFileSync(path.join(this.uploadDir, path.basename(name)), buf);
    return `/uploads/${path.basename(name)}`;
  }
  async getImage(url: string) {
    const mime = mimeOf(url);
    if (!mime || !url.startsWith("/uploads/")) return undefined;
    const file = path.join(this.uploadDir, path.basename(url)); // basename: no path traversal
    return fs.existsSync(file) ? { base64: fs.readFileSync(file).toString("base64"), mime } : undefined;
  }
}

/**
 * Accepts what people actually paste: "https://x.supabase.co", ".../rest/v1/", quotes, trailing
 * slashes, or the dashboard URL. supabase-js needs the bare project origin.
 */
export function normaliseSupabaseUrl(raw: string): string {
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  let u: URL;
  try {
    u = new URL(v.startsWith("http") ? v : `https://${v}`);
  } catch {
    throw new Error("SUPABASE_URL is not a valid URL. Use the Project URL, e.g. https://abcd1234.supabase.co");
  }
  // Dashboard link: https://supabase.com/dashboard/project/<ref>/...
  const dash = u.pathname.match(/\/project\/([a-z0-9]{15,})/);
  if (u.hostname.endsWith("supabase.com") && dash) return `https://${dash[1]}.supabase.co`;
  return u.origin;
}

export function createStore(): Store {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (url && key) {
    if (key.startsWith("sb_publishable_")) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY has the publishable key. Use the SECRET key (sb_secret_...).");
    }
    return new SupabaseStore(normaliseSupabaseUrl(url), key);
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("  ⚠ No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY: using local JSON — data is lost on redeploy.");
  }
  return new JsonStore(path.resolve(process.env.DATA_DIR ?? "data"));
}
