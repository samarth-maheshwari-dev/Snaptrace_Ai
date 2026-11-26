export type ItemType = "lost" | "found";
export type ItemStatus = "open" | "claimed" | "resolved";
export type ClaimStatus = "pending" | "approved" | "rejected";

export const CATEGORIES = [
  "electronics",
  "bags",
  "bottles",
  "id_cards",
  "keys",
  "accessories",
  "clothing",
  "stationery",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Structured description of an item, produced by Gemini Vision (or derived from form text). */
export interface Descriptor {
  category: Category;
  primaryColor: string;
  secondaryColors: string[];
  brand: string | null;
  distinctiveFeatures: string[];
  material: string;
  size: "small" | "medium" | "large";
  condition: string;
  itemDescription: string;
  /** "vision" = Gemini looked at a photo, "text" = derived from what the user typed. */
  source: "vision" | "text";
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  category: Category;
  location: string;
  date_occurred: string;
  description?: string;
  contact_email: string;
  contact_name: string;
  image_url?: string;
  descriptor_json?: Descriptor;
  /** Gemini text embedding of the descriptor. Server-only, never sent to clients. */
  embedding?: number[];
  /** Google account id (sub) of whoever reported it. */
  reporter_id?: string;
  status: ItemStatus;
  created_at: string;
}

/** What the public API returns — never the reporter's email. */
export type PublicItem = Omit<Item, "contact_email" | "contact_name" | "embedding" | "reporter_id"> & {
  reporter: string;
  /** True when the signed-in user reported this item. */
  mine?: boolean;
};

export interface Claim {
  id: string;
  item_id: string;
  claimer_id: string;
  claimer_name: string;
  claimer_email: string;
  student_id: string;
  phone?: string;
  proof_text: string;
  status: ClaimStatus;
  created_at: string;
}

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  role: "admin" | "user";
}

export interface Match {
  item: PublicItem;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  warnings: string[];
  /** Set when Gemini compared the two items directly. */
  verified?: { probability: number; note: string };
}
