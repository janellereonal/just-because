# The Theme Bible

How Just Because themes are made, the bar every theme has to clear before it ships, and where each current
theme stands against that bar.

Our edge: other group gift products put a background behind a grid of messages, or make a still card or a
video montage. Ours are **physical objects people open with a gesture**: blowing out candles with the mic,
pressing a wax seal, tearing a boarding pass. Every theme should feel like that object is in your hands.

## The 8 checks

Every theme must pass all eight before it ships.

1. **A real object.** A cake, an envelope, a box, a parol, not an abstract background. You should be able to
   say what it is in three words.
2. **A gesture that fits the occasion.** You blow out birthday candles, crack a wedding seal, untie a
   Christmas ribbon. The gesture should be the thing people already do with that object.
3. **Personal inside the object.** The person's own details are part of the object, not floating above it:
   their name on the boarding pass, their real age in the candles, their monogram on the seal, friends' names
   as stamps.
4. **A clear payoff moment.** One moment of sound, light and motion that says "it's open".
5. **Sound and haptics, subtle and mutable.** Off until the viewer turns sound on. Short, quiet, made for the
   material (paper tears, wax cracks, bells ring). Haptics only on phones that support them, never before the
   first tap.
6. **Works with every format.** The opening hands off cleanly to every gift format (scrapbook, bento, hunt,
   zine, storybook, mixtape, scratch, stars). Comic shows its own cover instead of an opening.
7. **Meets the performance budget on a mid-range Android phone.** See "Performance budget" below.
8. **Handles the hard cases.** Long names (40 characters with an apostrophe, an ampersand and an emoji),
   reduced motion, a missing photo, no friends yet, empty optional fields. Every gesture has a plain button
   that does the same thing, and works with a keyboard.

## Building a theme on the engine

New themes use the theme engine in `src/themes/engine/`. Existing themes stay as they are until after launch.

| Part | Where | What it gives you |
|---|---|---|
| Gestures | `gestures.ts` (`useGesture`) | tear, peel, pull, untie, blow, shake, scratch, hold, slide, spin, unfold, pop, wipe. Each works by touch, mouse and keyboard, has a reduced-motion path, and takes taps where a sensor isn't available (blow, shake). The maths is in `core/progress.ts`, tested with `bun test`. |
| Materials | `materials.ts` (`material()`) | paper, cardboard, wax, foil, fabric, glass, capiz, frost, wood, metal. Lit by the house key light (top left), with inline noise textures, so nothing downloads. |
| Effects | `particles.ts` | confetti, petals, snow, sparks, dust. Off under reduced motion. Confetti and sparks use the gift's own sprinkles when it has them. |
| Sound and haptics | `sound.ts` | Sound packs per material (paper tear, tape pull, wax crack, ribbon pull, bell, glass), all synthesised, all silent until the viewer turns sound on. `haptic.tick / tap / thud / success`. |
| Personalisation | `slots.ts` (`resolveSlots`) | recipient, age, date, place, sender's place, photo, monogram (letters only), two accents. Every slot has a fallback; `given` says which were real. |
| Definition | `define.ts` (`defineTheme`) | One config per theme: object, gesture, materials, effects, sound, slots, palette, fonts, categories, regions, price band, per-format handoff, assets, status and flag. `validateTheme` lists problems in plain words. |
| Stage | `EngineStage.tsx` | Runs a theme inside the shared opening shell (background, grain, sound toggle, hint, Skip), loads its fonts and its object on demand, and adds the plain button. |
| Strings | `src/i18n/` (`t()`) | Every piece of text in themes, the engine and new UI. English only for now. Dates, numbers and money use the visitor's locale (`formatShortDate`, `formatNumber`, `formatMoney`). |
| Playground | `/dev/themes` | Any theme (engine or current) with any personalisation, worst case, phone or laptop size, autoplay. Tabs for every gesture, material, particle preset and sound. Dev only (a 404 in production). |

### Steps

