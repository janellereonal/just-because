Paste this into Claude Code on your Mac (with the Spline app open):

---

You're continuing the Just Because redesign. Spline's MCP should be connected in this session (check that the Spline tools are available; if not, tell me before doing anything else).

SETUP
- Clone https://github.com/janellereonal/just-because (or `git pull` if it's already on this Mac) and check out the `redesign` branch. Never push to `main`: main is the live site. Push to `redesign` only; Vercel makes a preview link for it.
- Read CLAUDE.md, HANDOFF.md (section 1b is the redesign) and docs/mascot-brief.md first.
- `bun install`. For local testing you need a DATABASE_URL in .env; ask me for it, don't guess.

THE LOOK
Colorful, playful, cute, 3D and easy on the eyes. Pastel "toybox" tokens are already in src/styles.css (blush ground #FFF7F2, pink #FBD3DC, lilac #E6DCF7, mint #D5F0E3, butter #FFE8B0, sky #D9E8FB, peach #FFDCCB, berry accent #C2366B, ink #2B2522). Fonts: Fredoka for headings, DM Sans for body. Copy voice: plain and friendly, say gift/note/friends/open, no em dashes, max one exclamation mark per screen.

TASK 1: BO IN SPLINE
- Bo is currently built from simple shapes in code: src/lib/bo3d/scene.ts. Use that as the reference for proportions and colors: soft cream gift-box body, pink lid that hinges open at the back, berry-pink ribbon down the middle and over the lid, a bow on top, black eyes with white shines, pink cheeks, a small smile, little arms, short legs, pink shoes. Matte clay material, soft lighting.
- Build a nicer version in Spline. Keep separate, named parts: body, lid (pivot at the back edge), bow, arm_left, arm_right (pivots at shoulders), leg_left, leg_right, eyes, cheeks, mouth. The code animates these.
- Export as GLB to public/models/bo.glb (keep it under about 1.5 MB; use Spline's export, or tell me if the MCP can't export and I'll do it by hand).
- Update scene.ts to load the GLB with GLTFLoader and drive the same named parts, keeping the current code-built Bo as the fallback if the file fails to load. Keep the existing API (setMood, setStory, setStorySource, setLidColor, setPaused, dispose).

TASK 2: ACCESSORIES
In Spline, make small accessories that sit on Bo's lid, one per theme: party hat (Birthday), heart (Valentine's), mini suitcase (Bon Voyage), Santa hat (Christmas), paw print (Pets), sparkler (New Year), ribbon rosette (Anniversary), flower (Weddings, Bridal Shower). Export as GLBs in public/models/accessories/ and add a setAccessory(name | null) to the scene.

TASK 3: BEHAVIORS
Then build the behaviors in docs/mascot-brief.md, in its delivery order, adapted to the 3D Bo: (1) landing scroll hops with squash/stretch, (2) hero transition, (3) theme accessories + /create and editor reactions + speech bubbles, (4) quirks and easter eggs including the Wrap it up animation, (5) reduced-motion and mobile pass. Pause after each step, push to `redesign`, and send me the preview link and a short note.

RULES
- No mascot on recipient-facing gift pages (/g/...).
- Performance: three.js stays lazy-loaded and pauses off screen; target smooth on a mid-range phone. Animate transform/opacity in the DOM.
- prefers-reduced-motion: no hops or flips.
- Run `npx tsc --noEmit` and `NITRO_PRESET=node bun run build` before every push.
- Never touch PayMongo keys or set PAYMONGO_ALLOW_LIVE. Never paste secrets into chat or code.
- I like short, casual updates. Make sensible calls and tell me what you chose.
