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
  recipient" only send their text to the finished gift (`listPublicTreeOrnaments`, /g/),
  never to the friend page. Locked calendar doors and ornaments before `tree_reveal_date`
  are sent without content until that day has started in UTC+14 (`dayStartedSomewhere`).
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
- Buyers abroad: foreign cards work, charged in PHP (hosted checkout is pesos only). They see a guide price
  in their currency (`formatApprox`, `useViewerMoney` in `src/lib/viewerCurrency.ts`, display only).
  `applyPaidEvent` refuses a payment whose currency differs from the order's. `plan_purchased` records
  `method` and `card_origin` (local/foreign card), shown in /admin. Dollar prices need PayMongo approval
  and a card page of our own: `docs/payments-international.md`.
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

## Sign-in and guests

- Google is the main sign-in button when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; email
  opens under "Use email instead". In Google Cloud (OAuth client, type Web) add the redirect URI
  `https://justbecause.site/api/auth/callback/google` (and `http://localhost:8080/api/auth/callback/google`
  for local work). Preview URLs change per branch, so Google sign-in is only expected on production.
- Account linking: signing in with Google using an existing account's email adds Google to that account
  (`account.accountLinking`, Google trusted). If that account's email was never confirmed, its password
  and sessions are removed first (`databaseHooks.account.create.before` in `src/server/auth.ts`), so
  someone who signed up with another person's email can't keep access.
- Guests (flag `guestStart`): `/create` makes a guest session (Better Auth anonymous plugin,
  `user.is_anonymous`, placeholder email at `guest.justbecause.invalid`, never mailed). Guests can make
  up to 3 gifts and edit them. Sharing and paying ask them to sign in (`requireAccount()` /
  `guestsSignInFirst` on the server). Signing in or up in the same browser runs `claimGuestGifts`
  (`src/server/guests.ts`), which moves their gifts, orders, concierge requests and events to the real
  account before the guest row is deleted. Never sign a guest out: the header shows "Sign in" instead.

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

## Photos and uploads

- Photos are shrunk in the browser before upload (`preparePhoto` in `src/lib/upload.ts`): longest side
  1600 px, WebP 80%, turned upright, EXIF (GPS) dropped by redrawing. Booth photos also get a 400 px
  copy in `data.thumb`, used through `photoProps()` (`src/lib/media.ts`) as a srcset. No library.
- Size and length limits per kind are `MEDIA_LIMITS` in `src/lib/limits.ts`, checked in the browser and
  again in `authorizeUpload`. Files are cached for a year (names are unique).
- HEIC: Safari reads it and iPhones send JPEG anyway. Other browsers get a "save it as a JPG" message,
  because a HEIC decoder needs WebAssembly, which our CSP doesn't allow.
- Old uploads can be shrunk with `tools/media/compress-existing.ts` (dry run by default, never deletes).

## Known gotchas

- Countdowns are a UTC moment (`countdown_at`) shown in each viewer's own time zone; calendar days open
  at the viewer's local midnight. Use `src/lib/time.ts`, never a hardcoded zone or locale.
- Background layers on gift pages: `position:absolute` inside an `overflow:hidden` wrapper,
  or they leak over the editor.
- Keep `@tanstack/react-start` at a patched version; Vercel blocks deploys of versions
  with known CVEs.
- `bunfig.toml` refuses packages published less than 24h ago (supply-chain guard).

## Styles and occasions (Oct 2026, replacing "theme + format" in the UI)

- **Style** is the one visual choice (`src/lib/styles.ts`): its own opening, look and way of reading.
  Styles made from themes (Cake, Love Letter...) borrow a theme row as their "look"; styles made
  from layouts (Scrapbook, Mixtape...) wear none. **Occasion** (`src/lib/occasions.ts`) only sorts the
  styles, picks the words, the starting sections and Bo's outfit. Words are full sentences in
  `src/i18n/en.ts` (`occasion.<id>.*`, `style.<id>.*`).
- Stored as `gift_sites.style` and `gift_sites.occasion` (migration 0016, both nullable). A style always
  sets `format` to its layout and `theme_id` to its look, server side (`themeForStyle` in api.ts).
- Gifts from before styles have both null and render exactly as before: theme opening + saved layout,
  theme words (`resolveStyle`, `giftWords`; tested for every theme × layout in `src/lib/styles.test.ts`).
- Changing only the layout of a styled gift clears its style (it becomes a theme + layout gift).
- Every style has an opening and a body. Theme styles use their theme's opening (`src/themes/<theme>`). Layout
  styles (Scrapbook, Storybook, Comic, Bento, Hunt, Zine, Mixtape, Scratch, Constellation) have their own in
  `src/themes/layouts/` (registry `LAYOUT_OPENINGS`, shared kit in `kit.tsx`), picked by `TactileOpening`'s `style`
  prop (`giftStyle` on `GiftIntro`). They take the gift's palette. Try one at `/dev/openings?style=mixtape&pal=berry`.

