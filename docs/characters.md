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
