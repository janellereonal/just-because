# Next session: picking up Just Because

## 18 Oct 2026, evening: Constellation rebuilt as a 3D sky

Janelle's bar for every style: Zine, Boarding Pass and Invitation (openings and bodies), "down to the audio".
Constellation now meets it: WebGL night sky with a Milky Way, mountains, a heart of friends' stars that draws its
outline as neighbours are found (any tap order), its own synthesized sound (`src/lib/nightsky/sound.ts`), drag to look
around, reduced motion = a still sky, no WebGL = the classic sky. Test tap-through: `tools/screens/skyplay.cjs`.
Next: bring the other styles up to the same bar, one at a time, each with its own sound.

## Latest (18 Oct 2026): styles and occasions

Janelle's restructure: **Style** becomes the one visual choice, **Occasion** an optional filter, and the word
"theme" leaves the UI. Plan agreed on 18 Oct, in four PRs:
1. **Model (this PR, `styles-model`):** `src/lib/styles.ts`, `src/lib/occasions.ts`, migration 0016
   (`style`, `occasion`), create/update accept them, words follow the occasion. No visible change.
2. /create (from, for, occasion, style, sections) and the editor, "theme" removed, "Celebration plan" badge,
   behind flag `styles`. Pricing: styles from themes on every plan, layout styles keep their plan
   (`tier.formats` must let theme styles through). Port #43's fixes (no double openings, Zine and Notebook
   pick up the look, font and palette name clashes), then close #43.
3. `/styles` gallery with occasion chips, nav and homepage links, `/themes` redirects.
4. Openings for the 9 layout styles: done (18 Oct, branch `styles-complete`, `src/themes/layouts/`). Every style now
   has an opening and a body, in the gallery and on real gifts. Next: slow-motion recordings and a real-phone pass.

