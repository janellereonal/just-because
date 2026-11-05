# Design inspiration, audit and next ideas (5 Nov 2026)

Overnight design pass before the 7 Nov deadline, on branch `design-polish`. Goal: make Just Because feel world
class with small, safe visual fixes tonight, and write up the bigger ideas instead of building them.

How it was checked: a local Postgres with a fresh test account, at 390x844 (phone) and 1440x900 (desktop), on the
dev server and the production build. The live site couldn't be reached from the cloud session (its network policy
blocks it), so nothing here was checked on justbecause.site. We take principles from other apps, never their looks,
assets, characters or words.

## 1. Apps studied and what we can learn from each

Sources were read where reachable (some review sites were read through search excerpts). Items marked *(general
knowledge)* weren't checked against a source.

### Kudoboard (competitor, group boards)
- Their top Trustpilot complaint: people set up a board, then find out only a few people can sign before paying.
  **For us:** keep "friends add notes free, you pick a plan when it's ready" next to every start button.
- Reviewers find logging in to write a message annoying. **For us:** no login for friends is our biggest edge. Say it
  in the invite message, not just on the friend page.
- Reviewers ask for suggested wording because "not everyone is as creative". **For us:** starter lines on the
  friend page.
- Organisers ask for reminders by a target date. **For us:** a gentle nudge in the editor.
- The recipient can thank everyone in one go. **For us:** a "thank everyone" reply brings friends back.
- Sources: trustpilot.com/review/www.kudoboard.com, capterra.com/p/182991/Kudoboard/reviews,
  support.kudoboard.com/hc/en-us/articles/360059701493

### GroupGreeting (competitor, group cards)
- The delivered card switches to an envelope and page-turning view. **For us:** the recipient view should feel like
  a different place from the editing view (ours does, keep it that way).
- Organisers love seeing who has signed in real time and reminding the rest. **For us:** a who's-in row in the
  editor.
- Contributors forget to add their name. **For us:** keep "Your name" required and visible before Send (it is).
- Common complaints: generic designs, little cover customisation. **For us:** our styles are the answer; show them off.
- Sources: groupgreeting.com/faq, capterra.com/p/186564/GroupGreeting/reviews, g2.com/products/groupgreeting/reviews

### Partiful
- The invite is the brand: theme, title font and an effect layer stack together. **For us:** each style already
  has its own opening; keep effects to one per style so it never tips into cringe (reviewers call some Partiful
  effects "very 2010 internet").
- Critiques say the share button after creating should take over the screen. **For us:** a big "Send to friends"
  moment right after creating.
- Guests use it on the web with no app. **For us:** the friend page must stay perfect on a phone browser.
- Sources: dailydesignchallenge.com/breakdowns/partiful, ixd.prattsi.org/2025/02/design-critique-partiful

### Apple Invites
- Anyone can RSVP without an Apple account. **For us:** confirms no-login contributing.
- Hosts control what the link preview shows. **For us:** most people first see a gift as a message thumbnail, so
  share titles and images must stay sharp.
- Shared album and playlist built by guests. **For us:** contributed songs could read as one soundtrack.
- Source: apple.com/newsroom/2025/02/introducing-apple-invites-a-new-app-that-brings-people-together

### Spotify Wrapped
- One item per screen, and a short pause before the reveal. **For us:** an optional story mode for the recipient.
- The 2020 team used two motions only, fade and move or fade and grow, with the move lasting longer than the fade.
  **For us:** used for tonight's loader and send pop.
- Templates rotate so slides never feel the same. **For us:** vary note cards in a long gift.
- It ends on a card made to be shared. **For us:** a recipient end card they can save.
- Sources: growth.design/case-studies/spotify-wrapped-psychology, hegeman.co/project/spotify-your-2020-wrapped

### Duolingo
- Celebrations scale with the milestone: their streak moment was redesigned because it wasn't "celebratory enough".
  **For us:** a small pop for one note, a bigger party for paying and opening.
