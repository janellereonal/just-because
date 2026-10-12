# Add Bo throughout Just Because

## Build
- Add the supplied `Bo` component verbatim, preserving every SVG part, color, pose, and reduced-motion rule.
- Replace the letter badge in the shared navigation with Bo, and place the larger hello pose beside the landing headline.
- Add Bo to the empty gifts view, contribution header and successful-submit state, recipient reveal transition, publish-success screen, and gift footer.
- Replay delivery only after each successful contribution; run surprise and published once per trigger.
- Keep existing gift flows and styling intact while adapting layouts for mobile and desktop.

## Interaction details
- The recipient reveal starts with idle Bo. Opening swaps it to surprise Bo for 700ms, then reveals the gift and unlocks audio.
- Publishing replaces the editor with a centered success view containing the public link, Copy, and Share controls.
- Contribution success says “Your note is on its way” beside delivery Bo and increments its animation key.

## Validation
- Check the changed flows in the running app at desktop and mobile sizes, including the one-shot transitions and link controls.
- Run the project’s TypeScript check and confirm no browser errors in the tested flows.
