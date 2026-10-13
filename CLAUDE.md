# Just Because

Group gift websites. One person sets up a themed gift, friends add letters, photos,
songs and more through one shared link (no login), the organiser approves, and the
recipient opens one finished page. ITENT 155 capstone (Ateneo), team JKCK.

Live: https://justbecause.site (fallback https://just-because-snowy.vercel.app)

## Stack

- **TanStack Start** (React 19, file routes in `src/routes`, Vite 8, Tailwind 4)
- **Postgres on Neon** via **Drizzle** (`src/server/db/schema.ts`)
- **Better Auth** for login: email/password + Google (`src/server/auth.ts`)
- **Vercel Blob** for photos/voice notes (`src/routes/api/upload.ts`, `src/lib/upload.ts`)
- **Resend** for email (`src/server/email.ts`)
- Hosted on **Vercel** (team "Just Because", region `sin1`), auto-deploys from `main`

Moved off Lovable + Supabase in Oct 2026. Old Lovable SQL lives in
`drizzle/lovable-legacy-migrations/` for reference only.

## How data access works (important)

The browser never talks to the database. Every read/write is a server function in
`src/lib/api.ts`, and that file enforces the privacy rules that used to be Supabase RLS:

- Anyone can read a gift's settings, modules and calendar by slug.
- Guests only see **approved** contributions. Tree ornaments marked "only the
  recipient" never send their text to the browser.
- Guests add contributions (always `pending`) and can edit/delete their own with the
  `edit_token` stored on their device, only while the gift is a **draft**.
- Only the creator (or an admin) can edit a gift, see pending items, approve/hide,
  toggle sections, or plan the calendar. Use `requireSiteOwner()`.
- Only admins (`user.is_admin`) can change themes.

When adding a feature that touches data: add a server fn in `api.ts`, guard it with
`requireUser` / `requireSiteOwner` / `requireAdmin` from `src/server/guards.ts`, and
return rows through `toRow()` (snake_case, matching the `normalize*` helpers in `src/lib`).
Code under `src/server/**` must never be imported by client code directly.

## Commands

```bash
bun install
bun run dev            # http://localhost:8080 (needs DATABASE_URL in .env)
bun run db:generate    # after editing schema.ts, creates a migration in drizzle/migrations
bun run db:migrate     # applies migrations (Vercel runs this on every build)
bun run db:seed        # 24 palettes + 8 themes, idempotent (also runs on build)
npx tsc --noEmit       # typecheck
NITRO_PRESET=node bun run build && node .output/server/index.mjs   # prod build locally
```

Locally, without `BLOB_READ_WRITE_TOKEN` uploads save to `.dev-uploads/`, and without
`RESEND_API_KEY` emails print to the server log. See `.env.example` for all variables.

## Emails

Confirm-email on sign-up, password reset, new-note alert to the creator (max one per
30 min per gift, `gift_sites.last_notified_at`), and "gift is live" on publish. Email
verification is only required once `RESEND_API_KEY` and `EMAIL_FROM` are both set.

## Brand

- Mascot **Bo** (`src/components/Bo.tsx`), a walking gift box.
- Colors: paper #FBF8F2, cream #F4EEE3, ink #2B2522, terracotta #B5623E, blush #E9C9B6.
  Occasion palettes are for gift pages only, never product chrome.
- Type: Fraunces (display), DM Sans (body), Caveat (handwritten), JetBrains Mono (labels).
- Voice: like the friend organising the group gift. Say gift, note, friends, open (not
  site, content, users, launch). Plain English in product copy. Max one exclamation mark
  per screen. No em dashes in copy.

## Known gotchas

- Countdowns use the gift's date in **Asia/Manila** time.
- Background layers on gift pages: `position:absolute` inside an `overflow:hidden` wrapper,
  or they leak over the editor.
- Keep `@tanstack/react-start` at a patched version; Vercel blocks deploys of versions
  with known CVEs.
- `bunfig.toml` refuses packages published less than 24h ago (supply-chain guard).

## Open product work

Payments (Stripe test mode for the capstone demo, PayMongo for GCash/Maya later, keep the
gateway swappable), bridal shower and anniversary templates, pricing by storage time.
