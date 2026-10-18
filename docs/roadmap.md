# Roadmap: revenue and going global

Specs only, nothing here is built. Written 17 Oct 2026 (Revenue PR 7). Prices are suggestions until
Janelle confirms them; when something is built, its prices go in `src/config/pricing.ts`, never anywhere else.

Each item: **problem, scope, pricing, dependencies, risks, open questions.**

---

## 1. Printed keepsake book

**Problem.** A gift page is lovely but lives on a screen. People want something to hold, give at the party,
or keep on a shelf, especially for milestones (debuts, 60th birthdays, weddings, farewells).

**Scope.**
- "Print this gift" on a sent gift (organiser) and at the end of the gift (recipient).
- We lay out a book from the gift: cover with the theme art and the recipient's name, one note per page
  (or two short ones), photos full-bleed, a contributor list at the back. Voice notes and videos become
  QR codes that open them on the gift page.
- Preview every page before paying. Flag low-resolution photos ("This photo may print blurry") and let the
  organiser swap or drop them.
- Order through a print-on-demand partner that prints near the delivery address; we never hold stock.

**Pricing.** ₱1,990 to ₱3,500 / $49 to $89 depending on size and page count (for example 20 pages softcover
at the low end, 40+ pages hardcover at the high end). Shipping shown separately at checkout.

**Partner options** (shortlist to test with sample orders; check current terms before signing anything):
1. **Lulu Print API** (Lulu Direct). Photo books and hardcovers among 3,000+ configurations, an API that
   prints and ships each order, print facilities in the US, Canada, UK, France, India and Australia, and
   worldwide shipping. Best for international orders. Philippine delivery would ship from abroad (slower,
   duties possible).
2. **Peecho**. Print API for photo books, prints locally near the customer through its partner network and
   ships worldwide. Good fit for a "print anywhere" setup; check whether it has a printer in Southeast Asia.
3. **Photobook Worldwide** (Photobook Philippines). Singapore/Malaysia-based photo book maker since 2005,
   with an office in the Philippines and customers in 100+ countries. Best for local Philippine delivery
   and quality; we'd need to confirm whether they offer an ordering API or a B2B upload flow.
   A local fallback for small runs: **Photokeeps** (Manila photo book printer).

