# Next session: picking up Just Because

Updated 16 Oct 2026 (sessions 6 to 8), so a new session, on any Claude account, can carry on without
missing anything. Start with `HANDOFF.md` section 0.

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
