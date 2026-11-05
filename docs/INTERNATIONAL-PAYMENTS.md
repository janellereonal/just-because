# International payments: Lemon Squeezy as a second checkout

Written 6 Nov 2026. A plan, nothing built yet. Supersedes the "what works today" part of
`docs/payments-international.md`: the live PayMongo account only offers QR Ph right now, so buyers
outside the Philippines can't pay at all (no cards). See `enabledPaymentMethods` in
`src/config/pricing.ts`.

## Why Lemon Squeezy

- **Dollar prices and cards from anywhere**, with Apple Pay, Google Pay and PayPal on its checkout.
- **Merchant of record:** Lemon Squeezy sells to the buyer and handles foreign sales tax and VAT
  (EU, UK, US states). With our own checkout that would be our job.
- **Pays out to the Philippines:** by bank transfer (the Philippines is on its bank payout list) or
  by PayPal. Payout fees depend on the method.
- **Simple to wire:** a hosted checkout made with one API call, and webhooks signed with an HMAC.
- **Cost:** about 5% + $0.50 per sale (check the current pricing). On a $7 plan that's about $0.85.

PayMongo stays the checkout for the Philippines (QR Ph, Maya, GrabPay, ShopeePay, and later GCash
and cards), in pesos.

## Prices

Set in dollars, not converted (like the concierge price). Proposed, Janelle's call:

| Plan | Pesos (PayMongo) | Dollars (Lemon Squeezy) | Extend, dollars |
|---|---|---|---|
| Sweet | ₱299 | **$7** | $3 |
| Celebration | ₱599 | **$12** | $6 |
| Keepsake | ₱999 | **$19** | $10 |

In `src/config/pricing.ts`, each tier gets `usd: { amount: 700, extendAmount: 300 }` (cents). The server
picks the amount from there, the same way it does for pesos. Upgrades in dollars charge the dollar
difference ($12 − $7 = $5). Discount codes keep working; `minCharge` gets a dollar twin (for example
$1).

## How the plan picker chooses

1. The server knows the visitor's country from Vercel's `x-vercel-ip-country` header
   (`getVisitorCountry` already exists). The browser can't choose a price, only a provider, and the
   server checks it.
2. **Visitors in the Philippines** see pesos and PayMongo, as today, plus a small link: "Paying with a
   card from abroad? Pay in dollars."
3. **Everyone else** sees dollar prices and Lemon Squeezy by default, plus: "Have GCash, Maya or a
   Philippine bank app? Pay in pesos."
4. The choice goes to `startCheckout` as `provider: "lemonsqueezy" | "paymongo"`. The server works
   out the amount for that provider's currency from `pricing.ts`.
5. The QR tip on phones only shows for PayMongo.

## Code plan

1. **`src/server/payments/lemonsqueezy.ts`**, implementing `PaymentProvider`:
   - `createCheckout`:
     - Call `POST https://api.lemonsqueezy.com/v1/checkouts` (JSON:API, `Authorization: Bearer <key>`).
     - Relationships: our store and one "Gift plan" variant.
     - `custom_price` in cents, from our server.
     - `checkout_data.custom = { order_id }`.
     - `product_options.redirect_url` = `/checkout/{orderId}`.
     - `test_mode` while testing.
     - Store the checkout id on the order, as today.
   - `handleWebhook`:
     - Verify the `X-Signature` header. It's the HMAC-SHA256 hex digest of the **raw body**, keyed with
       our webhook signing secret; compare with `timingSafeEqual`.
     - Act on `order_created` when `data.attributes.status` is `paid`. Read our order id from
       `meta.custom_data.order_id`, the amount from `data.attributes.total` (cents) and the currency
       from `data.attributes.currency`.
     - Anything unsigned gets the same treatment as PayMongo's: only a hint to ask the API.
   - `checkPaid`:
     - Look the order up through the API (`GET /v1/orders`, filtered by store and email) and match our
       order id.
     - **To confirm in test mode:** whether the order object carries `custom_data` or only the webhook
       does. If only the webhook, keep the Lemon Squeezy order id from the webhook and rely on the
       webhook plus the confirm page's polling.
   - `reopenCheckout`: return the stored checkout URL while it hasn't expired.
   - `expireCheckout`: Lemon Squeezy checkouts take an `expires_at` when made. Set it to 24 hours (like
     our unpaid-order rule) and report "open" until then.
2. **Register it** in `src/server/payments/index.ts`.
3. **`src/routes/api/webhooks/lemonsqueezy.ts`**: a copy of the PayMongo route. Event ids go in
   `webhook_events` as `ls:{event_name}:{data.id}`, so a retry does nothing.
4. **`applyPaidEvent`**: no change. It already refuses a payment whose currency or amount doesn't
   match the order, and `orders.currency` and `orders.provider` already exist (no migration).
5. **Refunds:** listen for `order_refunded` and write a `refund done` row to `payment_log`. Refunds
   themselves stay a button in the Lemon Squeezy dashboard.
6. **/admin, Payments setup:** add a Lemon Squeezy line, plus "Set up the webhook" through the API
   (`POST /v1/webhooks` with our URL, the events and a fresh secret). It would work like the PayMongo
   button, but the secret has to be saved as an env var, since storing it in the database was blocked
   before.
7. **Tests:** a fake Lemon Squeezy server like `tools/payments/fake-paymongo.ts` (checkouts, signed
   webhooks), and the same tests PayMongo has: pay, retry, forged signature, wrong amount, wrong
   currency, replay.
8. **Copy:** dollar prices on the landing for visitors abroad (instead of "≈ $10"), the two links
   above, and a receipt line saying Lemon Squeezy appears on the card statement.

Size: two PRs (provider plus webhook, then plan picker plus prices), about 2 to 3 days with tests, plus
a test-mode run by Janelle. **Not safe before 7 Nov**: it needs an approved Lemon Squeezy store first.

## What I need from you

1. A **Lemon Squeezy account and store** (Settings, store details). They review new stores; describe it as
   "digital group gift pages, sold per gift".
2. **Payout details:** a Philippine bank account or PayPal, plus the identity and tax forms they ask
   for.
3. In the store, **one product, "Gift plan"**, with one variant (any price; we send the real price
   with `custom_price`). Send me its **store id** and **variant id**. They aren't secret.
4. A **test mode API key**, pasted into Vercel as `LEMONSQUEEZY_API_KEY` (never in chat or code).
   Later, the live key.
5. After the webhook is made, its signing secret goes into Vercel as `LEMONSQUEEZY_WEBHOOK_SECRET`.
6. Your call on the **dollar prices** above, and on how tax shows: added at checkout, or included in
   $7, $12 and $19. Included is friendlier, but we keep less in countries with VAT.

## Sources

- Webhook signing: https://docs.lemonsqueezy.com/help/webhooks/signing-requests
- Create a checkout: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
- Payout countries: https://docs.lemonsqueezy.com/help/getting-started/supported-countries
