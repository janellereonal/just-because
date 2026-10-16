Project: Just Because (justbecause.site), repo janellereonal/just-because.

Before anything else, read CLAUDE.md, HANDOFF.md (section 0 first), docs/NEXT-SESSION.md, and tools/README.md.

THIS IS THE LAUNCH PROMPT
We are about to make the site public. This prompt is the complete pre-launch scope. It replaces two earlier prompts: the "stress test" prompt (6 PRs) and PRs 1 to 3 of the "Keepsake Modern" design prompt. The design prompt's PRs 4 to 10 wait until after launch; do not start them.

First, check open and merged PRs and branches. If any item below is already done, verify it, skip it, and say so. Don't redo work.

DEFINITION OF DONE FOR LAUNCH
- No known bug that loses data, duplicates data, exposes private content, or blocks paying.
- Legal pages live (marked as drafts until I confirm a review), with contact and refunds clear.
- Private gift pages never indexed. Shared links show rich previews.
- Payment works end to end, including failure and recovery paths.
- Homepage on a throttled mobile profile: LCP under 2.5s, CLS under 0.1, Lighthouse accessibility 95 or higher.
- Every theme and format renders cleanly with worst-case input.
- Works on iOS Safari, Android Chrome and desktop Chrome, Safari and Firefox.

Do this as EIGHT separate PRs, in order. Finish and open each one before starting the next.

==================================================
PR 1: TRUST, PRIVACY AND SHARING
==================================================
1. Legal and contact pages (all currently 404): /privacy, /terms, /refunds, /contact.
   - Plain-language drafts covering what we collect (names, notes, photos, voice and video from organisers and friends), why, retention (tied to plan length), processors (check the code for the real list: hosting, payments, storage, auth, email), deletion requests, refunds and acceptable use. Reference the Philippine Data Privacy Act of 2012.
   - A banner on each: "Draft: under review". Make it one flag I can switch off once reviewed.
   - Contact: a simple form or mailto. Use a placeholder email and ask me for the real one.
   - Link all four in the footer, plus "By continuing you agree to the Terms and Refund Policy" in the plan modal.
