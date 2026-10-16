/**
 * "Download everything": a zip of a gift made in the browser, so nothing big
 * runs on the server. Inside: notes.html (every note, readable and printable),
 * notes.csv (for a spreadsheet) and a media folder with every photo, voice
 * note and video. If a file can't be fetched, notes.html links to it instead.
 */
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { fetchContributions, fetchCalendarEntries, type Contribution } from "@/lib/gift";

const SECTION: Record<string, string> = {
  letters: "Letter",
  photobooth: "Photo",
  songs: "Song",
  wordcloud: "Words",
  voice: "Voice note",
  tree: "Ornament",
  superlatives: "Award",
  openwhen: "Open when",
  capsule: "Time capsule",
  video: "Video",
  quiz: "Quiz",
  map: "Map pin",
  coupons: "Coupon",
  doodle: "Doodle",
};

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const csv = (t: string) => `"${t.replace(/"/g, '""')}"`;
const safe = (t: string) => t.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "note";

function extFor(url: string, type: string | null) {
  const fromUrl = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(url)?.[1]?.toLowerCase();
  if (fromUrl && fromUrl !== "type") return fromUrl;
  if (type?.includes("jpeg")) return "jpg";
  if (type?.includes("png")) return "png";
  if (type?.includes("webp")) return "webp";
  if (type?.includes("mp4")) return "mp4";
  if (type?.includes("webm")) return "webm";
  if (type?.includes("mpeg")) return "mp3";
  return "bin";
}

function mediaOf(c: Contribution): string[] {
  const out = c.media_url ? [c.media_url] : [];
  if (c.data) for (const v of Object.values(c.data)) if (typeof v === "string" && /^(https:\/\/|\/api\/dev-uploads\/)/.test(v) && /blob\.vercel-storage|dev-uploads/.test(v)) out.push(v);
  return out;
}

export function ExportGift({ siteId, title, className = "" }: { siteId: string; title: string; className?: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy("Gathering notes…");
    try {
      const { zipSync, strToU8 } = await import("fflate");
      const [notes, calendar] = await Promise.all([fetchContributions(siteId, false), fetchCalendarEntries(siteId).catch(() => [])]);
      const files: Record<string, Uint8Array> = {};
      const rows: string[] = [["Section", "From", "Status", "Added", "Text", "Link", "Files"].map(csv).join(",")];
      const html: string[] = [];
      let i = 0;
      for (const n of notes) {
        i += 1;
        setBusy(`Packing ${i} of ${notes.length}…`);
        const saved: string[] = [];
        const missing: string[] = [];
        for (const [k, url] of mediaOf(n).entries()) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(String(res.status));
            const buf = new Uint8Array(await res.arrayBuffer());
            const name = `media/${String(i).padStart(3, "0")}-${safe(n.author_name)}${k ? `-${k + 1}` : ""}.${extFor(url, res.headers.get("content-type"))}`;
            files[name] = buf;
            saved.push(name);
          } catch {
            missing.push(url);
          }
        }
        const section = SECTION[n.module_type] ?? n.module_type;
        const added = n.created_at ? new Date(n.created_at).toLocaleString() : "";
        rows.push([section, n.author_name, n.status, added, n.text_content ?? "", n.external_link ?? "", saved.join(" ")].map(csv).join(","));
        html.push(`<article><p class="meta">${esc(section)} · ${esc(added)}${n.status !== "approved" ? ` · ${esc(n.status)}` : ""}</p>
${n.text_content ? `<p class="text">${esc(n.text_content).replace(/\n/g, "<br>")}</p>` : ""}
${n.external_link ? `<p><a href="${esc(n.external_link)}">${esc(n.external_link)}</a></p>` : ""}
${saved.map((f) => (/\.(jpe?g|png|webp|gif|avif)$/i.test(f) ? `<img src="${esc(f)}" alt="">` : `<p><a href="${esc(f)}">${esc(f)}</a></p>`)).join("")}
${missing.map((u) => `<p><a href="${esc(u)}">File (couldn't be downloaded, open it here)</a></p>`).join("")}
<p class="from">${esc(n.author_name)}</p></article>`);
      }
      for (const [k, e] of calendar.entries()) {
        if (!e.media_url) continue;
        try {
          const res = await fetch(e.media_url);
          if (res.ok) files[`media/calendar-${e.entry_date}-${k + 1}.${extFor(e.media_url, res.headers.get("content-type"))}`] = new Uint8Array(await res.arrayBuffer());
        } catch {
          /* skip */
        }
      }
      files["notes.csv"] = strToU8(`\ufeff${rows.join("\r\n")}`);
      files["notes.html"] = strToU8(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:Georgia,serif;background:#FBF8F2;color:#2B2522;max-width:680px;margin:40px auto;padding:0 20px}h1{font-weight:500}article{background:#fff;border:1px solid #E6DCCD;border-radius:14px;padding:18px 20px;margin:16px 0}.meta{font:12px system-ui,sans-serif;color:#7A6E62;margin:0 0 8px}.text{font-size:17px;line-height:1.6}.from{font-style:italic;color:#B5623E}img{max-width:100%;border-radius:8px;margin:8px 0}</style></head>
<body><h1>${esc(title)}</h1><p>${notes.length} notes, saved from Just Because on ${esc(new Date().toLocaleDateString())}.</p>${html.join("\n")}</body></html>`);
      setBusy("Zipping…");
      const zip = zipSync(files, { level: 0 });
      const blob = new Blob([zip as BlobPart], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safe(title)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
      toast.success("Downloaded. The zip has every note, photo and voice note.");
    } catch (error) {
      console.error(error);
      toast.error("We couldn't make the download. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={!!busy}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-cream px-5 text-sm font-medium disabled:opacity-70 ${className}`}
    >
      <Download className="size-4" />
      {busy ?? "Download everything"}
    </button>
  );
}
