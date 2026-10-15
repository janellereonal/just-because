# Next session: picking up the Just Because redesign

Updated 15 Oct 2026 (session 4), so a new session can carry on without missing anything.

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

## Session 4 brief (kept for reference)

The redesign is **live on justbecause.site** (PR #1 merged `redesign` into `main`). Work on `redesign`,
check the preview, then open a PR `redesign` -> `main` for Janelle to merge. Claude's own pushes to
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

- Repo: https://github.com/janellereonal/just-because (work on branch **`redesign`**)
- Preview of the newest `redesign` push (always current): https://just-because-git-redesign-just-because1.vercel.app
  (Vercel asks you to sign in with an account on the "Just Because" team)
- Live site, `main` branch, do not touch: https://justbecause.site
- Vercel project: https://vercel.com/just-because1/just-because

## Rules (from Janelle)

- `main` is the live site (justbecause.site). Work on `redesign`, check the preview, then fast-forward
  `main` only when Janelle says to put it live (she did on 15 Oct).
- Run `npx tsc --noEmit` and `NITRO_PRESET=node bun run build` before every push.
- Never touch PayMongo keys or set `PAYMONGO_ALLOW_LIVE`. Never paste secrets into chat or code.
- Copy voice: plain and friendly, say gift/note/friends/open, no em dashes, max one exclamation mark per screen.
- No hopping/talking mascot on recipient gift pages (`/g/...`).
- three.js stays lazy-loaded and pauses off screen. Animate transform/opacity in the DOM.
- prefers-reduced-motion: no hops or flips.
- Janelle likes short, casual updates. Make sensible calls and say what you chose.

## Read first

1. `CLAUDE.md` (stack, data rules, payments)
2. `HANDOFF.md` section **1b** (the redesign, the mascot, tonight's work)
3. `docs/mascot-brief.md` (the original behavior brief)
4. `src/lib/mascot/controller.ts` header comment (perches and `data-bo-*` attributes)

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
cd just-because && git checkout redesign
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
