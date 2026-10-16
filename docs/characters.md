# Characters (the cast)

Every gift opening has a character in it: Bo, a dog, a little person, a coffee
cup, or a picture the creator uploaded. The creator picks it in the editor under
**Cast** (tabs: Characters, Customize, Upload, Sprinkles, plus "Surprise me").

Code lives in `src/themes/_shared/cast/`:

| File | What it does |
| --- | --- |
| `types.ts` | The contract (`CharacterHandle`), the saved setting (`CharacterSetting`) and `normalizeCharacter()` |
| `library.tsx` | The placeholder characters (geometric SVG) and the accessories (party hat, veil, pilot cap…) |
| `Character.tsx` | Draws a character or an uploaded sticker and runs the motion |

What's saved on a gift: `gift_sites.character` (jsonb) and `gift_sites.icon_set`
(jsonb). Both are optional; `castFor(kind, character, iconSet)` in
`src/themes/_shared/design.ts` falls back to the theme's defaults.

## The contract

A theme never animates a character directly. It holds a ref and calls:

```ts
type CharacterHandle = {
  tap(): void;        // a little squish, as if poked
  anticipate(): void; // leans in, eyes wide (the gesture has started)
  celebrate(): void;  // jumps, happy face (the gift opened)
  sad(): void;        // droops (a gesture was abandoned)
  look(x, y): void;   // -1..1 each axis
  idle(): void;       // back to breathing and blinking
};
```

Characters also follow the pointer on their own (`follow`), blink, and can be
`sleepy` (eyes closed) or `blush`.

## How to swap in real Rive files

The placeholders were built so a Rive character can drop in without touching a
single theme.

1. **Make the file in Rive.** One artboard per character, 120 x 120 units, the
   character standing on the bottom edge (leave ~6 units for the floor shadow).
2. **Add a state machine called `Main`** with these inputs, named exactly:

   | Input | Type | Fired by |
   | --- | --- | --- |
   | `idle` | trigger | `idle()` |
   | `tap` | trigger | `tap()` |
   | `anticipate` | trigger | `anticipate()` |
   | `celebrate` | trigger | `celebrate()` |
   | `sad` | trigger | `sad()` |
   | `lookX` | number, -100..100 | `look(x, _)` x 100 |
   | `lookY` | number, -100..100 | `look(_, y)` x 100 |

   Optional: a boolean `sleepy` and a boolean `blush`, and one bone or group
   named `head` where accessories should sit.
3. **Export the `.riv`** and put it in `public/cast/<id>.riv` (or upload to Blob
   and use the URL).
4. **Install the runtime**: `bun add @rive-app/react-canvas` (check the
   version is more than 24 hours old, `bunfig.toml` refuses newer ones).
5. **Add a Rive branch to `Character.tsx`.** Inside the component, when the
   spec has a `rive` field, render `useRive({ src, stateMachines: "Main",
   autoplay: true })` instead of the SVG body, and map the handle:

   ```ts
   const inputs = useStateMachineInput(rive, "Main", "tap"); // one per input
   useImperativeHandle(ref, () => ({
     tap: () => tapInput?.fire(),
     anticipate: () => anticipateInput?.fire(),
     celebrate: () => celebrateInput?.fire(),
     sad: () => sadInput?.fire(),
     idle: () => idleInput?.fire(),
     look: (x, y) => { lookX.value = x * 100; lookY.value = y * 100; },
   }));
   ```

   Keep the outer wrapper (size, pointer following, reduced motion) as it is.
6. **Register it in `library.tsx`**: add `rive: "/cast/<id>.riv"` to the
   character's spec (keep `body` as the fallback that shows while the file
   loads, and for reduced motion).
7. **Accessories**: either draw them inside the Rive file (one boolean input
   per accessory, e.g. `party-hat`) or keep using the SVG ones, which sit at
   `spec.head`.

Nothing else changes: the openings only ever talk to the handle.

## Uploads

An upload is a picture the creator chose (their pet, their face, a drawing).
It's shown as a die-cut sticker: a white outline made from the picture's own
alpha (CSS drop-shadow stack), a soft shadow, and the theme's accessory on top.
There's no automatic background removal on purpose (privacy and bundle size);
the Upload tab asks for a cut-out PNG or a plain background. Uploads use the
same motion as library characters, so the contract still works.

## Sprinkles (icon sets)

`src/themes/_shared/iconSets.ts`. Sets: hearts, stars, paws, florals, confetti,
snowflakes, emoji, initials, or the creator's own (up to 3 emoji or small
pictures, with a physics choice: float, fall, drift, burst). Every particle in
an opening and on the gift page (falling background bits, tap bursts, the
birthday wish) comes from the gift's set. Never hardcode a particle shape in a
theme; call `burstSet()` or render `<SprinkleField>` / `<IconGlyph>`.

