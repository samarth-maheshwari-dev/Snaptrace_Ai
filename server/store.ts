import fs from "node:fs";
import path from "node:path";
import { buildSeedItems } from "./seed";
import type { Claim, Item } from "./types";

/**
 * Tiny JSON-file store for local development.
 * - Lives in ./data (gitignored), NOT in /public — the old version served the whole
 *   database, including emails, as a static file at /uploads/items.json.
 * - Writes are atomic (write temp file, then rename) so a crash can't corrupt it.
 * This is deliberately behind a small interface so it can be swapped for Postgres.
 */
interface DbShape {
  items: Item[];
  claims: Claim[];
}

export class JsonStore {
  private data: DbShape;

  constructor(private file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.data = this.load();
  }

  private load(): DbShape {
    if (fs.existsSync(this.file)) {
      try {
        return JSON.parse(fs.readFileSync(this.file, "utf-8")) as DbShape;
      } catch (e) {
        console.error(`[store] ${this.file} is corrupt, starting from seed`, e);
      }
    }
    const fresh = { items: buildSeedItems(), claims: [] };
    this.write(fresh);
    return fresh;
  }

  private write(d: DbShape = this.data) {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
    fs.renameSync(tmp, this.file);
  }

  items(): Item[] {
    return this.data.items;
  }
  item(id: string): Item | undefined {
    return this.data.items.find((i) => i.id === id);
  }
  addItem(item: Item) {
    this.data.items.push(item);
    this.write();
  }
  updateItem(id: string, patch: Partial<Item>): Item | undefined {
    const item = this.item(id);
    if (!item) return undefined;
    Object.assign(item, patch);
    this.write();
    return item;
  }
  deleteItem(id: string): boolean {
    const before = this.data.items.length;
    this.data.items = this.data.items.filter((i) => i.id !== id);
    this.data.claims = this.data.claims.filter((c) => c.item_id !== id);
    this.write();
    return this.data.items.length < before;
  }

  claims(): Claim[] {
    return this.data.claims;
  }
  claim(id: string): Claim | undefined {
    return this.data.claims.find((c) => c.id === id);
  }
  addClaim(claim: Claim) {
    this.data.claims.push(claim);
    this.write();
  }
  updateClaim(id: string, patch: Partial<Claim>) {
    const c = this.claim(id);
    if (c) Object.assign(c, patch);
    this.write();
    return c;
  }
}
