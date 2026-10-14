# Next session: picking up the Just Because redesign

Written 14 Oct 2026 at the end of a Claude Code session, so a new session (or a new Claude account)
can carry on without missing anything.

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
2. `HANDOFF.md` section **1b** (the redesign and everything the mascot does now)
3. `docs/mascot-brief.md` (the original behavior brief)
4. `src/lib/mascot/controller.ts` header comment (how perches and `data-bo-*` attributes work)

## What's done (all pushed to `redesign`)

- Pastel "toybox" look, Fredoka + DM Sans, new landing, theme gallery (earlier sessions).
- **3D Bo** built in code: `src/lib/bo3d/scene.ts`. Real hollow lid, opening in the box, cute faces
  (wink, happy, blep, love, surprised, dizzy, sleepy, yawn), eyes follow the pointer, random blinks.
- 8 theme accessories on the lid (`src/lib/bo3d/accessories.ts` maps themes to them).
- Every flat SVG Bo replaced by 3D stills: `public/bo/*.webp`, used by `src/components/Bo.tsx`. 3D favicons.
- **Hopping Bo** (`src/components/BoBuddy.tsx` + `src/lib/mascot/controller.ts`) on the landing page,
  /create and the editor. Pages talk to him through `src/lib/mascot/bus.ts`.
- **TalkingBo** (`src/components/TalkingBo.tsx`): the hero and theme gallery Bo introduce themselves
  and react to taps. Hero paper scraps: `src/components/HeroScraps.tsx`.
- All 5 brief steps: scroll hops, hero transition, accessories + page reactions + bubbles,
  quirks/easter eggs (tap, 5-tap dizzy, drag/flick, sleep, hidden-tab title, first-gift party,
  "Wrap it up" before checkout), reduced-motion and mobile pass.
- Tuning knobs: `TUNING` at the top of `src/lib/mascot/controller.ts`.

## Not verified yet (do this first)

The previous session never saw anything animate: the in-app browser pane stayed hidden, which stops
animation. Logic was checked by stepping the controller by hand, and looks were checked from still
renders. Please test in a real, visible browser:

1. Landing page: hero intro bubble, tapping Bo, the draggable scraps, the hopping Bo all the way down.
2. **/create, the editor (/sites/:id) and the dashboard were never run at all.** They need a login and
   a database. Check: Bo hops to focused fields, reactions (name, theme, comic/scrapbook), the
   recipient-name line, the Invite wave, "Wrap it up" → plan → checkout (the wrap must never take over ~1s),
   the first-gift celebration, and the dashboard peek with no gifts.
3. A phone-size viewport and reduced motion.

## Open questions for Janelle

- The **still** 3D Bo is still on recipient pages: the gift opening animation (`GiftIntro.tsx`), the
  "Made with Just Because" footer (`GiftSiteView.tsx`), ornament popups (`GiftTree.tsx`), and the
  password/ended screens (`GiftPage.tsx`). This was there before the redesign. Remove or keep?
- Janelle likes the code-built Bo, so no Spline export is needed. A Spline version exists in her Spline
  app (file still named "Untitled", she should save it). If she ever exports it to
  `public/models/bo.glb`, the site switches to it automatically (accessories as `acc_*` nodes, or
  `public/models/accessories/<name>.glb`). Then re-render the stills (below).

## Next work

- Restyle /create, the editor, dashboard and contribute pages in the toybox look (HANDOFF.md says so too).
- Fix anything the testing above turns up.

## Local setup

```bash
git clone https://github.com/janellereonal/just-because.git   # or: git pull
cd just-because && git checkout redesign
bun install
```

- `.env` needs `DATABASE_URL` (ask Janelle, never guess or commit it). Without it the site runs, but
  themes don't load and you can't sign in. See `.env.example`.
- `bun run dev` → http://localhost:8080
- `bun install` changes `bun.lock` on this Mac. That change was left uncommitted on purpose.

## Handy tricks from last session

- In dev, the hopping Bo's controller is on `window.__bo`. You can step it by hand
  (`__bo.frame(t)`, `__bo.tap(t)`, `__bo.onScroll()`) when animation frames aren't running.
- `createBoScene(...).snapshot()` renders one frame to an image data URL. That's how `public/bo/*.webp`
  were made: create a scene on a 480x480 canvas with `{ cute: false, followPointer: false }`, call
  `setPose`/`setFace`/`setMood`, snapshot, save. Poses used: idle (smile), hello (wave + wink),
  delivery (hold + happy), carry (hold + run, turn 0.35), walk (run, turn 0.35),
  surprise (lid 0.42, cheer 0.85, surprised), published (lid 0.35, cheer 1, tuck 0.5, love), happy.
- Vercel preview status for a push: `gh api repos/janellereonal/just-because/deployments` and then
  `.../deployments/<id>/statuses`.
