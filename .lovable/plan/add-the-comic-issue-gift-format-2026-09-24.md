# Add the Comic Issue gift format

## Goal
Add **Comic Issue** as an optional presentation format while leaving every existing Scrapbook gift and the current creation, contribution, privacy, approval, links, and publishing behavior intact.

## What will change

### 1. Store the format safely
- Add `format` to each gift, defaulting every existing and new gift to `scrapbook`.
- Add one `format_settings` object for Comic-only choices: cover title/subtitle, Two Worlds enabled state and names, panel order, and chapter overrides.
- Keep contributions and modules unchanged. Reordering or moving a Comic panel records its contribution ID in Comic settings; it does not rewrite the original submission or its module.
- Update generated app types and the existing save path to include only these two additive fields.

### 2. Add the format picker
- In gift creation, place two visual choices after the occasion/theme: **Scrapbook** and **Comic Issue**.
- Keep Scrapbook preselected so the current flow behaves exactly as before.
- Show compact, accessible previews of both formats and save the selected format with the gift.

### 3. Build Comic Issue as a separate viewer
- Route Comic gifts to a dedicated `ComicIssueView`; continue routing Scrapbook gifts to the existing view without altering it.
- Build the full-screen original cover with recipient title, birthday issue line, priceless price corner, barcode, Collector’s Edition badge, title slam, KA-BOOM burst, and “Open the issue →”.
- Replace only the Comic intro with this cover. Preserve the current remembered intro behavior for Scrapbook.
- Build a page-by-page reader with page-turn motion, mobile swipe, desktop arrows and keyboard navigation, page indicator, and Chapters menu.
- Map enabled content into Comic chapters:
  - Countdown → “Next Issue Drops In…” splash; at zero, birthday blast and halftone confetti.
  - Photos → “Origin Story” panels with caption boxes.
  - Letters → “The Ohana” character panels and speech bubbles; overflow continues into “Fan Mail.”
  - Songs → “Soundtrack” cassette/track panels.
  - Word cloud, voice, calendar, and tree → their own comic-styled chapters.
- End with “To be continued…” and a credits-style back cover listing unique contributor names.
- Use bold panel borders, halftone/newsprint treatments, Bangers for display text, Comic Neue for bubbles, and the gift palette for accents. Use only original generic comic imagery and motifs.

### 4. Add Two Worlds
- Add Comic editor controls to enable Two Worlds and edit both names, initially suggested as **HERO WORLD** and **OHANA WORLD**.
- Hero World uses night-city scenery, red/deep-navy energy, skyline/action lines, abstract web-line corners, and drifting halftone dots.
- Ohana World uses tropical sunset scenery, red/ocean-blue/orange energy, waves, palms, and hibiscus petals.
- Switch with a panel wipe and caption; retain the same panels, bubbles, fonts, gift palette accents, and current page.
- Disable decorative movement and replace page turns/wipes with simple transitions when reduced motion is preferred.

### 5. Adapt the contributor preview only
- Keep the current no-login form, submission storage, edit token, privacy choices, and contribution URLs.
- For Comic gifts, replace only the right-side preview with the Comic layout.
- Render other people’s data from the existing sealed feed as silhouettes, blurred placeholders, CLASSIFIED stamps, and redacted speech bubbles; never request or expose their hidden content.
- Render the contributor’s own locally remembered submission in full with “You’re in the issue!” and retain the existing visible panel/friend count.

### 6. Extend the existing editor for Comic gifts
- Keep the existing editor shell, Review panel, approval controls, invite links, Preview, and Wrap it up flow.
- For Comic gifts only, tailor the Words/Intro area for cover title and subtitle, and add Two Worlds controls.
- Add a Comic panel organizer that can reorder contributions within a chapter and assign a contribution to another Comic chapter. Persist only the Comic presentation map.
- Use the same Comic renderer in the editor canvas and full-screen recipient preview, including the Comic cover instead of the Scrapbook intro.

### 7. Verification
- Create one Scrapbook gift and confirm its editor, contributor preview, intro, approval, privacy, links, and publishing are unchanged.
- Create one Comic gift and verify cover opening, all enabled module mappings, page navigation, Chapters, Two Worlds, reduced motion, sealed contributor panels, own-submission reveal, panel organization, review/approval, and publishing.
- Check phone and desktop layouts, keyboard/swipe behavior, long letters, empty chapters, countdown zero, console errors, failed requests, and request loops.

## Technical details
- Apply an additive database migration only: `gift_sites.format` and `gift_sites.format_settings`, with defaults and no destructive data changes.
- Keep Comic code in focused components and helpers so the existing Scrapbook renderer remains isolated.
- Load the two Comic fonts through the app document head, not CSS imports.
- Preserve current row-level access rules; no new public write paths or broader permissions are needed.
