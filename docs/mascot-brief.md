# Mascot behavior brief (from Janelle, 14 Oct 2026)

> **Update, 14 Oct 2026:** Janelle chose the colorful 3D redesign *plus* these behaviors. Ignore the lines below that say to keep the cream/terracotta style, not restyle, or avoid three.js. Bo is 3D now (src/lib/bo3d/scene.ts); the behaviors still apply. Everything else, including the non-negotiables, stands.

You're working on "Just Because" (justbecause.site), a collaborative gift-site builder. Friends add letters, photos and songs to a themed scrapbook, and the creator sends one link. Pages: landing (hero + polaroid collage + gift-box mascot), (A) Choose a theme grid, (B) Pricing, /dashboard (My gifts), /themes/:id (theme preview), /create (name + theme + format + sections), /sites/:id (editor), then the "Wrap it up" redirect to PayMongo checkout.

GOAL
Give the site the same playful interactivity as our other project, Second Round by Sip & Scale, where a pixel matcha mascot hops between form fields as you scroll, reacts to what you type, and talks in small speech bubbles. Here the star is the existing gift-box mascot (bow on top, rosy cheeks, waving arm). Keep the current visual style EXACTLY: cream background, serif headings, terracotta accent, hand-drawn line mascot. Do NOT restyle anything. This is about behavior, not new visuals.

Behavior inspiration only, not visuals:
- Second Round (Sip & Scale) → mascot hops field to field on scroll, context speech bubbles
- Bruno Simon's portfolio → physics: things you can push and flick
- "Gus" scroll site → scrolling moves a character through a journey, with small mishaps
- Lusion → elements react to the cursor

STEP 0: AUDIT FIRST
Before coding, read the codebase and tell me: the framework, how the mascot is currently drawn (SVG/PNG/Lottie), which animation libraries are installed, and how the pages are structured. If the mascot is a flat image, propose how to split it into parts (box, lid/bow, arms, legs, face) so it can squash, stretch, wave and change expressions. Prefer GSAP + ScrollTrigger (or Framer Motion if already used). No three.js unless it's genuinely needed.

1) MASCOT HOPS AS YOU SCROLL (top priority, landing page)
- The mascot starts in the hero, waving. As the user scrolls down, it hops along with them: onto the "(A) CHOOSE A THEME" label, then onto theme cards, then "(B) PRICING", then onto the MOST POPULAR card.
- Every hop: anticipation squash (~80ms) → parabolic jump arc → stretch mid-air → landing squash → small bounce settle. The bow ribbons flop on landing, and 3–5 tiny confetti bits puff out and fade.
- Hop height scales with scroll speed: slow = small polite hops, fast = big leap, occasionally a flip. Very fast = it gets left behind, then scrambles to catch up with its little legs.
- Scrolling UP: it hops backward, or slides down a card edge.
- Quirk: about 1 in 8 hops it misjudges the landing, wobbles on the edge, flails its arms, then steadies. Never twice in a row.

2) HERO TRANSITION
- The polaroids in the hero collage tilt gently toward the cursor (subtle 3D parallax) and can be nudged and dragged a little, springing back like they're taped down.
- On scroll out of the hero, a few confetti pieces and polaroid "scraps" flutter down and land in the themes section, and the mascot rides one down onto the first theme card.

3) MASCOT REACTS TO THE PAGE
- Eyes follow the cursor (small pupil shifts). Blinks every 3–6s at random.
- Theme cards: when the mascot lands on or near a hovered card, it wears a tiny matching accessory drawn in the same line style (heart for Valentine's, party hat for Birthday, mini suitcase for Bon Voyage, Santa hat for Christmas, paw print for Pets, sparkler for New Year, ribbon rosette for Anniversary, flower for Weddings).
- Pricing: it points at Celebration ("MOST POPULAR"). Hovering Keepsake → its eyes go sparkly.
- /create form, same rules as Second Round: the mascot hops to whichever field is focused and bobs a little with each keystroke. Bubbles (short, casual, one at a time, auto-hide ~2.5s):
  - Gift site name typed → "Ooh, cute name."
  - Theme changed → quick outfit swap, plus a line matching the theme
  - Comic Issue selected → comic "BAM!" pose
  - Scrapbook selected → it hugs a tiny book
- Editor (/sites/:id): the mascot sits at the corner of the preview canvas. Recipient name filled → "{name} is so lucky." Invite friends clicked → excited wave. "Wrap it up" clicked → it wraps itself up, pulls its own ribbon tight, takes a bow, THEN redirects to checkout (keep it under ~1s so it never delays payment).
- Dashboard empty state: the mascot peeks out from behind the "New gift" button.
- Speech bubbles must NEVER cover the field being typed in or any button. Place them above or to the side, and flip sides if there's no room.

4) PLAYFUL QUIRKS / EASTER EGGS
- Click/tap the mascot: the lid pops open and a little burst of confetti comes out.
- Click 5x quickly: dizzy (spiral eyes, bow spinning), then recovers.
- Drag and flick: simple spring/gravity physics, bounces off viewport edges, then hops back to its spot. Avoid a heavy physics engine unless one is already installed.
- Idle 20s: yawns and dozes off with "z z z". Any input wakes it with a startled jump.
- Tab hidden: document.title becomes "Your gift misses you 🎁". Restore on return.
- First successful gift created: celebratory flip and a confetti burst in the existing palette.

5) NON-NEGOTIABLES
- Never put the mascot on the recipient-facing gift sites (the published gift). It lives only in the creator-side app and the landing page.
- Don't copy any reference site's visual style. Behavior only.
- Performance: animate only transform/opacity, use requestAnimationFrame, keep one scroll system, throttle cursor tracking, pause loops when the tab is hidden. Target 60fps on a mid-range phone.
- The mascot never blocks clicks or typing: pointer-events: none except a small hitbox on the mascot itself.
- prefers-reduced-motion: no hops, flips or parallax. The mascot fades between spots and bubbles still appear.
- Mobile: touch replaces cursor, smaller hops, and the mascot never hides a field, a CTA or the keyboard area.
- Accessibility: the mascot and bubbles are decorative (aria-hidden). Real validation and error text must still exist as accessible text.
- Code structure: one mascot controller/state machine (idle, hopping, reacting, sleeping, dizzy, dragged, wrapping, celebrating), shared across pages, not scattered timeouts.

6) DELIVERY
Build in this order and pause after each so I can check it: (1) landing scroll hops with squash/stretch, (2) hero polaroid tilt + transition, (3) theme accessories + /create and editor reactions + bubble placement, (4) quirks and easter eggs including the "Wrap it up" animation, (5) reduced-motion + mobile pass. Then list the tuning knobs (hop height, quirk frequency, bubble timing) I can tweak.