- Characters run on state machines (idle, happy, sad). **For us:** Bo already has moods; tie them to events, never
  random.
- Rewards in the middle of a flow, not only at the end. **For us:** small moments at 3, 5 and 10 notes.
- Don't nag *(general knowledge: Duo's guilt notifications are a meme)*. **For us:** reminders stay warm.
- Sources: blog.duolingo.com/streak-milestone-design-animation, blog.duolingo.com/building-character

### Finch
- The pet grows because you showed up, so the mascot matters exactly where the app asks for effort. **For us:** Bo
  could fill up as notes arrive (organiser side only).
- Idle life without demands; tap the pet for a mood. **For us:** Bo's existing idle and tap reactions are right.
- No cold start: you begin with something already there. **For us:** the organiser's own first note means a gift is
  never empty.
- Sources: svgapp.ai/app-mascots/finch-birb, sophiepilley.com/post/the-magic-of-finch-where-self-care-meets-enchanted-design

### Paperless Post
- Their old envelope took nine seconds and hid the RSVP. The rebuild drops it in already open and lets the page load
  underneath; RSVPs went up. **For us:** openings stay short and always skippable (ours are).
- The outside is personalised (addressed by name). **For us:** "For Mia, from 12 friends" on the outside, which our
  Friends Arrive story already does.
- A neutral frame lets the content shine. **For us:** keep product chrome quiet on /g/.
- Source: medium.com/design-paperless-post/you-re-invited-93c86d417ee5

### Stripe Checkout
- Name the amount on the button ("Pay $64.99" beats "Pay now"). **For us:** "Pay ₱599 and wrap it up".
- If nothing happens right after a tap, people tap again. **For us:** every button answers at once, and waiting
  screens show they're alive.
- The success page leaves zero doubt: headline, check or confetti, summary, next step. **For us:** our paid screen
  now ends with a next step.
- Sources: stripe.com/resources/more/checkout-screen-best-practices, stripe.com/resources/more/payment-successful-pages

### Awwwards picks that fit a cute gifting product
- Teletype (awwwards.com/sites/teletype): a character that sleeps, smiles and strains while you type. Mascot states
  tied to a task.
- SIROPPE (awwwards.com/sites/siroppe): a dancing loader and a playful 404. Loading and error states as brand moments.
- Happy Egg (awwwards.com/sites/happy-egg): press and hold to open. Matches our hold gestures.
- Interactive Christmas Card (awwwards.com/sites/interactive-christmas-card): customise a 3D card, then share it.
  Closest to our model.
- Zepto (awwwards.com/sites/zepto): a mascot that makes payments feel friendly.

## 2. Before and after, page by page

✅ = fixed tonight. → = left for later (see section 4).

### Homepage (/)
- **Before:** strong first impression (clear headline, a real gift playing in a phone, the hopping Bo). But the
  phone mock's camera pill covered the opening's top line ("HAPPY BIRTHDAY"), and on phones the Cake opening's two
  buttons ran off both edges of the mock.
- **After:** ✅ the top line sits below the camera pill (checked: top line at 312px, pill ends at 310px). ✅ The
  buttons wrap inside the screen.
- → It says "formats" in two places ("Ten ways to open the same gift", "All 10 formats" in Plans) while the product
  says "styles". Left alone tonight because the launch-marketing branch may be editing the homepage.
- → On phones the formats list is ten tall cards, about two and a half screens.
- → "How it works" card 04 has a tall empty gap under Bo on phones.

### Styles gallery (/styles)
- **Before:** cards play their openings, occasion chips are clear. On phones it's one big card per screen, about
  16,000px of scrolling for 21 styles. Desktop is fine.
- **After:** unchanged tonight. → Phone layout is idea 4 below.

### Starting a gift (/create)
- **Before:** the guide, numbered steps, sticky "Create the gift" bar and Bo's lines all work well. After tapping
  "Create the gift" the screen went fully blank while the editor's code loaded (seen in screenshots at 250ms).
