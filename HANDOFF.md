# Handoff: where Just Because is (13 Oct 2026, night)

Read this together with `CLAUDE.md` (how the code works). This file is about **status, accounts,
and what's next**, so a fresh Claude session on any account can pick up without the old chat.

## 1. What's live and working

- **https://justbecause.site**, deployed by Vercel from `main` of `github.com/janellereonal/just-because`.
- Moved fully off Lovable and Supabase. Postgres on Neon, Better Auth, Vercel Blob, Resend.
- **Emails work.** The Resend domain `justbecause.site` is verified, and a sign-up confirm email was
  delivered to janelledelavegareonal@gmail.com.
- **Janelle's account** (janelledelavegareonal@gmail.com) is confirmed and is an **admin**.
- **Themes:** 8 seeded themes. "Despidida" was renamed to **Bon Voyage** (category Farewell).
  None of them have preview images yet (Admin → Upload preview).
- **Paid publishing with PayMongo is built and deployed (commit `dcaabc1`), in test mode only.**
  Tested end to end locally with a fake PayMongo server: pay, cancel/retry, idempotent webhook,
  forged webhook rejected, caps, full messages, upgrade, custom link, ended page.
- Last commit `35e30fc` adds a **Payments setup checklist on /admin**, plan status on the
  dashboard, and locks the comic format on Sweet gifts. It was pushed, but the deploy wasn't checked
  yet (see task A below).
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

## 5. Task queue for Claude (in order)

A. **Check that commit `35e30fc` deployed.** /admin should show "Payments setup". If the
   build failed, read the Vercel build log and fix it.
B. Once Janelle has added the keys: help her through the test run in section 4. If the webhook doesn't
   fire, check the Vercel runtime logs for lines starting with `[payments]`.
C. Known gaps (each is small; do them without asking):
   - The "Extend this gift" button is a placeholder. Build it as a checkout that pushes `expires_at`
     forward by the tier's duration (a new order kind `extend`).
   - Contributors are counted by name. Optionally add a device id kept in localStorage and sent
     with each note, and count distinct device ids instead (keep the name fallback).
   - Handle `payment.failed` if useful (today an unpaid checkout counts as abandoned after 24h).
   - The early-bird promo is in the config but off.
D. Open product work: password protection as a paid feature (add a flag in `TierFeatures` in
   `src/config/pricing.ts`), refunds (note in `applyPaidEvent`), PayPal as a sibling of
   `src/server/payments/paymongo.ts`, and bridal shower and anniversary themes.
E. Upload theme preview images (needs images from Janelle).

## 6. Rules for whoever picks this up

- **Test mode only.** The app refuses `sk_live_` keys unless `PAYMONGO_ALLOW_LIVE=true`. Don't set it.
- **Never type or store API keys, passwords or webhook secrets.** Janelle pastes them into Vercel herself.
  Storing the webhook secret in the database was tried and blocked, so it stays an env var.
- Never hardcode a price. Everything comes from `src/config/pricing.ts`.
- Copy voice: plain, friendly, no em dashes, max one exclamation mark per screen.
- Janelle likes short, casual updates and few questions. Make sensible calls and say what you chose.
- Before pushing: `npx tsc --noEmit`, and for bigger changes
  `NITRO_PRESET=node bun run build`. Pushing to `main` deploys to production.
- Every deploy runs `db:migrate` and `db:seed` automatically. The live database currently has
  1 user and no gifts.

## 7. Going live later (not now)

1. Activate the PayMongo account (business verification).
2. Match `enabledPaymentMethods` to the methods that are actually enabled.
3. Create a **live** webhook (same URL and event) and swap `PAYMONGO_WEBHOOK_SECRET`.
4. Set `sk_live_...` and `PAYMONGO_ALLOW_LIVE=true`, then redeploy.
5. Make one small real payment, check it, and refund it in the PayMongo dashboard.
