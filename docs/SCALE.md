# Scale: what breaks first, and what to do about it

Written 6 Nov 2026, for launch. Numbers are rough. Prices are from the providers' public price
lists as of late 2026; check them before upgrading.

## How the app is built (the parts that matter for load)

- **Vercel** (Fluid Compute, region `sin1`): every page and server function. Instances are reused
  across requests, so in-memory caches and limits are per instance.
- **Neon Postgres**, reached through the pooled URL with `postgres-js` (`max: 5` connections per
  instance, `src/server/db/index.ts`).
- **Vercel Blob** for photos, voice notes and videos. Photos are shrunk in the browser to 1600 px
  WebP before upload (a 22 MB phone photo becomes about 270 KB).
- **Resend** for email, **PayMongo** for payments (hosted checkout, so no card traffic on our side).

## What a "user" costs us

A typical gift: 1 organiser, 8 to 20 friends, 1 recipient who opens it a few times and shows it to
people. Rough counts per gift:

| | Per gift |
|---|---|
| Page opens (friend page, gift link, editor) | 60 to 150 |
| Server calls per gift-link open | about 9 |
| Database writes | 20 to 60 (notes, events, saves) |
| Photos stored | 10 to 30, about 250 KB each, so 3 to 8 MB |
| Emails | 3 to 10 (sign-up, note alerts at most every 30 min, receipt, reminder) |

So 1,000 users is roughly 60 to 100 gifts.

## What changed tonight to make room (branch `scale-ready`)

- **Read cache** (`src/server/readCache.ts`): a gift's row, its sections, approved notes, calendar,
  ornaments, link preview, and the style and palette lists are cached in memory for 10 seconds
  per instance (60 seconds for styles and palettes). Visitors arriving together share one query.
  Only raw rows are cached; who may see them (owner, password, open or ended) is still checked on
  every request. Owner changes clear the gift's entries at once on that instance.
  - Measured locally: 1,000 loads of one gift link went from **965 database transactions to 2**.
    40 full opens in a browser went from 589 to 187; most of what's left is the view and open
    events we write on purpose.
  - Turn it off with `READ_CACHE_TTL_MS=0` (then redeploy).
- **Shared rate limits** (`sharedRateLimit` in `src/server/rateLimit.ts`, table `rate_limits`,
  migration 0020): password guesses and note floods now count across every instance, not per
  instance. If the database can't answer, it falls back to the per-instance limit instead of
  blocking people. The daily job deletes rows older than a day.
- **Limits that don't punish shared IPs** (from QA, branch `qa-night`): notes are limited per
  device (30 per 10 minutes) with a 300 per IP flood guard, and reads allow 1,000 per IP per
  minute. Carriers in the Philippines put many phones behind one IP.
- **Friendly errors** were already in place: route errors show "This page didn't load" with Try
  again, server functions return safe messages with real status codes, and a gift or friend link
  that can't reach the database shows "We couldn't open this gift just now" with Try again (after
  about 10 seconds of retries).

## What breaks first, by size

### 1,000 users (about 100 gifts)

Nothing in the app. These do:

1. **Vercel Hobby deploy limit.** It already happened: #85, #86 and #87 were refused with
   "Deployment rate limited, retry in 24 hours", so the live site is behind `main`. Hobby is also
   for non-commercial use only. **Move the team to Pro before launch.**
2. **Resend free plan: 100 emails a day** (3,000 a month). Sign-up confirmations alone can pass
   that on a launch day. **Move to Resend Pro** (50,000 a month).
3. **Neon free plan** compute hours and storage. Fine for a soft launch; move to Launch when
   paying customers arrive, so the database doesn't pause or cap.

### 10,000 users (about 1,000 gifts)

1. **Admin metrics** (`getMetrics`) scan the `events` table for 30 to 90 days. Slows down once
   events reach the low millions. Fix: a nightly rollup table, or keep 90 days of raw events.