- **After:** ✅ a calm loader (three soft dots) shows instead. It fades in only after 250ms, so fast loads never see
  it. It's the router's default, so every page change in the app gets it.
- → The section preview says "Ana" even after you type the real name.
- → The guide's "Pick a style" picture is plain colour pills, which reads like a colour picker.

### Editor (/sites/:id)
- **Before:** clear four step flow with live phone and laptop previews. On phones the title truncates to
  "Happy birt…" next to the ••• and Wrap it up buttons.
- **After:** the blank moment on the way in is covered by the new loader. → Show "For Mia" in that title spot.

### Friend link page (/contribute/:slug)
- **Before:** lovely: the gift's own colours, "It'll look something like this", "No account needed". But after
  sending, the page scrolled so "Your note is on its way to Mia" was cut off at the top, there was no moment of
  delight, "Send it" had no press feedback, and on phones "Here's the gift so far" squeezed into one row with its
  count.
- **After:** ✅ a small burst of paper bits in the gift's own colours when a note lands, timed (650ms) so it plays after
  the page has scrolled back (checked frame by frame). ✅ The scroll now keeps "on its way" in view. ✅ Soft press
  on Send it and Add something else. ✅ The header stacks on phones.
- → Starter lines for the message box.

### Paying (Wrap it up, /checkout/:orderId)
- **Before:** the checklist before paying is clear, and the paid screen (mint card, Bo, confetti, link) is already
  a good "no doubt" moment. But the checkout page flashed blank before appearing, "Confirming your payment…" was
  a still card that could look frozen, and the paid screen didn't say what to do next.
- **After:** ✅ the loader covers the blank flash. ✅ Moving dots under "Confirming your payment…". ✅ One line
  under the gift link: "Send this link to Mia whenever you're ready. It's theirs to keep." ✅ Soft press on Copy.
- → Put the amount on the final pay button.

### Recipient opening (/g/:slug)
- **Before:** the best part of the product. Knock on the box, the friends tumble out, the cake, then the party
  table with every note. No hopping or talking Bo. The very first moment before the story is plain paper, and the
  ending ("With love from Sofia and Mateo" + Share) is modest.
