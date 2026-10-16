// Restores the shared palettes and the occasion themes. Idempotent.
import postgres from "postgres";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.warn("DATABASE_URL not set, skipping.");
  process.exit(0);
}
const sql = postgres(url, { max: 1 });

// Main and Accent both pass 3:1 against the background (the palette picker warns below that).
// Check new palettes with the contrast helpers in src/lib/palettes.ts before adding them.
const P = (n: number) => `22222222-2222-4222-8222-${String(n).padStart(12, "0")}`;
const palettes: [string, string, string, string, string][] = [
  ["Blush", "Romantic", "#F8E1E7", "#EA3F6A", "#C43B5A"],
  ["Deep Romance", "Romantic", "#FCE9E4", "#D64550", "#7A1F2B"],
  ["Rose Gold", "Romantic", "#FBEFE9", "#BC7567", "#8A5A4E"],
  ["Blush Bloom", "Romantic", "#FCF1F0", "#B97A74", "#9C829B"],
  ["Berry", "Romantic", "#F7ECF2", "#B83B7A", "#4A1D3F"],
  ["Confetti", "Bright", "#FFF3D6", "#DB6A00", "#5A6FE8"],
  ["Pastel Party", "Bright", "#FDEFF4", "#C86D90", "#9B72CF"],
  ["Sunny", "Bright", "#FFF6E5", "#C57D00", "#449C7A"],
  ["Citrus", "Bright", "#FFFBEA", "#CD7C00", "#E4572E"],
  ["Peach Fuzz", "Bright", "#FFF1EA", "#D26E45", "#C45E4A"],
  ["Soft Goodbye", "Soft", "#EEF3F5", "#668DAC", "#3D5A73"],
  ["Sky", "Soft", "#EEF4FB", "#5D8DC8", "#2E4A7A"],
  ["Ocean", "Soft", "#EAF4F4", "#1E989B", "#1F4E5F"],
  ["Lavender Paws", "Soft", "#F3EFFA", "#9F76CB", "#CF668A"],
  ["Ivory Sage", "Soft", "#FAF6F0", "#A7865E", "#7A8C7A"],
  ["Just Because", "Earthy", "#F4EEE3", "#B5623E", "#2B2522"],
  ["Golden Hour", "Earthy", "#FFF6E9", "#CD781A", "#5A7D9A"],
  ["Classic Christmas", "Earthy", "#F4EDE4", "#C1442E", "#2F6B4F"],
  ["Cozy Cabin", "Earthy", "#FBF3E7", "#CE7237", "#7A5230"],
  ["Timeless", "Earthy", "#F6EFE9", "#AE8039", "#5A4A3F"],
  ["Matcha", "Earthy", "#F1F3E8", "#759256", "#3F5A3A"],
  ["Monochrome", "Earthy", "#FAFAF7", "#2B2522", "#8A8177"],
  ["Midnight Gold", "Dark", "#1A1F2E", "#E8C468", "#F5F0E1"],
  ["Sparkle", "Dark", "#20143A", "#9B6FE8", "#E8D9A0"],
  // Signature palettes, one per theme (Oct 2026 theme system). Appended so ids stay stable.
  ["Wax Seal", "Romantic", "#F6EEE3", "#B4335A", "#5E1424"],
  ["Vinyl Night", "Dark", "#2B1D18", "#E9D6B0", "#B48DA3"],
  ["Party Butter", "Bright", "#FFF3C4", "#EB4E99", "#2D4BD6"],
  ["Ivory Gold", "Soft", "#FBF7EE", "#7D946C", "#A8843E"],
  ["Nursery", "Soft", "#F5EFE4", "#5A8CBC", "#D5627C"],
  ["Pine & Cranberry", "Earthy", "#F7F4EE", "#A3203A", "#1F4D3A"],
  ["Midnight Toast", "Dark", "#10152E", "#E5C26B", "#A99BF5"],
  ["Boarding Pass", "Soft", "#F6F0E4", "#3E8CCE", "#E2531F"],
  ["Tennis Ball", "Earthy", "#F4EBDD", "#D1662B", "#A8461F"],
  // Style themes (Handwritten, Game Night, Pixel), Oct 2026. Appended so ids stay stable.
  ["Fountain Pen", "Soft", "#FBF6EA", "#2A3A6B", "#B8485F"],
  ["Love Note", "Romantic", "#FFF1EC", "#B8485F", "#2A3A6B"],
  ["Kraft Paper", "Earthy", "#F3E7D3", "#7A5230", "#2A3A6B"],
  ["Game Night", "Bright", "#FFF6E5", "#22305E", "#D93A33"],
  ["Board Game", "Bright", "#EAF6EE", "#22305E", "#C9302A"],
  ["Felt Table", "Dark", "#1E4D3B", "#FFD34E", "#FFF6E5"],
  ["Pixel Night", "Dark", "#1B1640", "#3DF2B0", "#FF5DA2"],
  ["Arcade", "Bright", "#FFF4D6", "#5B3FE0", "#D9336F"],
  ["Handheld", "Soft", "#E3EDC9", "#306230", "#6A4BD8"],
];
const ids = new Map(palettes.map(([name], i) => [name, P(i + 1)]));

