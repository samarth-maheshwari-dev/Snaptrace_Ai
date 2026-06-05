# SnapTrace 🔴
### *Photo-First Campus Lost & Found Platform*

> **"Show what you lost. Find it in seconds."**

[![Built with React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Gemini Vision](https://img.shields.io/badge/Gemini-Vision_AI-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Hackathon](https://img.shields.io/badge/IntelliAI_Arena-2026-FF2D55?style=flat-square)]()

---

## The Problem

Text-based lost & found boards fail. **"Blue bottle"** matches 40 listings. A photo of YOUR specific Decathlon bottle with a dent on the right side matches exactly one.

SnapTrace replaces keywords with photos — and lets **Gemini Vision AI** do the matching.

---

## What Makes SnapTrace Different

| Feature | Traditional Lost & Found | SnapTrace |
|---|---|---|
| Search Method | Keyword text search | Photo upload → AI visual match |
| Match Quality | "Blue bottle" = 40 results | Specific item → 87% similarity score |
| Claim Verification | None | Proof-of-ownership description required |
| Fraud Prevention | No | Smart UX: "describe what only the owner knows" |
| AI Integration | None | Gemini Vision API — core feature |

---

**Demo Flow:**
1. Upload a photo of a lost laptop
2. Watch Gemini Vision extract — `{Dell, Black, Plastic, Sticker on lid}`
3. See `87% match` animate in — *"Found at Library, 2 hours ago"*
4. Submit claim → Admin approves → Both parties notified

---

## Tech Stack

```
Frontend      React 18 + TypeScript + Vite
Styling       Tailwind CSS + shadcn/ui
Backend/DB    Supabase (Auth, PostgreSQL, Storage)
AI            Google Gemini 1.5 Flash Vision API
Hosting       Vercel (CI/CD via Lovable.dev)
Charts        Recharts
Animations    Framer Motion / CSS Keyframes
Fonts         Syne (headings) · Inter (body) · JetBrains Mono (IDs)
```

---

## Project Structure

```
snaptrace/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── Navbar.tsx          # Sticky navbar with glass blur on scroll
│   │   ├── ItemCard.tsx        # Browse grid card with status/type badges
│   │   ├── MatchCard.tsx       # SnapSearch result — % badge + claim CTA
│   │   ├── ClaimModal.tsx      # Proof-of-ownership claim form modal
│   │   ├── StatsBar.tsx        # Animated live stats counter
│   │   └── Footer.tsx
│   ├── pages/
│   │   ├── Home.tsx            # Landing — hero + how it works + feed
│   │   ├── Browse.tsx          # Full item grid with filters
│   │   ├── Post.tsx            # 3-step post form (type → details → photo)
│   │   ├── SnapSearch.tsx      # THE feature — upload → AI match → ranked results
│   │   ├── ItemDetail.tsx      # Single item view + claim action panel
│   │   └── Admin.tsx           # Password-gated admin panel (admin2026)
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client init + typed queries
│   │   ├── gemini.ts           # Gemini Vision API call + base64 util
│   │   └── similarity.ts       # Descriptor comparison scoring algorithm
│   ├── hooks/
│   │   ├── useItems.ts         # Supabase items CRUD + realtime subscription
│   │   └── useClaims.ts        # Claims fetch, submit, status update
│   ├── types/
│   │   └── index.ts            # Item, Claim, Descriptor, MatchResult types
│   ├── App.tsx                 # React Router route definitions
│   └── main.tsx
├── .env.example
├── .env.local                  # DO NOT COMMIT — holds API keys
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Landing — hero, how it works, stats, recent feed |
| `/browse` | Browse Items | All items with filters (type, category, location, date) |
| `/post` | Post Item | 3-step form to report lost or found item |
| `/snapsearch` | SnapSearch ⭐ | Upload photo → AI analysis → ranked visual matches |
| `/item/:id` | Item Detail | Full item view + claim action panel |
| `/admin` | Admin Panel | Password-gated dashboard — manage items, claims, stats |

---

## Database Schema (Supabase / PostgreSQL)

```sql
-- All lost & found posts
CREATE TABLE items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT CHECK (type IN ('lost', 'found')),
  title           TEXT NOT NULL,
  category        TEXT NOT NULL,
  location        TEXT NOT NULL,
  date_occurred   DATE NOT NULL,
  description     TEXT,
  contact_email   TEXT NOT NULL,
  contact_name    TEXT NOT NULL,
  image_url       TEXT,
  descriptor_json JSONB,              -- Gemini Vision structured output
  status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'resolved')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Claim requests submitted by students
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID REFERENCES items(id) ON DELETE CASCADE,
  claimer_name    TEXT NOT NULL,
  claimer_email   TEXT NOT NULL,
  student_id      TEXT NOT NULL,
  phone           TEXT,
  proof_text      TEXT NOT NULL,      -- "describe something only the owner would know"
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Gemini Vision Integration

### How It Works

Every uploaded image goes through this pipeline:

```
User uploads image
       ↓
Supabase Storage → public URL
       ↓
Base64 encode image
       ↓
Gemini 1.5 Flash Vision API call
       ↓
Returns structured JSON descriptor:
{
  category, primaryColor, secondaryColors[],
  brand, distinctiveFeatures[], material, size,
  condition, itemDescription
}
       ↓
Store descriptor_json in items table
       ↓
Run similarity scoring against opposite-type items
```

### Similarity Scoring Algorithm

The matching engine compares two item descriptors and returns a `0–100%` score:

| Property | Weight | Logic |
|---|---|---|
| Category | 30% | Exact match |
| Primary Color | 20% | Exact match |
| Brand | 20% | Case-insensitive exact match |
| Material | 10% | Exact match |
| Size | 10% | Exact match |
| Distinctive Features | 10% | Jaccard intersection overlap |

Match thresholds:
- `80–100%` → Green → Strong match, show prominently
- `50–79%` → Amber → Possible match
- `40–49%` → Gray → Low confidence
- `< 40%` → Hidden / "No strong match found"

---

## Setup & Installation

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini 1.5 Flash)
- A [Vercel](https://vercel.com) account (optional, for deployment)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/snaptrace.git
cd snaptrace
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

> ⚠️ Never commit `.env.local` — it's gitignored.

### 3. Set Up Supabase

Run the schema SQL in your Supabase SQL Editor:

```sql
-- Paste the CREATE TABLE statements from the Database Schema section above
-- Then enable Storage:
-- Supabase Dashboard → Storage → Create bucket: "item-images" (Public)
```

Set Storage bucket policy to allow public reads:

```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-images');
```

### 4. Run Locally

```bash
npm run dev
# → http://localhost:5173
```

### 5. Deploy to Vercel

```bash
npm run build
vercel --prod
# Add env variables in Vercel Dashboard → Settings → Environment Variables
```

---

## Key User Flows

### Flow A — "I Lost My Laptop" (Primary)

```
/ (Home)
  → Click "🔍 Find My Item"
  → /snapsearch — upload laptop photo
  → Gemini analyzes (3–5 sec animated loader)
  → "87% Match — Dell laptop, black — Found at Library"
  → "Send Claim Request" → fill modal
  → Admin approves → both parties notified
```

### Flow B — "I Found a Water Bottle"

```
/ (Home)
  → Click "📦 Report Found Item"
  → /post — select "Found" → fill details → upload photo
  → Gemini stores descriptor
  → System auto-matches against lost items
  → Toast: "Potential match found!" → item detail shows match
```

### Flow C — Admin Resolves Case

```
/admin (password: admin2026)
  → Pending Claims tab
  → Read proof description
  → "✅ Approve & Notify Both"
  → Item status → Resolved
```

---

## Design System

### Colors

```
Background      #0D0D0D    Near black
Surface/Cards   #161616    Dark elevated surface
Border          #2A2A2A    Subtle separator
Primary Accent  #FF2D55    Squid Game red/pink — CTAs, active states
Secondary       #FF6B35    Warm orange — secondary actions
Success         #00D26A    Green — resolved, high match
Warning         #FFB800    Amber — claimed, medium match
Text Primary    #F5F5F5    Main readable text
Text Muted      #888888    Captions, labels
```

### Typography

```
Syne 800        → Page headings, logo, hero title
Inter           → Body, labels, form fields
JetBrains Mono  → Item IDs, status codes, match percentages
```

### Component Tokens

```tsx
// Card
className="bg-[#161616] border border-[#2A2A2A] rounded-2xl"

// Primary Button (red glow on hover)
className="bg-[#FF2D55] hover:bg-[#E0263A] text-white rounded-xl 
           hover:shadow-[0_0_20px_rgba(255,45,85,0.3)] 
           transition-all active:scale-[0.97] hover:scale-[1.03]"

// Input
className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl 
           text-white placeholder-gray-600"
```

---

## Animations

| Trigger | Animation |
|---|---|
| Page load | `fade-in + translateY(20px → 0)` — 400ms |
| Cards on scroll | Staggered fade-up via IntersectionObserver |
| Match % counter | Count from 0 → final value over 1 second |
| Upload drag-over | Border pulses red |
| Processing state | Gradient bar loops left → right |
| Toast | Slide in top-right, auto-dismiss 4s |
| Open badge | Subtle green pulse animation |
| Match cards | Appear with 100ms stagger after results load |

---

## Demo Mode (Hackathon Fallback)

If the Gemini API fails during the live demo, a `DEMO_MODE` flag bypasses the API and returns pre-cached descriptors:

```typescript
// src/lib/gemini.ts
const DEMO_MODE = false; // flip to true for offline demo

const DEMO_DESCRIPTORS = {
  laptop: {
    category: "electronics",
    primaryColor: "black",
    brand: "Dell",
    distinctiveFeatures: ["sticker on lid", "scratch near hinge"],
    material: "plastic",
    size: "large"
  },
  // ... 2 more pre-seeded items
};
```

Pre-seed 3 found items in Supabase with these descriptors before the demo. The SnapSearch `87% match` animation will fire reliably regardless of API status.

---

## Admin Access

```
Route:     /admin
Password:  admin2026
```

Admin capabilities:
- View all items with status filters
- Approve or reject pending claims
- Mark items as Resolved
- View stats charts (items/day, category breakdown, recovery rate)

---

---

## Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Desktop 1280px+ | Full layouts as designed |
| Tablet 768–1279px | 2-col grids, sidebar collapses |
| Mobile < 768px | Single column, bottom sheet modals, full-width buttons |

---

## Contributing

This is a hackathon project built for **IntelliAI Arena 2026**. If you're building on top of this:

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `git commit -m "feat: add real-time match notifications"`
4. Open a PR

---

