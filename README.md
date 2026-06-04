# SnapTrace — Product Requirements Document
**Photo-First Campus Lost & Found Platform**
**Hackathon: IntelliAI Arena 2026 | Track 1 – Web & App Development**

---

## 1. PRODUCT OVERVIEW

### Tagline
*"Show what you lost. Find it in seconds."*

### Concept
SnapTrace is a campus lost & found platform where students upload a **photo** of their lost item and the system visually matches it against reported found items using **Google Gemini Vision AI** — returning a ranked similarity score. No more "blue water bottle" keyword dead-ends. Photos tell the truth.

### The Problem
Text-based lost & found boards fail because people describe items poorly. "Blue bottle" matches 40 listings. A photo of YOUR specific Decathlon bottle with a dent on the right side matches exactly one.

### The Unique Solution
Gemini Vision API analyzes uploaded item images into structured semantic descriptors (color, brand, material, distinctive features). When a student searches for a lost item by uploading a photo, the system compares descriptors and returns a **% similarity match** against all found items — ranked from highest to lowest.

---

## 2. TECH STACK (Lovable.dev Optimized)

```
Frontend:     React + TypeScript + Vite
Styling:      Tailwind CSS + shadcn/ui components
Backend/DB:   Supabase (Auth, PostgreSQL, Storage)
AI:           Google Gemini 1.5 Flash Vision API
Hosting:      Vercel (auto-deploy from Lovable)
```

**Supabase Tables:**
- `items` — all lost & found posts
- `item_descriptors` — Gemini Vision JSON output per item
- `claims` — claim requests
- `matches` — match results log

---

## 3. DESIGN SYSTEM

### Theme
- **Mode:** Dark-first (dark background, light text)
- **Aesthetic:** Clean modern dark UI with Squid Game-inspired accent colors (fits hackathon theme)
- **Vibe:** Premium, minimal, functional — not cluttered

### Color Palette
```
Background:     #0D0D0D (near black)
Surface cards:  #161616
Border:         #2A2A2A
Primary accent: #FF2D55 (Squid Game red/pink)
Secondary:      #FF6B35 (warm orange)
Success:        #00D26A (green)
Warning:        #FFB800 (amber)
Text primary:   #F5F5F5
Text muted:     #888888
```

### Typography
```
Headings:  Syne (Google Font) — bold, modern
Body:      Inter (Google Font) — clean, readable
Monospace: JetBrains Mono (for status codes/IDs)
```

### Component Style
- Cards: `bg-[#161616] border border-[#2A2A2A] rounded-2xl`
- Buttons primary: `bg-[#FF2D55] hover:bg-[#E0263A] text-white rounded-xl`
- Input fields: `bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-600`
- Badges: pill-shaped, color-coded by status
- Subtle red glow on hover for primary CTAs: `shadow-[0_0_20px_rgba(255,45,85,0.3)]`

---

## 4. PAGES & SCREENS

---

### PAGE 1: Landing / Home (`/`)

**Purpose:** Entry point. Explains SnapTrace in under 5 seconds. Gets users to act.

**Layout (top to bottom):**

**Navbar (sticky)**
- Left: Logo — circle icon + "SnapTrace" in Syne font, red dot on the 'S'
- Center: Nav links — Home, Browse, Report Item
- Right: "Sign In" button (ghost) + "Post Item" button (red filled)
- On scroll: navbar gets `backdrop-blur-md bg-black/60` glass effect

**Hero Section**
- Full viewport height
- Left side (60%):
  - Tag line badge: `🔴 AI-Powered Lost & Found`
  - H1 (oversized, 5xl–7xl): "Lost something? **Show us a photo.**"
  - Subtext: "SnapTrace uses Gemini Vision AI to visually match your lost items against found reports on campus."
  - Two CTA buttons side by side:
    - "🔍 Find My Item" → goes to SnapSearch page (red filled, glow)
    - "📦 Report Found Item" → goes to post form (ghost outlined)
- Right side (40%):
  - Animated card mockup showing the match UI (image of a laptop → 87% match found)
  - Subtle floating animation (CSS keyframe up-down)