- **After:** unchanged tonight on purpose (it's the core experience, and it already works). The loader is Bo-free, so
  it's safe here. → End card is idea 3 below.

### Dashboard (/dashboard, empty)
- **Before:** on phones Bo's peek sat on top of the heading "Let's make the first one".
- **After:** ✅ on phones he peeks out from the side of "New gift". Desktop is unchanged.
- → Three buttons all start a gift on the empty state; one would be calmer.

## 3. Polished tonight

| Change | Why | Files |
|---|---|---|
| Router default loader, three soft dots, fades in after 250ms, no Bo | Blank screens after a tap feel broken (Stripe) | `src/components/RouteLoading.tsx`, `src/router.tsx` |
| Moving dots on `PageLoading` and "Confirming your payment…" | Waiting must look alive | `src/components/PageStates.tsx`, `src/pages/CheckoutStatusPage.tsx` |
| Friend page send burst, scroll fix, press feedback, stacked header | Celebrate each note, small scale (Duolingo) | `src/components/ui/SendBurst.tsx`, `src/pages/ContributePage.tsx` |
| Paid screen next step line, press on Copy | Success page leaves zero doubt (Stripe) | `src/pages/CheckoutStatusPage.tsx`, `src/copy/strings.ts` (`PAID_COPY`) |
| Opening top line clear of the phone mock's camera pill | Hero mock looked broken | `src/themes/_shared/opening.tsx` (`jb-opening-kicker`), `src/styles/polish.css` |
| Cake opening buttons wrap | Buttons ran off the hero phone | `src/themes/birthday/Opening.tsx` |
| Dashboard Bo peeks from the side on phones | He covered the heading | `src/routes/_authenticated/dashboard.tsx` |

All new CSS is in `src/styles/polish.css`, uses one motion rule (fade, then move a little longer, on
`--ease-paper`) and stops under reduced motion. New copy is in `src/copy/strings.ts` (`LOADING_COPY`,
`PAID_COPY`). No data, pricing, payment or server code changed.

## 4. Top 5 bigger redesign ideas (not built)

### 1. A "Send to friends" moment right after creating
- **What changes:** after the first "Create the gift", before the editor, a short sheet with the invite link, one
  big button that opens the phone's share sheet (`navigator.share`, copy as fallback) and a ready message ("Help me
  make Mia's birthday gift. No account needed."). Skippable, shown once per gift.
- **Why it helps:** the gift only works if friends add notes, and organisers are most motivated the second they
  create. Partiful critiques and Apple Invites both put sharing first.
- **How big:** small to medium. One new sheet component, copy in `strings.ts`, an `invite_shared` event that already
  exists. About half a day with testing.
- **Safe before Nov 7?** Yes, behind a flag. It only adds a step; nothing existing changes.

### 2. Starter lines on the friend page
- **What changes:** three or four tappable openers above the message box, per occasion ("The first time I met
  you…", "A thing you do that nobody notices…"). Tapping fills the box; the friend edits.
- **Why it helps:** a blank box is the hardest part (Kudoboard's most requested feature). More friends finish a note.
- **How big:** small. Words per occasion in `src/i18n/en.ts`, chips in `ContributePage.tsx`.
- **Safe before Nov 7?** Yes. It touches only the friend page UI and copy, and the words need one read for voice.

### 3. Recipient end card
- **What changes:** after the last note, a card with "From 12 friends, just because", the friends' names and the
  gift's colours, which the recipient can save as an image or share.
- **Why it helps:** Spotify Wrapped proved the end card is what people post, and every post is an ad for us.
- **How big:** medium. A canvas render like the photobooth frames (`src/lib/photobooth/frames.ts`), shown at the
  end of every body (shared `kit.tsx` footer).
- **Safe before Nov 7?** Risky. It touches the end of every style's body; better right after launch.

### 4. Styles gallery that fits a phone
- **What changes:** on phones, two columns of smaller cards with a still frame; tap to play the opening in a sheet
  with "Use this style". Desktop stays as is.
- **Why it helps:** today it's about 16,000px of scrolling, so most people never see the styles that might fit
  best. Comparing side by side helps people choose.
- **How big:** medium. New phone layout for `/styles`, still images per style (we have the opening engine to render
  them), a sheet for playback.
- **Safe before Nov 7?** Not without stills ready. The layout alone is safe; rendering and checking 21 stills
  takes time.

### 5. Who's in, and a gentle nudge
- **What changes:** in the editor, a row of friend initials with their notes, a count toward the plan cap, and
  "Send a reminder" that copies a warm reminder message with the link. Never guilt.
- **Why it helps:** GroupGreeting reviewers love seeing who signed and nudging the rest; Kudoboard reviewers ask
  for it. More notes per gift means better gifts and better plan fit.
- **How big:** medium. Data already exists (contributions and device counts); it needs an editor panel and copy.
- **Safe before Nov 7?** Probably not. The editor is busy and other branches touch it; ship it in the week after.

Also worth doing later: the amount on the pay button, Bo filling up as notes arrive (organiser side only), an
optional story mode for the recipient, and one wording pass on "styles" vs "formats".

## 5. How this was tested
- `npx tsc --noEmit`, `bun test src` (245 pass), `NITRO_PRESET=node bun run build`.
- Playwright in Chromium at 390x844 and 1440x900: create to editor (DOM traced every 150ms to confirm the loader
  replaces the blank), friend page send (frame by frame for the burst), checkout pending and paid (local test
  orders in the local database), recipient opening, dashboard over time, hero mock measured in the DOM.
- Production build smoke test: `/`, `/styles`, `/create`, `/contribute/…`, `/g/…` load with no console errors.
- Screenshots were kept locally, not committed.
