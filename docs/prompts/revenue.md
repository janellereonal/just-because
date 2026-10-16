Project: Just Because (justbecause.site), repo janellereonal/just-because.

Before anything else, read CLAUDE.md, HANDOFF.md (section 0 first), docs/NEXT-SESSION.md, and tools/README.md.

HOW THIS FITS WITH OTHER WORK
- A separate "launch" prompt is running in another session (trust and privacy, inputs, payments, editor fixes, metrics, design foundation, homepage, launch QA). Don't do its work, and don't touch the files it is changing unless this prompt says so.
- I'm also editing the site myself at the same time. Before starting each PR, pull the latest main and branch from it. Before opening each PR, rebase on main again. If there's a conflict, keep my changes and adapt yours. Keep PRs small and focused.
- PR 3 and PR 4 below touch checkout and plans. Don't start them until the launch prompt's payments PR ("PR 3: Payments and gift lifecycle") is merged. Check this yourself first, and if it isn't merged, skip ahead and come back.

GOAL
Make Just Because income-generating and make its themes the best of any group gift product in the world. Competitors offer backgrounds behind a grid of messages, still cards or video montages. Our edge is physical objects people open with a gesture (blowing out candles with the mic, pressing a wax seal, tearing a boarding pass). This prompt turns that edge into a system and adds the first revenue streams.

We are building a global brand. The Philippines is our first market, not our only one. Every feature, theme and piece of copy must work for a global audience, with local collections added on top.

Do this as SIX separate PRs, in this order (respecting the wait rule above). Then do PR 7 (docs only).

==================================================
PR 1: THEME ENGINE AND THEME BIBLE
==================================================
Build a reusable theme engine so new premium themes take days, not weeks. Do NOT migrate or change the existing 13 themes in this PR; new themes use the engine, and we migrate old ones after launch.

