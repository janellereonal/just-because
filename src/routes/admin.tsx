import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { usePreviewUrl } from "@/components/ThemeCard";
import { fetchThemes, THEME_BUCKET, type Theme } from "@/lib/themes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Theme admin — Just Because" },
      { name: "description", content: "Manage the Just Because theme template library." },
      { property: "og:title", content: "Theme admin — Just Because" },
      {
        property: "og:description",
        content: "Manage the Just Because theme template library.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: themes = [] } = useQuery({
    queryKey: ["themes", "all"],
    queryFn: () => fetchThemes(true),
    enabled: isAdmin,
  });

  const toggleStatus = useMutation({
    mutationFn: async (theme: Theme) => {
      const next = theme.status === "published" ? "draft" : "published";
      const { error } = await supabase.from("themes").update({ status: next }).eq("id", theme.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      toast.success(next === "published" ? "Theme published." : "Theme hidden from creators.");
    },
    onError: () => toast.error("Couldn't update that theme."),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-5 py-16 text-sm text-muted">Checking access…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <div className="mx-auto max-w-md px-5 py-20 text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight">Admins only</h1>
          <p className="mt-2 text-sm text-muted">
            This space manages the shared theme library.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">Theme library</h1>
        <p className="mt-3 max-w-[52ch] text-muted">
          Upload preview images and control which themes creators can pick.
        </p>

        <div className="mt-8 space-y-3">
          {themes.map((theme) => (
            <AdminThemeRow
              key={theme.id}
              theme={theme}
              onToggle={() => toggleStatus.mutate(theme)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminThemeRow({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const queryClient = useQueryClient();
  const previewUrl = usePreviewUrl(theme.preview_image_url);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const path = `${theme.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from(THEME_BUCKET)
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      toast.error("Upload failed. Images must be under 10MB.");
      return;
    }
    const { error } = await supabase
      .from("themes")
      .update({ preview_image_url: path })
      .eq("id", theme.id);
    setUploading(false);
    if (error) {
      toast.error("Saved the image but couldn't link it to the theme.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["themes"] });
    toast.success("Preview image updated.");
  }

  return (
    <div className="card-paper flex flex-wrap items-center gap-4 p-4">
      <div
        className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl ring-1 ring-ink/5"
        style={{ backgroundColor: theme.palettes[0]?.background ?? "transparent" }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={theme.name} className="size-full object-cover" />
        ) : (
          <span className="font-mono text-[10px] text-muted">no image</span>
        )}
      </div>

      <div className="min-w-[180px] flex-1">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
          {theme.category}
        </p>
        <p className="font-display text-lg font-medium tracking-tight">{theme.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {theme.palettes.map((palette, i) => (
            <div key={i} className="flex gap-1">
              {[palette.background, palette.primary, palette.accent].map((c) => (
                <span
                  key={c}
                  className="size-3.5 rounded-full ring-1 ring-ink/5"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <label className="cursor-pointer rounded-full border border-line bg-glass/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-glass/80">
        {uploading ? "Uploading…" : "Upload preview"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </label>

      <button
        onClick={onToggle}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          theme.status === "published"
            ? "bg-ink text-cream hover:bg-ink/90"
            : "border border-line bg-cream hover:bg-glass/70"
        }`}
      >
        {theme.status === "published" ? "Published" : "Draft"}
      </button>
    </div>
  );
}
