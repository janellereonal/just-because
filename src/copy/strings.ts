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
    body: "Make one gift and share the link. Friends add letters, photos, songs, videos and voice notes from their phones, no account needed. You read every note first, then they open it all at once,",
    bodyAccent: "just because.",
    primary: "Make a gift",
    secondary: "See how it works",
    soloLead: "Just from you?",
    soloLink: "Make a solo gift for someone you love",
    examplesLabel: "Example gifts",
    screenLabel: (name: string) => `${name}, an example gift`,
    pauseTour: "Pause the tour",
    playTour: "Play the tour",
    closeAgain: "Close it again",
    noteAdded: (who: string) => `${who} added a letter`,
    noteWhen: "just now",
    noteJoined: (n: number) => `${n} friends joined`,
    fullGift: "Open it full screen",
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
    isNew: "New",
    pickLabel: "Formats",
    screenLabel: (name: string) => `Ana's 30th as a ${name}`,
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

/** Characters panel. */
export const CAST_COPY = {
  wanderer: "Wanderer",
  wandererHint: "One of these strolls around the gift. Tap it for a little hop.",
  wandererOff: "Off",
  allCharacters: "All characters",
  surprise: "Surprise me",
  startFrom: "Start from",
  makePerson: "Make a person",
  makePersonHint: "Pick their hair, glasses, outfit and what they're holding.",
  editPerson: "Change this person",
  people: "People",
  skin: "Skin tone",
  hairColor: "Hair color",
  outfitColor: "Outfit color",
  keepsColors: "This one keeps its own colors. You can still give it a name tag.",
  yours: "Yours",
  seeAll: "See all",
  back: "Back",
  searchPlaceholder: "Search: dog, cake, grandma…",
  searchLabel: "Search characters",
  forThisGift: "For this gift",
  animals: "Animals",
  friends: "Little friends",
  makeShort: "Make one",
  noMatch: "No one by that name yet. Try another word.",
  noOne: "No one",
} as const;

/** The gallery's full-screen opening, once it's open. */
export const SHOWCASE_COPY = {
  chip: "Sample gift · scroll to see it all",
  use: "Use this theme",
  again: "Open it again",
  details: "Theme details",
} as const;

