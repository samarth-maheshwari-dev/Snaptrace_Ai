import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { CATEGORIES, type Category, type Descriptor } from "./types";

const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
const model = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim();

// No hardcoded fallback key. The previous code shipped a real key in source control.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
export const aiEnabled = ai !== null;
export const aiModel = model;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, enum: [...CATEGORIES] },
    primaryColor: { type: Type.STRING },
    secondaryColors: { type: Type.ARRAY, items: { type: Type.STRING } },
    brand: { type: Type.STRING, nullable: true },
    distinctiveFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
    material: { type: Type.STRING },
    size: { type: Type.STRING, enum: ["small", "medium", "large"] },
    condition: { type: Type.STRING },
    itemDescription: { type: Type.STRING },
  },
  required: ["category", "primaryColor", "secondaryColors", "distinctiveFeatures", "material", "size", "condition", "itemDescription"],
};

// Never trust model output blindly — validate it like any other input.
const DescriptorSchema = z.object({
  category: z.enum(CATEGORIES).catch("other"),
  primaryColor: z.string().max(40),
  secondaryColors: z.array(z.string().max(40)).max(5).catch([]),
  brand: z.string().max(60).nullable().optional().transform((b) => (b && b.toLowerCase() !== "unknown" ? b : null)),
  distinctiveFeatures: z.array(z.string().max(80)).max(8).catch([]),
  material: z.string().max(30).catch("other"),
  size: z.enum(["small", "medium", "large"]).catch("medium"),
  condition: z.string().max(30).catch("good"),
  itemDescription: z.string().max(300),
});

const PROMPT = `You catalogue items for a university lost-and-found desk.
Describe ONLY the main object in the photo, objectively. Use simple colour words.
List up to 5 distinctive features a person could use to tell this exact object apart
(stickers, scratches, dents, keychains, text). Use null for brand if no logo is visible.`;

export class AiUnavailableError extends Error {}

export async function describeImage(base64: string, mimeType: string): Promise<Descriptor> {
  if (!ai) throw new AiUnavailableError("GEMINI_API_KEY is not configured on the server.");

  const res = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: base64 } }, { text: PROMPT }] }],
    config: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
  });

  const parsed = DescriptorSchema.parse(JSON.parse(res.text ?? "{}"));
  return { ...parsed, brand: parsed.brand ?? null, source: "vision" };
}

/* ---------------- Embeddings ---------------- */
const embedModel = (process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001").trim();

/** Text embedding for semantic similarity. Returns undefined (never throws) so matching degrades gracefully. */
export async function embed(text: string): Promise<number[] | undefined> {
  if (!ai || !text.trim()) return undefined;
  try {
    const res = await ai.models.embedContent({
      model: embedModel,
      contents: text,
      config: { taskType: "SEMANTIC_SIMILARITY", outputDimensionality: 256 },
    });
    const values = res.embeddings?.[0]?.values;
    return values && values.length ? values : undefined;
  } catch (e) {
    console.error("[gemini embed]", e instanceof Error ? e.message : e);
    return undefined;
  }
}

/* ---------------- Pair verification ----------------
 * Heuristics find candidates; for the top few we ask the model directly
 * "is this the same physical object?" with both photos when we have them.
 */
export interface PairSide {
  descriptor: Descriptor;
  title?: string;
  image?: { base64: string; mime: string };
}

const VerifySchema = z.object({
  probability: z.number().min(0).max(1),
  note: z.string().max(200),
});

const verifySchema = {
  type: Type.OBJECT,
  properties: {
    probability: { type: Type.NUMBER, description: "0..1 likelihood these are the SAME physical object" },
    note: { type: Type.STRING, description: "One short sentence: the deciding evidence" },
  },
  required: ["probability", "note"],
};

const VERIFY_PROMPT = `You help a lost-and-found desk. Decide if A and B are the SAME physical object
(not just the same product model). Same-model items with no shared unique marks should score around 0.4-0.6.
Unique shared marks (stickers, dents, scratches, keychains, engravings) push it up; any clear contradiction
(different brand, colour, shape, damage) pushes it down hard. Be calibrated, not generous.`;

export async function verifyPair(a: PairSide, b: PairSide, timeoutMs = 9000): Promise<{ probability: number; note: string } | null> {
  if (!ai) return null;
  const parts: Array<Record<string, unknown>> = [{ text: VERIFY_PROMPT }];
  for (const [label, side] of [["A", a], ["B", b]] as const) {
    parts.push({ text: `Item ${label}${side.title ? ` ("${side.title}")` : ""}: ${JSON.stringify({ ...side.descriptor, source: undefined })}` });
    if (side.image) parts.push({ inlineData: { mimeType: side.image.mime, data: side.image.base64 } });
  }
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: { responseMimeType: "application/json", responseSchema: verifySchema, temperature: 0 },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("verify timeout")), timeoutMs)),
    ]);
    return VerifySchema.parse(JSON.parse(res.text ?? "{}"));
  } catch (e) {
    console.error("[gemini verify]", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Fallback when there is no photo / no AI: derive a weak descriptor from the form text. */
export function describeFromText(input: { title: string; category: Category; description?: string }): Descriptor {
  const text = `${input.title} ${input.description ?? ""}`;
  const colorWord = text.toLowerCase().match(
    /\b(black|white|grey|gray|silver|blue|navy|red|maroon|pink|green|olive|yellow|gold|orange|brown|beige|purple)\b/,
  );
  return {
    category: input.category,
    primaryColor: colorWord?.[1] ?? "",
    secondaryColors: [],
    brand: null,
    distinctiveFeatures: input.description ? [input.description] : [],
    material: "other",
    size: "medium",
    condition: "unknown",
    itemDescription: text.trim(),
    source: "text",
  };
}
