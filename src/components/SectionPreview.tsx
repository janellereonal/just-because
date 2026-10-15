/**
 * One real section, drawn by the same code as the finished gift, in the
 * chosen theme and colors, filled with sample notes. It's live: open the
 * envelopes, answer the quiz, tear a coupon. Used while picking sections.
 */
import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ModuleType, SiteModule } from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";
import { GiftSiteView } from "@/components/GiftSiteView";
import { Live3DContext } from "@/components/Theme3D";
import { buildPreviewSite, sampleFor } from "@/components/ThemeLivePreview";
import { sampleNotes } from "@/lib/sampleSections";
import { SPRING } from "@/themes/_shared/stage";

const PLAIN: Theme = {
  id: "plain",
  name: "Just Because",
  category: "",
  preview_image_url: null,
  palettes: [{ background: "#FBF8F2", primary: "#2B2522", accent: "#B5623E" }],
  suggested_palette_ids: [],
  description: null,
  status: "published",
  default_modules: [],
  created_at: "",
};

export function SectionPreview({
  type,
  theme,
  palette,
  recipient,
  className = "",
}: {
  type: ModuleType;
  theme: Theme | null | undefined;
  palette?: Palette | null | undefined;
  recipient?: string | undefined;
  className?: string;
}) {
  const t = theme ?? PLAIN;
  const pal = palette ?? t.palettes[0] ?? PLAIN.palettes[0]!;
  const name = recipient?.trim() || sampleFor(t).name;
  const site = useMemo(() => {
    const s = buildPreviewSite(t, pal);
    return { ...s, custom_text: { ...s.custom_text, recipient_name: name } };
  }, [t, pal, name]);
  const notes = useMemo(() => sampleNotes(name, site.id), [name, site.id]);
  const modules: SiteModule[] = [{ id: `pv-${type}`, site_id: site.id, module_type: type, price: 0, enabled: true }];
  const contributions = notes.filter((c) => c.module_type === type);

  return (
    <div
      className={`relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-24px_rgba(43,37,34,.55)] ring-1 ring-ink/8 ${className}`}
      style={{ background: pal.background }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${type}-${t.id}-${pal.background}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SPRING.soft}
          className="max-h-[min(520px,62vh)] overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:thin]"
        >
          <Live3DContext.Provider value={false}>
            <GiftSiteView site={site} theme={t} modules={modules} contributions={contributions} sample sectionsOnly />
          </Live3DContext.Provider>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