/** Comic Issue format. */
export const COMIC_COPY = {
  hero: "our hero",
  imprint: "Just Because Comics",
  no: "No.",
  priceless: "Priceless",
  seal1: "Friends",
  seal2: "approved",
  open: "Open the issue",
  closeCover: "Close the cover preview",
  featuring: (n: number) => (n > 1 ? `Featuring ${n} friends` : "A one-shot special"),
  inside: (letters: number, photos: number) =>
    [letters ? `${letters} letter${letters === 1 ? "" : "s"}` : "", photos ? `${photos} photo${photos === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ") || "Every page by hand",
  chapters: "Chapters",
  contents: "In this issue",
  chapter: (n: number) => `Chapter ${n}`,
  page: "Page",
  prev: "Previous page",
  next: "Next page",
  share: "Share this issue",
  close: "Close",
  replay: "See the cover",
  backToEdit: "Back to editing",
  meanwhile: "Meanwhile, in the other world…",
  mine: "You're in this issue",
  classified: "Classified",
  filedBy: (name: string) => `Filed by ${name}. Opens on the big day.`,
  says: (name: string) => `${name} says:`,
  photoAlt: "A photo from the gift",
  legendary: "A legendary moment",
  snap: "Snap!",
  nowPlaying: (name: string) => `Now playing, picked by ${name}`,
  track: "Track one",
  songFrom: (name: string) => `Song from ${name}`,
  listen: "Listen to the track",
  transmission: "Incoming transmission",
  voiceFallback: "Press play. You'll want to hear this.",
  footage: "Live footage",
  drawingBy: (name: string) => `A drawing by ${name}`,
  fanArt: (name: string) => `Fan art by ${name}`,
  ornament: "A secret ornament message",
  hungBy: (name: string) => `Hung by ${name}`,
  bigDay: "The big day is in",
  tagline: "Made by friends",
  itsHere: "It's here",
  kapow: "Kapow!",
  clock: ["days", "hrs", "min", "sec"],
  mission: "A secret mission",
  locked: "Mission locked",
  theEnd: "The end…",
  orIsIt: "or is it?",
  starring: "Starring",
  writtenBy: "Written by",
  lettering: "Lettering",
  byHand: "Done by hand, with love",
  everyone: "Everyone who loves you",
  fanMail: "Fan mail",
  continued: (chapter: string, n: number) => `${chapter}, part ${n}`,
  toBeContinued: "To be continued",
  sampleLetter: "You make every day feel like an adventure. Thank you for being you.",
} as const;

/** The wishing tree. */
export const TREE_COPY = {
  openFrom: (name: string) => `Open ${name}'s ornament`,
  lockedFrom: (name: string) => `${name}'s ornament, still locked`,
  prev: "Previous tree",
  next: "Next tree",
  empty: "The first ornament is waiting to be hung.",
  sealed: "Sealed for now",
  sealedBody: (name: string) => `${name}'s message opens with the gift.`,
  private: "A private ornament",
  privateBody: "This message is only for the person the gift is for.",
  opensOn: (day: string) => `Opens on ${day}`,
  wait: "Hang on, it's nearly time.",
  close: "Close",
} as const;

/** The /sections gallery. */
export const SECTIONS_PAGE = {
  meta: "Every section friends can add to a Just Because gift, live and ready to try.",
  kicker: (n: number) => `${n} sections`,
  title: "Everything friends can add",
  body: "Pick the ones that suit the person. Each one below is live, so open it and have a play.",
  filter: "Filter sections",
  groups: { all: "All", words: "Words", pictures: "Photos and video", sound: "Sound", play: "Games and fun", keepsakes: "Keepsakes", holidays: "Holidays" },
  openPreview: (label: string) => `Try the ${label} section`,
  tryIt: "Try it",
  close: "Close",
  live: "This is the real section with sample notes.",
  closing: "Mix and match as many as you like. You can change them any time, even after friends start adding notes.",
  cta: "Start a gift",
  link: (n: number) => `See all ${n} sections`,
} as const;

/** The short guide a new organiser sees before their first gift (flag newUserGuide). */
export const GUIDE_COPY = {
  kicker: "Before you start",
  title: "Here's how your gift comes together",
  label: "How a gift comes together",
  steps: [
    {
      n: "01",
      title: "Pick a theme",
      body: "It's the wrapping: how the gift opens, its colors and Bo's outfit.",
      bo: "Pick a mood. I'll dress up for it.",
    },
    {
      n: "02",
      title: "Share one link",
      body: "Friends add letters, photos and songs from their phone. No app, no account. Or make it just from you.",
      bo: "The more, the merrier.",
    },
    {
      n: "03",
      title: "Read everything first",
      body: "Every note waits for you. Keep the sweet ones and hide anything you'd rather not send.",
      bo: "You get the first look.",
    },
    {
      n: "04",
      title: "Wrap it up and send",
      body: "Making the gift and collecting notes is free. When it's ready, pick a plan and send one link they can keep.",
      bo: "Then they open it.",
    },
  ],
  stepOf: (n: number, of: number) => `Step ${n} of ${of}`,
  next: "Next",
  back: "Back",
  skip: "Skip",
  start: "Start my gift",
  reopen: "How does this work?",
  close: "Close the guide",
};
/** The photobooth camera (flag photoboothCamera): take a photo, pick a frame, write on it. */
export const PHOTOBOOTH_COPY = {
  open: "Take one in the photobooth",
  openHint: "Use your camera, pick a frame and write a little message on it.",
  title: "Photobooth",
  close: "Close the photobooth",
  starting: "Turning on your camera…",
  noCamera: "We couldn't use your camera. You can still pick a photo from your device and frame it.",
  denied: "Camera access is off for this page. Turn it on in your browser, or pick a photo from your device.",
  fromDevice: "Use a photo from your device",
  one: "One photo",
  four: "Four in a row",
  shoot: "Take the photo",
  shootFour: "Take four",
  shooting: (n: number, of: number) => `Photo ${n} of ${of}`,
  retake: "Retake",
  startOver: "Pick another",
  framesLabel: "Frame",
  messageLabel: "Write on it (optional)",
  messagePlaceholder: "Happy birthday, from all of us",
  use: "Use this photo",
  making: "Framing it…",
  previewAlt: "Your framed photo",
  postcardMark: "A LITTLE NOTE · JUST BECAUSE",
  frames: {
    polaroid: "Instant",
    film: "Film",
    confetti: "Party",
    hearts: "Hearts",
    postcard: "Postcard",
    clean: "No frame",
  },
};
/** Concierge beta: "Want us to handle it?" */
export const CONCIERGE_COPY = {
  title: "Want us to handle it?",
  pitch: "We chase the friends, tidy the photos and put the whole gift together for you.",
  cta: "Tell us about it",
  formTitle: "We'll handle it",
  formIntro: "A few details and we'll take it from there. No payment yet: we'll sort that out with you directly.",
  fields: {
    recipient: "Who's it for?",
    occasion: "What's the occasion?",
    deadline: "When does it need to be ready?",
    friends: "About how many friends?",
    contact: "How should we reach you?",
    contactHint: "An email, a phone number or a Messenger name.",
    timeZone: "Your time zone",
    notes: "Anything we should know?",
    notesPlaceholder: "Inside jokes, people who must be in it, photos you already have…",
  },
  send: "Send request",
  sending: "Sending…",
  doneTitle: "Request sent",
  done: "Got it. We'll contact you within 24 hours with next steps.",
  doneHint: "You can keep working on the gift in the meantime.",
};

/** Plain occasion names, for prefilled forms ("Birthday"). Empty when the theme fits any occasion. */
export const OCCASION_NAMES: Record<string, string> = {
  valentine: "Valentine's Day",
  birthday: "Birthday",
  voyage: "Farewell",
  christmas: "Christmas",
  pets: "A pet",
  newyear: "New Year",
  anniversary: "Anniversary",
  wedding: "Wedding",
  bridal: "Bridal shower",
  baby: "Baby shower",
};
/** The friend page (contribute). */
export const FRIEND_PAGE = {
  /** How each section reads in "Add a note, a photo or a song". */
  things: {
    letters: "a note",
    photobooth: "a photo",
    songs: "a song",
    voice: "a voice note",
    wordcloud: "a word",
    tree: "an ornament",
    calendar: "a surprise",
    countdown: "a countdown",
    openwhen: "an open-when letter",
    capsule: "a time capsule note",
    superlatives: "an award",
    quiz: "a quiz question",
    map: "a place",
    coupons: "a coupon",
    video: "a video",
    doodle: "a doodle",
  } as Record<string, string>,
  notReady: "The organiser is still setting this up. Check back soon.",
  more: "More",
  fewer: "Fewer",
};

/** "Add a note, a photo or a song." built from the sections that are on. */
export function friendAddLine(types: readonly string[]): string {
  const words = types.map((t) => FRIEND_PAGE.things[t]).filter((w): w is string => !!w);
  if (words.length === 0) return "";
  if (words.length === 1) return `Add ${words[0]}.`;
  if (words.length <= 3) return `Add ${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}.`;
  return `Add ${words.slice(0, 3).join(", ")} and more.`;
}

/**
 * Sample letters shown in previews before friends add theirs, matched to the occasion.
 * The first one is also the friend page example. `{name}` becomes ", Ana" or nothing.
 */
export const SAMPLE_LETTERS: Record<string, [string, string, string]> = {
  valentine: ["Happy Valentine's Day{name}. You make ordinary days feel special.", "Still my favourite person to sit next to.", "Thank you for loving me so well."],
  birthday: ["Happy birthday{name}. Here's to your best year yet.", "Another year of you is a gift to all of us.", "Cake first, then we talk. Love you."],
  voyage: ["Safe travels{name}. Send us a postcard from there.", "Go see everything. We'll keep your seat warm.", "Proud of you for taking the leap."],
  christmas: ["Merry Christmas{name}. You make the season brighter.", "Thank you for every gift that wasn't wrapped.", "Here's to cocoa, carols and you."],
  pets: ["Who's a good one{name}? You are.", "Thank you for every greeting at the door.", "Best nap buddy there ever was."],
  newyear: ["Happy New Year{name}. Here's to your best year yet.", "So glad we got through last year together.", "Big plans, small steps. We're with you."],
  anniversary: ["Happy anniversary{name}. Here's to many more years together.", "You two make it look easy.", "Thank you for showing us what love looks like."],
  wedding: ["Congratulations{name}. So happy for you both.", "What a day, and what a pair.", "Wishing you a lifetime of good mornings."],
  bridal: ["Can't wait to celebrate you{name}.", "Here's to the bride, and the best is yet to come.", "So happy for you. Save me a dance."],
  baby: ["Welcome to the world, little one{name}.", "That little one is so lucky to have you.", "Sleep when you can. We're here for the rest."],
  handwritten: ["I wrote this one by hand, just for you{name}.", "A few words I've been meaning to say.", "Keep this for a rainy day."],
  game: ["You always win{name}, and I don't even mind.", "Player two, ready when you are.", "GG. Thanks for every round."],
  pixel: ["Achievement unlocked: best friend{name}.", "Extra life, just for you.", "Press start on a great year."],
  default: ["Thinking of you{name}, always.", "You make every room warmer.", "Thank you for always showing up."],
};

/** One sample letter, with the name filled in (or left out). */
export function sampleLetter(kind: string, i: number, name = ""): string {
  const set = SAMPLE_LETTERS[kind] ?? SAMPLE_LETTERS["default"]!;
  return set[i % set.length]!.replace("{name}", name ? `, ${name}` : "");
}

/** Shown on every format while it's showing sample notes. */
export const SAMPLE_BADGE = {
  friends: "Sample notes. Friends' notes replace these.",
  solo: "Sample notes. Yours replace these.",
};
/** Footer and legal pages. */
export const FOOTER_COPY = {
  line: "Made for the people you love.",
  madeIn: "Made in Manila",
  product: "Product",
  themes: "Themes",
  sections: "Sections",
  plans: "Plans",
  myGifts: "My gifts",
  signIn: "Sign in",
  legal: "Legal",
  privacy: "Privacy",
  terms: "Terms",
  refunds: "Refunds",
  help: "Help",
  contact: "Contact us",
  onThisPage: "On this page",
  inShort: "In short:",
  draft: "Draft: under review.",
  draftBody: "This page is being reviewed and may change before it's final.",
  updated: (date: string) => `Last updated ${date}`,
} as const;

/** Reporting a gift. */
export const REPORT_COPY = {
  link: "Report",
  title: "Report this gift",
  intro: "Tell us what's wrong. We'll look at it, and we may pause the gift. The organiser won't see who reported it.",
  reasons: [
    ["harassment", "Bullying or harassment"],
    ["private-info", "Shares someone's private information"],
    ["sexual", "Sexual content"],
    ["hate", "Hate or violence"],
    ["spam", "Spam or a scam"],
    ["other", "Something else"],
  ] as const,
  details: "Anything else we should know? (optional)",
  send: "Send report",
  sending: "Sending…",
  thanks: "Thanks. We'll take a look.",
  failed: "That didn't send. Try again in a moment, or email us.",
  cancel: "Cancel",
  close: "Close",
  pausedTitle: "This gift has been paused",
  pausedBody: "It's been taken down while we look into a report. If it's yours, check your email or contact us.",
  makeYourOwn: "Make your own gift",
} as const;

/** Upload states and limits, shown on photo, voice note and video fields. */
export const UPLOAD_COPY = {
  preparing: "Preparing photo…",
  heic: "This browser can't open HEIC photos. Send it from your iPhone, or save it as a JPG first.",
  uploading: "Uploading…",
  tooBig: (kind: "photo" | "voice" | "video") =>
    kind === "video"
      ? "That video is over 50 MB. Try a shorter clip, up to a minute."
      : kind === "voice"
        ? "That voice note is over 5 MB. Keep it under 2 minutes."
        : "That photo is over 8 MB. Try a smaller one.",
  tooLong: (kind: "photo" | "voice" | "video") =>
    kind === "video" ? "Videos can be up to a minute long. Try a shorter clip." : "Voice notes can be up to 2 minutes long.",
};

/** "Have a code?" in the plan picker. */
export const CODE_COPY = {
  ask: "Have a code?",
  placeholder: "Enter code",
  apply: "Apply",
  checking: "Checking…",
  remove: "Remove",
  applied: (code: string, label: string, plans: string[], allPlans: boolean) =>
    label === "Free" ? `${code} applied: ${plans.join(" and ")} is free.` : `${code} applied: ${label}${allPlans ? "" : ` ${plans.join(" and ")}`}.`,
  free: (plan: string) => `Get ${plan} free`,
};

/** Prices and paying, for buyers in the Philippines and everywhere else. */
export const PRICE_COPY = {
  approxSuffix: "(approx.)",
  /** Under the plan cards, for visitors in the Philippines. */
  footerLocal: "Prices are in pesos.",
  /** Under the plan cards, for everyone else. */
  footerAbroad: "You pay in Philippine pesos, and cards from any country work. The amount in your currency is a guide. Your bank sets the exact rate.",
  /** Next to the pay button, for visitors outside the Philippines. */
  abroadPayNote: "Paying from outside the Philippines? Use a Visa or Mastercard. It's charged in pesos, and some banks add a small fee for that.",
} as const;

/** Starting a gift without an account (flag guestStart). */
export const GUEST_COPY = {
  keep: "Sign in so you don't lose your gift.",
  bannerBody: "You're making this as a guest. Sign in to share it, pay for it or open it on another device.",
  signIn: "Sign in",
  google: "Continue with Google",
  email: "Use email instead",
  limit: "Sign in to make more gifts. Guests can start up to 3.",
  shareTitle: "Sign in to share it",
  shareBody: "Your gift is saved on this device for now. Sign in and it moves to your account, so friends can add to it and it's safe if you switch phones.",
  payTitle: "Sign in to wrap it up",
  payBody: "We'll send the receipt and the gift link to your email. Everything you made comes with you.",
  later: "Not now",
  authHeading: "Keep your gift",
  authBody: "Sign in or make an account. The gift you started moves over with everything in it.",
  starting: "Starting your gift…",
};

/** Placing stickers on the opening, in the editor's preview. */
export const STICKER_COPY = {
  label: (name: string, selected: boolean) => (selected ? `${name} sticker, selected` : `${name} sticker. Tap to move, resize or turn it.`),
  picture: "Picture",
  smaller: "Smaller",
  bigger: "Bigger",
  turnLeft: "Turn left",
  turnRight: "Turn right",
  front: "Bring to front",
  undo: "Undo",
  remove: "Delete",
  done: "Done",
  resize: "Drag to resize",
  turn: "Drag to turn",
  removed: "Sticker deleted. Undo brings it back.",
  keys: "Arrow keys move it, plus and minus resize it, square brackets turn it, Delete removes it.",
  hint: "Tap a sticker in the preview to move, resize, turn or delete it.",
};
