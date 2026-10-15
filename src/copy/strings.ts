/**
 * Product copy in one place, so it can be reviewed (and one day translated)
 * without hunting through components. Plain, friendly English for a global
 * audience: no local slang, no payment brands outside checkout, no em dashes,
 * at most one exclamation mark per screen.
 */

export const SECTION_COPY = {
  openwhen: {
    label: "Open-when letters",
    blurb: "Sealed letters for later: open when you miss home, when you can't sleep.",
    prompt: "Write an open-when letter",
    title: "Open when…",
    whenLabel: "Open when",
    whenPlaceholder: "you need a laugh",
    textPlaceholder: "Write the letter they'll open then.",
    sealed: "Tap to open",
    reopen: "Fold it back up",
  },
  capsule: {
    label: "Time capsule",
    blurb: "Notes that stay locked until a date in the future.",
    prompt: "Bury something for later",
    title: "Time capsule",
    dateLabel: "Opens on",
    textPlaceholder: "Something to read one year from now.",
    lockedLine: "Opens",
    countdownLabel: "Still sealed",
    openedLine: "Opened",
  },
  superlatives: {
    label: "Superlatives",
    blurb: "Friends hand out awards. The most popular ones rise to the top.",
    prompt: "Give them an award",
    title: "The awards",
    awardLabel: "The award",
    awardPlaceholder: "Most likely to…",
    reasonPlaceholder: "Why they deserve it (optional)",
    votes: (n: number) => (n === 1 ? "1 vote" : `${n} votes`),
    pickOne: "Or pick one",
  },
  quiz: {
    label: "Quiz",
    blurb: "How well do they know their own life? Friends write the questions.",
    prompt: "Ask a quiz question",
    title: "How well do you know you?",
    questionLabel: "Question",
    questionPlaceholder: "Where did we first meet?",
    answerLabel: "The right answer",
    wrongLabel: "Wrong answers (one or more)",
    score: (n: number, of: number) => `${n} out of ${of}`,
    again: "Play again",
    askedBy: (who: string) => `asked by ${who}`,
    finished: "That's the lot",
  },
  map: {
    label: "Memory map",
    blurb: "Pins on a map for the places you've shared.",
    prompt: "Pin a memory",
    title: "Places we've been",
    placeLabel: "Where",
    placePlaceholder: "The night market, Lisbon",
    textPlaceholder: "What happened there?",
  },
  coupons: {
    label: "Coupon book",
    blurb: "Promises they can cash in: one dinner, one movie night, one favor.",
    prompt: "Give a coupon",
    title: "Coupon book",
    titleLabel: "The coupon",
    titlePlaceholder: "One home-cooked dinner",
    fineLabel: "Fine print (optional)",
    finePlaceholder: "Valid any weeknight. Dessert included.",
    redeem: "Tear to redeem",
    redeemed: "Redeemed",
  },
  video: {
    label: "Video messages",
    blurb: "Short videos from friends, up to about a minute.",
    prompt: "Send a video",
    title: "Video messages",
    pick: "Choose a video",
    hint: "Up to 60 MB. About a minute from a phone.",
    textPlaceholder: "A caption (optional)",
  },
  doodle: {
    label: "Doodle guestbook",
    blurb: "Friends draw something. Nobody has to be good at it.",
    prompt: "Draw something",
    title: "Guestbook doodles",
    clear: "Start over",
    undo: "Undo",
    empty: "Draw a little something first.",
    textPlaceholder: "Sign it (optional)",
  },
} as const;

export const CHIP_IN_COPY = {
  label: "Chip-in fund",
  blurb: "Everyone adds a little towards one big present.",
  soon: "Coming soon",
  detail:
    "We're building this carefully so money is handled safely. It isn't part of any plan yet.",
};
