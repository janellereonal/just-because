import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NOINDEX } from "@/lib/seo";
import { fetchThemes } from "@/lib/themes";
import { KIND_WORDS, themeKindOf } from "@/lib/themeKind";
import { themePalettes, usePalettes } from "@/hooks/usePalettes";
import { readableInk } from "@/lib/palettes";
import { designFor, themeFontVars, loadThemeFonts } from "@/themes/_shared/design";
import { useEffect } from "react";

/**
 * Dev only: the 1200x630 link-preview cards. tools/screens/og.js screenshots
 * them into public/og/. /dev/og?kind=birthday&v=gift (v: gift | add | default)
 */
export const Route = createFileRoute("/dev/og")({
  head: () => ({ meta: [NOINDEX] }),
  validateSearch: (s: Record<string, unknown>) => ({
    kind: typeof s["kind"] === "string" ? s["kind"] : "default",
    v: (s["v"] === "add" || s["v"] === "default" ? s["v"] : "gift") as "gift" | "add" | "default",
  }),
  component: DevOg,
});

const STILL_KINDS = ["anniversary", "birthday", "bridal", "christmas", "game", "handwritten", "newyear", "pets", "pixel", "valentine", "voyage", "wedding"];

function DevOg() {
  const { kind, v } = Route.useSearch();
  const { data: themes = [] } = useQuery({ queryKey: ["themes", false], queryFn: () => fetchThemes(false) });
  const { data: all = [] } = usePalettes();
  useEffect(() => loadThemeFonts(kind as never), [kind]);
  if (!import.meta.env.DEV) return null;

  if (v === "default") {
    return (
      <div id="og" className="relative flex overflow-hidden" style={{ width: 1200, height: 630, background: "#FBF8F2" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(70% 90% at 85% 40%, #F7DCE5 0, transparent 70%)" }} />
        <div className="relative z-10 flex w-[640px] flex-col justify-center pl-20">
          <p className="font-display text-[30px] font-semibold text-[#2B2522]">
            Just <span className="text-[#C2366B]">Because</span>
          </p>
          <h1 className="mt-6 font-display text-[76px] leading-[0.98] font-semibold tracking-tight text-[#2B2522]">
            One gift from <em className="font-medium">everyone</em> who loves them.
          </h1>
          <p className="mt-6 text-[26px] text-[#6B625C]">Letters, photos, songs and voice notes, opened all at once.</p>
        </div>
        <div className="relative flex-1">
          <img src="/themes3d/birthday.webp" alt="" className="absolute top-[40px] right-[-60px] w-[520px] rotate-[4deg] rounded-[36px] shadow-[0_30px_60px_-30px_rgba(43,37,34,.5)]" />
          <img src="/themes3d/valentine.webp" alt="" className="absolute top-[330px] right-[230px] w-[330px] -rotate-[6deg] rounded-[28px] shadow-[0_30px_60px_-30px_rgba(43,37,34,.5)]" />
          <img src="/bo/happy.webp" alt="" className="absolute right-[40px] bottom-[10px] w-[170px]" />
        </div>
      </div>
    );
  }

  const theme = themes.find((t) => themeKindOf(t) === kind);
  const p = theme ? themePalettes(theme, all)[0] : undefined;
  if (kind !== "default" && (!theme || !p)) return <p>loading</p>;
  const bg = p?.background ?? "#FBF8F2";
  const accent = p?.accent ?? "#C2366B";
  const ink = readableInk(bg);
  const still = STILL_KINDS.includes(kind) ? `/themes3d/${kind}.webp` : "/themes3d/default.webp";
  const d = designFor(kind as never);
  const title = v === "add" ? "Add your note to the gift" : "A gift for you";
  const sub = v === "add" ? "A few words, a photo or a song. No account needed." : "Made by the people who love you.";
  return (
    <div id="og" className="relative flex overflow-hidden" style={{ width: 1200, height: 630, background: bg, color: ink, ...(themeFontVars(kind as never) as object) }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(80% 100% at 80% 50%, ${accent}33 0, transparent 70%)` }} />
      <div className="relative z-10 flex w-[600px] flex-col justify-center pl-20">
        <p className="text-[20px] font-semibold tracking-[0.2em] uppercase opacity-70">{(KIND_WORDS as Record<string, { badge: string }>)[kind]?.badge ?? d.name}</p>
        <h1 className="mt-5 text-[78px] leading-[1] font-semibold" style={{ fontFamily: "var(--jb-display)" }}>
          {title}
        </h1>
        <p className="mt-6 text-[26px] opacity-75" style={{ fontFamily: "var(--jb-text)" }}>
          {sub}
        </p>
        <p className="mt-10 font-display text-[26px] font-semibold">
          Just <span style={{ color: accent }}>Because</span>
        </p>
      </div>
      <div className="relative flex-1">
        <img src={still} alt="" className="absolute top-1/2 right-[-40px] w-[600px] -translate-y-1/2 rounded-[40px]" style={{ boxShadow: "0 40px 80px -40px rgba(0,0,0,.45)" }} />
      </div>
    </div>
  );
}