2. Search engines: in robots.txt, disallow /g/, /contribute/, /sites/, /dashboard, /auth, /admin, /dev/. Add noindex meta and an X-Robots-Tag header on /g/*, /contribute/*, /sites/*, /dashboard and /dev/*. Keep marketing, /themes, /example/* and legal pages indexable. Add sitemap.xml with marketing pages only.
3. Link previews (no page has an og:image today):
   - A default 1200x630 og:image for marketing pages.
   - /contribute/[slug]: server-rendered title "Add a note to [Recipient]'s [occasion] gift" and a generated image with the theme art.
   - /g/[slug]: "A gift for [Recipient]" with the theme's opening object. Never include note content.
   - These tags must be in the server HTML. Verify with curl. Add matching twitter:image.
4. Slugs: new gifts get random slugs only (at least 10 characters, lowercase letters and digits, no lookalike characters). No names in URLs. Old slugs keep working. Keepsake custom slugs are cleaned and checked for uniqueness.
5. Security headers via Vercel config: Content-Security-Policy (list every source you allow and test embeds, fonts, PayMongo, storage), frame-ancestors 'none', X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy allowing only microphone and camera where used. Test voice notes, the candle mic, video and checkout afterwards.
6. Report a gift: a small, quiet "Report" link on /g/ and /contribute/ pages that sends me a report (reason plus slug). An admin can disable a gift. Gifts are public links with user content, so this is required before launch.

==================================================
PR 2: INPUT HARDENING AND RELIABILITY
==================================================
1. Double submits: triple-tapping "Send it" on the friend page created 3 identical notes. Disable buttons while sending, and make every create action idempotent on the server using a client-generated submission ID (gift, organiser notes, every note type, uploads).
2. Length limits with a visible counter near the limit, the same limits enforced on the server, and specific error messages:
   recipient name 40, heading 80, message under title 280, opening small line 48, button 40, greeting 120, section titles 60, footer 200, friend name 40, letter 2,000, single word 24. Set sensible limits for every other field and list them in the PR.
   (A long friend name currently fails with "Something went wrong", and the heading and message have no limit.)
3. Trim whitespace before validating. A spaces-only recipient name currently fails with "Couldn't create that gift. Please try again."
4. Specific errors instead of generic ones. Keep what the user typed on failure. Return proper HTTP status codes (401, 403, 404, 422, 429) from server functions instead of 200 with an error payload.
5. Long text in every theme and format: Storybook cover overflow, long notes running past the page, names hidden behind the ribbon on bridal and wedding openings, and a monogram built from stray characters ("T&<"). Shrink to fit, then wrap, then truncate. Long notes continue onto the next page or scroll. Monograms use letters only.
6. Worst-case test page at /dev/worst-case (dev only, noindex): every theme opening and every format with a 40-character name with emoji, an apostrophe and an ampersand, an 80-character heading, and a 2,000-character note. Screenshot it.
7. Uploads: check file type and size on the server (photos, voice, video), strip photo location data, and show friendly errors for unsupported files.
8. Rate limiting on the friend page and other public endpoints (per IP and per gift), with a friendly 429 message.
9. Error monitoring: add Sentry (or use what's there) for client and server errors, with no note content or personal data in error payloads. Fix the React hydration error #418 on the homepage (likely the live countdown or other time-based text).

==================================================
PR 3: PAYMENTS AND GIFT LIFECYCLE
==================================================
Do not touch PayMongo keys or set PAYMONGO_ALLOW_LIVE. Test with test mode locally only, and only if it is already configured. If it isn't, review the code paths, write tests with mocked webhooks, and tell me what I need to test by hand.
1. Webhooks: verify signatures, handle each event idempotently (the same event twice must not double-activate), and log events.
2. States: success, failure, cancel, and "paid but the redirect never came back". The gift must unlock from the webhook even if the user closes the tab. Clear screens for each state.
3. Receipt email after payment (plan, amount, gift name, link).
4. Enforce plan limits on the server (contributors, photos, formats, password, custom slug). Show a clear upgrade message when a limit is hit. The organiser always sees the limits before paying.
5. Plan expiry: decide and implement what happens when a plan ends (suggest: the gift shows a gentle "This gift has been wrapped up" page and the organiser can download or extend). Email the organiser 14 days before expiry. Write the decision in docs/NEXT-SESSION.md.
6. Account and data: the organiser can delete a gift (already exists; confirm it also deletes stored media), delete their account, and export a gift's notes and media as a zip.

==================================================
PR 4: EDITOR AND ORGANISER FIXES
==================================================
1. One note count everywhere. In the gift = approved friend notes + organiser notes. Waiting = pending. Hidden = hidden. Use the same numbers and words in the top bar, the Notes badge, Wrap it up and the dashboard. The friend page counts people, not notes, and leaves out the organiser.
2. Section titles: Words only shows fields for 8 of the 16 sections. Every turned-on section with a title needs a field. Move the Countdown and Time capsule dates into a "Dates" group.
3. Warnings: block turning off the last section, warn before turning off a section that has notes, and on the friend page show "The organiser is still setting this up" if no sections are on. Build the friend page's "Add a note, a photo or a song" line from the sections that are actually on.
4. The top bar title must update when the heading changes (one source of truth).
5. Step checkmarks only after the user changes something or taps Next.
6. Moderation: add Delete with a confirmation, Undo after Approve or Hide, "Show more" for long notes, and Approve all.
7. Fix "Skip intro" in the editor preview.
8. Mobile editor: the bottom sheet opens at about 45% height with a drag handle so the preview stays visible.
9. People builder: tall hair styles must never cover the eyes and brows, and every skin part must use the same tone. Add a dev grid of every hair style with every skin tone and screenshot it.
10. Character library: a shimmer or blurred skeleton instead of faceless bodies while loading, labels that never cut off, and category tabs that scroll sideways with a fade.
11. Sample notes match the occasion and are clearly labeled as samples in every format.
12. The friend page shows 4 note types plus "More".

==================================================
PR 5: METRICS
==================================================
Track: gift_created, invite_shared (channel), friend_page_viewed, note_added (type), gift_wrapped, plan_purchased (plan), gift_opened, make_your_own_clicked (source).
- Use the existing analytics tool if there is one. Otherwise log to an events table in Postgres. Don't add a third-party tracker without asking me. No note content in events.
- An admin-only page showing: % of gifts with 5 or more notes, friend-page visit to note conversion, wrap and pay conversion, recipient open rate, and median time from sign-up to first share.
- If analytics needs a cookie notice, add a minimal, privacy-first one.

==================================================
PR 6: DESIGN FOUNDATION AND APP SHELL ("Keepsake Modern")
==================================================
Direction: a warm, editorial, paper-like brand where the UI stays quiet and the gift is the hero. Principles: the gift is the hero; paper, not plastic; one brand color used rarely; emotion over features; one job per screen.

STEP 1, APPROVAL FIRST: build /dev/design (dev only, noindex) showing the tokens, type, components, logo and a redesigned homepage hero. Send me phone and laptop screenshots and wait for my OK before applying it site-wide. This step matters because the font change shifts the whole personality.

1. Tokens (app and marketing UI only; themes keep their own palettes): paper #FAF6F0, surface #FFFFFF, ink #2B2522, ink-muted #6B625C, line #EAE3DA, raspberry #C2366B, raspberry-deep #9E2455, blush #FBE3EA, and occasion accents for tags and filters only: butter #F6D77A, sage #A9C5A0, sky #A8C8EC, lilac #C9B8E8. No pink page or panel backgrounds. Check AA contrast for every pair.
2. Type: Fraunces (variable, soft optical style) for display, replacing Fredoka. DM Sans for UI. Remove the monospace from marketing and UI (keep it inside themes that need it). Scale 64, 48, 36, 28, 22, 18, 16, 14, 12. Minimum 12px. Self-host and subset. Theme fonts load only when that theme renders.
3. Shape and depth: radius 8, 16, 28, with pills only for buttons and tags. Two shadows only ("rest" and "lift"). 8pt grid. A subtle paper grain at 2 to 3% opacity.
4. Motion: 150 to 250ms ease-out, no bouncing UI, respect reduced motion. Build one "fold and tie" transition for send and wrap moments.
5. Icons: one line set (Phosphor or Lucide, 1.5px). Replace all system emoji in the UI.
6. Logo: a lockup with a gift-tag mark (tag with a small heart cutout) plus the wordmark in Fraunces, in horizontal, stacked, favicon, app icon and monochrome versions. Use it in every header, the footer, emails and share images.
7. Bo rules: only in the homepage hero, empty states, success moments, 404s and the final call to action. Never roaming, never covering content or controls, one at a time. Remove roaming Bo and speech bubbles from marketing pages and the editor. No hopping or talking Bo on /g/ pages.
8. Rebuild the core components on the tokens: buttons, inputs, textareas with counters, toggles, chips, tags, cards, modals, sheets, toasts, tabs, tooltips, empty states, skeletons.
9. Apply to the app shell: header (lockup, labelled icon buttons), footer (product links, legal pages, contact, socials, "Made in Manila"), toasts, modals, auth, the plan modal, the dashboard (gift cards with theme art, status Collecting, Ready to send, Sent, Opened, search and sort once there are more than 9 gifts) and the three 404 pages. For /g/ and /contribute/ 404s, the button says "Ask whoever sent this for a new link", with "Make your own gift" as the secondary action.
10. Write docs/brand.md: principles, tokens, type, logo usage, Bo rules, voice (plain, warm, specific), and dos and don'ts.

==================================================
PR 7: HOMEPAGE, PERFORMANCE AND ACCESSIBILITY
==================================================
1. Homepage, 8 sections in this order:
   1. Hero: Fraunces headline "One gift from *everyone* who loves them." (italic on "everyone"), one line of subtext, one raspberry "Make a gift" button and a quiet "See an example" link, with a large phone playing a real gift opening and no controls around it. Fits above the fold at 1440x756 and 390x844.
   2. Proof strip: room for a real count and 3 testimonials. Clearly marked placeholders, hidden in production until I supply real ones. Never ship invented quotes or numbers.
   3. How it works in 3 steps (Set it up, Friends add, They open it) with large visuals.
   4. "The moment": a full-width video section. Placeholder until I supply footage; hide it in production until then.
   5. Themes: a large horizontal gallery that plays openings on hover (desktop) or in view (mobile), with occasion chips and "See all themes".
   6. What friends can add: 6 tiles (Letters, Photos, Voice notes, Videos, Songs, Open-when letters) and "Plus quizzes, awards, maps and more."
   7. Pricing: three cards on white, pesos plus approximate USD, "Pay only when you send it", and "Prices are in pesos" clearly visible. Change Keepsake's "debuts" to "18ths, weddings and big anniversaries", or show "debuts" to PH visitors only.
   8. FAQ, then a final call to action on a deep ink background with Bo.
   Move the full formats section to a new /formats page with an interactive switcher (the same gift shown in each format), and keep a small teaser on the homepage.
2. Performance: load homepage audio, video and demo gifts only on interaction or when in view (two voice files currently download twice). One H1 per page. Report before and after request count, total size, LCP and CLS on a throttled mobile profile. Targets: LCP under 2.5s, CLS under 0.1.
3. Accessibility: a <main> landmark, a "Skip to content" link, aria-labels on all icon-only buttons (logout, mobile "+", and the two unnamed homepage buttons), reduced motion for confetti, floating items and auto-scrolling demos, and visible focus states. Target Lighthouse accessibility 95 or higher on the homepage, /create, the editor, /contribute and /g.

==================================================
PR 8: LAUNCH QA (report, fix small things, list the rest)
==================================================
Test end to end on local at 390x844 and 1440x756, plus iOS Safari and Android Chrome (real device or the closest emulation available), on a throttled "slow 4G" profile. Screenshot every screen. Write results to docs/LAUNCH-CHECKLIST.md as pass or fail with notes.
1. Sign up as a new user, and sign out and in.
2. Create a gift with a 40-character name with emoji, an apostrophe and an ampersand.
3. Check every theme opening and format on /dev/worst-case.
4. From two separate browser profiles, add notes as two friends: a 2,000-character letter, 3 photos, a voice note, a video and a song. Tap Send rapidly; there must be no duplicates.
5. Approve, hide, delete and undo as the organiser. Counts must match everywhere.
6. Turn sections on and off and confirm the warnings.
7. Wrap it up through plan selection and checkout (test mode only if already configured). Test success, cancel, failure and closing the tab mid-payment.
8. Open the gift as the recipient on a phone, from the intro to the last page, with sound on and off.
9. Check link previews (curl the meta) for the homepage, a friend link and a gift link.
10. Confirm noindex on private pages, security headers, legal pages, report-a-gift, account deletion and export.
11. Check that Sentry receives a test error.
12. Run Lighthouse on the homepage, /create, the editor, /contribute and /g, and record the scores.
List anything that fails and isn't fixed in this PR at the top of the checklist under "Launch blockers".

==================================================
THINGS ONLY I CAN PROVIDE (ask me; use placeholders hidden in production until then)
==================================================
- The real contact email and social links
- Real testimonials, usage numbers and "moment" footage
- Confirmation that the legal pages were reviewed (until then they show the draft banner)
- Sign-off on /dev/design before PR 6 is applied site-wide
- The email provider for receipts, if none exists

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
- Existing gifts must keep working after every PR. Spot-check old gifts in several themes and formats each time.
- Check every change in a real browser at 390x844 and 1440x756, and send before and after screenshots.
- Keep everything polished, playful and hard to copy.
- Make sensible calls without asking, except where this prompt says to ask. Give short, casual updates and say what you chose.