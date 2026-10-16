Project: Just Because (justbecause.site), repo janellereonal/just-because.

Before anything else, read CLAUDE.md, HANDOFF.md (section 0 first), docs/NEXT-SESSION.md, and tools/README.md.

HOW THIS FITS WITH EARLIER WORK
There is an earlier "stress test" prompt with six PRs (trust and privacy, input hardening, editor fixes, brand system, homepage and performance, final check). Check open and merged PRs first.
- That prompt's PR 1 (trust and privacy), PR 2 (inputs) and PR 3 (editor fixes) still stand. Finish or merge them before starting PR 3 below.
- This prompt REPLACES that prompt's PR 4 (brand system) and PR 5 (homepage). If either is already built, build on top of it instead of redoing it, and say what you kept.
- Keep all existing features unless this prompt says to move or replace them.

GOAL
Make Just Because look and feel like a premium, billion-dollar consumer brand. The direction is called "Keepsake Modern": a warm, editorial, paper-like brand where the interface stays quiet and the gift itself is the hero.

DESIGN PRINCIPLES (use these to judge every screen)
1. The gift is the hero, not the UI. The interface is calm and neutral so themes can be loud.
2. Paper, not plastic. Warm off-white base, ink text, real texture, soft natural shadows. No glassy blur everywhere.
3. One brand color, used rarely. Raspberry marks the main action and key moments only.
4. Emotion over features. Show people and reactions, not toggles.
5. Every screen has one job: one main action and one focal point per section.

Reference brands for craft and feel (study, never copy): Paperless Post (stationery craft), Partiful (playful energy), Duolingo (disciplined mascot use), Airbnb (warmth and photography), Linear (restraint in UI).

Do this as TEN separate PRs, in order. Finish and open each one before starting the next.

==================================================
PR 1: DESIGN FOUNDATION
==================================================
1. Design tokens (CSS variables plus Tailwind theme), used everywhere in app and marketing UI. Themes inside gifts keep their own palettes.
   - paper #FAF6F0 (page background, replaces the pink tint)
   - surface #FFFFFF (cards, panels)
   - ink #2B2522 (headlines, primary text)
   - ink-muted #6B625C (body, secondary text)
   - line #EAE3DA (borders, dividers)
   - raspberry #C2366B (primary buttons and key highlights only)
   - raspberry-deep #9E2455 (hover, pressed)
   - blush #FBE3EA (selected states, rare highlight)
   - occasion accents, for category tags and filters only: butter #F6D77A, sage #A9C5A0, sky #A8C8EC, lilac #C9B8E8
   Rule: no pink page or panel backgrounds in app UI. Check contrast (WCAG AA) for every text and background pair and adjust shades if needed. Report any changes.

2. Typography
   - Display: Fraunces (variable). Use the soft optical style for warm headlines. Replaces Fredoka in all marketing and app UI.
   - UI and body: DM Sans (keep).
   - Remove the monospace from marketing and app UI. Keep it only inside themes that need it (boarding pass, ticket, receipt).
   - Type scale: 64, 48, 36, 28, 22, 18, 16, 14, 12. Minimum UI text 12px. Body 16 to 18px.
   - Headlines in sentence case, line height about 1.05, with an occasional italic word for warmth.
   - Self-host and subset the fonts. Load theme fonts only when that theme renders.

3. Shape, depth, spacing, texture
   - Corner radius: 8 (inputs, small chips), 16 (cards), 28 (feature sections). Only buttons and tags are fully rounded pills.
   - Exactly two shadows: "rest" (soft, for cards) and "lift" (modals, popovers). No glows, no colored shadows.
   - 8pt spacing grid. 120px between marketing sections on desktop, 72px on mobile.
   - A very subtle paper grain on the paper background (2 to 3% opacity, tiny file, no layout cost).

4. Motion
   - UI motion: 150 to 250ms, gentle ease-out, no bouncing on buttons or panels.
   - Build one signature "fold and tie" transition (a short paper fold with a ribbon) for when something is sent or wrapped. Reuse it in PRs 4, 6 and 7.
   - Respect prefers-reduced-motion everywhere.

5. Icons: pick one line icon set (Phosphor or Lucide) at a 1.5px stroke and replace every icon and system emoji in the app UI (for example the 👯 and 💌 on the create page).

