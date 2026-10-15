# Handoff: where Just Because is (14 Oct 2026, early morning)

Read this together with `CLAUDE.md` (how the code works). This file is about **status, accounts,
and what's next**, so a fresh Claude session on any account can pick up without the old chat.

## 1. What's live and working

- **https://justbecause.site**, deployed by Vercel from `main` of `github.com/janellereonal/just-because`.
- Moved fully off Lovable and Supabase. Postgres on Neon, Better Auth, Vercel Blob, Resend.
- **Emails work.** The Resend domain `justbecause.site` is verified, and a sign-up confirm email was
  delivered to janelledelavegareonal@gmail.com.
- **Janelle's account** (janelledelavegareonal@gmail.com) is confirmed and is an **admin**.
- **Themes:** 9 seeded themes, including **Anniversary** and the new **Bridal Shower**. "Despidida"
  was renamed to **Bon Voyage**. Renames go in the `renames` list in `scripts/seed.ts` so nothing
  duplicates. None of them have preview images yet (Admin → Upload preview).
- **Paid publishing with PayMongo is built and deployed (commit `dcaabc1`), in test mode only.**
  Tested end to end locally with a fake PayMongo server: pay, cancel/retry, idempotent webhook,
  forged webhook rejected, caps, full messages, upgrade, custom link, ended page.
- `35e30fc` (Payments setup checklist on /admin, plan status, comic locked on Sweet) deployed fine.
- **Built overnight (13 to 14 Oct), all deployed:**
  - `fbd7f79` Bridal Shower theme, rename map in the seed.
  - `0ff505c` **Extend this gift**: order kind `extend`, price `extendAmount` per tier in pricing.ts
    (Sweet ₱149, Celebration ₱299, Keepsake ₱499). Adds another plan stretch on top of the end date,
    or from today if ended. Upgrades now keep extensions. Buttons on the ended page, editor banner,
    and Sent → Extend this gift.
  - `0b9c7a4` Contributors counted by **device id** (migration 0003), name fallback for old notes.
  - `0cfe34e` **Password protection** on Celebration and Keepsake (migration 0004). Editor → intro
    panel → Password. Checked on the server; only a hash is stored.
  - Tested locally with a fake PayMongo server and real HTTP calls: extend (ended, stacking, then
    upgrade), retries skipped, underpayment refused, cap counting by device, password gate (wrong
    password, forged cookie, right password, Sweet ignores it, guess limit).
- **Until the PayMongo keys are added, "Wrap it up" on the live site shows "We couldn't open
  the payment page."** That's expected.

## 1b. Redesign (live on justbecause.site since 15 Oct 2026)

On 15 Oct Janelle asked to put the redesign live, so `redesign` was fast-forwarded into `main`.
Keep designing on `redesign` (preview link) and fast-forward `main` when she's happy with a batch.

Janelle wants the site colorful, playful, cute and 3D before launch, plus the mascot behaviors in
her brief (Bo hops between sections as you scroll, reacts to fields, easter eggs). Work happens on
the `redesign` branch; Vercel gives it its own preview link. `main` stays the live site.

