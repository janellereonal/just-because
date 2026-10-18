/**
 * The gift's character beside a layout opening's object, cheering when it
 * opens. Only when the organiser picked one: the house mascot never appears
 * (or hops) on gift pages.
 */
import { forwardRef } from "react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";

/** True when the gift has its own character (not none, not the house mascot). */
export function hasBuddy(p: OpeningProps) {
  const c = p.character;
  if (!c || c.type === "none") return false;
  return !(c.type === "library" && c.id === "mascot");
}

/** The gift's character, placed with `className`. Renders nothing without one. */
export const Buddy = forwardRef<
  CharacterHandle,
  { p: OpeningProps; size?: number; className?: string; style?: React.CSSProperties }
>(function Buddy({ p, size = 84, className = "", style }, ref) {
  if (!hasBuddy(p)) return null;
  return (
    <div className={`absolute z-[6] ${className}`} style={style}>
      <Character
        ref={ref}
        setting={p.character}
        accessory={p.accessory}
        size={size}
        live={!p.paused}
        showName={false}
      />
    </div>
  );
});