const themes: [string, string, string, string[], string[]][] = [
  ["Valentine's", "Romance", "Soft blush and deep rose for the people you adore.", ["letters", "photobooth", "songs"], ["Wax Seal", "Blush", "Deep Romance", "Berry"]],
  ["Happy Birthday", "Celebration", "Confetti-bright layouts for another trip around the sun.", ["letters", "photobooth", "countdown"], ["Party Butter", "Confetti", "Pastel Party", "Citrus"]],
  ["Bon Voyage", "Farewell", "A warm send-off for someone moving on.", ["letters", "voice", "photobooth"], ["Boarding Pass", "Golden Hour", "Soft Goodbye", "Sky"]],
  ["Christmas", "Season", "Pine, ribbon and candlelight for the holidays.", ["countdown", "calendar", "photobooth", "tree"], ["Pine & Cranberry", "Classic Christmas", "Cozy Cabin", "Midnight Gold"]],
  ["Pets", "Companions", "For the furry ones who make the house a home.", ["photobooth", "wordcloud", "letters"], ["Tennis Ball", "Sunny", "Lavender Paws", "Peach Fuzz"]],
  ["New Year", "New year", "Midnight and gold for fresh beginnings.", ["countdown", "wordcloud", "photobooth"], ["Midnight Toast", "Midnight Gold", "Sparkle", "Monochrome"]],
  ["Anniversary", "Milestone", "Champagne and clay for the years you have shared.", ["letters", "photobooth", "countdown"], ["Vinyl Night", "Timeless", "Rose Gold", "Just Because"]],
  ["Weddings", "Wedding", "Ivory, sage and soft gold for the big day.", ["letters", "photobooth", "songs"], ["Ivory Gold", "Ivory Sage", "Blush Bloom", "Matcha"]],
  ["Bridal Shower", "Shower", "Blush, peach and sage for the bride-to-be and her people.", ["letters", "photobooth", "wordcloud", "countdown"], ["Blush Bloom", "Peach Fuzz", "Ivory Sage"]],
  ["Baby Shower", "Shower", "Powder blue, butter and blush for the little one on the way.", ["letters", "photobooth", "wordcloud", "countdown"], ["Nursery", "Sunny", "Sky"]],
  ["Handwritten", "Any occasion", "Ink on paper, folded in four. For any occasion that needs a few real words.", ["letters", "openwhen", "capsule", "photobooth"], ["Fountain Pen", "Love Note", "Kraft Paper"]],
  ["Game Night", "Any occasion", "Dice, tokens and a board, for the friend who always wins.", ["letters", "quiz", "superlatives", "photobooth"], ["Game Night", "Board Game", "Felt Table"]],
  ["Pixel", "Any occasion", "Eight-bit hearts and coins on a little console. Press start.", ["letters", "quiz", "superlatives", "photobooth"], ["Pixel Night", "Arcade", "Handheld"]],
];

await sql.begin(async (tx) => {
  for (const [i, [name, group, bg, primary, accent]] of palettes.entries()) {
    await tx`
      insert into palettes (id, name, group_name, background, primary_color, accent, sort_order)
      values (${ids.get(name)!}, ${name}, ${group}, ${bg}, ${primary}, ${accent}, ${i + 1})
      on conflict (id) do update set name = excluded.name, group_name = excluded.group_name,
        background = excluded.background, primary_color = excluded.primary_color,
        accent = excluded.accent, sort_order = excluded.sort_order`;
  }
  // Renamed themes: keep the same row (and every gift using it), just change the name.
  // Add old names here instead of editing a theme's name above, so nothing duplicates.
  const renames: [string, string][] = [
    ["Despidida", "Bon Voyage"],
    ["Bridal shower", "Bridal Shower"],
    ["Bridal", "Bridal Shower"],
    ["Anniversaries", "Anniversary"],
  ];
  for (const [from, to] of renames) {
    await tx`update themes set name = ${to} where name = ${from}
             and not exists (select 1 from themes where name = ${to})`;
  }
  for (const [i, [name, category, description, modules, paletteNames]] of themes.entries()) {
    const suggested = paletteNames.map((n) => ids.get(n)!);
    const [existing] = await tx`select id from themes where name = ${name}`;
    if (existing) {
      await tx`update themes set suggested_palette_ids = ${suggested}::uuid[] where id = ${existing.id}`;
      continue;
    }
    await tx`
      insert into themes (name, category, description, status, default_modules, suggested_palette_ids, created_at)
      values (${name}, ${category}, ${description}, 'published', ${modules}::text[], ${suggested}::uuid[],
              now() + make_interval(secs => ${i}))`;
  }
});
await sql.end();
console.log("Seeded palettes and themes.");