Done so far:
- Pastel "toybox" tokens in `src/styles.css` (blush ground, candy pastels, berry accent #C2366B),
  Fredoka display + DM Sans body, floating rounded header. The flat SVG Bo's lid is pink now.
- **3D Bo** in code: `src/lib/bo3d/scene.ts` (three.js, built from rounded shapes) and
  `src/components/Bo3D.tsx` (lazy-loaded, pauses off screen, falls back to the SVG Bo). Supports
  moods (wave/idle/celebrate) and a 0..4 scroll story (dress up, notes fly in, wrap, open).
- Landing page rebuilt: 3D hero, sticky scroll story, themes row, plans, closing CTA.
- Theme gallery: occasion filter chips, big phone mockups showing the real gift (plays on hover /
  in view on phones). Theme page: real `GiftSiteView` in a phone, color-mood picker, "The opening" tab.
- Fixed: mini previews never mounted if palettes loaded after the first render.

Mascot behaviors (Oct 2026, all on `redesign`):
- **3D Bo** is the code-built model in `src/lib/bo3d/scene.ts`. A Spline version (same parts) exists in
  Janelle's Spline file; drop an export at `public/models/bo.glb` and the site uses it automatically.
  Janelle prefers the code-built look, so no export is needed.
- Faces (`setFace`): wink, happy, blep, love, surprised, dizzy, sleepy, yawn. He pulls a cute one every
  few seconds. Eyes follow the pointer; random blinks.
- Theme accessories on the lid (`setAccessory`, map in `src/lib/bo3d/accessories.ts`), built in code
  (or from `public/models/accessories/*.glb` if exported).
- Flat stills everywhere else are 3D renders: `public/bo/*.webp` via `src/components/Bo.tsx`.
- **Hopping Bo** (`src/components/BoBuddy.tsx` + `src/lib/mascot/controller.ts`): one state machine.
  Perches are marked with `data-bo-*` attributes (documented at the top of controller.ts). Pages nudge
  him through `src/lib/mascot/bus.ts` (`boSay`, `boAccessory`, `boReact`, `boWrap`).
  - Landing: floats down on a note, hops Themes → theme cards (wears each theme's accessory) → Plans →
    Most popular (points at it) → closing card. Keepsake hover = heart eyes.
  - /create: hops to the focused field, bobs on keystrokes, reacts to name, theme, comic/scrapbook.
  - Editor: sits at the canvas corner, hops to focused fields, "{name} is so lucky.", waves on Invite,
    wraps himself up before checkout (`boWrap`, max ~950ms, runs alongside the checkout request).
  - Quirks: tap = lid pop + confetti, 5 taps = dizzy, drag and flick with bounces, dozes after 20s,
    tab title "Your gift misses you 🎁", first gift = flip + confetti in the editor.
- **TalkingBo** (`src/components/TalkingBo.tsx`): hero and theme gallery Bo introduce themselves and
  react to taps. Hero has draggable paper scraps (`src/components/HeroScraps.tsx`).
- Reduced motion: no hops, flips, flings or parallax; he fades between spots; bubbles still show.
- Tuning knobs: `TUNING` at the top of `src/lib/mascot/controller.ts`.
- No talking/hopping Bo on recipient pages (`/g/...`). The still Bo in the gift opening animation, the
  gift footer and locked/ended screens predates this and is still there (open question for Janelle).

Session 2 (14 Oct, overnight), details in `docs/NEXT-SESSION.md`:
- Tested in a real Chromium (local Postgres, Playwright). Fixed Bo covering fields, Bo stuck invisible,
  bubbles over buttons, Manila-time countdowns, hydration warnings, glb 404s, nested buttons.
- Landing: a short Bo intro once per session (`LandingIntro`), then a product-first page whose hero is a
  real sample gift in a phone with a format switcher (`FormatDemo`).
- Formats: Bento Board, Gift Hunt and Zine join Scrapbook and Comic (`src/lib/formats.ts`,
  `src/components/formats/`). Scrapbook got taped letters, polaroids and digit-tile countdowns.
- Toybox restyle of /create, dashboard, contribute, editor, sign-in, header and 404.

Next: check the preview on a real phone, test checkout with a PayMongo test key on the preview,
answer the open questions in `docs/NEXT-SESSION.md`, then merge `redesign` into `main` when happy.

## 2. Accounts and where things live

| What | Where | Notes |
|---|---|---|
| Code | GitHub `janellereonal/just-because` | `janelledelavegareonal` is a collaborator |
| Hosting | Vercel, team "Just Because" | Logged in with the janellereonal GitHub. Region sin1 |
| Database | Neon project `neon-green-pocket` (Singapore) | Made through the Vercel integration, so log in to Neon via Vercel |
| Email | Resend (janelledelavegareonal account) | Domain verified. API key "Just Because" |
| Domain | Namecheap, `justbecause.site` | A record points to Vercel. `www` still shows the Namecheap parking page |
| Payments | PayMongo | **Not set up yet** (see section 3) |

**Vercel environment variables** (Settings → Environment Variables):
- Already set: `DATABASE_URL` and its friends (from Neon), `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`.
- Still to add: `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `APP_BASE_URL`.
- Optional: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Google sign-in stays hidden until both are set).

The full list with notes is in `.env.example`.

## 3. Things only Janelle can do (Claude must never type keys or passwords)

1. **PayMongo:** sign up or log in at dashboard.paymongo.com and stay in **test mode**.
2. Copy the **test secret key** (`sk_test_...`) from Developers → API keys and paste it into Vercel as `PAYMONGO_SECRET_KEY`.
3. **Create the webhook** in PayMongo → Developers → Webhooks:
   - URL `https://justbecause.site/api/webhooks/paymongo`
   - Event `checkout_session.payment.paid`
   - Copy its `whsk_...` secret into Vercel as `PAYMONGO_WEBHOOK_SECRET`.
   - If there's no Webhooks page in the dashboard, run this in your own terminal:
     ```
     curl https://api.paymongo.com/v1/webhooks -u sk_test_YOURKEY: -H "Content-Type: application/json" \
       -d '{"data":{"attributes":{"url":"https://justbecause.site/api/webhooks/paymongo","events":["checkout_session.payment.paid"]}}}'
     ```
     The `secret_key` in the reply is the webhook secret.
4. Add `APP_BASE_URL` = `https://justbecause.site` in Vercel.
5. **Redeploy** in Vercel (Deployments → ⋯ → Redeploy).
6. Open **/admin**. The Payments setup checklist should show three ticks.
7. In PayMongo → Settings, check which payment methods are switched on. If any of GCash, Maya,
   card or QR Ph is off, tell Claude so it can edit `enabledPaymentMethods` in `src/config/pricing.ts`.
8. Optional: Google sign-in keys, and pointing `www` at Vercel in Namecheap.

## 4. Test run once the keys are in (test mode, no real money)

1. Make a gift, then add a note and a photo from a private window using the contribute link.
2. Click **Wrap it up**, choose a plan, and pay by **card** with a PayMongo test card
   (see PayMongo's docs; 4343 4343 4343 4345, any future expiry and any CVC, should work).
   You should see "Confirming your payment…", then "Your gift is ready to open", plus an email.
3. Make a second gift and pay with **GCash or Maya**. Click **Fail** on the test page first: the
   gift should stay a draft and **Try again** should work. Then **Authorize**.
4. Click back to the merchant at checkout. You should see "No payment was made".
5. Sent → **Upgrade plan** should charge the difference. On Keepsake, Sent → **Change link name**.
6. In a private window, a draft gift's `/g/` link should say "This gift isn't open yet".
7. **Extend:** on a paid gift, Sent → **Extend this gift**, pay by card. The confirm page should say
   "Your gift is open for longer" with the new end date. (To test the ended page, ask Claude to set
   one test gift's `expires_at` in the past, then open its `/g/` link signed in.)
8. **Password:** on a Celebration or Keepsake gift, editor → intro panel → Password → save one.
   Open the `/g/` link in a private window: it should ask for the password, say "That's not it"
   for a wrong one, and open the gift for the right one. Signed in as the owner, it never asks.
9. **Contributor count:** add notes from two different private windows using the same name.
   Sent → the plan banner and dashboard should count 2 contributors, not 1.

## 5. Task queue for Claude (in order)

Done: A (deploy check), extend, device-id counting, password protection, bridal shower theme.
`payment.failed` was looked at and deliberately not handled (reason in `billing.ts` and CLAUDE.md).

A. Keys are in and the webhook works (14 Oct): set up from /admin, first card test payments went
   through, including one with the tab closed. Next: the rest of the test run in section 4.
B. Upload theme preview images once Janelle sends them (Admin → Upload preview).
C. Early-bird promo: built but off (`promo.enabled` in pricing.ts). Turn on only when Janelle says so.
D. **Refunds (not built, notes only).** When it's needed:
   - Today, a duplicate payment (two tabs) is logged as `[payments] ... Needs a refund.` in
     `applyPaidEvent` and the order is marked paid without changing the gift. Refund those by hand
     in the PayMongo dashboard (Payments → the payment → Refund).
   - To automate: add `refundPayment(paymentId, amount, reason)` to `PaymentProvider` in
     `src/server/payments/types.ts`; PayMongo's is `POST /v1/refunds` with
     `{ payment_id, amount, reason }` (reasons: duplicate, fraudulent, requested_by_customer, others).
   - Add order statuses `refund_pending` / `refunded`, call it from the duplicate branch of
     `applyPaidEvent` (after the transaction commits), and listen for `payment.refunded` /
     `payment.refund.updated` to mark the order refunded. Refunds of a used plan should stay
     manual (an admin button on /admin with a reason), not automatic.
E. **PayPal for buyers abroad (not built, notes only).**
   - Add `src/server/payments/paypal.ts` implementing `PaymentProvider`, and register it in
     `src/server/payments/index.ts`. Use PayPal Orders v2: `POST /v2/checkout/orders` with
     `intent: CAPTURE`, `purchase_units[0].reference_id = orderId`, amount from the same quote,
     and `return_url`/`cancel_url` = the existing `/checkout/{orderId}` URLs.
   - PayPal needs a capture step: on return, or on the `CHECKOUT.ORDER.APPROVED` webhook, call
     `POST /v2/checkout/orders/{id}/capture`, then feed a `PaidEvent` into `applyPaidEvent` from
     `PAYMENT.CAPTURE.COMPLETED`. Verify webhooks with `POST /v1/notifications/verify-webhook-signature`.
   - New route `src/routes/api/webhooks/paypal.ts` (copy the PayMongo one). Env vars
     `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_API_URL` (sandbox first).
   - Charge in USD: add a `usdAmount` per tier (and per extend) in pricing.ts rather than converting
     with `usdDisplayRate`, which is display only. Orders already store `currency` and `provider`.
   - UI: a "Paying from abroad? Use PayPal" link under the plan cards that calls `startCheckout`
     with `provider: "paypal"`.

## 6. Rules for whoever picks this up

- **Test mode only.** The app refuses `sk_live_` keys unless `PAYMONGO_ALLOW_LIVE=true`. Don't set it.
- **Never type or store API keys, passwords or webhook secrets.** Janelle pastes them into Vercel herself.
  Storing the webhook secret in the database was tried and blocked, so it stays an env var.
- Never hardcode a price. Everything comes from `src/config/pricing.ts`.
- Copy voice: plain, friendly, no em dashes, max one exclamation mark per screen.
- Janelle likes short, casual updates and few questions. Make sensible calls and say what you chose.
- Before pushing: `npx tsc --noEmit`, and for bigger changes
  `NITRO_PRESET=node bun run build`. Pushing to `main` deploys to production.
- Every deploy runs `db:migrate` and `db:seed` automatically. Migrations so far: 0000 to 0004
  (0003 device_id, 0004 password_hash), all additive. The live database had 1 user and no gifts
  on 13 Oct.
- Local testing: a Postgres on port 5433, a fake PayMongo server (POST/GET `/v1/checkout_sessions`)
  on `PAYMONGO_API_URL`, and webhooks signed with the local `PAYMONGO_WEBHOOK_SECRET`. Server
  functions can be called over HTTP at `/_serverFn/{id}` with a seroval payload, `origin` and
  `sec-fetch-site: same-origin` headers (the CSRF middleware rejects anything else).

## 7. Going live later (not now)

1. Activate the PayMongo account (business verification).
2. Match `enabledPaymentMethods` to the methods that are actually enabled.
3. Create a **live** webhook (same URL and event) and swap `PAYMONGO_WEBHOOK_SECRET`.
4. Set `sk_live_...` and `PAYMONGO_ALLOW_LIVE=true`, then redeploy.
5. Make one small real payment, check it, and refund it in the PayMongo dashboard.


## 1c. Session 3 (15 Oct 2026, morning)

- **Sign-up email:** signing up again with an email that already has an account looked like it
  worked but sent nothing (Better Auth hides which emails exist). Now `onExistingUserSignUp` sends a
  "you already have an account" email. The check-inbox screen has "Send it again" and mentions Spam.
- **Copy:** removed "free to make" and payment-method lines from marketing pages. Payment methods
  only show in the plan picker right before paying.
- **Themes look different now.** `src/lib/themeKind.ts` maps a theme to its occasion.
  `src/lib/theme3d/scene.ts` builds a 3D object per occasion; stills in `public/themes3d/*.webp`
  (re-render with the Playwright snippet in `docs/NEXT-SESSION.md` after changing the scene, and bump
  `STILL_VERSION` in `Theme3D.tsx`). `src/styles/skins.css` + `SkinDecor.tsx` give each occasion its
  own background, particles, letters, photos, countdown and titles. The opening animation uses the
  occasion's 3D object instead of Bo.
- New gifts start in their theme's font (`themeFont`).

## 1d. Session 4 (15 Oct 2026)

Phone fit everywhere, Phone/Laptop previews, intro-first auto tours on the theme page and cards,
four new formats (Storybook, Mixtape, Scratch Cards, Constellation), custom intros (new
`intro_settings` column, migration 0005) and much more play on themes (tap/spin 3D objects, catch
particles, flip photos, birthday wish). Details and file map in `docs/NEXT-SESSION.md`.


## 1e. Session 5 (15 Oct 2026)

Theme system redesign (tactile openings, Cast, themed notes, theme fonts), a new themes gallery, a new
landing page with example gifts, eight new sections, time-zone-aware countdowns and a chip-in fund data
model (no payments). PRs #4, #5 and #6, merge after #3, in order. Migrations 0007 to 0010 run on deploy.
Details: `docs/NEXT-SESSION.md`.
