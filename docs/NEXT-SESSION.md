# Next session: picking up the Just Because redesign

Updated the night of 14 Oct 2026 (second session), so a new session can carry on without missing anything.

## Links

- Repo: https://github.com/janellereonal/just-because (work on branch **`redesign`**)
- Preview of the newest `redesign` push (always current): https://just-because-git-redesign-just-because1.vercel.app
  (Vercel asks you to sign in with an account on the "Just Because" team)
- Live site, `main` branch, do not touch: https://justbecause.site
- Vercel project: https://vercel.com/just-because1/just-because

## Rules (from Janelle)

- Never push to `main` (it's the live site). Push to `redesign` only.
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
