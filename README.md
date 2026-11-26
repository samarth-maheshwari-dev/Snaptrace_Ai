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

**Matching** is two-stage (retrieve → re-rank):

1. **`server/matching.ts`**, a deterministic, explainable scorer run on every candidate. Each signal returns 0–1 or
   *null = no evidence*, and weights are renormalised over known signals, so a missing logo is not a mismatch.

   | Signal | Weight | How |
   |---|---|---|
   | Category | 22 | exact / related categories partial |
   | Semantic | 22 | cosine of Gemini text embeddings |
   | Distinctive features | 18 | overlap of normalised words (plurals, synonyms) |
   | Colour | 14 | colour families; near colours partial |
   | Brand | 10 | only when both sides saw one |
   | Description / material / size | 6 / 4 / 4 | |

   Contradictions multiply the score down and are shown as warnings: different brand, clashing colour,
   different category, or *found before it was lost*. Thin evidence lowers the score (coverage factor);
   text-only reports are capped at 75 with low confidence.
2. **`server/matcher.ts`**: the top 3 are sent to Gemini with **both photos** to ask "same physical object?".
   The probability is blended in (55/45), cached per pair, and skipped gracefully if AI is off or slow.
   A hard contradiction caps the result at 60 whatever the model says.

Matches under 40 are hidden.

## Stack

- **Frontend:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router
- **Backend:** Express + zod validation, helmet, per-IP rate limiting
- **AI:** Google Gemini (`gemini-2.5-flash` by default) with structured JSON output
- **Storage:** Supabase (Postgres + Storage, RLS on, server-only service key); falls back to a local JSON file for dev
- **Tests:** Vitest

## Security & privacy

- **No passwords anywhere.** Google Sign-In: the server verifies Google's ID token (signature, audience, expiry, `email_verified`) and issues an httpOnly, HMAC-signed session cookie.
- Staff = emails in `ADMIN_EMAILS`, re-checked on every request. Optional `ALLOWED_EMAIL_DOMAINS` limits sign-in to a college domain.
- CSRF: every write needs an `X-Requested-With` header (cross-site requests can't send it without a CORS preflight we never allow).
- No secrets in code; production refuses to start without `SESSION_SECRET`.
- Reporter emails are **never** returned by the public API; contact is shared only after staff approve a claim.
- Uploads are type-sniffed from their bytes (JPEG/PNG/WEBP only), size-capped, renamed with UUIDs.
- Photos are re-encoded in the browser, which strips EXIF GPS data before upload.
- Per-user rate limits on uploads, searches, reports, claims and sign-in.

## Run it

```bash
npm install
cp .env.example .env     # GEMINI_API_KEY, GOOGLE_CLIENT_ID, ADMIN_EMAILS, SESSION_SECRET
                         # (or DEV_LOGIN=1 to try locally without Google OAuth)
npm run dev              # http://localhost:3000
```

Without `GEMINI_API_KEY` the app still runs; photo search is disabled and reports are matched on their text.

```bash
npm test        # unit tests (matching + security)
npm run lint    # type-check
npm run build && NODE_ENV=production npm start
```

## Deploy (Render + Supabase)

1. Supabase: new project → SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql).
2. Google Cloud: OAuth client ID (Web) with your live URL in *Authorised JavaScript origins*.
3. Render: **New → Blueprint** → this repo ([`render.yaml`](render.yaml)) → fill in `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`,
   `ADMIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. `SESSION_SECRET` is generated.

## Project layout

```
server/
  index.ts      routes
  matching.ts   similarity scoring
  gemini.ts     vision call + output validation
  matcher.ts    two-stage matching + AI verification cache
  security.ts   Google auth, sessions, CSRF, rate limit, image sniffing
  store.ts      Store interface: Supabase or local JSON
  seed.ts       demo items
src/
  pages/        Home, Browse, Report, Photo search, Item, Admin
  components/   Layout, ItemCard, MatchRow, ClaimModal, ImagePicker, Toast, Badges
  lib/          api client, image compression, category metadata
tests/
```

Originally built for IntelliAI Arena 2026; since rewritten.
