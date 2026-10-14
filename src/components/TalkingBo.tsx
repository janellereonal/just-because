import { useCallback, useEffect, useRef, useState } from "react";
import { Bo3D } from "@/components/Bo3D";
import type { BoFace, BoMood, BoScene } from "@/lib/bo3d/scene";

type Line = { text: string; face?: BoFace };

type Props = {
  className?: string;
  /** Said one after another once Bo is on screen. */
  intro: Line[];
  /** One of these when someone taps Bo. */
  onTap?: Line[];
  mood?: BoMood;
  notes?: boolean;
  label?: string;
};

const LINE_MS = 2800;

/**
 * A 3D Bo that introduces himself in a speech bubble and reacts when tapped.
 * The bubble is decorative (aria-hidden); the label carries the meaning.
 */
export function TalkingBo({ className, intro, onTap = [], mood = "wave", notes = false, label = "Bo, the Just Because gift box" }: Props) {
  const sceneRef = useRef<BoScene | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const queue = useRef<Line[]>([]);
  const timer = useRef(0);
  const tapIndex = useRef(0);

  const playNext = useCallback(() => {
    window.clearTimeout(timer.current);
    const next = queue.current.shift();
    if (!next) {
      setShow(false);
      return;
    }
    setLine(next.text);
    setShow(true);
    sceneRef.current?.setFace(next.face ?? "happy", 1400);
    timer.current = window.setTimeout(() => {
      setShow(false);
      timer.current = window.setTimeout(playNext, 280);
    }, LINE_MS);
  }, []);

  const say = useCallback(
    (lines: Line[], interrupt = false) => {
      if (interrupt) queue.current = [];
      queue.current.push(...lines);
      if (interrupt || !show) playNext();
    },
    [playNext, show],
  );

  const introduced = useRef(false);
  const onScene = useCallback(
    (scene: BoScene | null) => {
      sceneRef.current = scene;
      if (scene && !introduced.current) {
        introduced.current = true;
        timer.current = window.setTimeout(() => say(intro), 700);
      }
    },
    [intro, say],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const tap = () => {
    if (!onTap.length) return;
    const next = onTap[tapIndex.current % onTap.length]!;
    tapIndex.current++;
    say([next], true);
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <Bo3D className="absolute inset-0" mood={mood} notes={notes} label={label} onScene={onScene} />
      {onTap.length ? (
        // A small hitbox on Bo himself, so the rest of the area never blocks clicks.
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={tap}
          className="absolute top-[28%] left-1/2 h-[52%] w-[38%] -translate-x-1/2 cursor-pointer rounded-[30%] focus:outline-none"
        />
      ) : null}
      <div aria-hidden="true" className="pointer-events-none absolute top-[4%] left-[58%] max-sm:left-[52%]">
        <div className="bo-bubble" {...(show ? { "data-show": "" } : {})}>
          {line}
        </div>
      </div>
    </div>
  );
}
