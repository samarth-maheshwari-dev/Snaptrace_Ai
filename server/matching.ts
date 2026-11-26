import type { Category, Descriptor, Item } from "./types";

/**
 * SnapTrace matching engine (v2).
 *
 * Problems with v1 (and the original hackathon version):
 *  - Unknown fields counted as a mismatch. A photo with no visible logo lost 15 points
 *    against a branded item, even though "unknown" is not evidence of anything.
 *  - Contradictions weren't penalised. "Dell" vs "HP" just scored 0 for brand; the item could
 *    still reach 80 on colour + category.
 *  - No sense of time. A "found" item handed in BEFORE the owner says they lost it can't be theirs.
 *  - Purely lexical. "earbuds" vs "earphones" shared no tokens.
 *
 * v2 design:
 *  1. Each signal returns a value in [0,1] or `null` (= no evidence either way).
 *  2. Score = weighted mean over signals that HAVE evidence (weights renormalised),
 *     then scaled by coverage, so a match backed by 2 signals can't beat one backed by 6.
 *  3. Hard contradictions (brand clash, colour clash, impossible dates, wrong category)
 *     multiply the score down. They are listed as `warnings` so users see why.
 *  4. Optional semantic signal: cosine similarity of Gemini text embeddings.
 *  5. Optional AI verification of the top few candidates (see gemini.ts verifyPair),
 *     blended in by the caller.
 * Everything here is deterministic and unit-tested; AI signals only add on top.
 */

/* ------------------------------------------------------------------ text utils */

const COLOR_FAMILIES: Record<string, string[]> = {
  black: ["black", "jet", "charcoal", "onyx", "ebony"],
  grey: ["grey", "gray", "silver", "slate", "graphite", "gunmetal", "ash", "space", "steel", "metallic", "chrome"],
  white: ["white", "ivory", "cream", "off-white", "pearl", "transparent", "clear"],
  blue: ["blue", "navy", "teal", "cyan", "azure", "sky", "cobalt", "turquoise", "indigo", "denim"],
  red: ["red", "maroon", "crimson", "burgundy", "wine", "scarlet"],
  pink: ["pink", "magenta", "rose", "fuchsia", "coral"],
  green: ["green", "olive", "mint", "lime", "emerald", "khaki", "sage"],
  yellow: ["yellow", "gold", "golden", "mustard", "amber"],
  orange: ["orange", "rust", "peach", "copper"],
  brown: ["brown", "tan", "beige", "camel", "chocolate", "bronze", "wood", "wooden"],
  purple: ["purple", "violet", "lavender", "lilac", "plum"],
};
/** Families that are often confused in photos (lighting): treat as partial, not a contradiction. */
const NEAR_COLORS = new Set(["black|grey", "grey|white", "blue|purple", "red|pink", "red|orange", "orange|yellow", "brown|orange", "brown|yellow", "blue|grey", "green|grey"]);

export function colorFamily(color?: string | null): string | null {
  if (!color) return null;
  const words = color.toLowerCase().split(/[^a-z-]+/).filter(Boolean);
  for (const word of words.reverse()) {
    for (const [family, members] of Object.entries(COLOR_FAMILIES)) {
      if (members.includes(word)) return family;
    }
  }
  return null;
}

const nearColor = (a: string, b: string) => NEAR_COLORS.has(`${a}|${b}`) || NEAR_COLORS.has(`${b}|${a}`);

/** Small synonym map so lexical overlap survives common wording differences. */
const SYNONYMS: Record<string, string> = {
  earphone: "earbud", earpod: "earbud", headphone: "earbud", airpod: "earbud",
  bag: "backpack", rucksack: "backpack", schoolbag: "backpack",
  flask: "bottle", tumbler: "bottle", sipper: "bottle",
  mobile: "phone", smartphone: "phone", cellphone: "phone", iphone: "phone",
  notebook: "notebook", diary: "notebook", copy: "notebook",
  laptop: "laptop", macbook: "laptop", notebookpc: "laptop",
  specs: "glasses", spectacles: "glasses", eyeglasses: "glasses",
  wallet: "wallet", purse: "wallet",
  keychain: "keyring", keyring: "keyring",
  scratched: "scratch", scratches: "scratch", dented: "dent", dents: "dent",
  sticker: "sticker", decal: "sticker", stickers: "sticker",
  cracked: "crack", broken: "crack",
};

