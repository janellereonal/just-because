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

A. Keys are in (14 Oct) and the first card test payment worked, through the confirm-page backup check
   (`d501041`). **The PayMongo webhook didn't reach Vercel** (no `[payments]` log lines), likely because
   it was created in live mode. Fix: /admin → "Set up the webhook" registers a test-mode webhook
   with the key already in Vercel, and the handler no longer needs the webhook secret. Once a webhook works you'll see
   `[payments] webhook evt_...` in the Vercel logs. Then finish the test run in section 4.
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
