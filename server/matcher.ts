import { aiEnabled, verifyPair } from "./gemini";
import { blendWithVerification, scoreMatch, toMatchInput, type MatchInput } from "./matching";
import type { StoredImage } from "./store";
import type { Descriptor, Item, Match, PublicItem } from "./types";

/**
 * Two-stage matching:
 *   1. RETRIEVE: deterministic scorer (matching.ts) over every candidate. Cheap, explainable, testable.
 *   2. VERIFY:   for the top K, ask Gemini "same physical object?" with both photos when available,
 *                and blend that probability in. Results are cached per pair, so repeat views cost nothing.
 * If the AI is off, slow, or fails, stage 2 is skipped and stage-1 scores stand.
 */

export interface Query extends MatchInput {
  id: string;
  title?: string;
  /** The query photo itself (kept in memory, never written to disk for searches). */
  image?: StoredImage;
}

const SHOW_THRESHOLD = 40;
const CANDIDATE_THRESHOLD = 30; // looser for the AI stage: verification can lift a borderline pair
const VERIFY_TOP_K = 3;

const verifyCache = new Map<string, { probability: number; note: string }>();
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export async function findMatches(
  query: Query,
  candidates: Item[],
  opts: {
    limit: number;
    verify: boolean;
    toPublic: (i: Item) => PublicItem;
    /** Loads a candidate photo from storage (seed SVGs return undefined and are skipped). */
    loadImage?: (url: string) => Promise<StoredImage | undefined>;
  },
): Promise<Match[]> {
  if (!query.descriptor) return [];

  const scored = candidates
    .filter((c) => c.id !== query.id)
    .map((item) => ({ item, ...scoreMatch(query, toMatchInput(item)) }))
    .filter((m) => m.score >= CANDIDATE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(opts.limit, VERIFY_TOP_K) + 2);

  const results: Match[] = [];
  for (const [rank, m] of scored.entries()) {
    const key = pairKey(query.id, m.item.id);
    let verdict = verifyCache.get(key);

    if (!verdict && opts.verify && aiEnabled && rank < VERIFY_TOP_K && m.item.descriptor_json) {
      const v = await verifyPair(
        { descriptor: query.descriptor as Descriptor, title: query.title, image: query.image },
        {
          descriptor: m.item.descriptor_json,
          title: m.item.title,
          image: m.item.image_url && opts.loadImage ? await opts.loadImage(m.item.image_url).catch(() => undefined) : undefined,
        },
      );
      if (v) {
        verdict = v;
        verifyCache.set(key, v);
      }
    }

    let score = m.score;
    const reasons = [...m.reasons];
    if (verdict) {
      score = blendWithVerification(m.score, verdict.probability);
      reasons.unshift(`AI check: ${verdict.note}`);
    }
    // A hard contradiction caps the score no matter what the AI says.
    if (m.warnings.length) score = Math.min(score, 60);

    results.push({
      item: opts.toPublic(m.item),
      score,
      confidence: verdict ? (verdict.probability >= 0.75 && !m.warnings.length ? "high" : verdict.probability < 0.35 ? "low" : m.confidence) : m.confidence,
      reasons,
      warnings: m.warnings,
      verified: verdict ?? undefined,
    });
  }

  return results
    .filter((r) => r.score >= SHOW_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit);
}
