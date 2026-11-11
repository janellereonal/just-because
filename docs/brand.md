# Just Because brand: "Keepsake Modern" (draft)

Status: **draft for Janelle's approval.** Shown on `/dev/design` (dev only). Nothing here is applied to the
live site yet; once approved it rolls out screen by screen (app shell, homepage, gallery, create, editor,
friend page).

Warm, editorial and paper-like. The interface stays quiet so the gift itself is the hero.

## Principles

1. **The gift is the hero, not the UI.** Calm, neutral chrome so themes can be loud.
2. **Paper, not plastic.** Warm off-white, ink text, real texture, soft natural shadows. No glassy blur.
3. **One brand colour, used rarely.** Raspberry marks the main action and key moments only.
4. **Emotion over features.** Show people and reactions, not toggles.
5. **One job per screen.** One main action and one focal point per section.

## Tokens (app and marketing UI only)

Gifts keep their own theme palettes. Tokens live in `src/design/keepsake.css` (scoped to `.kd` while in draft).

| Token | Hex | Use |
|---|---|---|
| paper | #FAF6F0 | Page background (replaces the pink tint) |
| surface | #FFFFFF | Cards, panels |
| ink | #2B2522 | Headlines, main text |
| ink-muted | #6B625C | Body, secondary text |
| line | #EAE3DA | Borders, dividers (decorative, not text) |
| raspberry | #C2366B | Main action and key moments only |
| raspberry-deep | #9E2455 | Hover, pressed |
| blush | #FBE3EA | Selected states, rare highlight |
| butter / sage / sky / lilac | #F6D77A / #A9C5A0 / #A8C8EC / #C9B8E8 | Occasion tags and filters only |

No pink page or panel backgrounds in the app.

**Contrast (WCAG AA), all pass with the prompt's colours unchanged:** ink on paper 14.0, ink-muted on paper
5.5, ink-muted on white 6.0, white on raspberry 5.2, white on raspberry-deep 7.4, raspberry on paper 4.8,
ink on blush 12.4, ink on the four accents 8.0 to 10.7. Placeholders use #8A817A (3.8 on white), which is
fine for placeholder text but never for real text. The live table is on `/dev/design`.

## Type

- **Display:** Fraunces, variable, with the soft optical style (`"SOFT" 100`). Replaces Fredoka.
- **UI and body:** DM Sans.
- Both self-hosted (`@fontsource-variable/*`), Latin and Latin Extended subsets only.
- No monospace in marketing or app UI. It stays inside themes that need it (boarding pass, ticket, receipt).
- Scale: 64, 48, 36, 28, 22, 18, 16, 14, 12. Nothing under 12px. Body 16 to 18.
- Headlines in sentence case, line height about 1.05, with the occasional italic word for warmth
  ("One gift from *everyone* who loves them.").
- Theme fonts load only when that theme renders (already true: `loadThemeFonts`).

Never use Caveat, Pacifico, Dancing Script, Lobster or Great Vibes.

## Shape, depth, texture, motion

- Radius 8 (inputs, small chips), 16 (cards), 28 (feature sections, modals). Only buttons and tags are pills.
- Two shadows: **rest** (cards) and **lift** (modals, popovers). No glows, no coloured shadows.
- 8pt spacing grid. Marketing sections: 120px apart on desktop, 72px on phones.
- Paper grain: one tiny inline SVG noise at 2.5% on the paper background (`.kd-grain`).
- UI motion 150 to 250ms, ease-out, no bouncing buttons or panels. Respect reduced motion everywhere.
- **Fold and tie** (`src/components/brand/FoldAndTie.tsx`): the signature moment when a note is sent or a
  gift is wrapped. The note folds, a raspberry ribbon wraps it and ties. About 900ms. Reduced motion: a fade.

## Icons

Lucide, 1.5px stroke, everywhere in the UI. No system emoji in the UI (themes may use their own art).

## Logo

`src/components/brand/Logo.tsx`: a gift tag with a small heart cutout (the mark), plus "Just Because" in
Fraunces (the wordmark).

- Horizontal lockup for headers, stacked for splash and emails, mark alone for favicon and app icon.
- Mark in raspberry with an ink string on light backgrounds; one-colour version for dark backgrounds,
  stamps and embossing.
- Keep clear space of at least the mark's height around the lockup. Don't stretch, recolour outside the
  palette, or add effects.
- Bo is the mascot, not the logo.
- This is a first version. A professional designer may refine the mark later.

## Bo

Janelle's rules (they replace the "never roaming" line in the original design prompt):

- Bo keeps roaming on our own pages, and always avoids text, buttons, fields and previews.
- He pauses while someone is typing, tapping or dragging, and never floats over editor controls.
- One Bo on screen at a time.
- **No Bo on /g/ gift pages.** No hopping or talking Bo there, ever: the gift belongs to the recipient.
- Best moments for Bo: the homepage hero, empty states, success moments, 404s and the final call to action.

## Voice

Like the friend organising the group gift: plain, warm, specific.

- Say gift, note, friends, open. Not site, content, users, launch.
- Short sentences. Name the person when we know it ("Send it to Ana").
- At most one exclamation mark per screen. No em dashes in copy.
- Written for a global audience: no slang that only works in one country.

### Do

- "Invite link copied. Send it to Ana's friends."
- "The organiser reads every note before the gift goes out."
- "Pay only when you send it."

### Don't

- "Content successfully submitted!!" (system words, two exclamation marks)
- "Unlock premium experiences for your users." (marketing speak)
- Invented testimonials or numbers. Real quotes and counts only, from Janelle.
