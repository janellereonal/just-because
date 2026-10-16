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

/** The landing page and the example gifts. */
export const LANDING = {
  meta: {
    title: "Just Because | One gift from everyone who loves them",
    description:
      "Make a group gift: friends add letters, photos, videos and voice notes through one link, and they open it all at once.",
  },
  hero: {
    kicker: "Group gifts, made together",
    title: "One gift from everyone who loves them.",
    body: "Make one gift and share the link. Friends add letters, photos, songs, videos and voice notes from their phones. Then they open it all at once,",
    bodyAccent: "just because.",
    primary: "Make a gift",
    secondary: "See how it works",
    proof: ["Friends don't need an account", "You read every note first"],
    soloLead: "Just from you?",
    soloLink: "Make a solo gift for someone you love",
    demoLabel: "Ana's 30th. Try opening it.",
    demoHint: "12 friends added something",
    fullGift: "See the full gift",
  },
  occasions: [
    "Birthdays",
    "Farewells",
    "Weddings",
    "Anniversaries",
    "New babies",
    "Graduations",
    "Holidays",
    "Get well soon",
    "Retirements",
    "Pets",
    "Just because",
  ],
  how: {
    kicker: "How it works",
    title: "You set it up. Friends fill it. They open it.",
    steps: [
      {
        n: "01",
        title: "Pick a theme",
        body: "Each one opens like something real: a letter, a cake, a boarding pass.",
      },
      {
        n: "02",
        title: "Share one link",
        body: "Friends open it on their phone and add something. No app, no account.",
      },
      {
        n: "03",
        title: "Read everything first",
        body: "Every note waits for you. Keep the sweet ones, hide anything you'd rather not.",
      },
      {
        n: "04",
        title: "Send it",
        body: "Pick a plan, wrap it up and send one link they can keep for years.",
      },
    ],
  },
  inside: {
    kicker: "What goes inside",
    title: "More than a card. Less work than a scrapbook.",
    body: "Turn on the sections you want. Friends only see what you pick.",
    tiles: {
      letters: { title: "Letters", body: "Long, short, funny, teary. Everyone writes their own." },
      photos: {
        title: "Photos",
        body: "Throwbacks and blurry 2am shots, with a note on the back.",
      },
      songs: { title: "Songs", body: "Paste a link. It plays right on the page." },
      voice: { title: "Voice notes", body: "Hear Grandma say happy birthday, again and again." },
      words: { title: "Word cloud", body: "One word each. Together it says a lot." },
      countdown: { title: "Countdown", body: "Live, in everyone's own time zone." },
      openwhen: { title: "Open-when letters", body: "Sealed for later. Open when you miss us, or on a bad day." },
      capsule: { title: "Time capsule", body: "Notes that stay locked until a date you pick. Even a year away." },
      awards: { title: "Awards", body: "Friends vote. Most likely to cry at the toast wins a ribbon." },
      quiz: { title: "Quiz", body: "How well do they know the inside jokes? Friends write the questions." },
      map: { title: "Memory map", body: "Pins for the places that matter, joined by the route you took." },
      coupons: { title: "Coupons", body: "One free dinner. One no-questions-asked pickup. Tear to redeem." },
      video: { title: "Videos", body: "Short clips from everyone, playing right in the gift." },
      doodle: { title: "Doodle guestbook", body: "Draw something with your finger. It doesn't have to be good." },
    },
    more: (n: number) => `And ${n} more, from quizzes to doodles. Turn on just the ones that fit.`,
  },
  examples: {
    kicker: "Example gifts",
    title: "Made for all kinds of people",
    open: "Open it",
  },
  closing: {
    title: "Start a gift tonight. Send it whenever.",
    body: "Friends can start adding notes the minute you share the link.",
    cta: "Make a gift",
  },
  example: {
    banner: "This is an example gift",
    cta: "Make one",
  },
} as const;

export const LANDING_MORE = {
  formats: {
    kicker: "Formats",
    title: "Nine ways to open the same gift.",
    body: "Switch any time. Nobody has to rewrite their note.",
    tryIt: "Try it above",
    isNew: "New",
    seeAll: (n: number) => `See all ${n}`,
    seeFewer: "Show fewer",
  },
  themes: { link: (n: number) => `See all ${n || ""} themes`.replace("  ", " ") },
  plans: {
    kicker: "Plans",
    title: "Pick a plan when it's ready to send.",
    body: "Set up the gift and collect notes first. You choose a plan when you wrap it up, based on how many friends joined and how long it should stay open.",
  },
  faqTitle: "Good questions",
  faq: [
    {
      q: "Can I make one just from me?",
      a: 'Yes. Pick "Just me" when you start. There\'s no friends link, and you add every letter, photo, song and voice note yourself.',
    },
    {
      q: "Do my friends need an account?",
      a: "No. They open your link, type their name and add something. That's it.",
    },
    {
      q: "Can I see notes before they do?",
      a: "Yes. Every note waits for you to approve it, and you can hide anything before you send the gift.",
    },
    {
      q: "My friends live in different countries. Is that a problem?",
      a: "Not at all. Countdowns and time capsules show up in each person's own time zone, and dates are written the way they're used to.",
    },
    {
      q: "When do I pay?",
      a: "When you wrap it up. Set up the gift and collect notes first, then pick a plan right before you send it.",
    },
    {
      q: "Can I keep it private?",
      a: "The link is only shared by you. On Celebration and Keepsake you can add a password too.",
    },
    {
      q: "Can I change the format later?",
      a: "Any time before or after you send it. The notes stay the same, only the way it opens changes.",
    },
  ],
  stepVisuals: {
    link: "justbecause.site/c/ana-30",
    copy: "Copy",
    joined: "+12 notes",
    review: [
      { who: "Mom", text: "So proud of you.", ok: true },
      { who: "Jordan", text: "Remember the karaoke?", ok: false },
    ],
    approved: "Approved",
    hidden: "Hidden",
    opened: "Ana opened her gift",
    openedStats: "12 notes, 6 photos, 1 voice note",
  },
  footer: {
    themes: "Themes",
    plans: "Plans",
    signIn: "Sign in",
    myGifts: "My gifts",
    line: "Made for the people you love.",
  },
} as const;
