import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Loader2,
  Mail,
  Mic,
  Music2,
  Pencil,
  Square,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { deleteContributions, saveOwnerNote } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { signedMediaUrl, type Contribution, type ModuleType } from "@/lib/gift";

type NoteType = "letters" | "photobooth" | "songs" | "voice" | "wordcloud";

const TYPES: { type: NoteType; label: string; icon: typeof Mail }[] = [
  { type: "letters", label: "Letter", icon: Mail },
  { type: "photobooth", label: "Photo", icon: ImageIcon },
  { type: "songs", label: "Song", icon: Music2 },
  { type: "voice", label: "Voice note", icon: Mic },
  { type: "wordcloud", label: "Words", icon: Type },
];

const PROMPTS: Record<NoteType, string[]> = {
  letters: [
    "The moment I knew…",
    "Things I never say enough…",
    "My favourite memory of us…",
    "What I want for you this year…",
  ],
  photobooth: ["Our first photo", "That one trip", "The day you made me laugh the hardest"],
  songs: ["The song that's so us", "The one from our first road trip"],
  voice: ["Say the thing you'd say in person"],
  wordcloud: ["kind, funny, home"],
};

const field =
  "mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent";

function Thumb({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void signedMediaUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  return url ? <img src={url} alt="" className="size-full object-cover" /> : null;
}

/** Records a short voice note in the browser. Nothing leaves the device until they save. */
function Recorder({ onFile }: { onFile: (f: File | null) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
      rec.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (r.mimeType || "audio/webm").split(";")[0]!;
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const file = new File(chunks, `voice-note.${ext}`, { type });
        setUrl(URL.createObjectURL(file));
        onFile(file);
        setState("done");
      };
      rec.current = r;
      r.start();
      setSecs(0);
      timer.current = window.setInterval(() => {
        setSecs((s) => {
          if (s >= 179) {
            r.stop();
            if (timer.current) window.clearInterval(timer.current);
          }
          return s + 1;
        });
      }, 1000);
      setState("recording");
    } catch {
      toast.error("We couldn't use the mic. You can upload a voice note instead.");
    }
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    rec.current?.stop();
  }

  return (
    <div className="mt-1 rounded-xl border border-line bg-cream p-3">
      {state === "recording" ? (
        <button
          type="button"
          onClick={stop}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-cream"
        >
          <Square className="size-4 fill-current" /> Stop · {Math.floor(secs / 60)}:
          {String(secs % 60).padStart(2, "0")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            onFile(null);
            setUrl(null);
            void start();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-cream"
        >
          <Mic className="size-4" /> {state === "done" ? "Record again" : "Record"}
        </button>
      )}
      {url && state === "done" ? <audio controls src={url} className="mt-2 w-full" /> : null}
    </div>
  );
}

/**
 * The creator's own notes, written straight in the editor. On a "Just me" gift
 * this is where the whole gift gets made; on a group gift it's "add yours too".
 */