1. Make `src/themes/engine/themes/<id>/theme.ts` with `defineTheme({...})` and `Object.tsx` exporting the
   object as the default export. Start from `kraft-parcel` (the dev-only sample).
2. Add it to `ENGINE_THEMES` in `src/themes/engine/registry.ts`. Use `status: "dev"` while building,
   `"draft"` with a `flag` once it can be previewed, and `"live"` when it passes all 8 checks.
3. Put every word in `src/i18n/en.ts` and list the keys in `strings`.
4. Bind the gesture to the object: `<div {...gesture.bind}>`. Drive motion from `gesture.progress` (a motion
   value, so it never re-renders per frame). Read `gesture.done` for the payoff.
5. Draw personal details from `slots` only. Never from raw gift fields, so fallbacks always apply.
6. Check it in `/dev/themes` at phone and laptop sizes, with worst case on, with the keyboard only, and with
   reduced motion turned on in the browser.
7. Run `bun tools/perf/theme-budget.ts <id>` and `node tools/perf/theme-fps.cjs <base> <id>`.
8. Prices: a premium theme names a band (`{ kind: "premium", band: "artist" }`). The amount lives in
   `src/config/pricing.ts`, like every other price. Never put an amount in a theme file.

### Rules that keep themes fast and real

- Springs only for motion. Transform and opacity only while things move.
- Every gesture also has a plain button, and a keyboard path.
- Sound off by default; the shell's toggle mutes everything.
- Particles come from the gift's icon set where it has one.
- Original artwork in our own clay and paper style. No copyrighted characters, logos or brands.
- Fonts from `src/themes/_shared/design.ts` rules: never Caveat, Pacifico, Dancing Script, Lobster or Great Vibes.

## Performance budget

- **Size:** under about 400 KB compressed for what a gift page downloads to show a theme's opening, beyond
  what every page already has (React, motion). That's the engine, the object and its listed assets. People's
  own photos aren't counted. Fonts come from Google Fonts and aren't counted. Check with
  `bun tools/perf/theme-budget.ts` (fails over budget). `bun run perf:themes` runs it for every engine theme.
- **Smoothness:** aim for 60 fps, never janky (no frame over 100 ms, at most 5% of frames over 50 ms) with
  4x CPU throttling and slow 4G on a 390x844 phone screen. Check with
  `node tools/perf/theme-fps.cjs http://localhost:8080 <id>` (needs the playground: the dev server, or a local
  production build made with `VITE_DEV_TOOLS=1`).
- **Lazy loading:** the object loads only when the theme is shown. Heavy extras (3D, large images, audio)
  load after the first frame.
- There's no CI in the repo yet. When there is, run `bun test`, `bun run perf:themes` and `npx tsc --noEmit`.

Measured on 16 Oct 2026 in the cloud sandbox (software rendering, so real phones are faster):

- `kraft-parcel` (engine sample): 22.9 KB gzip for the engine plus the object; 60 fps, worst frame 33 ms.
- The 13 current openings ship together in one chunk: about 214 KB gzip including the shared opening code
  (38 KB for the openings' own chunk in production). three.js (about 135 KB) loads only when a made-up person
  without a baked picture is shown. Every current opening ran at 59 to 60 fps with at most one frame over 50 ms.

## Cultural themes

Themes for a culture's own celebrations (Debut, Simbang Gabi, Quinceañera, Diwali, Eid, Lunar New Year and
others) are built or reviewed with people from that culture before they ship.

- Use authentic details: the real objects, the real order of things, the words people actually use. A
  balikbayan box has its own markings; a parol is made of capiz; a Debut has 18 candles and 18 roses.
- Avoid stereotypes and tourist shorthand: no costume clichés, no generic "exotic" patterns, no mixing
  traditions from different countries because they look alike.
- Write copy that a person from that culture would recognise as theirs, and that everyone else can still
  understand. Keep names of traditions in their own language, with a plain explanation nearby.
- Regional naming: a theme can have a different name by country (`regionalNames`). For example, Balikbayan Box
  for visitors from the Philippines and Care Package for everyone else. Both stay in the gallery for everyone.
