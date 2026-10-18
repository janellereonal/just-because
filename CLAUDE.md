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

**Status, accounts and the task queue are in `HANDOFF.md`. Read it first.**

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
bun run db:seed        # 24 palettes + 9 themes, idempotent (also runs on build)
npx tsc --noEmit       # typecheck
NITRO_PRESET=node bun run build && node .output/server/index.mjs   # prod build locally
```

Locally, without `BLOB_READ_WRITE_TOKEN` uploads save to `.dev-uploads/`, and without
`RESEND_API_KEY` emails print to the server log. See `.env.example` for all variables.

## Payments (PayMongo, test mode)

- Making, editing and collecting notes is free. Going live needs a paid plan.
- **All prices, caps, formats, durations, payment methods, the USD display rate and the promo
  live in `src/config/pricing.ts`.** Never hardcode a price anywhere else.
- Flow: "Wrap it up" → tier picker → `startCheckout` (server computes the amount) → PayMongo
  hosted checkout → back to `/checkout/$orderId`, which polls `getOrderStatus`.
- Orders are marked paid by `applyPaidEvent` in `src/server/billing.ts`, from two places:
  the webhook (`src/routes/api/webhooks/paymongo.ts`: verifies `Paymongo-Signature`, re-fetches
  the session) and, as a backup, `getOrderStatus` while the confirm page is open (asks PayMongo
  directly via `provider.checkPaid`, max every 5s per order). Event ids go in `webhook_events`,
  so either path running twice does nothing. Never trust anything the browser says about payment.
- Webhook calls that are unsigned, or signed with a secret we don't have, are only a hint: if we
  have a pending order for that checkout, we ask PayMongo about it with our secret key. So
  `PAYMONGO_WEBHOOK_SECRET` is optional. /admin → "Set up the webhook" registers the webhook
  through the API in the key's mode (test key → test webhook) and throws the secret away.
- Provider code sits behind `src/server/payments/types.ts`; PayMongo is
  `src/server/payments/paymongo.ts`. A second provider (PayPal) would be a sibling file.
- Order kinds: `publish` (first payment), `upgrade` (pay the difference; adds the extra months
  on top of the current end date, so extensions are kept) and `extend` (pay the tier's
  `extendAmount` for another `liveFor`, stacked on the end date, or from today if ended).
- Recipient link `/g/{slug}` only opens when paid + published + not ended. The owner gets a
  preview. Gifts published before payments have tier `legacy`: no caps, no expiry, every feature.
- Caps: contributors are counted by distinct **device id** (`contributions.device_id`, a random
  id the contribute page keeps in localStorage, `src/lib/device.ts`). Old rows without one fall
  back to the name, and a name already seen with a device isn't counted twice. Photos are
  photobooth items. Hidden items don't count. Over the cap, friends see "this gift is full"
  and the owner gets an upgrade banner. `device_id` is never returned to the browser.
- Paid features live in `TierFeatures`; check them with `hasFeature(tier, "...")`.
- We don't handle `payment.failed` on purpose: it's per attempt, and hosted checkout lets the
  buyer retry on the same session. Unpaid orders count as abandoned after 24h.
- Live keys (`sk_live_`) are refused unless `PAYMONGO_ALLOW_LIVE=true`.
- Every webhook call, confirm-page check and cron check is written to `payment_log` (shown in
  /admin). A payment that lands after the order was cancelled or timed out still counts.
- `/api/cron/daily` (Vercel Cron, needs `CRON_SECRET`) sends the "ends in 14 days" reminder,
  re-checks unpaid orders from the last 2 days and expires stale ones.
- Discount codes: `discount_codes` table, made and turned off in /admin; what each type does to a price
  is `discountedAmount` in pricing.ts (percent lands on a whole peso, anything above zero is at least
  `discountCodes.minCharge`). Logic in `src/server/discounts.ts`. Codes apply to a gift's first plan only
  and replace the early-bird promo. The code goes in the PayMongo line item description and on the
  order (`discount_code`, `discount_amount`). A use is counted in `applyPaidEvent`, in the same
  transaction that marks the order paid, so abandoned checkouts never use one up. Free codes skip
  PayMongo: the order is made with provider `free` and opened through `applyPaidEvent` too, which
  re-checks the code with its row locked so the last use can't be taken twice. Starter codes are in
  `discountCodes.starter`, made once by `db:seed`.
- Orders keep their row when a gift or account is deleted (`site_id`/`owner_id` set null).
- Tests: `bun test src` (the billing test runs only against a localhost DATABASE_URL, with
  the fake PayMongo in `tools/payments/fake-paymongo.ts`).
- Local testing without PayMongo: set `PAYMONGO_API_URL` to a fake server that mimics
  `/v1/checkout_sessions` and signs webhooks with `PAYMONGO_WEBHOOK_SECRET`.

## Password protection (Celebration, Keepsake)

`src/server/giftPassword.ts`. The owner sets a password in the editor (intro panel). Only a scrypt
hash is stored in `gift_sites.password_hash`, and `siteRow()` in `api.ts` strips it from every
site row. The gate is server side: `canViewGift` and `listCalendarEntries` return nothing until
the visitor has the signed HttpOnly cookie that `unlockGift` sets after the right password. The
cookie is an HMAC of the gift id and the current hash, so changing the password signs everyone
out. A password only applies while the plan includes it (`needsPassword`); the owner never needs
it. Wrong guesses are limited to 10 per 10 minutes per gift and IP (in memory, per instance).

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

- Countdowns are a UTC moment (`countdown_at`) shown in each viewer's own time zone; calendar days open
  at the viewer's local midnight. Use `src/lib/time.ts`, never a hardcoded zone or locale.
- Background layers on gift pages: `position:absolute` inside an `overflow:hidden` wrapper,
  or they leak over the editor.
- Keep `@tanstack/react-start` at a patched version; Vercel blocks deploys of versions
  with known CVEs.
- `bunfig.toml` refuses packages published less than 24h ago (supply-chain guard).

## Themes, cast and sections

- Each theme's opening lives in `src/themes/<theme>/Opening.tsx`, registered in `src/themes/TactileOpening.tsx`.
  Springs only, sound off by default, a plain button for every gesture, particles from the gift's icon set.
- Theme fonts: `src/themes/_shared/design.ts`. Never use Caveat, Pacifico, Dancing Script, Lobster or Great Vibes.
- Newer sections keep their extra fields in `contributions.data`; shape and cleaning in `src/lib/sections.ts`.
- New landing and section copy goes in `src/copy/strings.ts`.
- Photobooth camera (flag `photoboothCamera`): `src/components/photobooth/PhotoBooth.tsx`, frames drawn on a canvas in
  `src/lib/photobooth/frames.ts` (original shapes, gift palette, 1080x1350 JPEG). Booth photos are saved with
  `data.framed = true` and every layout shows them whole (`img[data-framed]`), never cropped.

## Open product work

Refunds and PayPal (notes in HANDOFF.md section 5), theme preview images (needs images),
and turning on the early-bird promo when it's time (`promo.enabled` in pricing.ts).

## Metrics

Our own `events` table (`src/server/events.ts`), shown on /admin as "How gifts are doing". No
third-party tracker, no cookies, no IP, no note content, so no cookie notice is needed. Server
events: `gift_created`, `note_added`, `gift_wrapped` (checkout started), `plan_purchased`. Browser
events go through `trackEvent()` in `src/lib/track.ts` (`invite_shared`, `friend_page_viewed`,
`gift_opened`, `make_your_own_clicked`); the server drops the organiser's own views. Each event's
allowed labels are in `EVENT_PROPS`; add new ones there.