1. Gesture library: reusable, tested interactions: tear, peel, pull, untie, blow (mic, with a tap fallback), shake (device motion, with a tap fallback), scratch, press and hold, slide, spin, unfold, pop, wipe. Each must work by touch, mouse and keyboard, with a reduced-motion version.
2. Materials and effects: paper, cardboard, wax, foil, fabric, glass, capiz, frost, wood and metal looks; particle presets (confetti, petals, snow, sparks, dust); a consistent lighting setup that matches the current 3D style.
3. Sound and haptics: short sound packs per material (paper tear, tape pull, wax crack, ribbon pull, bell), haptic taps where the phone supports them, all respecting the gift's mute toggle.
4. Personalisation slots every theme can use: recipient name, age, date, place (city, country or destination), sender's place, photo, monogram (letters only), and two accent colors. Each slot has a sensible fallback when empty.
5. Theme definition format: one config file per theme that combines an object, a gesture, materials, effects, sound, personalisation slots, a palette, its categories and regions, a premium price (or free), plus how it hands off to each format.
6. Performance budget, checked by a script (and in CI if CI exists): initial theme payload under about 400KB compressed (excluding the user's own photos), smooth (aim for 60fps, never janky) on a mid-range Android profile with 4x CPU throttling and slow 4G. Assets lazy-load after the first frame.
7. A dev playground at /dev/themes (dev only, noindex) to preview any theme with any personalisation values and worst-case input, on phone and laptop sizes.
8. Translation-ready: every piece of text in themes, the engine and new UI goes through a single translation layer (one strings file per language, English first). Don't translate anything yet. Dates, numbers and currencies use the visitor's locale.
9. Theme Bible: write docs/theme-bible.md. Every theme must pass all 8 checks before it ships:
   1. A real object (cake, envelope, box), not an abstract background
   2. A gesture that fits the occasion
   3. Personal inside the object (name on the boarding pass, real age in candles, monogram on the seal)
   4. A clear payoff moment (sound, light, motion)
   5. Sound and haptics, subtle and mutable
   6. Works with every format
   7. Meets the performance budget on a mid-range Android phone
   8. Handles long names, reduced motion and missing photos gracefully
   Add a section on cultural themes: themes for a culture are built or reviewed with people from that culture, use authentic details, and avoid stereotypes.
   Score each existing theme against the 8 checks in a table in the doc (audit only, no changes), and list the top 3 improvements per theme for after launch.

==================================================
PR 2: CHRISTMAS, GLOBAL AND FILIPINO-FIRST THEMES (time sensitive)
==================================================
Build these on the new engine, at least as polished as the best current themes. Every one must pass the Theme Bible.

Global:
1. Winter Cabin Christmas: a frosted cabin window you wipe clean to reveal a warm room with a tree. Each note is an ornament you tap to read. Palette of snow white, pine green, warm amber. Category: Holidays.
2. Care Package: a cardboard parcel with stamps and labels from the sender's and recipient's countries. You peel the tape, the flaps open, and the notes come out as items packed inside (a folded letter, a photo in a frame, a small jar, a toy). For any family or friends living apart, in any country, for any occasion. Category: Family and Just because.

Philippines collection:
3. Balikbayan Box: built on the same engine as Care Package, styled as a real balikbayan box with its typical markings and shipping labels showing the sender's and recipient's cities. Warm, homey palette. For OFWs and families apart, for any occasion, not only Christmas.
   Naming: show Balikbayan Box first to visitors from the Philippines and to anyone who searches for it, and Care Package first to everyone else. Both stay available to everyone in the gallery.
4. Parol Christmas: a large capiz parol star. Each note lights one part of the star; when all are lit, the parol glows fully with a soft bell sound. Palette of deep night blue, gold and warm capiz white. Category: Holidays.
5. Simbang Gabi mode (an option on Parol Christmas): notes unlock one per night from Dec 16 to Dec 24 in the recipient's time zone, nine in total, with the last opening on Christmas Eve. If the gift has more than nine notes, group them per night. Reuse any existing "one a day" or time capsule logic.
6. Debut (18th birthday): based on the real tradition. The opening is a grand doorway or curtain with 18 candles and 18 roses; the recipient lights or receives each one, and each holds a note ("18 treasures"). Elegant palette (ivory, blush, gold). Category: Birthdays, Philippines collection.

For each theme:
- Write the occasion template entry if an occasion config file exists (default format, sections, 3 to 5 friend prompts, example copy). If it doesn't exist yet, add the data in the theme config and note it in the PR.
- Use only original artwork and our own 3D style. No copyrighted characters, logos or brands.
- Add them to the theme gallery under "New", plus "Christmas" for the holiday themes and "Philippines" for the PH collection. Add them to the worst-case page if it exists.
- Mark all six as free for launch.
- Screenshot every opening at 390x844 and 1440x756, and record a short screen capture of each opening if possible.

Also, a small change to an existing theme: let the Happy Birthday cake show the real age when the organiser enters it (an optional "Turning" field). Use number candles for ages over 10. Fall back to the current candles if empty.

==================================================
PR 3: PRICING, TIERS, ADD-ONS AND PAYMENTS (wait for the launch payments PR)
==================================================
Never touch PayMongo keys or set PAYMONGO_ALLOW_LIVE. Test only in local test mode if already configured.

1. Free starter tier: up to 5 contributors, Scrapbook format only, live for 30 days, with a "Made with Just Because" end card. No password or custom link. Enforce on the server. Make the upgrade path obvious and friendly when they hit a limit ("You've got 5 friends in. Upgrade to add more."). Add basic abuse limits (free gifts per account per month).
2. New top tier: "Heirloom" for weddings, memorials and retirements: unlimited contributors and photos, all formats, password, custom link, live for 10 years, and a printed book discount once books exist. Recommend it by default for those occasions.
3. Regional pricing and payments:
   - Philippines: ₱299 / ₱599 / ₱999 / ₱1,999 (Sweet, Celebration, Keepsake, Heirloom).
   - Other countries: about $7.99 / $14.99 / $29.99 / $49.99, or the local-currency equivalent for major currencies (USD, EUR, GBP, AUD, CAD, SGD), rounded to clean local prices.
   - Detect the country server-side, and let users switch currency manually.
   - First, check what our PayMongo setup supports for international cards and non-PHP currencies, and the fees. Write the findings in docs/NEXT-SESSION.md, with a recommendation on adding a global processor (for example Stripe) for non-PH buyers while keeping PayMongo for the Philippines (GCash, Maya, local cards). Don't add a new processor or any keys yourself; stop and ask me.
   - Until a global processor exists, charge in PHP and show the approximate local amount clearly.
   - Put all prices in one config file so I can change them without code changes.
4. Add-ons at checkout, each optional and clearly priced (PH / international):
   - Extend live time by 1 year: ₱149 / $3
   - Video slideshow export: ₱199 / $4.99 (only if export exists; otherwise hide it and note it)
   - Remove "Made with Just Because" branding: ₱99 / $2.99
   - Premium artist theme: ₱99 to ₱199 / $2.99 to $4.99, set per theme in the theme config
5. Update the plan modal, pricing section and FAQ copy to match, in plain global English (no region-specific words in the main UI). Keep "Pay only when you send it". Plan features must match what the server enforces.
6. Add purchase events with plan, add-ons, region, currency and theme to the metrics from the launch prompt.

==================================================
PR 4: REMINDERS ENGINE (wait for the launch payments PR)
==================================================
1. On create (or in the editor's Words step), ask for one optional future date: "When's [Recipient]'s birthday?" (or anniversary, depending on the occasion). Store it with the gift.
2. On the friend page, after sending a note, offer an opt-in: "Remind me before [Recipient]'s birthday next year" with an email field. Unchecked by default. Store consent with a timestamp.
3. Send a reminder email 14 days and 3 days before the date, in the person's time zone ("Ana's birthday is in 2 weeks. Want to make her one?"), leading to /create with the recipient and occasion pre-filled. Organisers get the same for gifts they created.
4. Every email has a one-click unsubscribe, and people can see and delete their reminders from a simple page (linked in every email).
5. Use the email provider set up by the launch work. If none exists, build everything behind a flag, then stop and ask me.
6. Add a short "Reminders" section to the privacy policy draft (what we store, why, how to stop).
7. Track reminder_opt_in, reminder_sent, reminder_clicked and gift_created_from_reminder.

==================================================
PR 5: CONCIERGE ("WE'LL HANDLE IT") BETA
==================================================
A simple manual service for the first customers. No automated payment yet.
1. A "Want us to handle it?" option on the create page and in the editor: we chase the friends, tidy the photos and assemble the gift. Price shown as ₱1,499 / $49 (from the pricing config), marked "Beta, limited spots".
2. A short request form: recipient, occasion, deadline, number of friends, how to reach the organiser, time zone, and notes.
3. Save requests to the database and email me. An admin-only page lists requests with status (new, contacted, in progress, done) and a link to the gift.
4. Payment is handled by me manually for now. Show "We'll contact you within 24 hours with next steps."

==================================================
PR 6: THEME METRICS
==================================================
Add theme_id, format and region to the relevant events from the launch metrics work (gift_created, gift_opened, plan_purchased) and add: theme_opening_started, theme_opening_completed, theme_replayed and theme_shared.
On the admin page, add a per-theme table: gifts created, open completion rate, replay rate, share rate, paid conversion and make-your-own rate, with a filter by region. Sort by paid conversion. This decides which themes we build more of.

==================================================
PR 7: REVENUE AND GLOBAL ROADMAP (docs only, no building)
==================================================
Append to docs/roadmap.md (create it if it doesn't exist). For each item: problem, scope, pricing, dependencies, risks, and open questions.
1. Printed keepsake book: ₱1,990 to ₱3,500 / $49 to $89 through a print-on-demand partner. List 3 partner options that ship in the Philippines and internationally, and what we'd need (print-ready PDF specs, image resolution checks).
2. Chip-in fund: friends add money with their note; the recipient gets a payout (GCash, Maya or bank in the Philippines; local options elsewhere) or a gift card. Revenue from a small contributor-paid fee plus gift card margins. Flag clearly: holding or sending money is regulated (in the Philippines, BSP e-money rules; other countries have their own), so this must use a licensed partner and needs legal review before building.
3. Just Because for Teams: company birthdays, farewells, work anniversaries and welcomes, with central billing, Slack and HR system reminders and branded themes. Price benchmark: $25 to $399 a month (Kudoboard, GroupGreeting). First market: Philippine BPOs, startups and agencies, then global remote teams.
4. Artist marketplace and drops: illustrators from around the world design themes on the engine and earn a royalty per use. Seasonal limited drops with named artists. Include a draft royalty model and a submission and review flow.
5. Gift commerce: attach a real gift (flowers, cake, food box, a real balikbayan box) through delivery partners per country, with a commission per order.
6. Theme migration: move the existing 13 themes onto the engine, in order of usage from the theme metrics, applying each theme's top 3 improvements from the Theme Bible audit.
7. Going global:
   - Payments: a global processor alongside PayMongo.
   - Languages: the first 3 to add and why, based on where traffic comes from once we have data.
   - Local collections per country, with candidates US, UK, Australia, Indonesia, Mexico and Brazil.
   - Milestone birthday traditions in other cultures using the Debut pattern: Quinceañera, Sweet 16 and 21st, each built with input from people from that culture.
   - Global seasonal themes: Lunar New Year, Diwali, Eid, Hanukkah, Thanksgiving, Mother's Day and Father's Day.

==================================================
THINGS ONLY I CAN PROVIDE (ask me; use placeholders hidden in production until then)
==================================================
- Final prices if I want to change any of the suggestions
- Whether to add a global payment processor, and its keys (I add keys myself)
- Who handles concierge requests, and the email they go to
- Names of artists for the first drop (later)
- Legal review before chip-in is built

==================================================
RULES
==================================================
- Never push to main. Branch off main for each PR.
- Before each PR, run `npx tsc --noEmit` and `NITRO_PRESET=node bun run build`. Both must pass.
- Open the PR; I merge it myself.
- Test on local Postgres. Ask before using the real DATABASE_URL.
- Never touch PayMongo keys or set PAYMONGO_ALLOW_LIVE. Never add, paste or store secrets or keys for any provider.
- Copy: plain and friendly, no em dashes, max one exclamation mark per screen, written for a global audience. Cultural themes should feel authentic, not touristy.
- Bo keeps roaming on pages (I like that), but never covers content, controls or the preview. No hopping or talking Bo on /g/ gift pages.
- Original artwork only. No copyrighted characters, brands or logos in themes.
- Existing gifts and themes must keep working after every PR.
- Check every change in a real browser at 390x844 and 1440x756, and send screenshots.
- Keep everything polished, playful and hard to copy.
- Make sensible calls without asking, except where this prompt says to ask. Give short, casual updates and say what you chose.