export function OwnNotes({
  siteId,
  solo,
  onSoloChange,
  contributions,
  recipient,
  defaultName,
}: {
  siteId: string;
  solo: boolean;
  onSoloChange: (solo: boolean) => void;
  contributions: Contribution[];
  recipient: string;
  defaultName: string;
}) {
  const queryClient = useQueryClient();
  const signKey = `jb-sign-${siteId}`;
  const [sign, setSign] = useState(defaultName);
  const [type, setType] = useState<NoteType>("letters");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [busy, setBusy] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"record" | "upload">("record");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const prompt = PROMPTS[type][contributions.length % PROMPTS[type].length];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(signKey);
      if (saved) setSign(saved);
      else if (defaultName) setSign(defaultName);
    } catch {
      if (defaultName) setSign(defaultName);
    }
  }, [signKey, defaultName]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const mine = contributions.filter((c) => c.by_owner);

  function reset() {
    setText("");
    setLink("");
    setFile(null);
    setEditing(null);
  }

  function startEdit(c: Contribution) {
    setEditing(c);
    setType(c.module_type as NoteType);
    setText(c.text_content ?? "");
    setLink(c.external_link ?? "");
    setFile(null);
  }

  async function save() {
    const name = sign.trim();
    const problem = !name
      ? "Sign it with your name first."
      : type === "letters" && !text.trim()
        ? "Write something first."
        : type === "wordcloud" && !text.trim()
          ? "Add at least one word."
          : type === "songs" && !link.trim()
            ? "Paste a Spotify or YouTube link."
            : (type === "photobooth" || type === "voice") && !file && !editing?.media_url
              ? type === "photobooth"
                ? "Pick a photo first."
                : "Record or upload a voice note first."
              : null;
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      let media = editing?.media_url ?? null;
      if (file) media = await uploadFile(file, "contribution", siteId);
      const result = await saveOwnerNote({
        data: {
          id: editing?.id ?? crypto.randomUUID(),
          siteId,
          moduleType: type,
          authorName: name,
          textContent: text.trim() || null,
          mediaUrl: type === "photobooth" || type === "voice" ? media : null,
          externalLink: type === "songs" ? link.trim() || null : null,
        },
      });
      if (!result.ok) {
        toast.error(
          result.full === "photos"
            ? "This gift has all the photos its plan can hold."
            : "This gift is full on its plan.",
        );
        return;
      }
      try {
        window.localStorage.setItem(signKey, name);
      } catch {
        /* fine */
      }
      toast.success(editing ? "Updated." : "Added to the gift.");
      reset();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contributions", siteId] }),
        queryClient.invalidateQueries({ queryKey: ["modules", siteId] }),
      ]);
    } catch {
      toast.error("That didn't save. Try again?");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Contribution) {
    if (!window.confirm("Remove this from the gift?")) return;
    try {
      await deleteContributions({ data: { ids: [c.id] } });
      if (editing?.id === c.id) reset();
      await queryClient.invalidateQueries({ queryKey: ["contributions", siteId] });
    } catch {
      toast.error("Couldn't remove that one.");
    }
  }

  const label = (t: ModuleType) => TYPES.find((x) => x.type === t)?.label ?? "Note";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted">Who's it from?</p>
        <div
          className="mt-1.5 grid grid-cols-2 gap-1 rounded-full bg-cream p-1 ring-1 ring-line"
          role="radiogroup"
        >
          {(
            [
              [true, "Just me"],
              [false, "Me and friends"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={solo === v}
              onClick={() => onSoloChange(v)}
              className={`rounded-full py-2 text-xs font-semibold transition-colors ${solo === v ? "bg-ink text-cream" : "text-muted hover:text-ink"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {solo
            ? `You make every page for ${recipient || "them"}. There's no friends link.`
            : "Friends add theirs through the link. You can add yours here too."}
        </p>
      </div>

      <div className="rounded-2xl bg-pink/30 p-3.5 ring-1 ring-pink">
        <p className="text-sm font-semibold">
          {editing ? `Edit your ${label(editing.module_type).toLowerCase()}` : "Add something"}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="What to add">
          {TYPES.map(({ type: t, label: l, icon: Icon }) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              disabled={!!editing && editing.module_type !== t}
              onClick={() => {
                setType(t);
                setFile(null);
              }}
              className={`squish inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 disabled:opacity-40 ${type === t ? "bg-ink text-cream ring-ink" : "bg-cream ring-line hover:bg-pink/40"}`}
            >
              <Icon className="size-3.5" /> {l}
            </button>
          ))}
        </div>

        {type === "photobooth" ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-ink/25 bg-cream text-sm text-muted hover:border-accent"
            >
              {preview ? (
                <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
              ) : editing?.media_url ? (
                <span className="absolute inset-0">
                  <Thumb path={editing.media_url} />
                </span>
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <Upload className="size-5" /> Pick a photo
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <label className="mt-2.5 block">
              <span className="text-xs text-muted">Caption (optional)</span>
              <input
                className={field}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={prompt}
              />
            </label>
          </div>
        ) : null}

        {type === "letters" ? (
          <label className="mt-3 block">
            <span className="text-xs text-muted">Your letter</span>
            <textarea
              rows={6}
              className={`${field} font-[family-name:var(--jb-display,Fraunces)] text-lg leading-snug`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={prompt}
            />
          </label>
        ) : null}

        {type === "songs" ? (
          <div className="mt-3 space-y-2.5">
            <label className="block">
              <span className="text-xs text-muted">Spotify or YouTube link</span>
              <input
                className={field}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://open.spotify.com/track/…"
                inputMode="url"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Why this song? (optional)</span>
              <input
                className={field}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={prompt}
              />
            </label>
          </div>
        ) : null}

        {type === "voice" ? (
          <div className="mt-3">
            <div className="flex gap-3 text-xs">
              {(["record", "upload"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setVoiceMode(m);
                    setFile(null);
                  }}
                  className={voiceMode === m ? "font-semibold underline" : "text-muted"}
                >
                  {m === "record" ? "Record here" : "Upload a file"}
                </button>
              ))}
            </div>
            {voiceMode === "record" ? (
              <Recorder onFile={setFile} />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 bg-cream py-3 text-sm text-muted hover:border-accent"
                >
                  <Upload className="size-4" /> {file ? file.name : "Choose an audio file"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </>
            )}
            <label className="mt-2.5 block">
              <span className="text-xs text-muted">A short note (optional)</span>
              <input className={field} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
          </div>
        ) : null}

        {type === "wordcloud" ? (
          <label className="mt-3 block">
            <span className="text-xs text-muted">A few words that describe them</span>
            <input
              className={field}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={prompt}
            />
            <span className="mt-1 block text-[11px] text-muted">Separate words with commas.</span>
          </label>
        ) : null}

        <label className="mt-3 block">
          <span className="text-xs text-muted">Signed</span>
          <input
            className={field}
            value={sign}
            maxLength={120}
            onChange={(e) => setSign(e.target.value)}
            placeholder="Your name, or what they call you"
          />
        </label>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="squish inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? "Save changes" : "Add to the gift"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-4 text-sm text-muted hover:text-ink"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">
          {mine.length ? `Your notes (${mine.length})` : "Your notes"}
        </p>
        {mine.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted">
            {solo
              ? "Nothing yet. Start with a letter, it's the part they'll read twice."
              : "Add yours too. It shows up in the gift right away."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {mine.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-3 rounded-xl bg-cream p-2.5 ring-1 ${editing?.id === c.id ? "ring-accent" : "ring-line"}`}
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-pink/40 text-ink/70">
                  {c.module_type === "photobooth" ? (
                    <Thumb path={c.media_url} />
                  ) : (
                    (() => {
                      const Icon = TYPES.find((t) => t.type === c.module_type)?.icon ?? Mail;
                      return <Icon className="size-4" />;
                    })()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">
                    {label(c.module_type)}
                  </span>
                  <span className="block truncate text-sm">
                    {c.text_content || c.external_link || "No caption"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="grid size-9 place-items-center rounded-full text-muted hover:bg-pink/40 hover:text-ink"
                  aria-label="Edit"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(c)}
                  className="grid size-9 place-items-center rounded-full text-muted hover:bg-pink/40 hover:text-ink"
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
