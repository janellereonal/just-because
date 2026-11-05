# Design polish: research, audit and next ideas (5 Nov 2026)

Overnight pass before the 7 Nov deadline, on branch `design-polish`. Goal: make Just Because feel world class
with small, safe visual fixes tonight, and write up the bigger ideas instead of building them.

Tested on a local Postgres with a fresh test account, at 390x844 (phone) and 1440x900 (desktop), dev
server and production build. The live site could not be reached from the cloud session (the network
policy blocks it), so nothing here was checked on justbecause.site.

## 1. What the best consumer apps do (principles only)

Research covered our competitors (Kudoboard, GroupGreeting), Partiful, Apple Invites, Spotify Wrapped,
Duolingo, Finch, Paperless Post, Stripe Checkout and a few Awwwards sites. We take principles, never looks,
assets, characters or text.

| Principle | Seen in | What it means for us |
|---|---|---|
| Show the price before people put work in | Kudoboard reviews (top complaint) | Keep "friends add notes free, you pick a plan when it's ready" near every start button |
| No login for friends is the big advantage | Kudoboard reviews, Apple Invites | Say "No account needed" on the friend page (we do) and in the invite message |
| A blank box is the hardest part | Kudoboard reviews | Starter lines friends can tap on the friend page |
| Organisers want to see who's in and nudge the rest | GroupGreeting reviews | A who-added strip and a gentle reminder in the editor |
| The share moment needs the biggest button | Partiful critiques | After creating, one big "Send to friends" that opens the phone's share sheet |
| The link preview is the real first impression | Apple Invites | Every share link gets a strong title and image (we have OG images, keep them sharp) |
| One beat per screen, a little mystery before each reveal | Spotify Wrapped | Optional story mode for the recipient, a saveable end card |
| A tiny motion system: fade + move, fade + grow, move a bit longer than the fade | Spotify Wrapped 2020 | Used for tonight's loader and send pop |
| Celebrations scale with the moment | Duolingo | Small pop for one note, a bigger party for paying and opening |
| The mascot reacts to what you do, never nags | Duolingo, Finch | Bo has moods tied to events; keep reminders warm, no guilt |
| A slow reveal kills it | Paperless Post (their 9 second envelope hurt RSVPs) | Openings stay short and always skippable (ours are) |
| Every tap answers right away; name the amount on the pay button | Stripe Checkout | Pay button shows the amount; a live "confirming" state; a success page with no doubt |

## 2. Page by page audit

Screens from tonight are kept locally (not committed). What we saw, what was fixed tonight (✅), and what
is left (→).

### Homepage
- Strong first impression: clear headline, a real gift playing in a phone, the hopping Bo works.
- ✅ The phone mock's camera pill covered the opening's top line ("HAPPY BIRTHDAY").
- ✅ On the hero phone the Cake buttons ran off both edges of the screen; they now wrap.
- → The page calls them "formats" in two places ("Ten ways to open the same gift", "All 10 formats" in
  Plans) while the rest of the product says "styles". Worth one wording pass (left alone tonight since the
  launch-marketing branch may be editing the homepage).
- → On phones the formats list is ten tall cards in a row, about two and a half screens. A sideways
  scroller would keep the page moving.
- → "How it works" card 04 has a tall empty gap under Bo on phones.

### Styles gallery (/styles)
- The cards play their openings; the occasion chips are clear.
- → On phones it is one big card per screen, 21 styles, about 16,000 px of scrolling. Two columns of
  smaller cards (tap to play) would let people compare. Bigger change, see ideas.

### Starting a gift (/create)
- The guide, the numbered steps, the sticky "Create the gift" bar and Bo's lines all work well.
- ✅ After "Create the gift" the screen went blank while the editor's code loaded. There is now a calm
  loader (three soft dots that fade in only if the wait is longer than a quarter second). It applies to
  every page change in the app.
- → The guide's "Pick a style" art is plain colour pills, which reads more like a colour picker.
- → The section preview uses the sample name "Ana" even after you type the real name.

### Editor (/sites/:id)
- Clear four step flow, live preview, phone and laptop views.
- → On phones the title truncates to "Happy birt…" next to the ••• and Wrap it up buttons. Showing
  "For Mia" there would read better.

### Friend link page (/contribute/:slug)
- Lovely: the gift's own colours, "It'll look something like this", "No account needed".
- ✅ Sending a note now ends with a small paper pop in the gift's colours, timed to land once the page has
  scrolled back to the message (nothing under reduced motion).