const STOP_WORDS = new Set(
  ("a an the of on in at with and or to for from is are has have its it near small large some this that very " +
    "item object one side top bottom front back visible appears looks like").split(" "),
);

export function tokens(text: string | string[] | null | undefined): Set<string> {
  const joined = Array.isArray(text) ? text.join(" ") : text ?? "";
  const out = new Set<string>();
  for (let w of joined.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length < 2 || STOP_WORDS.has(w)) continue;
    if (SYNONYMS[w]) { out.add(SYNONYMS[w]); continue; }
    let stem = w;
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) {
      stem = w.slice(0, -1); // phones -> phone, dents -> dent
      // boxes -> box, glasses -> glass, scratches -> scratch
      if (/(s|x|z|ch|sh)e$/.test(stem) && !SYNONYMS[stem]) stem = stem.slice(0, -1);
    }
    out.add(SYNONYMS[stem] ?? stem);
  }
  return out;
}

/** Overlap coefficient-ish: shared / size of the SMALLER set. Short feature lists aren't punished. */
export function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.min(a.size, b.size);
}

export function cosine(a?: number[], b?: number[]): number | null {
  if (!a || !b || a.length === 0 || a.length !== b.length) return null;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : null;
}

const norm = (s?: string | null) => (s ?? "").toLowerCase().trim();
const known = (s?: string | null) => {
  const v = norm(s);
  return v && !["unknown", "other", "none", "n/a", "null"].includes(v) ? v : null;
};

/** Categories that are genuinely ambiguous in practice (earbuds case = electronics or accessories). */
const RELATED: Array<[Category, Category]> = [
  ["electronics", "accessories"],
  ["bags", "accessories"],
  ["id_cards", "accessories"],
  ["keys", "accessories"],
];
function categorySignal(a: Category, b: Category): number {
  if (a === b) return 1;
  if (a === "other" || b === "other") return 0.5;
  return RELATED.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ? 0.4 : 0;
}

/* ------------------------------------------------------------------ scoring */

export interface MatchInput {
  descriptor?: Descriptor | null;
  embedding?: number[];
  type?: "lost" | "found";
  date?: string; // YYYY-MM-DD
}

export interface MatchBreakdown {
  score: number; // 0-100
  confidence: "high" | "medium" | "low";
  reasons: string[];
  warnings: string[];
  signals: Record<string, number | null>;
}

export const WEIGHTS = {
  category: 22,
  semantic: 22, // embeddings; null when AI is off
  features: 18,
  color: 14,
  brand: 10,
  description: 6,
  material: 4,
  size: 4,
} as const;

const DAY = 86_400_000;