**How It Works Section**
- Section heading: "3 Steps. Zero Hassle."
- 3 horizontal cards with icon + step:
  1. 📸 **Snap** — Upload a photo of your lost/found item
  2. 🤖 **Match** — Gemini Vision AI analyzes and ranks similar items
  3. ✅ **Claim** — Contact the finder and get your item back
- Cards animate in on scroll with staggered fade-up

**Live Stats Bar**
- 4 numbers animated on scroll:
  - `124` Items Reported
  - `89` Items Recovered
  - `72%` Match Accuracy
  - `6 min` Avg. Recovery Time
- Dark bar with subtle red left border accent

**Recent Activity Feed**
- Heading: "Recently Found on Campus"
- Grid of 6 item cards (pulled from Supabase, limit 6, order by created_at desc, where type = 'found')
- Each card shows: item image, category badge, location, time ago, "View Match" button
- Hovering a card: subtle red border glow + lift shadow

**Footer**
- Dark background `#0A0A0A`
- Left: SnapTrace logo + tagline
- Center: Quick links (Home, Browse, Post Item, Admin)
- Right: "Built for IntelliAI Arena 2026 | AI Nexus Club, AITR"
- Bottom strip: "Powered by Gemini Vision AI + Supabase"

---

### PAGE 2: Browse Items (`/browse`)

**Purpose:** Full listing of all lost & found items with filters.

**Layout:**

**Header**
- H2: "Browse All Items"
- Subtitle: "Filter by category, status, or date to find your item"

**Filter Bar (sticky below navbar)**
- Horizontal filter row:
  - Toggle buttons: `All` | `Lost` | `Found` (pill toggle, active = red)
  - Category dropdown: Electronics, Clothing, Stationery, Accessories, ID/Cards, Other
  - Location input: text field (search campus location)
  - Date range picker: From / To
  - "Clear Filters" ghost button
- Results count: "Showing 24 items"

**Item Grid**
- Responsive grid: 3 cols desktop, 2 cols tablet, 1 col mobile
- Each **ItemCard** component:
  - Item photo (square, object-cover, rounded-xl)
  - Status badge (top-right overlay): 
    - `Open` = green pill
    - `Claimed` = amber pill  
    - `Resolved` = gray pill
  - Type badge (top-left overlay):
    - `Lost` = red pill
    - `Found` = blue pill
  - Item title (bold, white)
  - Category + Location (muted text, icon prefix)
  - Time posted (e.g., "2 hours ago")
  - CTA button: "View Details" → goes to `/item/:id`

**Empty State**
- If no results: centered illustration, "No items match your filters", "Clear Filters" button

---

### PAGE 3: Post Item (`/post`)

**Purpose:** Report a lost OR found item with image.

**Layout:**

**Step Indicator (top)**
- 3-step progress bar: Step 1: Type → Step 2: Details → Step 3: Photo → Submit
- Active step highlighted in red

**Step 1: Item Type**
- Large card toggle:
  - Left card: "🔴 I LOST something" → on click, card glows red, border highlights
  - Right card: "🔵 I FOUND something" → on click, card glows blue
- Continue button activates only after selection

**Step 2: Item Details**
- Form fields (all required):
  - Item Title: text input (e.g., "Black laptop bag")
  - Category: dropdown (Electronics, Clothing, Stationery, Accessories, ID/Cards, Other)
  - Location Found/Lost: text input + "Use my location" button
  - Date Found/Lost: date picker (defaults to today)
  - Description: textarea (max 300 chars, live char count)
  - Your Contact: email input
  - Your Name: text input
- "Next Step" button (red)

**Step 3: Photo Upload**
- Large dashed upload zone: "📸 Drop your item photo here or click to upload"
- Accepts: JPG, PNG, WEBP, max 5MB
- On upload: shows image preview with "Remove" option
- Below preview: "🤖 Gemini AI will analyze this photo to help match your item"
- Animated loading state when submitting: "Analyzing image with Gemini Vision..."
- On success: redirect to item detail page with success toast