2. **Blob bandwidth** grows with every gift open (photos are served from Blob's CDN). Still cheap,
   but watch the Vercel usage page.
3. **Neon compute**: autoscaling handles bursts; set the max compute size so a spike can't bill
   without limit, and keep the pooled URL.
4. **Support load**: refunds are by hand (/admin, "Refunds to make").

### 100,000 users (about 10,000 gifts)

1. **Postgres connections**: about 5 per instance through the pooler. Fine with Neon's pooler, but
   check the pooler limit for the plan.
2. **Hot gifts across many instances**: the read cache is per instance. If one gift is opened
   thousands of times a minute across many instances, add a shared cache (Upstash Redis via the
   Vercel Marketplace) or cache the link-preview HTML at the CDN.
3. **Emails**: move sending to a queue (Vercel Queues) so a slow email never slows a request.
4. **PayMongo**: payout schedules and account limits; ask PayMongo about volume.
5. **Rate limits**: the Postgres table works, but at this size move limits to Redis to take the
   writes off the database.

### 1,000,000 users

A different setup. A dedicated database plan with read replicas, Redis for cache and limits,
background workers for email and media, image resizing at the edge, partitioned events, on-call
monitoring, and a second payment provider for buyers abroad (`docs/INTERNATIONAL-PAYMENTS.md`).

## Upgrade order and when

| When | Upgrade | Why |
|---|---|---|
| Before launch | Vercel Pro | Deploy limit (already hit), commercial use, more function time |
| Before launch | Resend Pro | 100 a day free limit |
| First paying customers | Neon Launch | No pausing, more compute and storage |
| ~10k users | Events rollup, Neon autoscaling max set | Metrics speed, cost guard |
| ~50k to 100k users | Upstash Redis (shared cache and limits), Vercel Queues for email | Many instances, steady load |
| 1M | Dedicated DB, replicas, workers | Different architecture |

## Rough monthly costs (USD, before payment fees)

| Users | Vercel | Neon | Blob | Resend | Other | Total, roughly |
|---|---|---|---|---|---|---|
| 1,000 | $20 (Pro, 1 seat) | $0 to $19 | under $5 | $20 | | $40 to $65 |
| 10,000 | $20 to $60 | $19 to $70 | $10 to $30 | $20 | | $70 to $180 |
| 100,000 | $100 to $300 | $70 to $300 | $100 to $300 | $90 | Redis $10 to $50 | $400 to $1,000 |
| 1,000,000 | $1,000+ | $1,000+ | $1,000+ | $400+ | workers, monitoring | $3,000 to $10,000 |

PayMongo takes its fee per payment (it differs by method; QR Ph and wallets are cheaper than
cards). That's per sale, not a monthly cost.

## Launch day checklist

1. Vercel is on Pro, and `main` is deployed with the latest merges (check the commit on the
   Production deployment matches `main`).
2. Environment variables in Vercel (Production): `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`, `PAYMONGO_SECRET_KEY`, `CRON_SECRET`,
   `VITE_FLAGS`. Leave `READ_CACHE_TTL_MS` unset (10 seconds).
3. /admin, Payments setup: three ticks. `enabledPaymentMethods` in `src/config/pricing.ts` matches
   what PayMongo has switched on.
4. A real test on the live site, on a phone: make a gift, add a note from another phone, pay the
   smallest plan with QR Ph, open the gift link, then refund that payment in PayMongo.
5. Watch for the first hours:
   - Vercel: Logs and Runtime errors (filter 5xx).
   - /admin: payment log (anything that isn't "applied" or "hint"), refunds to make.
   - Neon: CPU, connections, storage.
   - Resend: sends and bounces.
6. Keep this file and the rollback steps open.

## Rollback plan

- **Bad deploy:** Vercel, Deployments, pick the last good Production deployment, "Instant
  Rollback". Takes seconds and doesn't rebuild. Every migration so far only adds columns and
  tables, so older code runs fine on the newer database.
- **The read cache misbehaves** (people see stale notes for too long): set `READ_CACHE_TTL_MS=0`
  in Vercel and redeploy. Everything reads the database directly again.
- **A feature misbehaves:** remove its name from `VITE_FLAGS` and redeploy.
- **One gift is a problem** (abuse, a report): /admin, Reports, Pause gift.
- **Payments misbehave:** remove the PayMongo secret key in Vercel and redeploy. "Wrap it up" then
  says "We couldn't open the payment page", and nothing gets charged. Payments that already went
  through are still in PayMongo and `payment_log`; re-add the key and they reconcile (the daily
  job and the confirm page ask PayMongo about unpaid orders from the last 7 days).
- **Database trouble:** Neon has point-in-time restore. Restore to a branch first, check it, then
  switch `DATABASE_URL`.