6. Logo lockup
   - Build a lockup: a simple gift-tag mark (a tag with a small heart cutout) plus the "Just Because" wordmark in Fraunces. Provide horizontal and stacked versions, a favicon, an app icon and a monochrome version.
   - Use it in every header, the footer, emails and share images.
   - Bo stays the mascot, not the logo.
   - Note in docs/brand.md that a professional designer may refine the mark later.

7. Bo rules
   - Bo appears in five places only: homepage hero, empty states, success moments, 404 pages, and the final call to action.
   - Bo never roams, never covers text, buttons or previews, and never floats over editor controls. Only one Bo on screen at a time.
   - Remove the roaming Bo and his speech bubbles from marketing pages and the editor.
   - The rule that Bo never hops or talks on /g/ gift pages still applies.

8. Component library: rebuild buttons (primary, secondary, ghost, destructive), inputs, textareas with character counters, selects, toggles, chips, tags, cards, modals, sheets, toasts, tabs, tooltips, empty states and skeleton loaders on the new tokens.

9. Style guide page at /dev/design (dev only, not linked, noindex) showing all tokens, type, components, icons, the logo and motion. Screenshot it for the PR.

10. Write docs/brand.md: principles, tokens, type, logo usage, Bo rules, voice (plain, warm, specific), and do and don't examples.

==================================================
PR 2: APPLY THE SYSTEM TO THE APP SHELL
==================================================
Apply PR 1 to: the header and nav (lockup, quieter links, labelled icon buttons), the footer (lockup, product links, legal pages, contact, socials, a small "Made in Manila" line), toasts, modals, auth pages, 404 pages, the plan modal and settings.

Dashboard ("My gifts"):
- Show gifts as a shelf of wrapped cards using each theme's art, with status: Collecting, Ready to send, Sent, Opened.
- A simple per-gift timeline: created, invites shared, notes in (count), wrapped, opened.
- Sort (newest, deadline) and search once there are more than 9 gifts.
- An empty state with Bo and one button.

==================================================
PR 3: HOMEPAGE AND FORMATS PAGE
==================================================
Rebuild the homepage in this order (8 sections):
1. Hero. Fraunces headline (keep "One gift from everyone who loves them." with "everyone" in italic), one line of subtext, one raspberry button "Make a gift" and a quiet text link "See an example". On the right, a large phone playing a real gift opening with no controls around it. Must fit above the fold at 1440x756 and 390x844.
2. Proof strip. Room for a real count and 3 short testimonials (first name and occasion). Use clearly marked placeholders and ask me for real quotes and numbers. Hide the count below a threshold I can set. Never ship invented quotes or numbers.
3. How it works, 3 steps (Set it up, Friends add, They open it), each with a large visual.
4. "The moment": a full-width video section of real people opening gifts. Build the section with a placeholder and a clear spot for the video file. Ask me for footage. Lazy-load it.
5. Themes: a large horizontal gallery where each card plays its opening on hover (desktop) or when scrolled into view (mobile), with occasion filter chips and "See all themes".
6. What friends can add: 6 tiles (Letters, Photos, Voice notes, Videos, Songs, Open-when letters) and one line: "Plus quizzes, awards, maps and more."
7. Pricing: three clean cards on white, local currency (pesos for PH, approximate in USD elsewhere until real conversion exists), headline "Pay only when you send it".
8. FAQ, then a final call to action on a deep ink background with Bo.

Also:
- Move the full formats section to a new /formats page with one interactive switcher (the same gift shown in each format). Keep a small teaser on the homepage.
- Load all homepage media (audio, video, demo gifts) only on interaction or when scrolled into view.
- One H1 per page.
- Report before and after numbers: request count, total size, LCP and CLS on a throttled mobile profile.

==================================================
PR 4: THEME GALLERY AND CREATE FLOW
==================================================
Theme gallery (/themes):
- A calm white gallery with large cards, an occasion filter (left on desktop, chips on mobile), and "New", "Seasonal" and "Popular" collections.
- Clicking a card opens a full-screen preview with the opening playing, then "Use this theme".

Create flow (/create), one question per screen, full screen, with the preview building live behind it:
1. Who's it for? (name, plus an optional photo)
2. What's the occasion?
3. Pick a theme (large animated cards, filtered by occasion, with "See all")
4. Just you, or with friends?
5. "Your gift is ready." A share sheet with the invite link, Copy, Messenger, WhatsApp, email and a QR code, using the fold-and-tie transition.