Status: 1 to 3 merged (#49, #61, #62, fixes #58). `styles` still has to be added to `VITE_FLAGS` in Vercel.
PR 4 part 1 (`love-letter-directions`, flag `letterOpenings`): Janelle didn't want to pick between the three
Love Letter directions, so all three ship. Break the seal is the default; Peel the seal and Slide it out are
choices under "How the letter opens" in the editor (`intro_settings.letter`). All three grow into the gift's
first page. Code: `src/themes/valentine/LoveLetter.tsx`; dev page `/dev/love-letter?d=a|b|c`.
Layout styles' openings are in #73 (another session). Still open: calm notebook wording for Sympathy.

Open: cultural review of the Lunar New Year, Eid, Diwali and Hanukkah words (`culturalReview` in occasions.ts).

## Earlier (17 Oct 2026, afternoon)

**Merged since the morning:** #31 (payments and gift lifecycle) and the hotfix #41 (re-applies #31's migration safely), both merged by Janelle, plus docs #40.
Migrations in the open PRs are renumbered to 0013 and written idempotently (`IF NOT EXISTS`), so a skipped migration can't break production again.

**Open, waiting for Janelle (merge in this order):**
1. [#23](https://github.com/janellereonal/just-because/pull/23) Launch PR 1: trust, privacy and sharing
2. [#26](https://github.com/janellereonal/just-because/pull/26) Launch PR 2b: photo privacy
3. [#33](https://github.com/janellereonal/just-because/pull/33) Launch PR 4: editor and organiser fixes
4. [#35](https://github.com/janellereonal/just-because/pull/35) Launch PR 5: metrics
5. [#36](https://github.com/janellereonal/just-because/pull/36) Revenue PR 6: theme metrics (on top of #35)
6. [#38](https://github.com/janellereonal/just-because/pull/38) Revenue PR 5: concierge (flag `concierge`)
7. [#42](https://github.com/janellereonal/just-because/pull/42) Handwritten becomes a Notebook layout (flag `handwrittenFormat`)
8. [#43](https://github.com/janellereonal/just-because/pull/43) Add-on 6b: themes, layouts and sections. **Not flagged, so not auto-merged.** It includes #33, #35/#36 and #42, so merge it after them. It lets owners change the theme in the editor: Janelle to confirm.
9. [#44](https://github.com/janellereonal/just-because/pull/44) Photobooth: camera, frames and a message (flag `photoboothCamera`)
10. [#45](https://github.com/janellereonal/just-because/pull/45) New-user guide on /create (flag `newUserGuide`)

Also still open: [#37](https://github.com/janellereonal/just-because/pull/37) design foundation (draft, waits for the design OK).

#44 and #45 meet the self-merge rules but are held so the queue above doesn't pick up conflicts. After each merge, merge main into the remaining branches. The only conflicts are first-import lines (keep both), `flags.ts` and appends at the end of `strings.ts`.

**Flags to turn on when ready** (`VITE_FLAGS`, comma list): `birthdayAge`, `concierge`, `handwrittenFormat`, `photoboothCamera`, `newUserGuide`.

**Next up:** Revenue PR 3 (pricing and add-ons) and Revenue PR 4 (reminders). Both are unblocked now that #31 is merged.

**Questions:**
- Keep "Change theme" in the editor (#43), or make the theme fixed once a gift is made?
- Do Vercel previews get their own Neon branch? If not, PR previews run migrations on the live database.

## Morning report (17 Oct 2026)

### 1. Merged automatically
- [#25](https://github.com/janellereonal/just-because/pull/25) Launch PR 2a: input limits, double-tap guards, long-text fixes.
- [#28](https://github.com/janellereonal/just-because/pull/28) Revenue PR 1: theme engine and Theme Bible.
- [#29](https://github.com/janellereonal/just-because/pull/29) Revenue PR 2: Christmas, global and Filipino-first themes (seeded as drafts, hidden until you publish them).
- [#39](https://github.com/janellereonal/just-because/pull/39) Revenue PR 7: `docs/roadmap.md` (docs only).
- Docs updates: [#24](https://github.com/janellereonal/just-because/pull/24), [#27](https://github.com/janellereonal/just-because/pull/27), [#30](https://github.com/janellereonal/just-because/pull/30), [#32](https://github.com/janellereonal/just-because/pull/32), [#34](https://github.com/janellereonal/just-because/pull/34). Production deployed fine after each; homepage, /create and the example gift load.

### 2. Waiting for your review (most important first)
Each PR has screenshots at 390 and 1440 in its description. Previews: open the Vercel link on each PR.
1. [#31](https://github.com/janellereonal/just-because/pull/31) **Launch PR 3: payments and gift lifecycle.** Late payments after a cancel still open the gift, a payment log, receipts, the 14-day reminder and a daily job, "Download everything", account deletion that removes photos. Touches payments, schema, emails and privacy. Has a list of things to test by hand (PayMongo test mode, `CRON_SECRET`, Blob delete, Resend).
2. [#23](https://github.com/janellereonal/just-because/pull/23) **Launch PR 1 (draft): trust, privacy and sharing.** Legal pages, robots and noindex, link previews, security headers, report a gift.
3. [#26](https://github.com/janellereonal/just-because/pull/26) **Launch PR 2b: photo privacy.** Strips location data from photos; scrubbed browser error reports.
4. [#33](https://github.com/janellereonal/just-because/pull/33) **Launch PR 4: editor and organiser fixes.** All 12 items: one note count everywhere, all section titles, safer section toggles, Undo / Approve all / Delete, Skip intro, a 45% phone sheet, hair fixes in the people builder.
5. [#35](https://github.com/janellereonal/just-because/pull/35) **Launch PR 5: metrics.** Our own events table and "How gifts are doing" on /admin. No tracker, no cookies, no note content.
6. [#36](https://github.com/janellereonal/just-because/pull/36) **Revenue PR 6: theme metrics.** Stacked on #35 (merge #35 first). Per-theme table sorted by paid conversion, with a region filter.
7. [#38](https://github.com/janellereonal/just-because/pull/38) **Revenue PR 5: concierge beta.** "Want us to handle it?" form, emails and an admin list. Flag off.
8. [#37](https://github.com/janellereonal/just-because/pull/37) **Launch PR 6 (draft): Keepsake Modern design.** `/dev/design` and the hero mock only, waiting for your OK before anything changes site-wide.

**Merge order that avoids trouble:** #23, #26, #31, then #33, #35, #36, #38. #23, #31, #35 and #38 each add a migration numbered 0011, and #31 and #33 overlap in the editor, so each one after the first needs a quick rebase and `bun run db:generate`. I can do those in the next session.

### 3. Flags waiting to be turned on
- `birthdayAge` (#29, merged): the age as candles on birthday cakes. Set `VITE_FLAGS=birthdayAge` in Vercel and redeploy.
- `concierge` (#38, once merged): add it to `VITE_FLAGS` after setting `CONCIERGE_EMAIL`.
- The five new themes (Winter Cabin, Care Package, Balikbayan Box, Parol, Debut) are drafts: publish each in /admin, Theme library, after a cultural review.

### 4. Questions for the morning
See "Questions for the morning" below. The new ones from tonight:
- Who handles concierge requests, which email, and keep ₱1,499 / $49? (#38)
- Design: go ahead with Fraunces replacing Fredoka, raspberry replacing terracotta, and the gift-tag logo direction? (#37)
- `CRON_SECRET` in Vercel, the 90-day deletion of ended gifts, and storage caps per gift. (#31)
- An organiser-wide time capsule date, or keep it per friend? (#33)
- The "Make one for someone" links (#35) aren't behind a flag. Fine, or flag them?

### 5. Reverted or broken
Nothing reverted. Nothing broken on production. Two things to know:
- The sandbox can't open Vercel previews, so every "checked in a browser" step used a local production build (as you allowed).
- Revenue PR 3 (pricing and add-ons) and Revenue PR 4 (reminders) were not started: both wait for #31. Launch PR 7 and 8 were skipped as you asked.

### 6. What's next
1. Rebase the open PRs in the merge order above once you've reviewed them.
2. Revenue PR 3 and 4 after #31 merges.
3. Apply Keepsake Modern site-wide after your OK on #37.

## Overnight run (16 to 17 Oct 2026): status and queue

**Read this block first.** Janelle combined three prompts (launch, revenue, design) into one queue and is asleep;
work goes on autonomously. Her rules for this run:
- Merge yourself only if: tsc and build pass, checked in a real browser at 390x844 and 1440x756 (the sandbox
  can't open Vercel previews, so a local production build counts), old gifts still open in 3 themes x 2 formats,
  the PR doesn't touch payments, pricing, plan limits, auth, permissions, schema or migrations, privacy, robots
  or noindex, security headers or CSP, emails or reminders, or the site-wide design, and new user-facing things are
  behind a feature flag that is OFF in production. Squash merge, then check prod (homepage, /create, editor, /g/).
- Everything else: open as a **draft** with screenshots, note why it's blocked, move on.
- Never: the real DATABASE_URL, PayMongo keys, new provider keys, real emails, destructive DB commands, force-push.
- Pull and rebase on main before each PR; Janelle's changes win conflicts.
- Item 11: build /dev/design and a hero mock as a draft only. Skip 12 and 14 (need design approval); do 13 and 15.

### Combined queue
| # | Item | Status |
|---|---|---|
| 1 | Launch PR 1: Trust, privacy and sharing | Draft [#23](https://github.com/janellereonal/just-because/pull/23), waits for Janelle (schema, robots, headers, privacy) |
| 2 | Launch PR 2: Input hardening and reliability | 2a **merged** [#25](https://github.com/janellereonal/just-because/pull/25); 2b [#26](https://github.com/janellereonal/just-because/pull/26) waits for Janelle (privacy) |
| 3 | Revenue PR 1: Theme engine and Theme Bible | **Merged** [#28](https://github.com/janellereonal/just-because/pull/28) |
| 4 | Revenue PR 2: Christmas, global and Filipino-first themes | **Merged** [#29](https://github.com/janellereonal/just-because/pull/29). Themes are drafts: review, then publish in /admin |
| 5 | Launch PR 3: Payments and gift lifecycle | [#31](https://github.com/janellereonal/just-because/pull/31), waits for Janelle (payments, schema, emails, privacy). Manual tests listed in the PR |
| 6 | Launch PR 4: Editor and organiser fixes | [#33](https://github.com/janellereonal/just-because/pull/33), waits for Janelle (not flagged; small data-rule changes). Overlaps #31 in EditorPage |
| 7 | Launch PR 5: Metrics | [#35](https://github.com/janellereonal/just-because/pull/35), waits for Janelle (migration, privacy) |
| 8 | Revenue PR 3: Pricing, tiers, add-ons and payments | not started, waits for #31 to merge |
| 9 | Revenue PR 4: Reminders engine | not started, waits for #31 to merge |
| 10 | Revenue PR 6: Theme metrics | [#36](https://github.com/janellereonal/just-because/pull/36), stacked on #35 |
| 11 | Launch PR 6: Design foundation (/dev/design draft only) | Draft [#37](https://github.com/janellereonal/just-because/pull/37), waits for Janelle's OK |
| 12 | Launch PR 7: Homepage, performance, accessibility | skipped until design OK |
| 13 | Revenue PR 5: Concierge beta | [#38](https://github.com/janellereonal/just-because/pull/38), flag `concierge` off |
| 14 | Launch PR 8: Launch QA | skipped until design OK |
| 15 | Revenue PR 7: Roadmap (docs only) | **Merged** [#39](https://github.com/janellereonal/just-because/pull/39) |

The three prompts are saved in `docs/prompts/` (launch.md, revenue.md, design.md) so a fresh session can read them.

### Questions for the morning
- Legal pages: review them, then set `SITE.legalDraft = false`. Policy choices I made that need your OK: minimum
  age 16; contents kept 90 days after a plan ends, then deleted; unpaid drafts deleted after 12 months without
  changes; refunds within 7 days if the recipient hasn't opened it. PR 3 will implement the retention rules.
- Socials for the footer (`SITE.socials`, hidden while empty).
- Error reports (#26): I used our own `/api/client-error` endpoint that writes to the Vercel logs instead of
  Sentry, because Sentry needs an account, a key and a CSP change. Do you want Sentry later?
- Photos from iPhones in HEIC, plus videos and voice notes, keep their metadata (most browsers can't redraw HEIC).
  Convert HEIC on the server later, or ask friends' phones to send JPEG (iOS does this when the picker allows it)?
- New themes (#29): get a cultural review of Balikbayan Box, Parol and Simbang Gabi, and Debut, then publish
  each in /admin (Theme library). They're drafts until then.
- Turn on the birthday age? Set `VITE_FLAGS=birthdayAge` in Vercel and redeploy.
- Simbang Gabi gates notes in the browser, so someone technical could read ahead with dev tools. Fine for a
  surprise; say if you want it enforced on the server too (that touches the privacy rules in api.ts).
- **#31:** add `CRON_SECRET` in Vercel (Production). Without it the daily job (14-day reminder, unpaid order
  re-checks) refuses to run.
- **#31:** deleting gifts 90 days after they end is not built yet. Today an ended gift is kept and its link
  shows "This gift has been wrapped up". Build the deletion job once the legal pages (#23) are agreed?
- **#31:** storage caps per gift, and plan limits for videos and voice notes. Today only photos count towards
  a plan, and a friend could upload many large videos. Cap per file is already in place; want a per-gift total?
- **#31 and #23** both add a migration numbered 0011. Whichever merges second needs `bun run db:generate` again
  (I'll do it, or ask in the next session).
- **#33:** time capsule dates are picked by each friend, so the Dates group only explains that. Want an
  organiser-wide "opens on" date instead?
- **#33 and #31** overlap in `EditorPage.tsx`; the second to merge needs a small rebase.
- **#38:** who handles concierge requests and which email (`CONCIERGE_EMAIL`)? Keep ₱1,499 / $49?
- **#37:** Fraunces instead of Fredoka, raspberry instead of terracotta, and the gift-tag logo: go ahead?
- **#35:** "Make one for someone" links on the gift footer and friend page aren't flagged. OK?
- **#35, #31, #23, #38** all add a migration numbered 0011; each after the first needs regenerating.
- Rate limits are in memory per server instance. Fine for launch; a shared store (Upstash or Postgres) would make
  them exact across instances. Worth it?

### Launch PR 5 (#35) and Revenue PR 6 (#36): metrics
- `events` table, `src/server/events.ts` (`track()`, `EVENT_PROPS` allow-list, never throws), browser events through
  `trackEvent()` in `src/lib/track.ts` (`trackClientEvent` drops the organiser's own views and opens).
- #36 adds theme, format and region (Vercel country header) to every event about a gift, plus
  `theme_opening_started/completed`, `theme_replayed`, `theme_shared` (`shareGift()` in every format).
- /admin: `src/components/admin/Metrics.tsx` and `ThemeMetrics.tsx`, server fns `getMetrics` and `getThemeMetrics`.

### Revenue PR 5 (#38): concierge beta
- `ConciergeOffer` (flag `concierge`), `submitConciergeRequest`, `listConciergeRequests`, `setConciergeStatus`,
  `concierge_requests` table, `conciergeRequestEmail` to `CONCIERGE_EMAIL` or every admin. Price in pricing.ts.

### Launch PR 6 (#37, draft): Keepsake Modern
- `/dev/design` (`?view=hero`), `src/design/keepsake.css` (scoped to `.kd`, loaded as links on that page only),
  `src/components/brand/Logo.tsx` and `FoldAndTie.tsx`, `docs/brand.md`. Fonts: `@fontsource-variable/*`.

### Revenue PR 7 (#39, merged): `docs/roadmap.md`

### Launch PR 4 (#33, branch `launch-editor`, waiting for Janelle)
- Note counts: `src/lib/noteCounts.ts` (`countNotes`, `noteSummary`, `friendsIn`), with tests. Use it anywhere a
  count is shown. `listMySites` returns `note_counts`; `listSealedContributions` returns `by_owner`.
- New `custom_text` keys for the 8 newer sections (`openwhen_title` ... `doodle_title`), passed to `NewSections`
  as `titles`. Words has a Dates group.
- Section toggles: last one can't go off (client and `setModuleEnabled`); one with notes asks first.
- Friend page copy: `FRIEND_PAGE` and `friendAddLine()` in strings.ts. `TAB_LIMIT = 4` in ContributePage.
- Rail checks: `touched` per gift in localStorage `jb:touched:<id>`; `railDone()` in EditorPage.
- Moderation: `setStatus(ids, status)` shows Undo; `removeNote`; `ReviewCard` has Delete, Show more.
- Phone sheet: `sheetH` (45 or 88, drag handle), a spacer shrinks the preview above it.
- People: hair fixes in `src/lib/clay/person.ts`; `/dev/people?grid=hair`; `tools/screens/hairgrid.cjs`.
  Re-render presets with `PEOPLE=1 ONLY=... node clay.js` after changing hair.
- Samples: `SAMPLE_LETTERS` / `sampleLetter()` in strings.ts; `GiftKindContext` (giftPieces) set by FormatView;
  `SAMPLE_BADGE` shown by FormatView on every format but the scrapbook.

### Launch PR 3 (#31, branch `launch-payments`, waiting for Janelle)
- Payments (`src/server/billing.ts`):
  - `applyPaidEvent` locks the order row first, then records the event. A payment after a cancel or a timeout
    still opens the gift. A second payment for the same plan logs "Needs a refund" and changes nothing.
  - `reconcileOrder` asks PayMongo about one unpaid order (under 7 days old); used by the confirm page, the
    billing panel (`reconcileSiteOrders`), the webhook hints and the cron.
  - `payment_log` table, written by `logPayment()`, shown in /admin.
  - Webhook: signatures older than 10 minutes and unsigned calls are hints, rate-limited 6 a minute per checkout.
  - Receipt email (`notifyPaid`). `addMonths` in pricing.ts is UTC and clamps the day.
- Lifecycle:
  - `/api/cron/daily` (vercel.json cron, 01:00 UTC, `CRON_SECRET`): 14-day reminder (`sendExpiryReminders`,
    once per end date via `gift_sites.expiry_reminded_at`), re-checks unpaid orders from the last 2 days,
    expires unpaid orders after 24h.
  - **Decision I made:** an ended gift shows "This gift has been wrapped up"; the organiser can extend or download
    a copy. Nothing is deleted yet (the 90-day deletion is a question above).
  - `ExportGift` (fflate, in the browser): zip with notes.html, notes.csv and media/. In the editor (Wrap it up,
    Keep a copy) and on the wrapped-up page.
- Privacy: `/account` with type-DELETE deletion (`deleteAccount`). Deleting a gift, note or account removes its
  files (`deleteMedia`, `deleteGiftMedia` in `src/server/uploads.ts`). Orders stay, with `site_id`/`owner_id` null.
- Limits: republishing checks the plan (`tierBlocker`); un-hiding a note checks there's room.
- Tests: `bun test src` (59). `src/server/billing.test.ts` runs only against a localhost DATABASE_URL, with the fake
  PayMongo in `tools/payments/fake-paymongo.ts` (also runnable on its own). Export test: `tools/screens/exp.cjs`.
- Janelle to test by hand: PayMongo test mode on the preview (pay; cancel then pay), `CRON_SECRET`, Blob delete,
  Resend emails.
- PR screenshots live on the `pr-shots` branch (never merged), one folder per PR.

### Revenue PR 1 (#28, merged): the theme engine
- `src/themes/engine/`:
  - `useGesture` handles 13 gestures (touch, mouse, keyboard, reduced motion). The maths is in `core/progress.ts`, with tests.
  - Materials, particles, synthesised sound packs and haptics.
  - Slots with fallbacks.
  - `defineTheme` and `validateTheme`.
  - `EngineStage` runs a theme inside the shared opening shell.
  - `kraft-parcel` is a dev-only sample theme.
- `src/i18n/`: `t()` and strings in `en.ts`. Dates, numbers and money use the visitor's locale.
- `/dev/themes` is the playground (dev only):
  - `?theme=&size=phone|laptop&worst=1&autoplay=1&simbang=1&now=2026-12-19&notes=9`
  - `&bare=1` shows the opening full screen, for screenshots.
- Performance:
  - `bun tools/perf/theme-budget.ts` checks size (400 KB).
  - `node tools/perf/theme-fps.cjs <base> <id>` measures frame times with 4x CPU and slow 4G.
  - `bun test` runs the tests. There's no CI yet.
- `docs/theme-bible.md` has the 8 checks, cultural themes, and an audit of the 13 current themes with their top 3 fixes.

### Revenue PR 2 (#29, merged): the new themes
- Engine themes:
  - `winter-cabin`, `care-package`, `balikbayan-box` (shares `care-package/Parcel.tsx`), `parol` and `debut`.
  - Each has `theme.ts` (config plus occasion template) and `Object.tsx`.
  - They're found by theme name (`engineThemeForName`). `TactileOpening` renders `EngineStage` for them, so every surface works.
  - Gift data comes through `src/lib/engineGift.ts` (`engineIntroProps`, `previewEngineProps`, `simbangVisible`).
- Simbang Gabi:
  - Logic is in `src/themes/engine/simbang.ts`, with tests.
  - It's a switch in `intro_settings.simbang` (opening settings, Parol only).
  - The gift page shows only the notes that have opened, plus a night banner.
  - Test it with `tools/screens/simbang.cjs <slug> <iso date> <out.png>`, which uses a fake clock.
- Birthday:
  - The "Turning" age is stored as `custom_text.turning` and shown as candles. It's behind flag `birthdayAge`.
  - Flags live in `src/config/flags.ts` (env `VITE_FLAGS`). They're on in dev.
- Seed:
  - The 5 themes are seeded as `draft` (the seed's sixth column). It never changes an existing row's status.
  - It also adds 9 palettes, which only show as their theme's suggestions (`THEME_ONLY_PALETTES` in PalettePicker).
- Gallery:
  - New groups: New, Christmas, Family and far away, and Philippines. They appear once an engine theme is published.
  - `src/lib/themeOrder.ts` handles ordering by visitor country (`getVisitorCountry`, from the Vercel header): Balikbayan Box first for PH, Care Package first elsewhere.
- Tools:
  - `engine-shots.cjs <id> <outDir> [w] [h] [query]` saves rest, mid, done and note screenshots.
  - `record.cjs <id> <out.mp4>` records via Chrome's screencast (about 4 fps in the sandbox).
  - `edtest.cjs` fills an editor field.
- Locally the 5 themes are published in the local DB. Local test gift with Simbang on: `pasko-for-lola-p4my6`.

### Launch PR 2a (#25, merged) and 2b (#26, waiting for Janelle)
- **2a, merged:**
  - Text limits in one place: `src/lib/limits.ts`, with counters from `src/components/ui/CharCount.tsx`.
  - Server-function error middleware `fnErrors` in `src/start.ts` turns errors into real status codes and safe
    messages: 422 validation, 401, 403, 429, 500.
  - `rateLimit()` and `clientIp()` in `src/server/rateLimit.ts`.
  - Notes are idempotent: retries reuse the id and edit token, and the insert ignores repeats. A triple tap saves
    one note.
  - Create has a 15-second same-title guard, so a double tap makes one gift.
  - Calendar fix: doors used the UTC day, which put every door one day early for viewers ahead of UTC. Use
    `localDateKey()` from `src/lib/time.ts`, never `toISOString().slice(0, 10)`.
  - Long-text fixes from `/dev/worst-case` (dev only; `?kind=&format=`, `&intro=1` shows the opening):
    - Greetings scale down and clamp to five lines.
    - Hint and Skip on openings stay off the button.
    - Monograms use letters only (`initialsOf`).
    - The zine masthead wraps between words.
    - The bento hero reserves space for its 3D piece.
    - Note cards reveal as soon as they enter the screen.
  - Scratch foils and the night sky follow the gift's palette.
  - The storybook is sized to the screen, with readable controls on dark backgrounds.
  - The Roamer checks a spot is clear of text and controls before parking there, and again after scrolling.
  - Tools: `tools/screens/cal.cjs` counts calendar doors in a time zone (`TZID=Asia/Manila`); `console.cjs` prints
    console errors; `fn.cjs` calls a server function; `tap.cjs` triple-taps Send.
- **2b, waiting for Janelle (privacy):**
  - `preparePhoto()` in `src/lib/upload.ts` redraws JPEG, PNG and WebP to remove EXIF and GPS, turns them
    upright and caps them at 2560px. Upload errors are friendlier.
  - `src/lib/clientErrors.ts` plus `/api/client-error`: scrubbed browser errors go to the server log, at most five
    per page load.
  - `tools/screens/up.cjs` uploads a file through the friend page.
- **Not reproduced:** the dev-only "This page didn't load" from the stress test, and React #418 on the live
  homepage. The likely #418 causes (the calendar UTC day and two date labels) are fixed in 2a. Check the
  console on prod after deploys.

### Launch PR 1 (#23, branch `launch-trust`, waiting for Janelle): what's in it
- /privacy, /terms, /refunds, /contact (mailto form), shared footer on marketing and legal pages, draft banner
  (one flag: `SITE.legalDraft`), "By continuing you agree to the Terms and Refund policy" in the plan modal.
- robots.txt disallows private paths, sitemap.xml lists marketing pages, noindex meta on every private route
  (`NOINDEX` in `src/lib/seo.ts`) and an `X-Robots-Tag` header from `src/server.ts` (and `vercel.json` for static).
- Link previews: server-rendered titles ("A gift for Kai", "Add a note to Kai's birthday gift") through route
  loaders (`src/lib/share.ts`, no note content; password or paused gifts get "A gift for you"), plus 29 preview
  images in `public/og/` (one per theme for gifts and for friend links, and a default), made by
  `tools/screens/og.js` from `/dev/og`.
- New gifts get random 12-character slugs with no lookalike characters. Old slugs keep working.
- Security headers (`src/lib/securityHeaders.ts`): CSP, frame-ancestors none, nosniff, referrer policy,
  permissions policy (mic and camera for self only). Checked for CSP violations on home, themes, sections,
  example, gift, friend page, editor, dashboard and create: none.
- Report a gift: quiet Report link on /g and /contribute, `gift_reports` table, emails every admin, admin list
  with Pause gift / Dismiss. Paused gifts (`gift_sites.disabled_at`) show "This gift has been paused" and take no
  notes. Migration `0011` is additive only.
- Screenshot tooling: `fonts.cjs` now serves local fonts under fonts.gstatic.com so they pass the CSP;
  `csp.cjs` prints CSP violations for a list of pages.

Updated 16 Oct 2026 (sessions 6 to 8), so a new session, on any Claude account, can carry on without
missing anything. Start with `HANDOFF.md` section 0.

## Session 13: polish batch, part 1 (branch `polish-pass`)

- **Gallery:** opening a theme full screen now lands on a whole sample gift (`SampleGift`, the theme's sections
  then the other good ones), with a compact Use this theme bar. Gallery cards and the sample use each theme's own
  first palette (they were all on the fallback palette before).
- **Comic Issue rebuilt** (`ComicIssueView.tsx`, `styles/comic.css`): masthead cover with the gift's character on a
  burst, cover blurbs and barcode; pages of panels with speech bubbles that have real tails, caption boxes, tapes,
  transmissions, power words, missions and a credits back cover; page turns by drag, swipe, arrows or keys.
  Everything is sized by container queries (the old one used window breakpoints, which broke in phone previews).
- **Tree:** clay tree (`public/clay/xtree.webp`) and 16 clay ornaments (`orn-<key>.webp`, recipes in
  `src/lib/clay/tree.ts`). Ornaments sway, wiggle on tap and open into the note. The ornament picker uses them too.
- **Sections page** `/sections` (also in the top menu, and "See all 16 sections" on the homepage): every section,
  live, filterable, lazy-mounted.
- **Fonts:** 10 new pairings (Storybook, Elegant, Bold, Bubbly, Pen pal, Typewriter, Groovy, Retro, Comic, Pixel),
  loaded on demand (`loadPairingFonts`). Saved ids are in `src/lib/fontChoices.ts` (server-safe).
- Dev: `/dev/format?kind=christmas&format=comic&cover=1` shows any theme in any format.
- Screenshots: `tools/screens/fonts.cjs` serves Google Fonts from `~/.fonts`, so shots use the real faces;
  `pages.cjs` screenshots paged views with real clicks.

## Session 12c: the character picker (branch `characters-picker`, on top of `people-builder`)

- `src/components/CharacterPicker.tsx`, used in the Look step and in Customize > Characters and sprinkles.
- First view, made for the gift: Bo, three people, three animals and three little friends whose tags include the
  theme kind (falling back to Bookworm/Explorer/Barista, Dog/Cat/Bunny, Star/Heart/Cake), No one, and "See all".
  The picked character stays visible even when it isn't a suggestion.
- See all: search (names and tags), tabs For this gift / People / Animals / Little friends, Surprise me (a quarter
  of the time a brand new random person), Make a person. Tiles mount their still only when scrolled into view.

## Session 12b: the people builder (branch `people-builder`, on top of `characters-library`)

- **Make a person** in Characters: age (4), skin tone (10), face (6), hair (24) and hair color (10), facial hair (5),
  glasses (5), hat (12), outfit (20) and outfit color (12), and what they hold (20). Every option shows as a real
  thumbnail of this person wearing it. "Start from" has 40 ready-made people (`PEOPLE` in `cast/person.ts`).
- Saved on the gift as `{ type: "person", person, preset?, image_url? }` (cleaned by `normalizePerson`). The 3D model
  is `src/lib/clay/person.ts`; it shares the head layout with the live face (`personFace`), so faces line up.
- Where the still comes from: `image_url` (baked in the editor 2.5 s after the last change, uploaded as an intro
  picture), else the preset file in `public/clay/people/`, else rendered in the browser with three.js (loaded on
  demand, one render at a time). Gift pages only need 3D for a person that hasn't been baked yet.
- "Little you" is hidden from the picker; gifts that use it keep working, and "Make a person" starts from its colors.
- A person with their own hat doesn't also wear the theme's hat.
- Re-render the 40 presets: `cd tools/screens && PEOPLE=1 node clay.js ../op/people 640 && python3 clay_webp.py ../op/people ../../public/clay/people`.
- `/dev/people` shows them all; `/dev/openings?kind=birthday&char=person:birthday-kid` puts one in an opening.
- Each baked change uploads a new small WebP (about 10 KB). Old ones aren't cleaned up yet.

## Session 12a: the character library (branch `characters-library`, on top of `new-themes`)

- 36 new clay characters (18 animals, 18 little friends), all modelled in three.js like the first cast, so they
  share one look, one size and one floor line: `src/lib/clay/animals.ts`, `objects.ts`, with the shared kit in
  `shapes.ts`. Faces stay live SVG. Full list with tags in `docs/characters.md`.
- Janelle's reference sheets were used as a style guide only: one has a stock watermark and one is a stock
  preview, so nothing was cut out of them.
- `clayCast.ts` holds their names, face maps and tags; they have no drawn body, so they keep their own colors.
- `ONLY=fox,owl node clay.js ...` re-renders just a few.

## Session 11: Handwritten, Game Night and Pixel, plus the wanderer (branch `new-themes`, on top of `themes-batch`)

- **Three new themes**, in the "Any occasion" group (seeded with 3 palettes each, all pass 3:1):
  - **Handwritten**: a note folded in four that you unfold (two taps), ink on lined paper. Kalam / Patrick Hand,
    "Love notes" sprinkles (ink drops, envelopes, hearts). Note cards are lined paper with washi tape.
  - **Game Night**: a board with two dice you roll; a token hops to the star square. Bungee / Outfit, frog in a
    party hat, "Game night" sprinkles (dice, meeples, tokens, spades). Note cards have chunky outlines.
  - **Pixel**: a handheld console, PRESS START, a loading bar and a beating pixel heart. Press Start 2P /
    Pixelify Sans, crown, "Pixels" sprinkles. Note cards are game dialog boxes.
  - Each has its own 3D hero (`src/lib/theme3d/scene.ts`), still in `public/themes3d/`, skin in `skins.css`,
    words in `themeKind.ts`, and starter sections in `presets.ts`.
- **Wanderer.** One sprinkle from the gift's set strolls along the edges of the gift page (all formats) and hops
  when tapped (`src/components/Roamer.tsx`). Picked in Look > Customize > Characters and sprinkles > Sprinkles
  (Off or one of the set). Stored as `icon_set.roam` (-1 off, 0 to 7); the three new themes have it on by default,
  older themes off. Still under reduced motion.
- `tools/screens/stills.js` renders the theme 3D stills (see "Re-rendering the theme 3D stills").
- Not checked: the theme fonts themselves (Google Fonts is blocked in the sandbox, so shots show fallbacks).

## Session 10: clay characters, clay icons, real gift covers, homepage showcase (branch `themes-batch`)

- **Clay characters.** `src/lib/clay/scene.ts` builds each character in three.js (matte clay material, soft
  key light, contact shadow, orthographic camera on the 120 box). `/dev/clay` renders them; `tools/screens/clay.js`
  saves PNGs and `clay_webp.py` writes `public/clay/<id>.webp` (512) and `<id>@256.webp`. `Character.tsx` draws
  the still and keeps the live SVG eyes, blush and mouth on top (face map in `spec.clay`). Recolored characters
  fall back to the drawn SVG. Re-run both scripts after changing a recipe. Bo stays the drawn/3D Bo.
- New characters: Shih Tzu x Maltese (`tzu-mal`) and Shih Tzu x Pomeranian (`tzu-pom`).
- Fixed: animals' eyes slid to the floor on blink (motion SVG origins; `transformBox: fill-box`).
- **Clay icons.** Path icons (hearts, stars, paws, florals, confetti) get soft matte shading from a gradient and a
  contact shadow, no SVG filter, so dozens can float on a phone. `IconGlyph material="clay"` is the default
  (`"flat"` opts out, `"felt"` is the baby opening's); bursts use the same look (`iconElement`).
- **Gift covers on My gifts.** `GiftCover` draws the gift itself: palette and background, the occasion's 3D still,
  its character, a few of its sprinkles and the heading in its own font. Still and cheap, no 3D running.
- `listMySites` now goes through `siteRow` (it was sending `password_hash` to the browser).
- Homepage: the hero phone tours the example gifts on its own (Ana, Sam, Milo, Nora & James), switchable;
  Ana's 30th uses every section. Formats are a showroom (live phone + the nine formats) below plans.
  Theme pages show a sample gift with the sections that suit the occasion.
- Handwritten, Game and Pixel themes and the wanderer are session 11.

## Session 9f: end-to-end walk through on local (branch `e2e-fixes`, follow-up brief section E)

Script: `tools/op/e2e.cjs` (not committed, lives with the other local helpers). Run from tools/screens with
`NODE_PATH=$PWD/node_modules node ../op/e2e.cjs <outDir> signup create friend review wrap recipient expired`.
Screens at 390 and 1280 for every step.

What happened, step by step:
1. **Sign up (phone) and sign in (laptop)**: works. Sign-up lands on /create. Signed out, /create goes to
   /auth?next=/create and comes back after signing in. No email confirmation locally (no Resend key), as designed.
2. **Create (laptop)**: "Who's it for?" -> "Happy birthday, Mia", birthday theme, Songs turned on from "More". Fine.
3. **Friend link (phone)**: letter, photo and song all sent.
   - FIXED: after a long note the friend page went wider than the phone (the one-column grid grew to the note's
     length because "What you've added" doesn't wrap), so the page slid sideways. Grid columns are now `minmax(0,1fr)`.
   - FIXED: after "Send it" the page stayed where the form was, so you landed inside the preview. It now scrolls
     to "It's in" and "Add something else".
   - FIXED (preventive): `scrollIntoView` also scrolls overflow:hidden ancestors (the phone frame, the editor shell).
     Replaced with `centerInScroller` (`src/lib/scroll.ts`) on the friend page, editor, scrapbook, Gift Hunt, Mixtape.
4. **Approve and hide (laptop)**: approved Jo's letter and Lia's song, hid Ken's photo. The rail badge, notes chip
   and Wrap it up checklist all updated.
5. **Wrap it up**: checklist ticks, plan picker opens at both sizes. **Stopped here**: PayMongo isn't configured
   locally, so "Choose Sweet" fails with "We couldn't open the payment page" (server: `PAYMONGO_SECRET_KEY isn't set`).
6. **Recipient (phone)**: simulated a paid gift in the local database only (tier, published, expiry). Intro, blow
   out, then letters and songs; the hidden photo stays out. The song player was blank because this sandbox can't
   reach YouTube. FIXED: an "Open in YouTube / Spotify" link under every player, for blocked networks.
7. **Expired**: set the expiry in the past locally. /g shows "This gift has ended", the editor shows the ended banner
   with "Extend this gift", My gifts says "Ended".

For Janelle to decide:
- /create lets you skip the theme; the gift then has no theme ("Just because, Mia"). Require one, or keep it optional?
- My gifts still shows "Open gift" on an ended gift (it opens the goodbye page) and the subtitle still says "Share the
  invite link" when every gift has ended. Hide or reword?
- Paid gifts can't be deleted (see 9d).
- Dev only: React logs "called use() to suspend…" from TanStack's lazy routes. Not seen in the production build.
- Payment test with real PayMongo test keys is still to do (HANDOFF section 4).

## Session 9e: homepage and create page (branch `home-create`, follow-up brief section D)

- Homepage order: hero, occasions, how it works, **example gifts**, what goes inside (6 tiles: letters, photos,
  songs, voice notes, open-when, time capsule, then "And 10 more, from quizzes to doodles"), plans, **formats**
  (one row of 4 with "See all 9"), FAQ, closing.
- Every start button goes to /create (hero, closing, My gifts, example banner). /themes stays in the nav.
  Signed out, /create sends you to /auth with `?next=` and brings you back (default after sign-in is /create).
  `safeNext` only allows same-site paths.
- /create: the section list starts with five rows (the theme's picks, topped up with letters, photobooth, songs,
  voice, word cloud) plus anything already on; "More" shows the rest. Chip-in "coming soon" is gone.
  The bottom bar reads "Bridal Shower" over "Scrapbook · 5 sections".
- Formats carry a plan tag ("Celebration") when the first plan doesn't include them, on /create and in the
  editor's Gift settings (`formatPlanTag` in pricing.ts, `.fmt-plan`). A plan that can't use a format still shows
  the lock, now with the plan's name.

## Session 9d: quick fixes outside the editor (branch `outside-fixes`, follow-up brief section C)

- Friend page: the sample letter line matches the occasion (`ModuleExample kind`, `LETTER_LINE`).
  Note types already came only from sections the organiser turned on (`openModules`); checked, no change.
  "Here's the gift so far": other friends' notes come from `fetchSealedContributions` (name and section only) unless
  the organiser turned on "Let friends read each other's notes"; checked, no change.
- My gifts: every card says "Me and friends" or "Just me" (badge moved to the top corner so titles aren't cut).
  A "..." menu deletes a gift after a confirmation. `deleteSite` refuses gifts with a paid order, because orders
  cascade with the gift and the payment record would go too. **Decision for Janelle:** should paid gifts be
  deletable (soft delete, or keep orders with `site_id` set null)?
- Footer shows "My gifts" instead of "Sign in" when signed in.
- Birthday "Make a wish" waits until the opening has gone (`jb:opening-done` event from the opening shell). The
  reveal opens a hole in the middle of the opening, so the gift's button showed through inside the cake.
- Example dates use a round 7:00 pm (`inDays` in demoGifts.ts).

## Session 9c: who the gift is for (branch `recipient-name`, follow-up brief section B)

- /create step 2 is "Who's it for?" (required). The title is made from it and the occasion:
  `occasionTitle(theme, name)` in `src/lib/themeKind.ts` ("Happy bridal shower, Bea"; pets get "For Milo, the best
  pet ever"). `createSite` takes `recipientName` and saves it as `custom_text.recipient_name`, heading = title.
- The friend page says "Add something for Bea", and never uses the gift's title as the name (it was often the
  organiser's own name). Old gifts without a name: "Add something to the gift", "Only the recipient", etc.
- The sample name "Ana" is now only an editor thing: `PlaceholderNameContext` (`src/components/SampleMark.tsx`),
  turned on by `FormatView placeholderName` in the editor canvas. The friend page, the real gift and the full
  preview never show it; a nameless gift says "you" or drops the name ("Lucky you", "Look up").
  `usePieces` returns `named` and `nameIsSample`.
- Old gifts with no name show the title alone, and the editor header shows "Who's it for? Add their name".

## Session 9b: editor in 4 steps (branch `editor-steps`, PR 2 of the editor brief, with the follow-up corrections)

The 10-tab rail is now **Words, Look, Notes, Wrap it up** (numbered, green check when done) plus a small
**Gift settings** link at the bottom of the rail (phone: "Settings" in the bottom bar).
- Words, in the order they see it: Opening screen (small line, greeting, button, opening style and the classic
  extras), Main page (heading, who it's for, "Message under the title"), section titles with the countdown date
  and tree reveal date, footer. Greeting and the old "Intro message" stay separate (one is on the opening, one under
  the title) and are labeled by where they show.
- Look: 3 suggested palettes as cards, 4 backgrounds, the font presets, Bo + dog, cat, bunny (+ "No one").
  "Customize" opens the hex box, all palettes, photo colors and the full Characters panel (custom colors, upload,
  sprinkles). `PalettePicker part="suggested" | "more"`, `CastPanel simple`.
- Notes: invite link with Copy, Messenger and WhatsApp; your own note (Letter, Photo, Song, Voice note, "More"
  for the other 9, `OwnNotes showSolo={false}`); Advent surprises when the calendar is on; friends' notes to approve.
- Wrap it up: checklist (who it's for, at least one approved note), password, then the old publish / plan flow.
  The top bar's Wrap it up button opens this step.
- Gift settings: Who's it from, How it opens (format, asks before switching; comic cover and panels live here),
  Sections on/off, "let friends read each other's notes". Chip-in "coming soon" is gone from the editor.
- The canvas shows the opening while you edit the opening's words or characters, and the gift otherwise
  (`canvasView`, switched by touching a group). Saved rail sections from before map to the new steps.
- Top bar: back, gift name, saved, notes chip, Preview, Wrap it up. The Invite friends popover is gone.
- Inline editing (stretch goal): not done. Clicking text in the preview already selects it and offers
  "Edit text", which jumps to the field. Real in-place editing needs contentEditable inside every format view;
  worth a separate pass.

## Session 9 (16 Oct 2026): editor quick fixes (branch `editor-quick-fixes`, PR 1 of the editor brief)

- Palettes: every Main and Accent in `scripts/seed.ts` now passes 3:1 on its background, so no suggested
  palette shows "hard to read". Fixed in OKLCH (same hue, a bit more chroma, darker). Existing gifts keep
  the colors they copied at creation (`custom_colors`) until the owner picks a palette again.
- Font "Storybook" is now "Fairytale" (key `handwritten` unchanged).
- Intro panel lost its "Play it again" and "Full screen" (the bottom bar has them; "Replay intro" replays in the
  canvas while the intro is showing there). Zoom shows one "Fit".
- Bo: the laptop and phone previews keep 80px side room at 900px and up; below 900px Bo isn't shown in the editor.
- Placeholders: `SampleText` / `SampleTag` (`src/components/SampleMark.tsx`, styles in play.css) fade sample text
  and add a small "sample" tag. Used for the recipient name in every format and the scrapbook's intro and footer.
  `usePieces` returns `nameIsSample`.
- Heading: `giftHeading(text, theme)` in `src/lib/themeKind.ts` falls back to an occasion line
  (`KIND_WORDS[kind].occasion`, "Happy bridal shower") when a gift has no heading. New gifts still copy the gift
  name into the heading; the recipient-name step on /create (follow-up brief, section B) replaces that.
- Words: example placeholders, a hint under Footer note. "Invite link" everywhere. Review's empty state has an
  Invite friends button. Top bar: "No notes yet" button became a "0 notes" status chip.
- Removed the reading-progress thread (line + bead) on the right edge of scrapbook gifts; it looked like a control.
- Screenshot helper `tools/screens/multi.js`: several shots in one browser from a JSON plan.

## Session 8 (16 Oct 2026): light, material and depth on the openings (branch `openings-depth`)

**The kit: `src/themes/_shared/light.tsx`.** One key light for every theme (up, left, a little in front),
so shadows fall down-right and highlights sit on top-left edges. Everything follows the tilt.
- `Object3D`: a real preserve-3d stage with a resting pose; the tilt turns it a few degrees more.
  `settle` turns it square to the viewer (used when words appear, so text is drawn sharp again).
- `FaceLight`: Lambert shading for one face of an `Object3D`, recomputed as the object turns.
- `Extrude`: thickness for flat things (paper, plinths): thin slices behind the face.
- `FloorShadow`, `ContactShadow`, `Sheen` (a specular band that glides with the tilt), `LightPool`,
  `LightShaft` (window light with dust motes), `elevation()`, `rim()`, `pressed()` (letterpress).
- `Texture` / `TEXTURE` / `TEXTURE_SOFT`: static SVG noise materials (paper, card, vellum, linen, felt,
  wood, kraft, brushed metal, grain). Calibrated in a browser; the paper one is formation clouds, not fibers.
- `LightDefs`: SVG lighting filters `jb-gloss` (wax, ribbon), `jb-puff` (felt), `jb-emboss`. Only used on SVG
  content (Safari ignores url() filters on HTML). `IconGlyph` takes `material="felt"` (relief + stitches).
- `ParallaxRoot` has an idle `drift`: when nobody moves for 1.8s the tilt sways slowly, so light keeps
  moving on phones without tilt and in previews. Off under reduced motion and when paused.
- Icon-set sprinkles now sit at three depths (far and soft, mid, a few big out-of-focus ones in front).

**Per theme**
- Valentine: envelope lying on linen in 3D, paper thickness, floor shadow, rose tissue liner with pressed
  hearts inside the flap, glossy wax seal (`jb-gloss`), window light with dust. Settles flat when the letter rises.
- Anniversary: the deck lies back in real perspective (walnut plinth 22px thick, raised brushed platter,
  tonearm with its shadow on the record, vinyl sheen that swings with the tilt, an amber "on" light). The
  lamp beam with dust comes up with the music. Drag math divides by cos(pose) for the foreshortening.
- Birthday: tiers are cylinders seen from above (elliptical frosted tops, round shading, curved bottoms),
  a porcelain plate with thickness, candlelight on the tops that breathes. The room is candlelit (amber)
  until the candles are out, then the lights come up.
- Wedding / Bridal: cotton card with letterpress border and greeting, foil monogram, vellum sleeve with
  body and texture, woven belly band, light shaft. The card now comes forward to the middle and settles flat.
- Christmas / default: a real 3D box (four sides, inside floor, a lid with its own sides, floor shadow),
  each face lit by `FaceLight`. Untie: bands slip off, the lid flies, the sides fall open like petals around a
  warm light with slow rays. The rope follows the knot on the lid wherever the box has turned, and draws
  straight into the SVG (no React render per frame). Fixed: the default theme's greeting and button were
  white on white.
- Baby: felt shapes with plush relief and stitched edges, the mobile's shadow on the wall, moonlight with
  dust, quilted mattress, wood rails, a skirting line.
- New Year: stars at three depths that twinkle, a city skyline (two rows, lit windows, a few blinking),
  each firework lights the sky around it and catches the rooftops, numbers cut from metal, engraved ring.
- Bon Voyage: the pass held at an angle in 3D with card texture and sheen, sun glow, clouds at three
  depths with one out-of-focus cloud drifting past in front.
- Pets: a real floor in perspective (honey oak boards to a vanishing point), window light in four panes on
  the floor and a beam with dust, braided rug with thickness, the pet's shadow stays on the floor when it
  hops, glossy felt ball, gift box with a top.

**Performance.** Nothing repaints per frame (checked with a trace: 0 Paint, ~1ms raster over 3s). Rules
that got it there: blur the leaf, never a container whose children move; no blend modes in the kit
(plain alpha looks the same here); will-change only while the tilt can move (`useTilt().live`).
In the cloud browser (software GPU) the 3D themes run at 20 to 40fps; real GPUs are fine.

**How to check:** dev-only `/dev/openings?kind=<theme>` (add `&auto=1` to play the gesture by itself),
and `tools/screens/openings.js` for phone and desktop shots of every theme, at rest and late in the story.

## Sessions 6 and 7 (16 Oct 2026): PRs #7 and #8, both merged

**PR #7 `polish-examples`**
- **Characters** (`src/themes/_shared/cast/library.tsx`) redrawn: dog (wagging tail, `.jb-wag` in
  `src/styles/play.css`), cat, bunny, bear, duckling, frog, person, cup, plant, cloud, moon. New
  `{ type: "none" }` character ("No one" in `CastPanel.tsx`). `THEME_DESIGNS.defaultCharacter` in
  `_shared/design.ts` is now `string | null`: valentine, anniversary, wedding, bridal, christmas, newyear
  and voyage default to none; birthday bear, baby duck, pets dog, default mascot.
- **Icons** (`_shared/iconSets.ts`): real path glyphs PAW, BONE, FISH, FLOWER, DAISY, LEAF, TULIP, SNOW
  (holes drawn counter-clockwise, nonzero fill). Dev-only page `/dev/cast` shows every character and set.
- **Example gifts** (`src/lib/demoGifts.ts`): Ana (30th, birthday), Sam (Bon Voyage), Milo (pets),
  Nora & James (wedding). Every section filled with details that agree with each other (quiz answers
  match map pins, etc.). Media in `public/demo/`: illustrated photos (webp), doodles (png), short videos
  (mp4), voice notes (mp3). How they were made: `tools/README.md`.
- **Scroll motion** (`src/components/ScrollStory.tsx`, mounted in `GiftSiteView` after `SkinDecor`):
  finds the nearest scrolling parent (or window), keeps a motif layer pinned to the viewport with JS
  (CSS sticky can't work inside `.sk-decor`'s overflow hidden), and moves a per-theme motif with scroll
  progress and speed: voyage plane + clouds, birthday balloons, pets paw-print trail, anniversary turning
  record, everyone else the gift's own icons drifting at depths. Plus a thin reading thread on the right.
  Off under reduced motion. Not shown in `sectionsOnly` previews.
- **Portal reveal** (`src/themes/_shared/opening.tsx`): when an opening finishes, a radial mask hole grows
  from the object (motion value `hole` → `maskImage`, ~1s) while the shell scales up, revealing the gift
  underneath. `GiftPage.tsx` now keeps the gift mounted (inert, fixed) under the intro so there's no blank
  flash. `onDone` fires at 1050ms.
- **Gallery** (`OpeningCard.tsx` + new `GiftPeek.tsx`): each card's opening loop ends on a glimpse of a
  finished gift (name + three notes in the theme's palette and fonts), also behind the full-screen preview.
- **Landing hero** (`landing/FormatDemo.tsx`): no more format cycling. After the candles are blown it gives a
  guided tour: glides to each `.sb-section`, lingers, shows a floating label with the section name, back to
  the top, repeats. Any touch hands control to the visitor.
- **Landing bento** (`landing/SectionsBento.tsx` + new `landing/MoreTiles.tsx`): 14 live tiles. New ones:
  open-when envelopes, locked capsule with a real countdown, awards vote race, quiz, map drawing its route,
  tear-off coupon, video clip, doodle pad you can draw on. Copy in `strings.ts` (`LANDING.inside.tiles`).
- **Container queries**: section grids in `GiftSiteView` and `NewSections` use `@xl:` instead of `sm:`, so
  gifts inside phone mockups lay out like phones (they were using the laptop's width before).
- Smaller: polaroid backs no longer stretch the grid, video cards start at `#t=1.6` (no blank first frame),
  memory map rebuilt (route draws through pins, place chips), `formatMoment` shows the year when it isn't
  this year, `/example/$id?open=1` skips the opening.

**PR #8 `section-previews`**
- **Theme page** (`src/routes/themes.$id.tsx`): "Try the sections" card lists every section as a chip.
  Turning one on adds it to the sample gift with sample notes and glides the phone to it (`data-section`
  attributes on every section). "Turn them all on" and "Back to the theme's picks". The stage is sticky on
  desktop; on phones the page scrolls back to the gift. The tried set goes to `/create` as
  `?sections=a,b,c` (new search param; every `navigate`/`Link` to `/create` must pass `sections`).
- **Create page** (`src/routes/_authenticated/create.tsx`): the step 5 preview is now `SectionPreview`
  (`src/components/SectionPreview.tsx`): the real section, rendered by `GiftSiteView` with the new
  `sectionsOnly` prop (no header, footer or scroll motif), in the chosen theme and its first suggested
  palette, with sample notes, interactive. `ModuleExample.tsx` is no longer used on that page.
- **Sample notes** for every section (`src/lib/sampleSections.ts`, `sampleNotes(recipient, siteId)`),
  written to fit any occasion; songs, calendar, tree and countdown use the existing `sample` placeholders.
  New neutral clip `public/demo/video-generic.mp4` ("From all of us, with love").
- Memory map pin labels near an edge lean inwards so they aren't cut off on narrow screens.

**Not done yet (ideas Janelle liked or asked about)**
- (Done in session 8: the per-theme lighting / material / depth pass on the openings.)
- Theme preview images, real Rive characters, real-phone gesture check (iOS Safari).
- Lots of older screens still have inline copy (move to `strings.ts` when touched).

## Session 5 is done (15 Oct 2026): theme system, gallery, landing, new sections

Four PRs, merge in order: **#3** Just me → **#4** `theme-system` (Phases 1–2) → **#5** `themes-gallery`
(Phase 3) → **#6** `landing-sections` (Phase 4). Each branch sits on the one before.

**Theme system (`src/themes/`).** Every theme opens like a real object, with a gesture and a plain
button that does the same: Valentine's envelope (hold the seal), Anniversary record (drag the needle),
Birthday cake (blow or tap candles), Wedding/Bridal invitation (slide it out of the vellum), Baby Shower
mobile (pull the string), Christmas present (pull the ribbon, rope physics), New Year (hold to count
3-2-1, the name appears in canvas sparks), Bon Voyage boarding pass (tear the stub, a stamp per friend),
Pets (stroke the pet, it runs off and brings the gift). Registry: `src/themes/TactileOpening.tsx`
(`OPENINGS`). Shared stage: `_shared/stage.tsx` (springs, `useBeats` with a dev-only `window.__jbBeat`
freeze for screenshots, haptics, grain, parallax, `useHold`, `FallbackButton`), `_shared/opening.tsx`
(shell, sound toggle, skip). Fonts and materials per theme: `_shared/design.ts` (`THEME_DESIGNS`). The
old 3D opening is "Classic" in the Intro panel (`intro_settings.opening = "classic"`).

**Cast.** `gift_sites.character` and `gift_sites.icon_set` (jsonb, migration 0007). Editor panel
"Cast" (`src/components/CastPanel.tsx`): Characters, Customize, Upload (die-cut sticker), Sprinkles,
Surprise me. Every particle in openings and on the gift page comes from the icon set. How to swap the
placeholder characters for Rive: `docs/characters.md`.

**Gift body.** Notes are themed (`_shared/NoteCard.tsx`). Font pairing `theme` is the new default
(0008); Caveat and Permanent Marker are gone.

**Gallery** (`/themes`, `src/components/OpeningCard.tsx`): each card plays its real opening on hover or
when on screen, tap for full screen and do it yourself, one "Use this theme" button.

**Phase 4.**
- Landing (`src/routes/index.tsx`): hero phone is "Ana's 30th" (12 friends), closed until you open it,
  then cycles formats; "See the full gift" → `/example/ana`. Sections bento with live mini-demos
  (`landing/SectionsBento.tsx`), example gifts row (`landing/ExampleGifts.tsx`). Personas live in
  `src/lib/demoGifts.ts` (Ana, Sam, Milo, Nora & James); `/example/$id` opens any of them.
- **All landing and new-section copy is in `src/copy/strings.ts`.** Older screens still have inline copy.
- New sections (`src/lib/sections.ts`, renderers `components/sections/NewSections.tsx`, form fields
  `components/sections/SectionFields.tsx`): open-when letters, time capsule, superlatives, quiz, memory
  map, coupon book, video messages, doodle guestbook. Extra fields go in `contributions.data` (jsonb,
  migration 0010), cleaned by `normalizeSectionData` on the server. A time capsule's text and photo stay
  on the server until it opens (`sealCapsule` in `api.ts`). Tile formats show them as notes, plus a
  video/quiz block underneath; the comic gives them chapters.
- Chip-in fund: **data model only** (`gift_funds`, `fund_pledges`, provider-agnostic, minor units +
  currency). Shown as "Coming soon". No payment code.
- Presets: `src/lib/presets.ts` picks each occasion's starting sections; the rest sit under "Add more"
  in /create and the editor.
- Time zones: `src/lib/time.ts`. Countdowns are a UTC moment (`gift_sites.countdown_at`, migration 0009,
  old gifts backfilled to Manila midnight) shown in the viewer's zone. Calendar doors and tree reveals
  open at the viewer's local midnight. Dates and money go through Intl.

Worth a look next: real-phone check of every gesture (iOS Safari especially: mic, tilt permission,
haptics are Android-only); the comic format still uses Bangers/Comic Neue on purpose; real Rive
characters; moving older screens' copy into `strings.ts`; chip-in fund once a provider is chosen.

## Session 4 is done (15 Oct 2026, PR from `redesign`)

All six asks are in. What changed and where:

1. **Phone fit.** `GiftIntro` is a size container (`[container:gift/inline-size]`, cqi units), so the
   opening fits any preview. Scrapbook heading uses cqi. Format roots clip sideways overflow (the Zine
   stickers caused a 368px scroll at 360). Header fits 360px. Audited 360/390/430 and landscape on every
   page: no horizontal scroll. Comic cover subtitle now follows the occasion (no more "birthday issue" on
   Valentine's).
2. **Phone / Laptop previews.** `src/components/DevicePreview.tsx` (`DevicePreview`, `DeviceToggle`).
   Laptop lays the gift out at a real 1280x800 and scales it down. The screen uses `contain: layout paint`,
   so fixed sheets, comic covers and confetti stay inside the preview. Used on the theme page, editor canvas,
   editor full screen, landing demo and contribute page.
3. **Intro-first previews.** `src/hooks/useGiftTour.ts`: the opening plays, opens itself (~4.6s), the gift
   scrolls, holds, loops. Any touch hands control over; "Pause the tour" / "Play the tour". Theme cards
   (`ThemeLivePreview`) do the same with the real `GiftIntro` (`quick`, `paused`, `interactive={false}`,
   stills only). `Pause3DContext` holds the gift's 3D scene while its opening covers it.
4. **Four new formats**: Storybook (3D page turns, drag a page by its edge, spreads on wide screens),
   Mixtape (cassette, reels spin, drag a reel to scrub, flip to side B), Scratch Cards (canvas foil,
   remembered per device), Constellation (tap stars, lines connect into a heart). Files in
   `src/components/formats/`, styles in `src/styles/formats2.css`, picker minis in `FormatPicker.tsx`.
   Celebration and Keepsake get all 9 formats; Sweet unchanged.
5. **Custom intros.** `gift_sites.intro_settings` jsonb (migration `0005_intro_settings.sql`), cleaned by
   `normalizeIntroSettings` in `src/lib/intro.ts`, saved by `updateIntroSettings` (requireSiteOwner).
   Upload kind `intro` (owner only, images, no SVG). Editor Intro panel = `IntroDesigner.tsx`; while it's
   open the canvas shows the live opening and stickers can be dragged into place.
6. **Playful themes.** `src/lib/play.ts` (bursts, synthesized chimes behind a sound toggle, haptics).
   3D objects: tap to react (per-occasion move: heartbeat, globe spin, lights twinkle…), drag to spin,
   5 taps for a secret. Gift pages: catch falling particles, tap lights and bunting, parallax with pointer
   or tilt, polaroids flip for the caption, birthday "Make a wish" with tap or mic blow-out
   (`SkinPlay.tsx`). Reduced motion keeps all of this calm.

Not done / worth a look next: re-render `public/themes3d/*.webp` if scenes change; real-phone check of
mic blow-out on iOS Safari; Sweet plan maybe gets Storybook too (her call).

## Session 4 brief (kept for reference, the branch notes are out of date)

The redesign is **live on justbecause.site** (PR #1 merged `redesign` into `main`). At the time work went on
`redesign` with a PR to `main`; now use a fresh branch off `main` instead. Claude's own pushes to
`main` get blocked as production deploys, so always go through a PR (use `gh api`, GraphQL is blocked).

### Janelle's asks for this session, in order

1. **Everything must fit on phones (bug).** Her screenshot: on the theme page, "The opening" tab inside
   the phone mockup overflows ("SEALED WITH LOV", "For Ana" cut off, giant hearts). Cause:
   `src/components/GiftIntro.tsx` sizes with viewport units (`w-[min(560px,88vw)]` on the 3D stage,
   `text-[clamp(2rem,8vw,3.5rem)]` on the greeting), so inside a 390px phone preview on a laptop it uses
   the laptop's width. Fix: make the intro root a size container (`container: gift / inline-size`) and
   switch to `cqi` units, like `src/styles/formats.css` and `skins.css` already do. Then audit every
   preview context: theme page phone, editor phone/desktop preview, full-screen preview, landing demo
   phone (`FormatDemo`), contribute preview, theme cards (`ThemeLivePreview`). Test at 360, 390 and
   430px wide, landscape, and a real iPhone if possible. No horizontal scroll anywhere.
2. **Laptop preview option** on the theme page (and anywhere there's a phone preview): a Phone / Laptop
   toggle like the editor's full-screen preview has. Laptop = a laptop frame at a real 1280px width,
   scaled down to fit.
3. **Preview videos start with the opening.** Theme cards and the theme page phone should play: the
   opening animation, it opens by itself after ~2s, then auto-scroll through the gift, then loop.
   `ThemeLivePreview.tsx` has the timeline (`INTRO_MS`, `SCROLL_MS`) and a disabled `MiniIntro`
   (`SHOW_MINI_INTRO = false`). Replace that with the real `GiftIntro` in `contained` mode (stills only,
   `Live3DContext` false so cards don't each open a WebGL context).
4. **More formats, very advanced and cute.** Today: Scrapbook, Comic Issue, Bento Board, Gift Hunt,
   Zine (`src/lib/formats.ts`, `src/components/formats/`, register plans in `src/config/pricing.ts`).
   Ideas to pick from: Storybook (3D page-turn book), Photo Booth Strip (notes as booth strips that
   print out), Arcade (claw machine: each prize is a note), Snow Globe / Shaker (shake the phone or drag
   to reveal notes, DeviceMotion with a tap fallback), Constellation (each friend is a star, tap to
   connect and read), Mixtape (cassette player, notes as tracks with the songs), Sticker Book (drag
   sticker notes onto a page), Advent Doors (open one door per note), Scratch Cards (scratch to reveal),
   Polaroid Wall with a clothesline you drag. Each needs a picker mini preview (`FormatPicker.tsx`),
   container-query layout, reduced-motion fallback, and keyboard access.
5. **Custom intros.** Let the creator customise the opening: pick or upload their own icon/sticker
   (emoji, upload an image, or choose a 3D object), change its colors, background, and the button text.
   Store in a new `intro_settings` jsonb on `gift_sites` (add to `schema.ts`, `bun run db:generate`,
   commit the migration; Vercel runs it on deploy), expose it through `api.ts` with `requireSiteOwner`,
   edit it in the editor's Intro panel with a live preview. Uploads go through the existing
   `src/lib/upload.ts`.
6. **Themes even more advanced, cute and interactive.** The goal: designs Canva can't do. Lots of
   interaction, movement and playfulness. Current state: 3D object per occasion
   (`src/lib/theme3d/scene.ts`), skins (`src/styles/skins.css`, `SkinDecor.tsx`). Ideas: tap the 3D
   object to make it react (balloons pop into confetti, the heart beats, the globe spins, the tree
   lights up, the disco ball scatters light), drag/flick particles, cursor or tilt parallax, letters
   that open like envelopes, photos you can flip for the caption, a sound toggle with small chimes,
   haptics on phones (`navigator.vibrate`), a "make a wish" candle blow-out (mic or tap) on birthdays,
   catching snowflakes on Christmas. Keep every animation transform/opacity, pause off screen, and
   respect prefers-reduced-motion.

Finish by testing everything in a real browser (setup below), on phone sizes too, then send Janelle the
preview link and a short summary. She wants it finished and polished when she opens it.

## Links

- Repo: https://github.com/janellereonal/just-because (branch off `main`, open a PR; `redesign` is retired)
- PR previews: `https://just-because-git-<branch>-just-because1.vercel.app` (Vercel comments it on the PR;
  sign in with an account on the "Just Because" team)
- Live site, `main` branch: https://justbecause.site
- Vercel project: https://vercel.com/just-because1/just-because

## Rules (from Janelle)

- `main` is the live site (justbecause.site). Never push to it. Work on a branch off `main` and open a PR;
  Janelle merges.
- Run `npx tsc --noEmit` and `NITRO_PRESET=node bun run build` before every push.
- Never touch PayMongo keys or set `PAYMONGO_ALLOW_LIVE`. Never paste secrets into chat or code.
- Copy voice: plain and friendly, say gift/note/friends/open, no em dashes, max one exclamation mark per screen.
- No hopping/talking mascot on recipient gift pages (`/g/...`).
- three.js stays lazy-loaded and pauses off screen. Animate transform/opacity in the DOM.
- prefers-reduced-motion: no hops or flips.
- Janelle likes short, casual updates. Make sensible calls and say what you chose.

## Read first

1. `CLAUDE.md` (stack, data rules, payments)
2. `HANDOFF.md` section **0** (links, how work ships, rules, open work), then **1b** (the mascot)
3. The top of this file (sessions 6 and 7)
4. `tools/README.md` (screenshots in a real browser, demo media)
5. `docs/mascot-brief.md` and the header of `src/lib/mascot/controller.ts` when touching Bo

## Done in session 2 (14 Oct, overnight)

Tested everything in a real Chromium where animation runs (see "How to test" below), fixed what broke,
then redesigned.

**Bugs fixed**
- Bo stood on top of the field you were typing in (and his body covered the field above). Now he
  stands beside the form, level with the field; on phones he stays on his perch and bobs.
- Bo got stuck invisible (opacity 0) after leaving a perch inside a scroll box (editor sidebar).
- Bubbles covered the Sign out button and fields. They now avoid the sticky header (`data-bo-avoid`),
  slide sideways to stay on screen, pick the least-bad spot, and re-pick after a hop.
- Visually hidden radios (format picker) no longer count as focus perches.
- Countdowns used the viewer's timezone; now Asia/Manila midnight everywhere (`manilaMidnight`).
- Live countdown clocks caused hydration warnings (`suppressHydrationWarning` on the ticking text).
- The Birthday preview showed a "Merry Christmas" sample letter.
- 404s for `/models/bo.glb` on every page: the 3D Bo now only asks for Spline files that actually ship
  (list built at build time in `vite.config.ts`, `__BO_MODEL_FILES__`).
- Voice note card said "Loading audio…" forever when a note had no file.
- Theme cards nested buttons (React warning). The card is a `role=button` div and the live preview is `inert`.
- Em dashes removed from page titles and note signatures.

**New**
- **Landing intro** (`src/components/landing/LandingIntro.tsx`, styles in `src/styles/landing.css`, classes
  `lp-intro*`): once per browser session, about 3s, skippable (click, Esc, scroll). Bo waves, the wordmark
  types in, his lid pops, notes fly out, the box splits open onto the site. A pre-paint inline script sets
  `html[data-intro]` so returning visitors never see a flash. Failsafe hides it at 8s if JS never runs.
  Careful: the recipient's opening animation (`GiftIntro.tsx`) uses `jb-intro`, so never reuse that name.
- **Product-first landing** (`src/routes/index.tsx`): hero with a real sample gift in a phone and a format
  switcher (`FormatDemo.tsx`, data in `src/lib/demoGift.ts`, photos in `public/demo/`), occasions marquee,
  how it works with little UI vignettes, what friends can add, formats, themes, plans, FAQ, closing CTA.
- **Three new formats** (registry `src/lib/formats.ts`, renderer switch `src/components/formats/FormatView.tsx`):
  - Bento Board: tiles, mesh gradient, tilt and shine on hover, tap a tile to open it.
  - Gift Hunt: every note is a wrapped box (candy patterns), unwrap them all, progress bar, stickers,
    confetti finale. Progress is remembered per device (`localStorage`, `jb-hunt-<siteId>`).
  - Zine: ransom-note name, marquee of friends, taped cut-outs, xerox photos, stickers, variable-weight words.
  - Shared: `src/lib/giftPieces.ts` (pieces, samples, Manila dates), `PieceSheet.tsx` (open a piece).
  - The format column is plain text, so no migration. Plans: Sweet gets Scrapbook + Bento; Celebration and
    Keepsake get all five (`src/config/pricing.ts`). Formats lay out with container queries (`container: gift`,
    `cqi` units), so they look right in phone previews too.
- **Scrapbook upgrade** (every theme): taped letters with handwritten signatures, tilted polaroids, digit-tile
  countdown, sections rise in on scroll (IntersectionObserver; nothing is hidden without JS).
- **Toybox restyle**: `/create` (numbered steps, theme cards, format picker, switches, sticky create bar,
  Bo walks down the steps on sticky side perches), dashboard (gift cards in each gift's colors, copy the
  friends link, empty state with Bo peeking), contribute (guest-facing copy, icon tabs), editor (Format tab,
  dotted canvas), sign-in (split layout, labeled fields), header (New gift + quiet sign out, mobile links), 404,
  checkout status (pastel card, confetti when paid).
- Theme page: "See it as" previews the theme in any format; "Use this theme" carries theme and format
  into `/create` (`?theme=…&format=…`).

## Still not verified

- Checkout redirect to PayMongo: needs a test key on the preview. The wrap animation itself was measured at
  ~1s and runs alongside the checkout request.
- Real fonts in screenshots: the test sandbox blocks Google Fonts, so Fredoka, Caveat, Bangers and
  Bricolage Grotesque were never seen in my screenshots. They're loaded in `__root.tsx`.
- A real phone (touch drag/flick on Bo, iOS Safari container queries are fine on iOS 16+).

## Open questions for Janelle

- The **still** 3D Bo is still on recipient pages: the gift opening (`GiftIntro.tsx`), the "Made with Just
  Because" footer, ornament popups and the password/ended screens. Keep or remove?
- Should Sweet get Bento (current choice) or Scrapbook only?
- A Spline version of Bo exists in her Spline app (file "Untitled"). If exported to `public/models/bo.glb`
  it's used automatically.

## How to test (what this session did)

No real database needed. In the cloud workspace:

```bash
sudo service postgresql start
sudo -u postgres psql -c "create user jb with password 'jb' superuser;" -c "create database jb owner jb;"
# .env (never commit): DATABASE_URL=postgres://jb:jb@localhost:5432/jb, same for _UNPOOLED,
# BETTER_AUTH_SECRET=<anything long>, BETTER_AUTH_URL and APP_BASE_URL=http://localhost:8080
set -a; . ./.env; set +a; bun run db:migrate && bun run db:seed
bun run dev   # or: NITRO_PRESET=node bun run build && PORT=3000 node .output/server/index.mjs
```

Browser: the Playwright Chromium download is blocked, so use `@sparticuz/chromium` from npm as
`executablePath` with `--use-gl=angle --use-angle=swiftshader` (WebGL works, slowly). Sign up a test user
through `/auth`, then drive `/create`, the editor and `/g/<slug>`. In dev, `window.__bo` is the mascot
controller: read `__bo.state`, the `.bo-bubble` element and Bo's wrapper rect to check overlaps.

## Local setup (Mac)

```bash
git clone https://github.com/janellereonal/just-because.git   # or: git pull
cd just-because && git checkout main && git pull
bun install
```

- `.env` needs `DATABASE_URL` (ask Janelle, never guess or commit it). See `.env.example`.
- `bun run dev` → http://localhost:8080
- `bun install` changes `bun.lock` on her Mac. That change was left uncommitted on purpose.

## Handy tricks

- `createBoScene(...).snapshot()` renders one frame to an image data URL. That's how `public/bo/*.webp`
  were made (480x480 canvas, `{ cute: false, followPointer: false }`, then `setPose`/`setFace`/`setMood`).
- Vercel preview status for a push: `gh api repos/janellereonal/just-because/deployments` then
  `gh api repos/janellereonal/just-because/commits/<sha>/status`.


## Re-rendering the theme 3D stills

With the dev server running, in Playwright (Chromium with WebGL): open any page, then for each kind
`const m = await import('/src/lib/theme3d/scene.ts')`, make a 960x600 canvas, call
`m.createThemeScene(canvas, kind, palette, { still: true }).snapshot()` and save the data URL to
`public/themes3d/<kind>.webp`. Use each theme's first suggested palette. Bump `STILL_VERSION`.
`tools/screens/stills.js` does this for you: `node stills.js <outdir> game:FFF6E5:22305E:D93A33`, then save
the PNGs as WebP (quality 86).
