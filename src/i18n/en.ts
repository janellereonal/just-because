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

  // Sample parcel (dev only).
  "occasion.parcel.heading": "Something for {name}",
  "occasion.parcel.greeting": "For {name}, from all of us",
  "occasion.parcel.prompt1": "A memory you two share",
  "occasion.parcel.prompt2": "Something you'd send if you could",
  "occasion.parcel.prompt3": "What you miss most",

  // Winter Cabin Christmas.
  "theme.cabin.hint": "Wipe the frost off the window",
  "theme.cabin.inside": "Tap an ornament to read it",
  "theme.cabin.empty": "Friends' notes hang here as ornaments",
  "occasion.cabin.heading": "Merry Christmas, {name}",
  "occasion.cabin.greeting": "Come in from the cold, {name}",
  "occasion.cabin.prompt1": "Your favourite Christmas with them",
  "occasion.cabin.prompt2": "What you'd hang on their tree",
  "occasion.cabin.prompt3": "A wish for their new year",
  "occasion.cabin.prompt4": "The smell, song or food that means Christmas to you two",

  // Care Package and Balikbayan Box.
  "theme.parcel.hint": "Peel off the tape",
  "theme.parcel.inside": "Tap something to read it",
  "theme.parcel.to": "To",
  "theme.parcel.from": "From",
  "theme.parcel.fragile": "Fragile",
  "theme.parcel.thisSideUp": "This side up",
  "theme.parcel.handleWithCare": "Handle with care",
  "theme.parcel.packedWith": "Packed with love",
  "theme.parcel.letter": "A letter",
  "theme.parcel.photo": "A photo",
  "theme.parcel.jar": "A little jar",
  "theme.parcel.toy": "Something small",
  "theme.balikbayan.para": "Para kay {name}",
  "theme.balikbayan.box": "Balikbayan box",
  "theme.balikbayan.doorToDoor": "Door to door",
  "occasion.parcel2.heading": "A box for {name}",
  "occasion.parcel2.greeting": "All the way from us to you, {name}",
  "occasion.parcel2.prompt1": "What you'd pack for them if you could",
  "occasion.parcel2.prompt2": "Something from home they'd miss",
  "occasion.parcel2.prompt3": "The first thing you'll do together when you see them",
  "occasion.parcel2.prompt4": "A little news from your side",
  "occasion.balikbayan.heading": "Pasalubong for {name}",
  "occasion.balikbayan.greeting": "Mula sa amin, para sa'yo, {name}",

  // Parol Christmas and Simbang Gabi.
  "theme.parol.hint": "Tap the star to light it",
  "theme.parol.lightAll": "Light it all up",
  "theme.parol.night": "Night {n} of 9",
  "theme.parol.before": "Simbang Gabi starts on 16 December",
  "theme.parol.next": "The next part lights up tonight at midnight",
  "theme.parol.allLit": "All nine nights are lit",
  "theme.parol.simbangOption": "Simbang Gabi: one note a night from 16 to 24 December",
  "occasion.parol.heading": "Maligayang Pasko, {name}",
  "occasion.parol.greeting": "A light for you this Christmas, {name}",
  "occasion.parol.prompt1": "A Christmas memory with them",
  "occasion.parol.prompt2": "Your Noche Buena wish for them",
  "occasion.parol.prompt3": "What you're thankful for this year",
  "occasion.parol.prompt4": "A light they bring to your life",

  // Debut.
  "theme.debut.hint": "Pull the cord to open the curtain",
  "theme.debut.light": "Tap a candle to light it",
  "theme.debut.lightAll": "Light all 18",
  "theme.debut.treasures": "18 treasures",
  "theme.debut.candle": "Candle {n}",
  "theme.debut.rose": "Rose {n}",
  "occasion.debut.heading": "{name} turns 18",
  "occasion.debut.greeting": "Eighteen candles, eighteen roses, all for you, {name}",
  "occasion.debut.prompt1": "Your wish for them at eighteen (an 18 candles wish)",
  "occasion.debut.prompt2": "A memory from when they were little",
  "occasion.debut.prompt3": "Advice for their next chapter",
  "occasion.debut.prompt4": "What you admire about them",
  "occasion.debut.prompt5": "A song for their dance",

  // Birthday "Turning".
  "birthday.turning": "Turning",
  "birthday.turningHint": "Their new age. The cake shows it in candles.",
  "editor.toPlace": "Where it's going",
  "editor.toPlaceHint": "Their city and country, for the shipping label.",
  "editor.fromPlace": "Where it's from",
  "editor.fromPlaceHint": "Where you (or most of you) are.",

  // Personalisation fallbacks, used when a slot is empty.
  "slot.recipient.fallback": "you",
  "slot.place.fallback": "Somewhere lovely",
  "slot.senderPlace.fallback": "Far away",
  "slot.photo.alt": "A photo for {name}",

  // Friend page.
  "contribute.ideas": "Ideas to write about",

  // Opening chrome.
  "opening.open": "Open it",
  "opening.openGift": "Open your gift",
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