- ✅ After sending, the page now scrolls so "Your note is on its way to Mia" stays in view (it was cut off).
- ✅ "Send it" and "Add something else" get the same soft press as the rest of the app.
- ✅ "Here's the gift so far" and its count stack on phones instead of squeezing into one row.
- → Starter lines for the message box (Kudoboard's top request).

### Paying (Wrap it up, /checkout/:orderId)
- The checklist before paying is clear, and the paid screen (mint card, Bo, confetti, link, open button) is
  already a good "no doubt" moment.
- ✅ "Confirming your payment…" now has live dots, so it never looks frozen.
- ✅ The blank screen before the checkout page appears is covered by the new loader.
- → Put the amount on the final pay button ("Pay ₱599 and wrap it up"), Stripe style.
- → On the paid screen, one line on what to do next: "Send this link to Mia when you're ready."

### Recipient opening (/g/:slug)
- The best part of the product. Knock, the friends tumble out, the cake, then the party table. No hopping
  or talking Bo, as agreed.
- → The end of the gift ("With love from Sofia and Mateo" + Share) could be a proper end card the
  recipient can save, Wrapped style.
- → The first fraction of a second before the story is plain paper; fine, but a soft fade in would hide it.

### Dashboard (empty)
- ✅ On phones, Bo's peek sat over the heading. He now peeks out from the side of "New gift".
- → Three buttons all start a gift ("+" in the header, "New gift", "Start a gift"). One would be calmer.

## 3. Built tonight (small and safe)

| Change | Files |
|---|---|
| Default page loader for the router (no Bo, fine on /g/) | `src/components/RouteLoading.tsx`, `src/router.tsx` |
| Loading dots on `PageLoading` and "Confirming your payment…" | `src/components/PageStates.tsx`, `src/pages/CheckoutStatusPage.tsx` |
| Send pop, scroll fix, press feedback, stacked header on the friend page | `src/components/ui/SendBurst.tsx`, `src/pages/ContributePage.tsx` |
| Opening top line clear of the phone mock's camera pill | `src/themes/_shared/opening.tsx` (class `jb-opening-kicker`), `src/styles/polish.css` |
| Cake opening buttons wrap on narrow screens | `src/themes/birthday/Opening.tsx` |
| Dashboard Bo peeks from the side on phones | `src/routes/_authenticated/dashboard.tsx` |

All new CSS is in `src/styles/polish.css` and stops under reduced motion. New copy is in
`src/copy/strings.ts` (`LOADING_COPY`). No data, pricing or payment code was touched.

## 4. Bigger ideas (not built)

In rough order of impact for launch week and after.

1. **One big "Send to friends" moment after creating.** Today the editor opens on the Words step. After the
   first create, show a short sheet: the invite link, one big button that opens the phone's share sheet
   (`navigator.share`, copy as fallback), and a ready message ("Help me make Mia's birthday gift. No account
   needed."). This is when organisers are most motivated to invite.
2. **Starter lines on the friend page.** Three or four tappable openers per occasion ("The first time I met
   you…", "A thing you do that nobody notices…"). They fill the box, the friend edits. Words go in `en.ts`
   per occasion.
3. **Who's in, and a gentle nudge.** In the editor, a row of friend initials with their notes, a count
   toward the plan cap, and a "Send a reminder" that copies a warm reminder message. Never guilt.
4. **Pay button with the amount, plus "what happens next".** "Pay ₱599 and wrap it up", a line under it
   ("You'll come back here and get the link for Mia"), and on the paid screen a short next step.
5. **Recipient end card.** After the last note, a card with "From 12 friends, just because", the friends'
   names and the gift's colours, which the recipient can save as an image or share. Wrapped proved this is
   the part people post.
6. **Recipient "thank everyone".** A single reply (a line or a voice note) the recipient sends back to all
   friends. Brings friends back and shows them the product from the other side.
7. **Styles gallery on phones.** Two columns of smaller cards with a still frame; tap to play the opening in
   a sheet with "Use this style". Cuts the page from about 16,000 px to about 4,000 px.
8. **Bo fills up as notes arrive (organiser side only).** Bo's box gets a ribbon, a sticker, a bow as notes
   come in (3, 5, 10). Celebrations scale with the milestone, Duolingo style. Never on /g/.
9. **Story mode for the recipient (optional).** One note per tap, the name revealed a beat after the words,
   layouts rotating so no two in a row look alike. An option per gift, never forced.
10. **One wording pass on "styles" vs "formats"** across the homepage, plans and editor.

## 5. How this was tested
- `npx tsc --noEmit`, `bun test src` (245 pass), `NITRO_PRESET=node bun run build`.
- Playwright in Chromium at 390x844 and 1440x900: create to editor, friend page send (frame by frame for
  the pop), checkout pending and paid (local test orders in the local database), recipient opening, dashboard.
- Production build smoke test: `/`, `/styles`, `/create`, `/contribute/…`, `/g/…` load with no console errors.