## The library (Oct 2026)

Every character lives in the same 120 box and sits on the floor at y = 112, so sizes and baselines match.
Clay stills are in `public/clay/<id>.webp` (512) and `<id>@256.webp`, rendered by `tools/screens/clay.js` from the
recipes in `src/lib/clay/` (`scene.ts` for the first cast, `animals.ts`, `objects.ts`). Re-render after changing a recipe:

```bash
cd tools/screens && ONLY=fox,owl node clay.js ../op/clay/png 640 && python3 clay_webp.py ../op/clay/png ../../public/clay
```

The face (eyes, blush, mouth) is live SVG drawn on top, from each entry's `clay` face map. Clay-only characters
(`src/themes/_shared/cast/clayCast.ts`) have no drawn body, so they always keep their own colors.
Tags are theme kinds plus plain words: the picker suggests characters whose tags include the gift's theme kind,
and search matches names and tags.

| id | Name | Category | Tags |
|---|---|---|---|
| `mascot` | Bo | Mascot | gift, bo |
| `dog` | Dog | Animals | pets, puppy |
| `tzu-mal` | Shih Tzu x Maltese | Animals | pets, puppy, fluffy |
| `tzu-pom` | Shih Tzu x Pomeranian | Animals | pets, puppy, fluffy |
| `cat` | Cat | Animals | pets, kitten |
| `bunny` | Bunny | Animals | baby, valentine, wedding, pets, easter |
| `bear` | Bear | Animals | valentine, anniversary, baby, teddy |
| `duck` | Duckling | Animals | baby, bath |
| `frog` | Frog | Animals | game, pond |
| `person` | Little you | Little people | people, you |
| `cup` | Coffee cup | Objects | handwritten, cozy, coffee, morning |
| `plant` | Plant | Objects | garden, cozy, home |
| `cloud` | Cloud | Objects | baby, sleepy, sky |
| `moon` | Moon | Objects | night, baby, sleepy |
| `snail` | Snail | Animals | garden, slow, handwritten |
| `octopus` | Octopus | Animals | sea, ocean, voyage |
| `bee` | Bee | Animals | garden, honey, birthday |
| `chick` | Chick | Animals | farm, baby, easter |
| `elephant` | Elephant | Animals | safari, baby |
| `turtle` | Turtle | Animals | sea, slow, voyage |
| `pig` | Pig | Animals | farm |
| `penguin` | Penguin | Animals | snow, christmas, winter |
| `giraffe` | Giraffe | Animals | safari, tall |
| `dino` | Dino | Animals | birthday, game, rawr |
| `koala` | Koala | Animals | sleepy, cuddle |
| `hedgehog` | Hedgehog | Animals | garden, autumn |
| `sheep` | Sheep | Animals | farm, sleepy, baby |
| `panda` | Panda | Animals | cuddle, bamboo |
| `fox` | Fox | Animals | autumn, forest |
| `mouse` | Mouse | Animals | cheese, little |
| `owl` | Owl | Animals | night, wise, graduation, handwritten |
| `whale` | Whale | Animals | sea, ocean, voyage |
| `robot` | Robot | Objects | game, pixel, tech, future |
| `star` | Star | Objects | night, pixel, newyear, wish |
| `candle` | Candle | Objects | birthday, christmas, wish, cozy |
| `pencil` | Pencil | Objects | school, handwritten, teacher, graduation |
| `camera` | Camera | Objects | voyage, photo, trip |
| `backpack` | Backpack | Objects | voyage, school, trip |
| `drop` | Raindrop | Objects | rain, calm |
| `planet` | Planet | Objects | space, night, pixel, voyage |
| `bulb` | Light bulb | Objects | idea, game, graduation |
| `bubble` | Speech bubble | Objects | chat, handwritten, notes |
| `heart` | Heart | Objects | valentine, anniversary, wedding, bridal, love |
| `cake` | Cake | Objects | birthday, party, wedding, bridal |
| `balloon` | Balloon | Objects | birthday, party, baby, newyear |
| `letter` | Love letter | Objects | handwritten, valentine, anniversary, wedding, bridal, notes, love |
| `snowman` | Snowman | Objects | christmas, snow, winter |
| `ornament` | Ornament | Objects | christmas, newyear |
| `suitcase` | Suitcase | Objects | voyage, trip |
| `sun` | Sun | Objects | summer, voyage, morning |

## People you build (Oct 2026)

`src/themes/_shared/cast/person.ts` lists every option (age, skin, face, hair, hair color, facial hair, glasses,
hat, outfit, outfit color, held item) and the 40 ready-made people. `src/lib/clay/person.ts` builds the clay model
from a config. The face is live SVG from `personFace()`, which uses the same head layout as the model.
A saved person is `{ type: "person", person, preset?, image_url? }`. See docs/NEXT-SESSION.md, session 12b.
