/**
 * English strings for the theme engine and new UI. One file per language;
 * other languages copy these keys. Placeholders look like {name}.
 * Plain words, no em dashes, at most one exclamation mark per screen.
 */
export const en = {
  // Gesture labels: what a screen reader announces, and the hint under the object.
  "gesture.tear.label": "Tear it open",
  "gesture.tear.hint": "Drag along the dotted line to tear it",
  "gesture.peel.label": "Peel it back",
  "gesture.peel.hint": "Drag the corner to peel it back",
  "gesture.pull.label": "Pull it",
  "gesture.pull.hint": "Pull down to open",
  "gesture.untie.label": "Untie the ribbon",
  "gesture.untie.hint": "Pull the ribbon end to untie it",
  "gesture.blow.label": "Blow",
  "gesture.blow.hint": "Blow into the mic, or tap",
  "gesture.blow.mic": "Use the mic",
  "gesture.blow.micDenied": "No mic? Tap instead",
  "gesture.shake.label": "Shake it",
  "gesture.shake.hint": "Shake your phone, or tap",
  "gesture.shake.motion": "Use motion",
  "gesture.scratch.label": "Scratch it off",
  "gesture.scratch.hint": "Scratch to reveal",
  "gesture.hold.label": "Press and hold",
  "gesture.hold.hint": "Press and hold",
  "gesture.slide.label": "Slide it out",
  "gesture.slide.hint": "Slide it up",
  "gesture.spin.label": "Spin it",
  "gesture.spin.hint": "Spin it around",
  "gesture.unfold.label": "Unfold it",
  "gesture.unfold.hint": "Tap or drag to unfold",
  "gesture.pop.label": "Pop them",
  "gesture.pop.hint": "Tap to pop",
  "gesture.wipe.label": "Wipe it clean",
  "gesture.wipe.hint": "Wipe the glass to see inside",
  "gesture.keys": "Press Enter or Space to do it with the keyboard",
  "gesture.progress": "{percent}% done",

  // Theme hints (engine themes can use their own instead of the gesture's).
  "theme.kraftParcel.hint": "Pull the tape off to open it",

  // Personalisation fallbacks, used when a slot is empty.
  "slot.recipient.fallback": "you",
  "slot.place.fallback": "Somewhere lovely",
  "slot.senderPlace.fallback": "Far away",
  "slot.photo.alt": "A photo for {name}",

  // Opening chrome.
  "opening.open": "Open it",
  "opening.skip": "Skip intro",
  "opening.soundOn": "Sound is on",
  "opening.soundOff": "Sound is off",

  // The /dev/themes playground (dev only, still translatable).
  "playground.title": "Theme playground",
  "playground.theme": "Theme",
  "playground.worst": "Worst case",
  "playground.reduced": "Reduced motion",
  "playground.phone": "Phone",
  "playground.laptop": "Laptop",
  "playground.replay": "Play again",
  "playground.gestures": "Gestures",
  "playground.materials": "Materials",
  "playground.particles": "Particles",
  "playground.sounds": "Sounds",
  "playground.slots": "Personalise",
  "playground.done": "Done",
  "playground.budget": "Budget: {used} of {limit} KB",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
