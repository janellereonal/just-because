import { BookOpen, PanelsTopLeft } from "lucide-react";
import type { GiftFormat } from "@/lib/comic";

export function FormatPicker({ value, onChange }: { value: GiftFormat; onChange: (value: GiftFormat) => void }) {
  const options = [
    { id: "scrapbook" as const, title: "Scrapbook", copy: "A warm, scrolling collection", Icon: BookOpen },
    { id: "comic" as const, title: "Comic Issue", copy: "A cover and page-turn adventure", Icon: PanelsTopLeft },
  ];
  return (
    <fieldset>
      <legend className="text-sm font-medium">Choose a format</legend>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {options.map(({ id, title, copy, Icon }) => {
          const active = value === id;
          return (
            <label key={id} className={`cursor-pointer overflow-hidden rounded-xl border ${active ? "border-accent ring-2 ring-accent/25" : "border-line"}`}>
              <input className="sr-only" type="radio" name="format" checked={active} onChange={() => onChange(id)} />
              <span className={`block h-28 p-3 ${id === "comic" ? "bg-ink" : "bg-paper"}`}>
                {id === "comic" ? (
                  <span className="grid h-full grid-cols-2 gap-1" aria-hidden>
                    <span className="border-2 border-cream bg-accent/70" />
                    <span className="grid border-2 border-cream bg-paper text-ink place-items-center font-black">BAM!</span>
                  </span>
                ) : (
                  <span className="grid h-full rotate-[-2deg] place-items-center rounded-sm border border-line bg-cream shadow-sm" aria-hidden>
                    <Icon className="size-8 text-accent" />
                  </span>
                )}
              </span>
              <span className="block bg-cream p-3">
                <span className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4" />{title}</span>
                <span className="mt-1 block text-xs text-muted">{copy}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}