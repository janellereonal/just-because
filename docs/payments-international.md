# Payments from outside the Philippines

Written 18 Oct 2026. Read with the Payments section of `CLAUDE.md`.

## What works today

- **Foreign Visa and Mastercard cards already work.** Our checkout is PayMongo's hosted page, and it accepts
  cards issued anywhere. The buyer is charged in **pesos** and their bank converts it.
- PayMongo charges us more for foreign cards (about 1 percentage point more than local cards). Check the
  current numbers at https://docs.paymongo.com/docs/fees-and-rates before changing prices.
- Buyers abroad see a guide price in their own currency (`formatApprox`, rates in `src/config/pricing.ts`)
  and a short note that they pay in pesos (`PRICE_COPY` in `src/copy/strings.ts`). Visitors in the
  Philippines (Manila time zone, or a Filipino browser language) see pesos only.
- GCash, Maya and QR Ph only work for people with Philippine accounts.

## What hosted checkout can't do

- **Charge in dollars.** PayMongo's Checkout Sessions API takes PHP only (`line_items[].currency`:
  "PHP is the only supported currency as of the moment").
- So a buyer in the US sees a peso charge on their statement, and some banks add a foreign transaction
  fee (often 1 to 3%). An unfamiliar foreign charge is also the most common reason for a chargeback.

Cheap fix for the statement problem, already wired but off: `statementDescriptor` in `pricing.ts`. Set it to
something like `"JUSTBECAUSE.SITE"`, try one payment in test mode, then ship it.

## Getting dollar prices through PayMongo

PayMongo supports USD for cards, but only through the **Payment Intents** API, and only after they switch it
on for our account. Docs: https://docs.paymongo.com/docs/payment-acceptance-usd-card-acceptance

What it needs from us:
1. **PayMongo approval.** Send the email below. Nothing can be tested until they configure the account.
2. **Our own card page** instead of the hosted checkout, for buyers outside the Philippines only.
   Card details go straight from the browser to PayMongo with the public key (we never see the card
   number), then: create a Payment Intent in USD on the server, attach the payment method, handle the
   3D Secure redirect, and confirm the payment on our side like today.
3. **A second provider module**, `src/server/payments/paymongo-usd.ts`, behind the same `PaymentProvider`
   interface. The interface and `orders.currency` already allow `"USD"`, and `applyPaidEvent` already refuses
   a payment whose currency doesn't match the order, so no database change is needed.
4. **Set dollar prices** (not converted from pesos, like the concierge price). At today's display rate
   ₱299 / ₱599 / ₱999 are about $5 / $10 / $17. Round numbers that also cover the higher fee would be
   **$6 / $12 / $19**. Janelle's call.
5. Settlement stays in pesos. PayMongo converts at their rate before paying out.

Rough size once approved: two PRs (card page, then provider plus prices), plus a test-mode run by Janelle.

## When to add a second provider instead

/admin → Payments now shows card payments split into Philippine and foreign cards (from the `card_origin`
label on `plan_purchased`). Rule of thumb: when foreign cards pass about **20% of paid gifts**, it's worth
more than PayMongo USD alone. Options, from lightest to heaviest:

| Option | Good for | Watch out for |
|---|---|---|
| PayMongo USD | Dollar prices for the US and diaspora | USD only; still no EUR, GBP, AUD; cards only |
| Xendit | PHP and USD, more Southeast Asia methods | Another account and review |
| Paddle or Lemon Squeezy (merchant of record) | Many currencies, and they handle foreign sales tax and VAT for us | Higher fee (around 5%+), their own checkout look |
| Stripe | Best global checkout | Needs a company in a Stripe country (for example a US LLC) |

Selling digital goods to people in the EU, UK and some US states can create sales tax or VAT duties. A merchant
of record takes that on. Get advice before foreign sales get big.

## Email to send PayMongo

> **Subject:** Request to enable USD card acceptance
>
> Hi PayMongo team,
>
> We run Just Because (https://justbecause.site), a group gift website, on PayMongo hosted checkout. A growing
> share of our buyers are outside the Philippines and pay by card.
>
> Could you enable USD card acceptance for our account so we can create Payment Intents in USD? Please let us
> know what you need from us, whether it can be turned on in test mode first, the fees for USD card payments,
> and how refunds work for USD payments.
>
> Also, is USD planned for Checkout Sessions? We'd prefer to keep using hosted checkout.
>
> Thank you,
> Janelle
> madewithjustbecause@gmail.com
