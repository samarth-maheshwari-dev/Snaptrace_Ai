import type { Descriptor, Item } from "./types";

/** Demo catalogue. Timestamps are relative to "now" so the feed never looks stale. */
type Seed = Omit<Item, "id" | "created_at" | "date_occurred" | "status"> & {
  hoursAgo: number;
  status?: Item["status"];
};

const d = (x: Omit<Descriptor, "source">): Descriptor => ({ ...x, source: "vision" });

const SEEDS: Seed[] = [
  {
    type: "found", title: "Black Dell laptop", category: "electronics", location: "Central Library, 2nd floor",
    description: "Left at the charging desk near the window. Has a few stickers on the lid.",
    contact_name: "Library Desk", contact_email: "library-desk@example.edu", image_url: "/images/items/laptop.svg", hoursAgo: 2,
    descriptor_json: d({ category: "electronics", primaryColor: "black", secondaryColors: ["silver"], brand: "Dell", distinctiveFeatures: ["stickers on lid", "scratch near hinge"], material: "plastic", size: "large", condition: "good", itemDescription: "A black Dell laptop with colourful stickers on the lid" }),
  },
  {
    type: "found", title: "Blue steel water bottle", category: "bottles", location: "Sports ground, near the nets",
    description: "750 ml, dent on one side.", contact_name: "Sports Office", contact_email: "sports@example.edu",
    image_url: "/images/items/bottle.svg", hoursAgo: 5,
    descriptor_json: d({ category: "bottles", primaryColor: "blue", secondaryColors: ["silver"], brand: "Decathlon", distinctiveFeatures: ["dent on side", "steel cap"], material: "metal", size: "medium", condition: "used", itemDescription: "A blue insulated steel bottle with a dent on one side" }),
  },
  {
    type: "found", title: "Wireless earbuds in white case", category: "electronics", location: "Computer Lab A",
    description: "Found under bench 4.", contact_name: "Lab Assistant", contact_email: "lab-a@example.edu",
    image_url: "/images/items/earbuds.svg", hoursAgo: 9,
    descriptor_json: d({ category: "electronics", primaryColor: "white", secondaryColors: [], brand: null, distinctiveFeatures: ["charging case", "small scratch on case"], material: "plastic", size: "small", condition: "good", itemDescription: "White wireless earbuds inside a rounded charging case" }),
  },
  {
    type: "lost", title: "Red backpack with keychain", category: "bags", location: "E-Block corridor",
    description: "Red backpack, laptop sleeve inside, small astronaut keychain on the zip.",
    contact_name: "Aditi", contact_email: "aditi@example.edu", image_url: "/images/items/backpack.svg", hoursAgo: 20,
    descriptor_json: d({ category: "bags", primaryColor: "red", secondaryColors: ["black"], brand: "Puma", distinctiveFeatures: ["astronaut keychain", "laptop compartment"], material: "fabric", size: "large", condition: "good", itemDescription: "A red backpack with an astronaut keychain on the zipper" }),
  },
  {
    type: "found", title: "Bunch of keys with yellow tag", category: "keys", location: "Main gate security cabin",
    description: "Three keys on a ring with a yellow plastic tag.", contact_name: "Security", contact_email: "security@example.edu",
    image_url: "/images/items/keys.svg", hoursAgo: 26,
    descriptor_json: d({ category: "keys", primaryColor: "silver", secondaryColors: ["yellow"], brand: null, distinctiveFeatures: ["yellow tag", "three keys", "ring"], material: "metal", size: "small", condition: "used", itemDescription: "Three silver keys on a ring with a yellow tag" }),
  },
  {
    type: "found", title: "Student ID card", category: "id_cards", location: "Canteen counter",
    description: "Name partly visible. Bring another ID to collect.", contact_name: "Canteen", contact_email: "canteen@example.edu",
    image_url: "/images/items/idcard.svg", hoursAgo: 30,
    descriptor_json: d({ category: "id_cards", primaryColor: "white", secondaryColors: ["blue"], brand: null, distinctiveFeatures: ["photo", "barcode", "lanyard hole"], material: "plastic", size: "small", condition: "good", itemDescription: "A white and blue student ID card with photo and barcode" }),
  },
  {
    type: "lost", title: "Silver analog watch", category: "accessories", location: "Seminar Hall 2",
    description: "Metal strap, round dial, scratch on the glass at 3 o'clock.",
    contact_name: "Rohan", contact_email: "rohan@example.edu", image_url: "/images/items/watch.svg", hoursAgo: 44,
    descriptor_json: d({ category: "accessories", primaryColor: "silver", secondaryColors: ["black"], brand: "Fossil", distinctiveFeatures: ["metal strap", "scratch on glass", "round dial"], material: "metal", size: "small", condition: "used", itemDescription: "A silver analog wristwatch with a round dial and metal strap" }),
  },
  {
    type: "found", title: "Green hoodie", category: "clothing", location: "Auditorium, row F",
    description: "Size M, drawstrings missing.", contact_name: "Events Team", contact_email: "events@example.edu",
    image_url: "/images/items/hoodie.svg", hoursAgo: 52,
    descriptor_json: d({ category: "clothing", primaryColor: "green", secondaryColors: [], brand: null, distinctiveFeatures: ["front pocket", "no drawstrings"], material: "fabric", size: "medium", condition: "good", itemDescription: "An olive green pullover hoodie with a front pocket" }),
  },
  {
    type: "lost", title: "Black spiral notebook", category: "stationery", location: "Physics lab",
    description: "Semester notes, my name written inside the cover.",
    contact_name: "Kavya", contact_email: "kavya@example.edu", image_url: "/images/items/notebook.svg", hoursAgo: 70,
    descriptor_json: d({ category: "stationery", primaryColor: "black", secondaryColors: ["white"], brand: "Classmate", distinctiveFeatures: ["spiral binding", "elastic band"], material: "paper", size: "medium", condition: "used", itemDescription: "A black spiral-bound notebook with an elastic band" }),
  },
  {
    type: "found", title: "Phone with cracked screen", category: "electronics", location: "Bus stop, Gate 2",
    description: "Dark blue case, crack across the top-left corner.", contact_name: "Transport Desk", contact_email: "transport@example.edu",
    image_url: "/images/items/phone.svg", hoursAgo: 96, status: "resolved",
    descriptor_json: d({ category: "electronics", primaryColor: "navy blue", secondaryColors: ["black"], brand: null, distinctiveFeatures: ["cracked screen", "dark blue case"], material: "glass", size: "small", condition: "damaged", itemDescription: "A smartphone in a dark blue case with a cracked screen" }),
  },
];

export function buildSeedItems(now = Date.now()): Item[] {
  return SEEDS.map(({ hoursAgo, status, ...rest }, i) => {
    const created = new Date(now - hoursAgo * 3_600_000);
    return {
      ...rest,
      id: `seed-${String(i + 1).padStart(2, "0")}`,
      status: status ?? "open",
      created_at: created.toISOString(),
      date_occurred: created.toISOString().slice(0, 10),
    };
  });
}
