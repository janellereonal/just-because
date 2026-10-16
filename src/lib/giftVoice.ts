/**
 * The few words on a gift that change when it's "Just me" (one person, for
 * someone they love) instead of from a group of friends.
 */
export function giftVoice(solo: boolean | undefined) {
  return solo
    ? {
        solo: true,
        sample: "Sample, replaced when you add your own",
        empty: (what: string) => `Your notes will show up here as ${what}.`,
        intro: (name: string) => `I made this just for you${name ? `, ${name}` : ""}. Take your time.`,
        signoff: "With love, always",
      }
    : {
        solo: false,
        sample: "Sample, replaced when friends add theirs",
        empty: (what: string) => `Notes from friends will show up here as ${what}.`,
        intro: (name: string) =>
          `Everyone who loves you put something in here${name ? `, ${name}` : ""}. Take your time.`,
        signoff: "With love, from all of us",
      };
}