**What we'd need to build.**
- A print-ready PDF per partner spec: trim size plus 3 mm bleed on every side, a safe zone (about 6 mm) for
  text, CMYK-safe colours (or the partner's sRGB workflow), fonts embedded, separate cover and interior PDFs
  if the partner needs them, spine width from page count.
- Image checks: at least 300 DPI at printed size (warn below 200, block below 150), upscale nothing silently.
- Server-side PDF rendering (headless Chromium print or a PDF library), stored for the order.
- Order status from the partner's webhooks, shown on the gift ("Printing", "Shipped", tracking link).

**Dependencies.** Revenue PR 3 (add-ons in pricing), Launch PR 3 (payments), the keepsake export (#31),
a partner account (Janelle signs up; we never add keys ourselves).

**Risks.** Print quality we can't see until a sample arrives; colour shifts on dark themes; photos from
phones that look fine on screen but print soft; customs and delivery times to the Philippines; refunds for
damaged books (partner policy decides).

**Open questions.** Which partner after sample orders? Softcover only at launch? Do we take a margin on
shipping? Who handles reprints?

---

## 2. Chip-in fund

**Problem.** Group gifts often come with money ("we all chipped in for a trip"). Today people collect it
over GCash or bank transfer by hand, outside the gift.

**Scope.** Friends add money with their note. The recipient gets the total as a payout (GCash, Maya or a bank
in the Philippines; local options elsewhere) or as a gift card. A progress bar on the gift (optional amounts
hidden). The data model already exists (`gift_funds`, `fund_pledges`, shown as "Coming soon").

**Pricing.** A small contributor-paid fee on each chip-in (for example 3 to 5%, shown before paying), plus
margin on gift cards. The organiser and recipient pay nothing.

**Dependencies.** A licensed payment and payout partner; legal review; Launch PR 3 payments; KYC flows from
the partner.

**Risks (read this first).** Holding or sending other people's money is regulated. In the Philippines that
means BSP rules on e-money and payment systems; other countries have their own (money transmission licences
in the US, e-money and payment rules in the UK and EU, and so on). **We must not hold the money ourselves.**
It has to run through a licensed partner that holds and pays out the funds, and it needs a legal review before
any building starts. Also: fraud (stolen cards used to "gift"), chargebacks after payout, refunds when a gift
is cancelled, tax questions for large amounts.

**Open questions.** Which licensed partner (PayMongo, Xendit, Maya Business, or a global one like Stripe
Connect where available)? Payout or gift card first? Minimum and maximum amounts? What happens to money if the
gift never opens?

---

## 3. Just Because for Teams

**Problem.** Companies do birthdays, farewells, work anniversaries and welcomes every month. Someone passes a
card around by hand or chases a Slack thread. HR wants it to just happen, on brand and on budget.

**Scope.** A team workspace with central billing, several organisers, a people list (name, birthday, start
date) with reminders before each date, Slack (and later Teams) to invite colleagues and post when a gift opens,
HR system import (CSV first, then BambooHR-style integrations), branded themes (logo, colours) and an admin view
of who's been celebrated.

**Pricing.** Benchmarks: Kudoboard and GroupGreeting charge roughly $25 to $399 a month for teams. Suggestion:
a small team plan around $25 a month (up to 25 people), a growing plan around $99, and custom above. Annual
discount. Unlimited gifts within the plan.

**First market.** Philippine BPOs, startups and agencies (large teams, strong celebration culture, many
farewells and work anniversaries), then global remote teams.

**Dependencies.** Co-organisers (design PR 5), reminders engine (Revenue PR 4), Teams-friendly themes
(farewell, work anniversary, welcome), invoices and VAT handling, Slack app review.

**Risks.** Longer sales cycles; security questionnaires; data processing agreements; people data (birthdays)
is personal data and needs consent and deletion.

**Open questions.** Self-serve only, or sales-led for big BPOs? Which HR systems matter most locally? Branded
themes as a paid add-on?

---

## 4. Artist marketplace and drops

**Problem.** Themes are our moat, and we can't draw them all. Illustrators around the world would love a way
to earn from their style.

**Scope.**
- Artists design themes on the engine (object, gesture, palette, particles, sounds) from a kit and the Theme
  Bible's 8 checks.
- **Submission and review flow:** apply with a portfolio → get the kit → submit a draft theme → we review for
  the 8 checks, performance budget, originality (no copyrighted characters or brands) and, for cultural
  themes, a review by people from that culture → revise → publish as a draft, then live.
- Seasonal **limited drops** with named artists (for example a Lunar New Year drop), shown on the gallery
  with the artist's name and story.

**Draft royalty model.** Per paid gift that uses the theme: the artist earns 15% of the plan price (for
example ₱90 on a ₱599 Celebration gift), paid monthly once over a minimum, with a monthly statement. Drop
artists get a small upfront fee plus the royalty. Exclusive themes get a higher rate (20%) for 12 months.

**Dependencies.** Theme engine (done), theme metrics (Revenue PR 6) to report usage, a payout partner and tax
forms for artists, artist agreements (IP ownership or licence, exclusivity, takedowns).

**Risks.** Quality drift; copying or copyrighted work slipping in; cultural themes done badly; payouts across
many countries.

**Open questions.** Royalty on every gift or only paid ones? Who owns the theme after a contract ends? How many
artists in the first drop, and who?

---

## 5. Gift commerce

**Problem.** A gift page plus something real (flowers, a cake, a food box) on the day is the full moment.

**Scope.** "Add a real gift" when sending: a short, curated list per country from delivery partners (flowers,
cakes, food boxes, a real balikbayan box in the Philippines). Delivery on the opening date. We earn a
commission per order; the partner handles fulfilment.

**Pricing.** Partner price plus a service fee, or partner-paid commission (typically 10 to 20% in
affiliate programs). Shown clearly at checkout.

**Dependencies.** Partners per country, address collection (personal data), delivery-date coordination with
the gift's opening date.

**Risks.** Failed or late deliveries hurt the moment and our brand; perishables; refunds; addresses are
sensitive personal data.

**Open questions.** Which first country and partners? Do we take payment or redirect to the partner?

---

## 6. Theme migration onto the engine

**Problem.** The 13 current themes were built before the engine. They work, but each has gaps the Theme Bible
audit found (personal touches, hit areas, reduced motion).

**Scope.** Move them onto the engine one by one, **in order of usage from the theme metrics** (Revenue PR 6,
"Themes" on /admin, sorted by paid conversion; use gifts made as the tie-break). For each, apply its top 3
improvements from `docs/theme-bible.md` ("Top 3 improvements per theme"). Example: Birthday gets the age as
number candles, the name piped in icing and 40 px candle hit areas.

Until there's a month of data, the likely order is Birthday, Christmas, Valentine, Wedding, Bridal, Voyage,
Baby, Anniversary, New Year, Pets, Handwritten, Game Night, Pixel. Bridal gets its own object (not a pink
Wedding).

**Pricing.** None: it's quality work that lifts conversion for every plan.

**Dependencies.** Theme metrics with at least a few weeks of data; the 8 checks; old gifts must keep opening
exactly as before (migrate behind the theme's name, keep its saved settings working).

**Risks.** Changing a theme someone already sent; visual regressions. Mitigate with screenshots of every theme
in every format before and after, and a flag per migrated theme.

**Open questions.** Should existing sent gifts get the new opening, or keep the old one?

---

## 7. Going global

**Payments.** Add a global processor alongside PayMongo for cards and wallets outside the Philippines (for
example Stripe, Paddle or PayPal), charging in the visitor's currency with real prices per currency instead of
the "≈ $" display. Provider code already sits behind `src/server/payments/types.ts`, so it's a sibling of
`paymongo.ts`. Janelle chooses the provider and adds the keys herself. Risks: tax (VAT/GST, US sales tax) and a
merchant-of-record decision.

**Languages.** Pick the first 3 from real traffic once metrics have a few weeks of data (`region` on events).
Likely candidates: Filipino (Tagalog) for the home market, Spanish (Latin America, Spain, the US), and
Indonesian or Portuguese depending on where visits come from. The i18n layer (`src/i18n/`) is ready for it.
Gift content stays in whatever language friends write.

**Local collections per country.** Small, well-made theme collections for the strongest markets. Candidates:
US, UK, Australia, Indonesia, Mexico and Brazil. Each: 3 to 5 themes, local occasions and dates, local
payment methods, local currency.

**Milestone birthdays in other cultures** (built like the Debut theme, with input from people from that
culture before it ships):
- **Quinceañera** (Mexico and Latin America): the 15th birthday.
- **Sweet 16** (US and Canada).
- **21st** (UK, Australia, New Zealand, Ireland): the key to the door.

**Global seasonal themes**, each on its own date and culturally reviewed: Lunar New Year, Diwali, Eid,
Hanukkah, Thanksgiving, Mother's Day and Father's Day (dates differ by country, so the theme should use the
recipient's country).

**Dependencies.** Theme metrics and region data, the engine, cultural reviewers, the global processor.

**Risks.** Themes that feel touristy instead of authentic; holidays on different dates by country; support in
languages we don't speak.

**Open questions.** Which country first after the Philippines? Who are the cultural reviewers for each theme?
