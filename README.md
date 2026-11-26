# SnapTrace

**A lost & found website for a college campus. You search with a photo instead of typing words.**

---

## The problem, in one line

If you lose a blue bottle and type "blue bottle", you get 40 results.
If you upload a **photo** of your bottle, SnapTrace shows the one that actually looks like yours.

---

## How it works (the 30-second version)

1. **Someone finds an item** → they post it with a photo.
2. **Someone loses an item** → they upload a photo of it (or a similar one).
3. **The AI (Google Gemini) looks at the photo** and writes down what it sees: type, colour, brand, stickers, scratches.
4. **SnapTrace compares** that description with every found item and gives each one a score out of 100.
5. **You see the best matches**, and *why* they matched ("same colour", "same brand", "both have a sticker on the lid").
6. **You click "This is mine"** and prove it with a detail that isn't in the photo.
7. **A staff member checks your proof.** Only after they approve do the owner and finder get each other's contact details.

That's it. No one's email is shown publicly, and no one can claim an item without staff checking it.

---

## Who can do what

| Action | Not signed in | Student | Staff |
|---|---|---|---|
| Browse items | ✅ | ✅ | ✅ |
| Search with a photo | ❌ | ✅ | ✅ |
| Post a lost / found item | ❌ | ✅ | ✅ |
| Claim an item | ❌ | ✅ | ✅ |
| Approve claims, delete items | ❌ | ❌ | ✅ |

- Everyone signs in with **Google**. There are **no passwords** in the app at all.
- "Staff" = the email addresses listed in the `ADMIN_EMAILS` setting. Nobody else.

---

## How the matching works (a bit deeper)

Matching happens in **two steps**:

**Step 1 — Quick score for every item.**
Each found item gets points for things that agree with your photo:

| What is compared | Points |
|---|---|
| Category (bottle, phone, keys…) | 22 |
| Overall meaning (AI text similarity) | 22 |
| Special marks (stickers, dents, scratches) | 18 |
| Colour ("navy" counts as blue) | 14 |
| Brand | 10 |
| Description / material / size | 6 / 4 / 4 |

Two simple rules keep it fair:
- **If something is unknown, it doesn't count against you.** No brand visible? Brand is just skipped.
- **If something clearly disagrees, the score drops** and you see a warning — e.g. different brand, very different colour, or the item was "found" before you even lost it.

**Step 2 — AI double-check on the top 3.**
The AI is shown **both photos** and asked: "Is this the same object?" Its answer is mixed into the score.
If the AI is slow or turned off, Step 1's score is used as is, so the app never breaks.

Matches below 40 are hidden.

---

## How it keeps data safe

- **Google sign-in, no passwords.** The server checks Google's proof and gives you a secure cookie.
- **Emails are never public.** They're shared only after staff approve a claim.
- **Uploads are checked.** Only real JPEG/PNG/WEBP images under 5 MB are accepted.
- **Photo location data is removed** in your browser before the photo is uploaded.
- **Rate limits** stop people from spamming searches, posts or claims.
- **No secret keys in the code.** All keys live in a `.env` file that is never uploaded to GitHub.
- **The database is not open to the internet.** Only the server can talk to it.

---

## Run it on your computer

You need **Node.js 22** installed.

```bash
npm install
cp .env.example .env    # then open .env and fill in the values
npm run dev             # open http://localhost:3000
```

What to put in `.env`:

| Setting | What it is | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | Lets the app use Google's AI | aistudio.google.com → API keys |
| `GOOGLE_CLIENT_ID` | Makes "Sign in with Google" work | Google Cloud Console → Credentials → OAuth client ID (Web) |
| `ADMIN_EMAILS` | Your email = you become staff | Just type it |
| `SESSION_SECRET` | A random password for cookies | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | The online database | Supabase → Project Settings → API |

Don't have all of these yet?
- No Gemini key → the app still runs, photo search is just turned off.
- No Supabase → data is saved in a local file instead.
- No Google login → set `DEV_LOGIN=1` to sign in by typing an email (only works on your computer, never live).

Other commands:

```bash
npm test         # run the tests
npm run lint     # check for type errors
npm run build    # build for production
npm start        # run the production build
```

---

## Put it online (Render + Supabase)

1. **Supabase:** create a project → open *SQL Editor* → paste and run [`supabase/schema.sql`](supabase/schema.sql).
2. **Google Cloud:** create an OAuth client ID (Web). Add your live website URL under *Authorised JavaScript origins*.
3. **Render:** *New → Blueprint* → pick this repo. It reads [`render.yaml`](render.yaml). Fill in
   `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   `SESSION_SECRET` is created for you.
4. Copy the live URL Render gives you and add it in Google Cloud (step 2).

---

## Built with

- **Website:** React, TypeScript, Vite, Tailwind CSS
- **Server:** Node.js + Express
- **AI:** Google Gemini (reads photos, compares items)
- **Database & photo storage:** Supabase
- **Tests:** Vitest

---

## Where things are in the code

```
server/
  index.ts      all the API routes
  gemini.ts     sends photos to the AI and checks its answer
  matching.ts   Step 1: the scoring rules
  matcher.ts    Step 2: the AI double-check
  security.ts   Google login, cookies, rate limits, image checks
  store.ts      saves data (Supabase online, or a local file)
  seed.ts       10 demo items so the site isn't empty
src/
  pages/        Home, Browse, Report, Photo search, Item, My activity, Staff desk
  components/   reusable UI pieces
  lib/          API calls, image resizing
supabase/
  schema.sql    database tables
tests/          automated tests
```

Originally built for IntelliAI Arena 2026; since rewritten.