export function scoreMatch(a: MatchInput, b: MatchInput): MatchBreakdown {
  const da = a.descriptor, db = b.descriptor;
  const empty: MatchBreakdown = { score: 0, confidence: "low", reasons: [], warnings: [], signals: {} };
  if (!da || !db) return empty;

  const reasons: string[] = [];
  const warnings: string[] = [];
  let penalty = 1;
  const s: Record<keyof typeof WEIGHTS, number | null> = {
    category: null, semantic: null, features: null, color: null, brand: null, description: null, material: null, size: null,
  };

  // Category
  s.category = categorySignal(da.category, db.category);
  if (s.category === 1) reasons.push(`Same type of item`);
  else if (s.category === 0) { penalty *= 0.35; warnings.push("Different type of item"); }

  // Colour (primary vs primary, with secondary as partial credit)
  const ca = colorFamily(da.primaryColor), cb = colorFamily(db.primaryColor);
  if (ca && cb) {
    if (ca === cb) { s.color = 1; reasons.push(`Same colour (${ca})`); }
    else if (db.secondaryColors.some((c) => colorFamily(c) === ca) || da.secondaryColors.some((c) => colorFamily(c) === cb)) s.color = 0.6;
    else if (nearColor(ca, cb)) s.color = 0.4;
    else { s.color = 0; penalty *= 0.6; warnings.push(`Colour differs (${ca} vs ${cb})`); }
  }

  // Brand: only counts when BOTH sides saw a brand.
  const ba = known(da.brand), bb = known(db.brand);
  if (ba && bb) {
    if (ba === bb || ba.includes(bb) || bb.includes(ba)) { s.brand = 1; reasons.push(`Brand: ${db.brand}`); }
    else { s.brand = 0; penalty *= 0.5; warnings.push(`Brand differs (${da.brand} vs ${db.brand})`); }
  }

  // Distinctive features (the strongest "this exact object" evidence)
  const fa = tokens(da.distinctiveFeatures), fb = tokens(db.distinctiveFeatures);
  if (fa.size && fb.size) {
    s.features = overlap(fa, fb);
    if (s.features >= 0.34) {
      const shared = [...fa].filter((t) => fb.has(t)).slice(0, 3).join(", ");
      reasons.push(`Shared details: ${shared}`);
    }
  }

  // Free-text description
  const ta = tokens(da.itemDescription), tb = tokens(db.itemDescription);
  if (ta.size && tb.size) s.description = overlap(ta, tb);

  const textOnly = da.source === "text" || db.source === "text";

  const ma = known(da.material), mb = known(db.material);
  if (ma && mb) s.material = ma === mb ? 1 : 0;
  // Size/material from a text-only report are defaults, not observations — never count them.
  if (!textOnly && da.size && db.size) s.size = da.size === db.size ? 1 : da.size === "medium" || db.size === "medium" ? 0.5 : 0;

  // Semantic similarity of descriptions (Gemini embeddings). Raw cosine for related texts sits
  // ~0.6-0.95, so rescale that band to 0..1.
  const cos = cosine(a.embedding, b.embedding);
  if (cos !== null) {
    s.semantic = Math.max(0, Math.min(1, (cos - 0.6) / 0.3));
    if (s.semantic >= 0.75) reasons.push("Descriptions are semantically very similar");
  }

  // Time: an item can't be found (much) before it was lost.
  if (a.date && b.date && a.type && b.type && a.type !== b.type) {
    const lost = Date.parse(a.type === "lost" ? a.date : b.date);
    const found = Date.parse(a.type === "found" ? a.date : b.date);
    if (!Number.isNaN(lost) && !Number.isNaN(found)) {
      const gapDays = (found - lost) / DAY;
      if (gapDays < -1) { penalty *= 0.3; warnings.push("Found before it was reported lost"); }
      else if (gapDays > 60) penalty *= 0.8; // stale, still possible
    }
  }

  // Weighted mean over signals with evidence + coverage factor.
  let num = 0, den = 0;
  const total = Object.values(WEIGHTS).reduce((x, y) => x + y, 0);
  for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    const v = s[k];
    if (v === null) continue;
    num += WEIGHTS[k] * v;
    den += WEIGHTS[k];
  }
  if (den === 0) return { ...empty, signals: s };
  const coverage = den / total; // 0..1
  const raw = (num / den) * (0.55 + 0.45 * Math.min(1, coverage / 0.75));
  let score = Math.round(100 * raw * penalty);
  // Words alone can't prove it's the same object; only a photo comparison can earn a top score.
  if (textOnly) score = Math.min(score, 75);

  const confidence: MatchBreakdown["confidence"] =
    textOnly || coverage < 0.45 ? "low" : warnings.length === 0 && coverage >= 0.7 ? "high" : "medium";

  return { score: Math.max(0, Math.min(100, score)), confidence, reasons, warnings, signals: s };
}

export const toMatchInput = (i: Pick<Item, "descriptor_json" | "embedding" | "type" | "date_occurred">): MatchInput => ({
  descriptor: i.descriptor_json, embedding: i.embedding, type: i.type, date: i.date_occurred,
});

/** Blend heuristic score with an AI verification probability (0..1). */
export function blendWithVerification(score: number, probability: number): number {
  return Math.round(0.55 * score + 0.45 * probability * 100);
}

/** Text used for embeddings — stable, field-ordered, no noise. */
export function embeddingText(d: Descriptor, title?: string): string {
  return [
    title,
    d.itemDescription,
    `category: ${d.category}`,
    `colour: ${d.primaryColor}${d.secondaryColors.length ? `, ${d.secondaryColors.join(", ")}` : ""}`,
    d.brand ? `brand: ${d.brand}` : "",
    `material: ${d.material}`,
    d.distinctiveFeatures.length ? `features: ${d.distinctiveFeatures.join("; ")}` : "",
  ].filter(Boolean).join(". ");
}