**Submit Logic (internal, describe to Lovable):**
1. Upload image to Supabase Storage → get public URL
2. Call Gemini Vision API with the image URL → get descriptor JSON
3. Insert row into `items` table with all form data + image URL + descriptor JSON
4. If `type = 'found'`: run matching algorithm against all 'lost' items → auto-notify poster if match > 70%
5. If `type = 'lost'`: run matching algorithm against all 'found' items → show matches immediately

---

### PAGE 4: SnapSearch — Visual Match Search (`/snapsearch`)

**Purpose:** THE UNIQUE FEATURE. Upload a photo, get ranked matches. This is what wins the hackathon.

**Layout:**

**Header**
- H2: "SnapSearch" with small 🤖 badge
- Subtitle: "Upload a photo of your lost item. Our AI will find the closest matches."

**Upload Zone (center, prominent)**
- Large card (50% page width, centered)
- Dashed border, red accent on hover/drag-over
- Icon: camera emoji + "Drop your item photo here"
- Subtext: "Gemini Vision AI will analyze and match it"
- After upload: shows image preview in the same card
- "🔍 Find Matches" red button — activates after image is uploaded

**Processing State (shows while Gemini API is working)**
- Full-width loading bar with animated progress
- Text cycles through:
  - "📸 Analyzing your image..."
  - "🤖 Extracting item features..."
  - "🔍 Comparing against found items..."
  - "📊 Ranking matches..."
- Estimated time: "This takes about 3–5 seconds"

**Results Section (appears below after analysis)**

**AI Analysis Card (shows what Gemini detected)**
- Card title: "🤖 What Gemini Detected"
- Chips/tags for each detected property:
  - Category: `Electronics`
  - Colors: `Black`, `Silver`
  - Brand: `Dell`
  - Features: `Sticker on lid`, `Scratch near hinge`
  - Material: `Plastic`
  - Size: `Large`
- Subtext: "Matching against X found items..."

**Match Results (ranked list)**
- Section heading: "Top Matches Found"
- Each **MatchCard** component (ranked 1st to Nth):
  - Left: Match percentage badge — big circle with % (e.g., `87%`) in color:
    - 80–100% = green
    - 50–79% = amber
    - Below 50% = gray (shown as "Low Match")
  - Center: Found item image (thumbnail)
  - Right: Item details — title, location, date found, matched properties highlighted
  - Bottom: "📩 Send Claim Request" button → opens claim modal

- If no matches above 40%: show "No strong matches found" state with option to post as Lost item

---

### PAGE 5: Item Detail (`/item/:id`)

**Purpose:** Full view of a single item with claim CTA.

**Layout:**

**Item Header**
- Breadcrumb: Home > Browse > [Item Name]
- Status badge (large): Open / Claimed / Resolved
- Type badge: LOST or FOUND

**Two-column layout:**

**Left (60%): Item Info**
- Item image (large, rounded-2xl)
- Item title (H2, bold)
- Description block
- Details grid:
  - Category, Location, Date, Posted by (name only)
- Contact info (shown only after claim request submitted)

**Right (40%): Action Panel**
- Card with:
  - If item is `Found` and viewer is `Lost owner`:
    - "🤖 Match Score" (if arrived from SnapSearch, show their % match)
    - "📩 Claim This Item" red button → opens modal
  - If item is `Lost`:
    - "📦 I Found This Item" button → redirects to post found item
  - If already claimed: "✅ Claim Submitted — Awaiting Response"
  - If Resolved: "🎉 This item has been returned"

**Similar Items**
- Horizontal scroll row of similar items (same category)
- Heading: "Other Items You Might Be Looking For"

---

### PAGE 6: Claim Request Modal

**Purpose:** Send claim request for a found item.

**Trigger:** "Claim This Item" button on item detail or match card.

**Modal Content:**
- Heading: "Claim Request for [Item Name]"
- Form fields:
  - Your Full Name (text)
  - Your Student ID (text)
  - Your Email (email)
  - Your Phone (tel, optional)
  - Proof of ownership description: textarea — "Describe something unique about this item that only the owner would know" (this is smart UX — prevents false claims)
