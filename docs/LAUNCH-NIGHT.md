# Launch night report (5 to 6 Nov 2026)

All work is in draft PRs. Nothing is merged and nothing was pushed to `main`. 8 pushes used of 10.
Every PR passed `npx tsc --noEmit`, `bun test src` and `NITRO_PRESET=node bun run build` before its
push, and all five have green Vercel checks.

## Read this first: the live site is behind `main`

The last three merges, #87 (`1216131`), #86 (`a0a77c4`) and #85 (`32b593c`), **never deployed**. Vercel
refused each one with "Deployment rate limited, retry in 24 hours" (the Hobby plan's limit). Live is
still on `a7946c9` from 18 Oct. That's why live says "All 10 formats" (already fixed on `main`) and has
no `og:site_name`. **Redeploy `main` in Vercel**, and move the team to Pro before launch (see
`docs/SCALE.md`).

## The PRs

| PR | Branch | What it changes |
|---|---|---|
| [#88](https://github.com/janellereonal/just-because/pull/88) | `design-polish` | Your three design-polish patches (calm loader, friend send moment, paid-screen next step, DESIGN-INSPO.md). Checks green, nothing to fix. |
| [#89](https://github.com/janellereonal/just-because/pull/89) | `launch-fixes` | The 8 live-site fixes, plus these docs. |
| [#90](https://github.com/janellereonal/just-because/pull/90) | `qa-night` | Fixes from the stress test (stacked on #89). |
| [#91](https://github.com/janellereonal/just-because/pull/91) | `scale-ready` | Read cache, shared rate limits, `docs/SCALE.md` (stacked on #90). |
| [#92](https://github.com/janellereonal/just-because/pull/92) | `launch-marketing` | Share previews and small fixes from checking every promised feature (stacked on #91). |

### #89 launch-fixes
- **Board Game dice on phones:** the board now also scales by screen height. Before, "Roll the dice"
  overlapped "Tap the dice to roll" by 12px at 360×480 and touched it at 375×520 (in-app browsers,
  Safari with toolbars). Now there's about 30px of space; 390×844 looks the same.
- **New-user guide step 1:** six real style cards instead of blank pills. The landing's "How it works"
  uses the same picture, so it gets them too.
- **Board Game on Sweet:** I paid ₱299 on the fake PayMongo and the recipient got the full Gift Hunt.
  Now a style needs the plan that includes its layout. Love Letter, Countdown, Record Player,
  Invitation, Board Game and Debut show "Celebration plan" on /create (card, note and create bar).
  Checkout refuses Sweet with a clear reason, and paid gifts keep their look. **Decision for you:** this
  replaces the 18 Oct rule "styles from themes come with every plan"; how to undo it is in the PR.
- **"All 10 formats":** already correct on `main` ("All 9", Handwritten off); live just needs the redeploy.
- **Payment wording:**
  - `enabledPaymentMethods` is now QR Ph, Maya, GrabPay and ShopeePay, with a comment to add card
    and gcash once PayMongo turns them on.
  - The plan picker says "Pay with ..." from that list.
  - There's no Visa or Mastercard promise while cards are off.
  - On phones, a tip shows before checkout: save the QR, open GCash, Maya or your bank app, choose
    Pay QR, upload it.
- **Delete a gift:** in the editor's Gift settings, the editor's ⋯ menu, and the dashboard. A draft
  needs one confirm. A paid gift also needs DELETE typed (its link closes, no refund), and its order
  record is kept.
- **Homepage on phones:** the 3D scenes now wait until the page has loaded, the intro is done and the
  phone is idle. The same still images show until then, so it looks the same. Measured at 4× slower
  CPU: returning visitors see the whole hero at 0.6s. Before, the hero card sat empty for about 3s,
  with a 770ms freeze.
- **Approved pricing changes:** `minCharge` is 4900, and `statementDescriptor` is "JUSTBECAUSE.SITE".
- **Docs:** `docs/INTERNATIONAL-PAYMENTS.md` (Lemon Squeezy plan), `docs/IDEAS.md` (top 5 first),
  and this report.

### #90 qa-night
- **Worst bug found:** notes were limited to 30 per IP per 10 minutes. Philippine carriers share one IP
  across many phones, and so does party Wi-Fi, so a busy gift would turn real friends away. New limits:
  - 30 notes per device
  - 300 per IP
  - 600 per gift per hour
  - reads: 1,000 per IP per minute (was 240)
- **/create with no name:** the error pointed at a field hidden under the sticky bar. The field now
  scrolls into view with "Add the name of who it's for."
- **Boarding Pass with long names:** the stub's name ran off the edge.
- **/admin:** showed "346.7%" friend conversion. It's now "Notes per friend visit".

### #91 scale-ready
- **10-second read cache** for public gift reads. Privacy checks still run on every request, and
  owner changes clear it. 1,000 loads of one gift link went from 965 database transactions to 2.
- **Shared rate limits** in Postgres for password guesses and note floods (migration 0020: additive,
  safe to run twice).
- **`docs/SCALE.md`:**
  - what breaks at 1k, 10k, 100k and 1M users
  - upgrades and when
  - rough costs
  - a launch day checklist
  - a rollback plan

### #92 launch-marketing
- **Example gifts share their own preview** ("See Ana's 30th | An example gift from Just Because")
  with their occasion's picture.
- **Home, /styles, /sections and /themes** set full share cards.
- **Friend page labels:** "A video" or "A voice note" instead of "A file".
- **Balikbayan Box:** no more "Peel off the tape" once the box is open.

## What was tested

Locally, on a production build with the live flags
(`styles,guestStart,photoboothCamera,newUserGuide,letterOpenings`), with a local Postgres and the fake
PayMongo. Never the real database, real payments or real emails. The live site got read-only checks
only.

- **As a gifter (Chrome, 375, 390 and 1440 wide):**
  - Every page, with no errors or sideways scroll.
  - All 20 offered styles created through /create, with each editor opening cleanly.
  - Guest start, approving notes and Approve all.
  - Paying: cancel, then pay. Discount codes: LAUNCH20, FRIENDSFREE and an unknown code.
  - The recipient opening, extend, the ended page, the dashboard and /admin.
- **As a friend:**
  - Empty fields, a double tap (one note), going offline mid-letter (text kept, friendly message,
    resend works) and long text with emojis.
  - A 22 MB photo (shrunk to 266 KB) and a HEIC (friendly message).
  - Voice note, video and doodle uploads, and every section type.
- **Breaking it:**
  - 50 friends at once on a Sweet gift stops at exactly 10.
  - The photo cap message.
  - Another user or a guest can't edit, delete, approve, pay for, password or rename someone else's
    gift, or read its pending notes.
  - `amount: 1` sent from the browser still charges the real price.
  - Fake, unsigned, wrong-secret and replayed webhooks change nothing.
  - Password gate: hash hidden, notes and names hidden, forged cookie refused, guess limit, unlock,
    and a password change signs everyone out.
  - Database down: friendly "Try again" pages.
- **What our posts promise:**
  - The Boarding Pass, Invitation, Balikbayan Box, Fetch, Record Player, Cake and Gift Box openings
    play through to the gift.
  - A Christmas group gift with open-when letters, voice notes, a time capsule (stays sealed), awards,
    coupons, a quiz, a doodle and a memory pin all render.
  - Plan prices match `pricing.ts`.
  - All 29 share images are 1200×630 and under 300 KB.

## What's left

- **No WebKit or Safari test:** Playwright's WebKit download finishes but stalls while unpacking in
  this sandbox (tried twice). I used Chrome with an iPhone user agent and touch instead. **Please do a
  quick pass on a real iPhone:** the homepage, one opening, the friend page with a photo, and the plan
  picker's QR tip.
- **Minor, not fixed:** the friend page's empty send doesn't mark the field `aria-invalid`, and a
  toast can linger about 4s after you pick a different photo.
- **With the database down,** gift links take about 10 seconds of retries before showing "Try again".
- **Previews may touch the live database:** if Vercel previews share the production `DATABASE_URL`
  (an open question from earlier sessions), the #91 preview build already created the new empty
  `rate_limits` table on the live database. It's additive and harmless, and it would happen at merge
  anyway. Worth giving previews their own Neon branch.
- **Lemon Squeezy is a plan only** (`docs/INTERNATIONAL-PAYMENTS.md`). It needs your store first.

## Suggested merge order

1. **#88** (design-polish). It's independent of the rest.
2. **#89, #90, #91, #92**, in that order. Each one is stacked on the one before, and GitHub moves the
   next PR onto `main` when you merge.
3. **#88 and #89 both added copy at the end of `src/copy/strings.ts`.** I merged `design-polish` into
   the stack and resolved it (kept both), so merging #88 first and then #89 to #92 is conflict-free.
   Until #88 merges, #89's diff also shows #88's changes.
4. **Redeploy `main` in Vercel** after the merges, and check the Production deployment's commit
   matches `main`.

## Only you can do

1. Redeploy `main` in Vercel, and **move the team to Vercel Pro** (deploy limit, commercial use).
2. **Resend Pro** before launch day: the free plan sends 100 emails a day.
3. **Publish Balikbayan Box** (and, if you're happy with them, Care Package, Parol, Winter Window and
   Debut) in /admin, Theme library. Balikbayan is promised in the posts but isn't on the live site.
4. **Decide on style plans** (#89): Celebration styles stay Celebration, or go back to every plan.
5. **Ask PayMongo to turn on cards and GCash**, then add `card` and `gcash` to `enabledPaymentMethods`.
6. **For Lemon Squeezy:** a store, payout details, a "Gift plan" product, and a test API key in Vercel
   (list in `docs/INTERNATIONAL-PAYMENTS.md`). Also your call on $7, $12 and $19.
7. **A real iPhone pass** (see above).