Rules:
- Format and sections come from smart defaults per occasion (see PR 9) and can be changed later in Gift settings. Remove them from the create flow.
- Back and forward work, progress shows as dots, and every step can be skipped except the name.
- The time from landing on /create to seeing the share sheet should be under 60 seconds for a new user. Measure it in your own test and report.

==================================================
PR 5: EDITOR
==================================================
1. Preview first: the gift fills the screen. Click any text in the preview to edit it in place (heading, recipient name, message, section titles, footer). Click the character to open the character picker. Keep the panel fields as a fallback.
2. Undo and redo (buttons and keyboard shortcuts) for the editing session.
3. A clear save state: "Saving…", "Saved", "Offline, will save when you're back".
4. Co-organisers: the owner can invite up to 2 co-organisers by email or link. They can edit and moderate but cannot pay, delete the gift or remove the owner. Enforce permissions on the server for every action, not just in the UI. Show avatars in the top bar.
5. Mobile: the bottom sheet opens at about 45% height with a drag handle, so the preview stays visible. Support tap-to-edit on the preview.
6. Apply the new tokens, components and icons throughout.

==================================================
PR 6: FRIEND PAGE, REMINDERS AND EMAILS
==================================================
Friend page (/contribute/[slug]), phone first, one column:
1. Top: the recipient's name and photo (if added), and who organised it ("Sofia is putting this together for Ana's 30th").
2. Writing prompts shown as tappable chips that fill a starter line, set per occasion (see PR 9). For example: "A memory with Ana", "Something you admire about her", "Advice for this year".
3. Big, easy media actions: record a voice note, record a video, add several photos at once, all in the browser.
4. After sending: the fold-and-tie animation of the note going into the gift, then "Want to make one for someone in your life?" leading to /create. Track this click.
5. Show 4 note types plus "More" (only the ones the organiser turned on).

Deadline and reminders:
- The organiser can set a deadline ("Collect notes until Oct 20").
- The friend page shows the deadline.
- Friends who left an email (optional field, "Remind me if I forget") get one reminder 48 hours before the deadline.
- The organiser gets a summary email 24 hours before the deadline.

Branded emails for: friend invite, deadline reminder, new note waiting (batched, at most once a day), gift opened, and thank-you received.
- Same paper look, lockup, one button, plain copy, an unsubscribe link.
- Use the existing email provider if there is one. If there isn't, stop and ask me which to use before adding one.
- Build an email preview page at /dev/emails (dev only).

==================================================
PR 7: RECIPIENT EXPERIENCE
==================================================
1. The opening plays full screen with sound (respect the mute toggle and reduced motion), then reveals notes gradually instead of all at once.
2. Thank everyone: after reading, the recipient can write one thank-you that goes to every contributor (by email where available, and on the friend page under "What you've added").
3. Keep it: download the whole gift as a well-designed PDF keepsake book (cover, one note per page, photos, contributor list). Generate it server-side or with a print stylesheet, whichever gives the better result. Test with a large gift.
4. Share the moment: a story-sized share card (1080x1920) with the theme art and "12 people made me this" (no note content), shareable to Instagram and WhatsApp.
5. End card: "Made with Just Because. Make one for someone." leading to /create. Track clicks.

==================================================
PR 8: NEW FORMATS (Stories and Jar of Notes)
==================================================
1. Stories (Wrapped style): full-screen tap-through slides. Start with group stats ("12 friends, 3 countries, 41 photos, 2 voice notes"), then one note per slide (photos full-bleed, voice with a waveform), and end with a group collage of contributor names. Tap right for next, left for back, hold to pause.
2. Jar of Notes: a glass jar full of folded notes. Shake (on phones that allow it) or tap to pull one out and unfold it. Optional "one a day" mode that unlocks one note per day in the recipient's time zone.
- Both formats must work with every note type and every theme palette, show sample notes clearly labeled as samples, handle long notes, and respect reduced motion.
- Set the plan tier for each (suggest Celebration and up) and show the plan tag in the format picker.
- Add both to the worst-case test page from the stress-test prompt.

