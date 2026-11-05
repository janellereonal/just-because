# Ideas worth doing

Written 6 Nov 2026, after a night of testing the site as a gifter, a friend and a recipient. Top 5
first. Size: **S** is under a day, **M** is 1 to 3 days, **L** is a week or more. "Safe before 7 Nov"
means small, behind a flag or copy only, and doesn't touch payments, data rules or the schema.

## Top 5

### 1. "Nudge your friends" from the editor (S, safe before 7 Nov)
Most gifts stall at 2 or 3 notes because the organiser shares the link once. Add a button in the editor
and on the dashboard, next to the invite link: "Nudge friends". It opens the phone's share sheet with
a ready message ("2 days left to add something for Ana's gift: {link}") and the days left to the gift's
date. Client only, no new data. Track `invite_shared` with `kind: nudge` to see if it moves notes per
gift.

### 2. A printable card with a QR code to the gift (S, safe before 7 Nov)
Many gifts are handed over in person: at the party, with a cake. After paying, offer "Print a card":
a pastel card in the gift's style, the recipient's name, and a QR code to the gift link. A pure JS QR
library works under our security policy. It also brings the gift to the party itself, which is where
new organisers see it.

### 3. Thank-you from the recipient (M, not before 7 Nov)
After opening, the recipient can send one short thank-you to everyone who added something. It shows
on the friend page and goes to the organiser by email. It closes the loop for friends (who now hear
nothing) and gives everyone a reason to come back. Needs a table and an email, so after launch.

### 4. Pay in dollars abroad (M, not before 7 Nov)
Right now buyers outside the Philippines can't pay at all (QR Ph only). `docs/INTERNATIONAL-PAYMENTS.md`
has the Lemon Squeezy plan: $7, $12 and $19, chosen by country, with a link to switch. Needs Janelle's
store and keys first.

### 5. Send it later (M, not before 7 Nov)
Let the organiser pick when the gift link opens ("midnight on her birthday, her time"). The link shows
a countdown page with the gift's opening object until then. The countdown pieces exist already
(`countdown_at`, Manila and viewer time zones). This turns "send it now" into "set it and forget it",
which matters most for people organising ahead.

## More, roughly in order

- **Story share card for the recipient (M):** after opening, "Share a sticker": a 1080×1920 image in
  the gift's style ("12 friends made me this"), made in the browser, for Instagram and Facebook
  stories. The best ad we could get, and nothing private in it.
- **Co-organisers (M):** a second person who can approve notes and edit. Common for weddings and
  office gifts. Needs a permission change in `requireSiteOwner`.
- **Tagalog and Taglish copy (M):** strings are already in `src/i18n` and `src/copy`. Start with the
  friend page, since friends are the widest audience.
- **Friend page: "See where your note landed" (S):** after sending, scroll the preview to their own
  note with a soft highlight. Today they see "It's in" and the gift, but not themselves in it.
- **Better empty gift for the recipient (S):** a gift with one note looks thin. Group small sections
  together, and hide section titles that have nothing yet (some already do).
- **Show plans by style on /styles (S):** the style gallery could show the same "Celebration plan"
  badge the picker on /create now shows, so people know before they even start.
- **Faster first visit (M):** the Bo intro takes about 3 seconds before the homepage. Skip it for
  visitors arriving from a shared gift or friend link, and shorten it on slow phones.
- **Refund button in /admin (M):** today refunds happen by hand in the PayMongo dashboard (notes in
  HANDOFF.md section 5).
- **Chip-in fund (L):** the data model exists; friends add money towards a real present. Needs payments
  to friends, payouts and a lot of trust work. Not before cards and international payments.

## Redesigns worth considering

- **One "Wrap it up" screen:** the plan picker, password, link name and QR tip are spread over a panel
  and a dialog. One calm screen: what they get, which plan fits (with their own counts), how to pay.
- **Friend page on small phones:** the section grid (12 buttons) pushes the writing box below the
  fold on a 375×667 phone. Show the 3 sections the organiser suggested, with "More" for the rest.
