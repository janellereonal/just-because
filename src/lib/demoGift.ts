/**
 * A made-up gift for the landing page demo. Nothing here touches the database.
 */
import type { GiftSite, ModuleType, SiteModule, ViewContribution } from "@/lib/gift";
import type { GiftFormat } from "@/lib/formats";
import type { Palette } from "@/lib/themes";

export const DEMO_PALETTE: Palette = { background: "#FFF4EC", primary: "#5B4BDB", accent: "#E8577E" };

const MODULE_TYPES: ModuleType[] = ["letters", "photobooth", "songs", "voice", "wordcloud", "countdown"];

export function demoSite(format: GiftFormat): GiftSite {
  const inTen = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  return {
    id: "demo",
    creator_id: "demo",
    title: "Happy 21st, Maya",
    theme_id: null,
    slug: "demo",
    status: "published",
    format,
    format_settings: { cover_title: "THE AMAZING MAYA", cover_subtitle: "SPECIAL BIRTHDAY ISSUE" },
    custom_text: {
      heading: "Happy 21st, Maya",
      recipient_name: "Maya",
      intro_message: "Everyone who loves you put something in here. Take your time.",
      footer_note: "See you at dinner on Saturday.",
    },
    custom_colors: DEMO_PALETTE,
    palette_id: null,
    share_notes: true,
    font_choice: "playful",
    countdown_date: inTen,
    calendar_locked: false,
    intro_text: null,
    background_style: "clean",
    tree_reveal_date: null,
    tier: "celebration",
    published_at: null,
    expires_at: null,
    created_at: new Date().toISOString(),
    password_set: false,
    password_protected: false,
    unlocked: true,
  };
}

export const DEMO_MODULES: SiteModule[] = MODULE_TYPES.map((t, i) => ({
  id: `demo-m${i}`,
  site_id: "demo",
  module_type: t,
  price: 0,
  enabled: true,
}));

function note(id: string, module_type: ModuleType, author_name: string, text_content: string | null, media_url: string | null = null): ViewContribution {
  return {
    id,
    site_id: "demo",
    module_type,
    author_name,
    text_content,
    media_url,
    external_link: null,
    status: "approved",
    ornament_key: null,
    visibility: "public",
    created_at: "",
  } as ViewContribution;
}

export const DEMO_NOTES: ViewContribution[] = [
  note("d1", "letters", "Mama", "Anak, I still remember the day you were born. I'm proud of you every single day. Happy 21st."),
  note("d2", "photobooth", "Jo", "That beach day in La Union", "/demo/beach.webp"),
  note("d3", "letters", "Paolo", "You make every room warmer. Don't ever change."),
  note("d4", "songs", "Lia", "This one is so you."),
  note("d5", "letters", "Bea", "To many more beach trips and bad karaoke nights. Love you lots."),
  note("d6", "photobooth", "Mika", "Org night, 2am", "/demo/party.webp"),
  note("d7", "voice", "Papa", "A little voice note"),
  note("d8", "letters", "Tita Grace", "Study hard but rest too. God bless you always, iha."),
  note("d9", "wordcloud", "Jo", "kind"),
  note("d10", "wordcloud", "Bea", "funny"),
  note("d11", "wordcloud", "Mika", "brave"),
  note("d12", "wordcloud", "Paolo", "home"),
];