- Before a cultural theme ships, note in its PR who reviewed it, and what changed because of their review.

## Themes on the engine (Revenue PR 2, Oct 2026)

All five are free for launch, seeded as **drafts**: only admins see them until they're published in /admin
(Theme library). Each ships with its occasion template in its `theme.ts` (default format, sections, 3 to 5
friend prompts, example heading and greeting); there's no separate occasion config file yet.

| Theme | Object and gesture | Personal inside | Payoff | Notes inside the object |
|---|---|---|---|---|
| Winter Cabin Christmas | A frosted cabin window; wipe the frost (canvas, any pointer, Enter clears a band at a time) | Their name on the stocking, the gift's date on the mantel | Frost melts, the room warms, the tree and garland light, a bell | Up to 10 ornaments on the tree; tap one to read it |
| Care Package | A taped parcel; peel the tape | To and From label, stamps for each country, postmark with the city and date | Flaps open, confetti, things come out | A folded letter, a photo in a frame, a little jar, something small |
| Balikbayan Box | The same parcel, styled as a balikbayan box: tape everywhere, a printed band, "Para kay {name}" in marker, a door-to-door cargo label | As Care Package | As Care Package | As Care Package |
| Parol Christmas | A capiz parol; tap each panel to light it | Their initials in the rosette | All lit: the parol glows, a bell rings, sparks | One note per panel (10). Simbang Gabi: one panel per night, 16 to 24 December |
| Debut | A gilded arch with a velvet curtain; pull the cord | Their name and a gold 18, the date | Light all 18 candles: the roses bloom, petals and sparks, a short tune | 18 treasures: each candle holds a note, and its rose blooms |

Checked for all five: real object, fitting gesture, personal details on the object, a payoff, sound off by
default and haptics after the first tap, the same opening in every format that has one, 27 to 28 KB each
(budget 400 KB), 60 fps under 4x CPU throttling, and the worst-case page (40-character name, 2000-character
notes, no photos). Every gesture works by keyboard and has a plain button ("Light it all up", "Light all 18").

**Cultural review still needed before these go live:** Balikbayan Box, Parol Christmas (and Simbang Gabi),
and Debut were built from the traditions as written in the brief, with Tagalog lines kept short ("Para kay",
"Maligayang Pasko", "Pasalubong", "Mula sa amin, para sa'yo"). Per the rule above, have them reviewed by people
who grew up with these traditions, and note who reviewed them in the PR that publishes them.

## Audit of the current themes (16 Oct 2026, no changes made)

Yes means it passes, Partly means it mostly does with a gap worth fixing, No means it doesn't yet.
Check 6: every theme shows the same opening in every format that has one (all but comic, which uses its cover).
Check 7: all measured at 59 to 60 fps under 4x CPU throttling, within the size budget.