- Submit button: "Send Claim Request"
- On submit: insert into `claims` table + toast notification

---

### PAGE 7: Admin Panel (`/admin`)

**Purpose:** Verify items, close cases, manage users.

**Access:** Simple password gate (hardcode a password for hackathon demo: `admin2026`)

**Layout:**

**Sidebar navigation:**
- Dashboard
- All Items
- Pending Claims
- Resolved Cases
- Stats

**Dashboard Tab:**
- 4 stat cards:
  - Total Items Posted
  - Open Lost Items
  - Open Found Items
  - Items Resolved Today
- Recent activity table: last 10 actions

**All Items Tab:**
- Table with columns: ID, Image (thumbnail), Title, Type, Status, Category, Location, Posted, Actions
- Actions per row: View, Mark Resolved, Delete
- Bulk action: "Mark Selected as Resolved"
- Filter by type / status / date

**Pending Claims Tab:**
- Each claim card shows:
  - Found item thumbnail + title
  - Claimer: name, student ID, email, phone
  - Proof description they wrote
  - Two buttons: ✅ "Approve & Notify Both" | ❌ "Reject Claim"
  - On approve: item status → Resolved, email both parties (simulate with toast)

**Stats Tab:**
- Bar chart: Items posted per day (last 7 days)
- Pie chart: Category breakdown
- Line chart: Recovery rate over time
- All using Recharts library

---

## 5. DATA MODELS

### `items` table (Supabase)
```sql
id              uuid primary key default gen_random_uuid()
type            text check (type in ('lost', 'found'))
title           text not null
category        text not null
location        text not null
date_occurred   date not null
description     text
contact_email   text not null
contact_name    text not null
image_url       text
descriptor_json jsonb  -- Gemini Vision output
status          text default 'open' check (status in ('open', 'claimed', 'resolved'))
created_at      timestamptz default now()
```

### `claims` table (Supabase)
```sql
id              uuid primary key default gen_random_uuid()
item_id         uuid references items(id)
claimer_name    text not null
claimer_email   text not null
student_id      text not null
phone           text
proof_text      text not null
status          text default 'pending' check (status in ('pending', 'approved', 'rejected'))
created_at      timestamptz default now()
```

---

## 6. GEMINI VISION API INTEGRATION

### API Call Structure
```javascript
// Call this after image is uploaded to Supabase Storage
async function analyzeItemImage(imageUrl: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64ImageData  // convert image to base64
              }
            },
            {
              text: `Analyze this item image. Return ONLY valid JSON with no markdown:
              {
                "category": "electronics|clothing|stationery|accessory|id_card|other",
                "primaryColor": "single dominant color",
                "secondaryColors": ["array", "of", "other", "colors"],
                "brand": "brand name or null",
                "distinctiveFeatures": ["feature1", "feature2"],
                "material": "plastic|fabric|metal|leather|paper|other",
                "size": "small|medium|large",
                "condition": "new|good|used|damaged",
                "itemDescription": "one sentence plain description"
              }`
            }
          ]
        }]
      })
    }
  );
  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}
```

### Similarity Scoring Algorithm
```javascript
function computeSimilarity(descriptorA: object, descriptorB: object): number {
  let score = 0;
  let maxScore = 0;

  // Category match (highest weight)
  maxScore += 30;
  if (descriptorA.category === descriptorB.category) score += 30;

  // Primary color match
  maxScore += 20;
  if (descriptorA.primaryColor === descriptorB.primaryColor) score += 20;

  // Brand match
  maxScore += 20;
  if (descriptorA.brand && descriptorB.brand && 
      descriptorA.brand.toLowerCase() === descriptorB.brand.toLowerCase()) score += 20;

  // Material match
  maxScore += 10;
  if (descriptorA.material === descriptorB.material) score += 10;

  // Size match
  maxScore += 10;
  if (descriptorA.size === descriptorB.size) score += 10;

  // Distinctive features overlap
  maxScore += 10;
  const featuresA = new Set(descriptorA.distinctiveFeatures?.map(f => f.toLowerCase()) || []);
  const featuresB = new Set(descriptorB.distinctiveFeatures?.map(f => f.toLowerCase()) || []);
  const intersection = [...featuresA].filter(f => featuresB.has(f));
  if (featuresA.size > 0) score += (intersection.length / featuresA.size) * 10;

  return Math.round((score / maxScore) * 100);
}
```