## Themes, cast and sections

- Each theme's opening lives in `src/themes/<theme>/Opening.tsx`, registered in `src/themes/TactileOpening.tsx`.
  Springs only, sound off by default, a plain button for every gesture, particles from the gift's icon set.
- Love Letter (flag `letterOpenings`): three openings in `src/themes/valentine/LoveLetter.tsx`, picked with
  `intro_settings.letter` (empty = break the seal, `peel`, `slide`). They end by growing into the gift's first page:
  the gift waits underneath in `[data-gift-underlay]`, and a layout marks its first page with `data-gift-page`
  (Storybook does). Openings that do this pass `reveal="fade"` to `OpeningShell` instead of the portal reveal.
- Theme fonts: `src/themes/_shared/design.ts`. Never use Caveat, Pacifico, Dancing Script, Lobster or Great Vibes.
- Newer sections keep their extra fields in `contributions.data`; shape and cleaning in `src/lib/sections.ts`.
- New landing and section copy goes in `src/copy/strings.ts`.
- Constellation is a real 3D night sky: `src/lib/nightsky/scene.ts` (three.js: Milky Way painted once into a texture,
  thousands of twinkling stars, a mountain ridge, the friends' stars fitted between the title and the ridge on any
  screen), `src/components/formats/NightSky.tsx` (the tappable stars are real buttons over the canvas; lines run along
  the heart's outline between found neighbours) and `src/lib/nightsky/sound.ts` (glass bells up a pentatonic scale,
  line shimmer, night air, the finale chord). No WebGL falls back to the classic CSS sky in `ConstellationView`.
- Sound, beyond the openings' foley in `src/lib/play.ts`: `src/lib/sound/material.ts` (paper, card, tape, plastic and foil
  for reading a gift: page turns, slaps, lids, cassettes, scratches; levels matched to the openings with
  `tools/screens/sound-meter.cjs`) and `src/lib/sound/instruments.ts` (music box, celesta, marimba, kalimba, keys,
  brass, coin, glass; `PAYOFF[style]` is each layout style's own ending). Every note sheet makes a sound when it opens
  (`PieceSheet sound=`). All silent until the viewer turns sound on.
- Layout styles' openings sit in a real place (`src/themes/layouts/scenes.tsx`: craft table, bedside, comic shop,
  tablecloth, explorer's desk, copier glass, bedroom floor, shop counter), drawn by `OpeningShell scene=` instead of
  the theme's confetti. Contact sheet of every style: `tools/screens/style-sheet.cjs`.
- Photobooth camera (flag `photoboothCamera`): `src/components/photobooth/PhotoBooth.tsx`, frames drawn on a canvas in
  `src/lib/photobooth/frames.ts` (original shapes, gift palette, 1080x1350 JPEG). Booth photos are saved with
  `data.framed = true` and every layout shows them whole (`img[data-framed]`), never cropped.

## Friends arrive (flag friendsIntro)

A short story before the gift's own opening, on `/g/` only: a box giggles, the recipient knocks twice, the
friends tumble out (one clay character per friend who wrote a note, with their name; the last one is late),
they whisper, then the recipient presses and holds to wind them up and they shout "Surprise!". Then the
theme opening plays. `src/components/story/FriendsArrive.tsx`, cast and seats in `src/lib/story/cast.ts`,
tonal sounds in `src/lib/story/sound.ts`, words `story.*` in `src/i18n/en.ts`. Owners can turn it off in the
Intro panel (`intro_settings.friends = false`). Never on quiet occasions (Sympathy, Get well). Try it at
`/dev/story?n=5&name=Mia` (`auto=1` plays itself).

Feature flags are all on in Vercel preview deployments (`VITE_VERCEL_ENV=preview`), off in production
unless listed in `VITE_FLAGS`.

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

PostHog (optional, off unless `VITE_POSTHOG_KEY` is set; settings in `src/config/analytics.ts`):
- Browser: `src/lib/analytics.ts`, loaded after first render from `AnalyticsBridge` in `__root.tsx`. Traffic
  goes through our own `/ingest/*` route (`src/routes/ingest.$.ts`), so the CSP stays same-site.
- No cookies (localStorage), Do Not Track respected, autocapture never sends page text, recordings mask all
  text and inputs and block uploaded media. No recordings on `/g/`, `/contribute/`, `/checkout/`.
- `redactUrl` cuts gift and order ids out of every URL-like property (`/g/:id`) and drops query strings
  except `utm_*`. Never send note content, names or emails to PostHog. Organisers are identified by user id only.
- Server events (not the browser ones) are copied from `track()` via `src/server/posthog.ts`.
- The privacy policy (`src/copy/legal.ts`) switches its analytics lines on with the key. Keep them true.
