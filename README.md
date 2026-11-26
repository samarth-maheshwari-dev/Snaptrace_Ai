# SnapTrace

**Campus lost & found where you search with a photo, not keywords.**

"Blue bottle" matches forty listings. A photo of *your* bottle — dent and all — matches one.
SnapTrace uses Gemini Vision to turn a photo into a structured description, scores it against
everything that's been handed in, and shows the closest matches **with the reasons they matched**.
Owners prove ownership with a detail that isn't in the listing; staff verify before anyone's
contact details are shared.

## How it works

```
photo ──► browser resize + EXIF strip ──► POST /api/images
                                            │  magic-byte check, 5 MB cap
                                            ▼
                                   Gemini (JSON schema output)
                                            │  validated with zod
                                            ▼
                                  descriptor stored server-side
                                            │
              POST /api/search ◄────────────┘  (client only sends the image id —
                     │                          it can't forge a descriptor)
                     ▼
     scoreMatch() vs every open "found" item ──► ranked matches + reasons
```

**Matching (`server/matching.ts`)** — weighted, explainable score (0–100):

| Signal | Weight | How |
|---|---|---|
| Category | 30 | exact; different categories are capped at 35 total |
| Colour | 20 | normalised to colour families (`navy` → blue, `space grey` → grey) |
| Distinctive features | 20 | word-set Jaccard, so "sticker on lid" ≈ "lid has stickers" |
| Brand | 15 | case-insensitive |
| Description | 10 | word-set Jaccard |
| Material | 5 | exact |

Matches under 40 are hidden; 75+ are shown as strong.

## Stack

- **Frontend:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router
- **Backend:** Express + zod validation, helmet, per-IP rate limiting
- **AI:** Google Gemini (`gemini-2.5-flash` by default) with structured JSON output
- **Storage:** JSON file store in `./data` for local dev (behind a small interface, swappable for Postgres)
- **Tests:** Vitest

## Security & privacy

- No secrets in code. Keys and the admin password come from `.env` (gitignored).
- Reporter emails are **never** returned by the public API; only staff see them.
- Admin login is checked server-side and returns an HMAC-signed, expiring token; every admin route verifies it.
- Uploads are type-sniffed from their bytes (JPEG/PNG/WEBP only), size-capped, renamed with UUIDs.
- Photos are re-encoded in the browser, which strips EXIF GPS data before upload.
- Rate limits on uploads, reports, claims and login.

## Run it

```bash
npm install
cp .env.example .env     # fill in GEMINI_API_KEY, ADMIN_PASSWORD, SESSION_SECRET
npm run dev              # http://localhost:3000
```

Without `GEMINI_API_KEY` the app still runs (browse, report, claims, admin); photo search is disabled
and reports are matched on their text.

```bash
npm test        # unit tests (matching + security)
npm run lint    # type-check
npm run build && NODE_ENV=production npm start
```

## Project layout

```
server/
  index.ts      routes
  matching.ts   similarity scoring
  gemini.ts     vision call + output validation
  security.ts   admin tokens, rate limit, image sniffing
  store.ts      JSON store (atomic writes)
  seed.ts       demo items
src/
  pages/        Home, Browse, Report, Photo search, Item, Admin
  components/   Layout, ItemCard, MatchRow, ClaimModal, ImagePicker, Toast, Badges
  lib/          api client, image compression, category metadata
tests/
```

Originally built for IntelliAI Arena 2026; since rewritten.
