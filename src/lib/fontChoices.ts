/** The saved font_choice values (labels and faces live in FONT_PAIRINGS in gift.ts). Safe on the server. */
export const FONT_CHOICE_IDS = ["theme", "romantic", "playful", "modern", "handwritten", "storybook", "elegant", "bold", "bubbly", "penpal", "typewriter", "groovy", "retro", "comic", "pixel"] as const;
export type FontChoiceId = (typeof FONT_CHOICE_IDS)[number];