---

## 7. KEY USER FLOWS

### Flow A: "I Lost My Laptop" (Primary)
1. Land on homepage → click "🔍 Find My Item"
2. SnapSearch page → upload laptop photo
3. Gemini analyzes (3–5 sec loading)
4. See ranked matches: "87% Match — Dell laptop, black, found at Library"
5. Click "Send Claim Request" → fill form
6. Admin approves → both parties get notified

### Flow B: "I Found a Water Bottle" (Secondary)
1. Homepage → click "📦 Report Found Item"
2. Post form: select "Found", fill details, upload photo
3. Gemini analyzes photo, stores descriptor
4. System auto-checks against existing Lost items
5. If match found: toast shows "Potential match found! A student reported losing a similar item."
6. Redirects to item detail with match shown

### Flow C: Admin Resolves Case
1. Admin goes to `/admin` → enters password
2. Sees pending claims
3. Reviews claimer's proof description
4. Clicks "Approve & Notify Both"
5. Item status → Resolved, both students see update

---

## 8. ANIMATIONS & INTERACTIONS

All animations should be smooth and purposeful — not distracting.

- **Page load:** fade-in + translateY(20px → 0) on main content, 400ms
- **Cards on scroll:** staggered fade-up (IntersectionObserver or Framer Motion)
- **Match percentage counter:** animate from 0 to final value over 1 second
- **Upload zone:** border pulses red when file is dragged over it
- **Processing loader:** gradient bar animates left to right repeatedly
- **Toast notifications:** slide in from top-right, auto-dismiss after 4 seconds
- **Status badges:** subtle pulse animation on "Open" status (green pulse)
- **Navbar:** smooth background blur transition on scroll
- **Match result cards:** appear one by one with 100ms stagger after results load
- **Buttons:** scale(0.97) on press, scale(1.03) on hover

---

## 9. RESPONSIVE BEHAVIOR

- **Desktop (1280px+):** All layouts as described above
- **Tablet (768–1279px):** 2-col grids, sidebar collapses
- **Mobile (below 768px):** Single column, bottom sheet for modals, full-width buttons

---

## 10. DEMO SCENARIOS (for hackathon presentation)

**Demo 1 — SnapSearch Live (wow moment):**
- Have 3 pre-seeded "found" items in DB with images and descriptors
- Upload a photo of a similar item → show 87% match appear with animation
- Click "Claim" → submit form → show success

**Demo 2 — Post Found Item:**
- Upload a found item → Gemini analyzes → show descriptor tags appear
- System says "Match found!" → demonstrates auto-notify feature

**Demo 3 — Admin Panel:**
- Show pending claim → approve it → item goes to Resolved
- Show stats dashboard with charts

**FALLBACK (if Gemini API fails during demo):**
- Pre-cache 3 hardcoded descriptor JSONs
- Hardcode a `DEMO_MODE = true` flag that bypasses API and returns pre-cached results
- Judges will not know the difference

---

## 11. ENVIRONMENT VARIABLES NEEDED

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## 12. WHAT MAKES THIS WIN THE HACKATHON

| Judging Criteria | How SnapTrace Scores |
|---|---|
| **Innovation 30%** | Photo-based visual matching via Gemini Vision — no other team has this |
| **Technical 35%** | Gemini Vision API + similarity algorithm + Supabase real-time + full CRUD |
| **UI/UX 15%** | Dark Squid Game-themed design, animated match results, step-by-step post form |
| **Gemini/GCP 10%** | Gemini Vision is the core feature — full 10 bonus points |
| **Demo 10%** | Upload photo → watch AI match appear = dramatic, memorable, clear |

**Total addressable score: 105% (with bonus)**

---

*PRD Version 1.0 | SnapTrace | IntelliAI Arena 2026 | Built for Web Track*