==================================================
PR 9: NEW THEMES AND OCCASION TEMPLATES
==================================================
New themes, each with its own physical opening object and gesture at the quality of the current themes:
1. Farewell / Leaving work: a packed moving box you untape
2. Retirement: a desk calendar whose last page you tear off
3. Graduation: a diploma tube you pop open
4. Get well soon: a care package you unwrap, with a soft, calm palette
5. Thank you: a hand-pressed card with a flower you lift
6. New job / Promotion: a fresh business card or office key you pick up
If any opening object above doesn't work well in practice, choose a better one and say why.

Occasion templates. For every occasion (existing and new), define in one config file:
- the default theme, format and sections
- 3 to 5 writing prompts for friends
- example heading and message copy
- default section titles
For example, Retirement: sections Letters, Photos, Awards, Memory map, Voice notes; prompts "Favorite memory working together", "What you taught me", "What you should do first in retirement".
The create flow, friend page prompts and sample notes all read from this file.

Also add an "Any occasion" style collection built from existing assets with new palettes and fonts only (no new openings): Minimal, Editorial, Botanical, Retro 70s.

==================================================
PR 10: METRICS AND ROADMAP DOCS
==================================================
1. Track these events: gift_created, invite_shared (with channel), friend_page_viewed, note_added (with type), gift_wrapped, plan_purchased (with plan), gift_opened, thank_you_sent, keepsake_downloaded, share_card_shared, make_your_own_clicked (with source: friend page, recipient end card).
   - Use the existing analytics tool if there is one. If there isn't, log events to a simple events table in Postgres and don't add a third-party tracker without asking me.
   - Add an admin-only page that shows: % of gifts reaching 5 or more notes, friend-page visit to note conversion, wrap and pay conversion, recipient open rate, thank-you rate, make-your-own rate, and median time from sign-up to first share.
2. Write docs/roadmap.md with short specs (problem, scope, open questions, dependencies) for the later items, without building them:
   - Next: scheduled delivery by email or SMS, video slideshow export, printed photobook, chip-in fund, occasion landing pages (/birthday, /wedding, /farewell, /retirement, /baby-shower, /get-well, /graduation, /work-anniversary), Teams plan, a "Help me start" writing helper, the remaining themes (Housewarming, Engagement, Teacher appreciation, Mother's and Father's Day, Work anniversary, In memory, Debut, Parol Christmas, Lunar New Year, Eid, Diwali, Hanukkah, Halloween, Pride), the formats The Daily [Name] (newspaper), Movie Night (credits roll), Garden and Photo Album, and the style packs Y2K and Kawaii.
   - Later: open-together live mode, reaction recording, translations, a birthday reminder calendar, seasonal collections, a theme creator marketplace, and more formats (Polaroid Wall, Postcard Stack, Message in a Bottle, Snow Globe, Piñata, Group Chat Replay, Museum, Quilt, Yearbook).
   - Do not build: a free-form drag-and-drop page builder, or ads and third-party branding inside gifts.
   - For In memory, note that it needs a quiet design: no confetti, no bouncing, no mascot, muted palette.

==================================================
THINGS ONLY I CAN PROVIDE (ask me, use clear placeholders until then)
==================================================
- Real testimonials and real usage numbers
- Real photos and the "moment" video footage of people opening gifts
- The contact email and social links
- The email provider choice, if none exists yet
- Final sign-off on the logo mark

==================================================
RULES
==================================================
- Never push to main. Branch off main for each PR.
- Before each PR, run `npx tsc --noEmit` and `NITRO_PRESET=node bun run build`. Both must pass.
- Open the PR; I merge it myself.
- Test on local Postgres. Ask before using the real DATABASE_URL.
- Never touch PayMongo keys or set PAYMONGO_ALLOW_LIVE. Never paste or store secrets.
- Copy: plain and friendly, no em dashes, max one exclamation mark per screen, written for a global audience.
- No hopping or talking Bo on /g/ gift pages.
- Never ship fake testimonials, fake numbers, or stock photos presented as real customers.
- Keep existing gifts working after every change. Check old gifts in every theme and format after each PR.
- Check every change in a real browser at 390x844 and 1440x756, and send before and after screenshots of every screen you change.
- Keep everything polished, playful and hard to copy.
- Make sensible calls without asking, except where this prompt says to ask. Give short, casual updates and say what you chose.