| Theme | 1 Object | 2 Gesture | 3 Personal | 4 Payoff | 5 Sound | 6 Formats | 7 Perf | 8 Hard cases |
|---|---|---|---|---|---|---|---|---|
| Valentine (wax-sealed envelope, hold the seal) | Yes | Yes | Partly: greeting on the letter, nothing personal on the seal | Yes | Yes | Yes | Yes | Partly: reduced motion skips the whole payoff |
| Birthday (cake, blow or tap candles) | Yes | Yes | No: always 5 candles, no name or age on the cake | Yes | Yes | Yes | Yes | Partly: candles are about 20 px wide on a phone; "Blow on your phone" shows on desktop |
| Voyage (boarding pass, tear the stub) | Yes | Yes | Yes: name on the pass and stub, friends as stamps | Yes | Yes | Yes | Yes | Partly: filler stamp reads "Arrived With love With love"; 8 px labels |
| Christmas (wrapped box, pull the ribbon) | Yes | Yes | No: nothing personal on the box | Yes | Yes | Yes | Yes | Yes |
| Pets (the pet fetches a gift, stroke it) | Yes | Yes | No: nothing personal on the pet or the gift | Yes | Yes | Yes | Yes | Partly: needs a lot of stroking; the love meter is hidden from screen readers |
| New Year (3-2-1 dial, hold to count down) | Yes | Yes | Yes: name spelled in fireworks | Yes | Yes | Yes | Yes | Partly: long names clip on the canvas; reduced-motion name doesn't wrap |
| Anniversary (turntable, drop the needle) | Yes | Yes | Partly: greeting on the label; years guessed from the text, 3 if none | Yes | Yes | Yes | Yes | Partly: label text can overflow; the arm's hit area is about 8 px wide |
| Wedding (invitation in a vellum sleeve, slide it out) | Yes | Yes | Yes: foil monogram on the card and the seal | Yes | Yes | Yes | Yes | Partly: no reduced-motion path; fixed-pixel drag |
| Bridal (same object as Wedding, pink palette) | Yes | Partly: borrowed from Wedding | Yes: monogram | Yes | Yes | Yes | Yes | Partly: as Wedding |
| Baby (mobile over a crib, tug the string) | Yes | Yes | Partly: the gift's icon set hangs on the mobile, no name | Yes | Yes | Yes | Yes | Yes |
| Handwritten (note folded in four, tap to unfold) | Yes | Yes | Yes: "For {name}" outside, friends' names inside | Yes | Yes | Yes | Yes | Partly: long greetings clip (no shrink); text doesn't sit on the ruled lines |
| Game Night (board game, roll the dice) | Yes | Yes | Partly: greeting on the board | Yes | Yes | Yes | Yes | Partly: the roll is always 3 + 4; reduced motion skips the token |
| Pixel (handheld console, press START) | Yes | Yes | Partly: greeting on the screen | Yes | Yes | Yes | Yes | Partly: START is 34x9 px; A and B can't be reached by keyboard; long greetings clip |

### Top 3 improvements per theme (after launch, when each moves to the engine)

- **Valentine:** press the recipient's monogram into the wax seal; a calmer reduced-motion payoff (the letter
  fades open, the melody still plays); a short note from the first friend inside the envelope flap.
- **Birthday:** the "Turning" age as real candles (number candles over 10, planned in Revenue PR 2); the name
  piped in icing on the cake; candle hit areas of at least 40 px, and a hint that doesn't say "phone" on desktop.
- **Voyage:** fix the filler stamps (never repeat "With love"); use real places when the gift has them (sender's
  city as From, recipient's city as To, the gift's date); labels of at least 10 px.
- **Christmas:** a gift tag on the ribbon with the recipient's name; friends' names on little tags inside the
  box; the box colour from the gift's palette.
- **Pets:** the pet's name on its collar tag or bowl; fewer strokes to finish (about half); show the love meter
  to screen readers as progress.
- **New Year:** shrink very long names to fit the sky instead of clipping; let the reduced-motion name wrap;
  the year on the dial (2027) and friends' names as small sparks.
- **Anniversary:** an explicit "years together" field instead of guessing from the text; clamp the label text
  to the record label; a bigger tonearm hit area (at least 40 px).
- **Wedding:** a reduced-motion path (the card fades up out of the sleeve); the wedding date on the card;
  drag limits in proportion to the card, not fixed pixels.
- **Bridal:** an object of its own (a teacup and saucer, a ribboned favour box or a bouquet to untie), so it's
  not a pink Wedding; the bride's name on the place card; petals instead of shared Wedding sparkles.
- **Baby:** the baby's name stitched on the crib bumper or a block letter on the mobile; a soft foley sound
  for the tug; the due date or birth date on a little tag.
- **Handwritten:** use the shared greeting sizing (shrink and clamp); line the text up with the ruled lines;
  the sender's handwriting style as an option.
- **Game Night:** the roll lands on the recipient's age or a number from the gift; a reduced-motion version
  where the token appears on the star square; friends' names on the board squares.
- **Pixel:** a bigger START button (at least 44 px tall); A and B reachable by keyboard; the recipient as
  PLAYER 1's name, with long greetings shrunk to fit the screen.
