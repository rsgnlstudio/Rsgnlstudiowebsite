"use client";

import { Volume2, VolumeX } from "lucide-react";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { setSoundEnabled } from "@/lib/ambient";
import { useSceneStore } from "@/store/scene";
import { useSoundStore } from "@/store/sound";

/**
 * Round button at the top right that turns the ambient sound on and off.
 * Styled like the Day/Night switch, so its colors cross over with the scene.
 * Sound starts off; the first click here starts the audio engine.
 */
export function SoundToggle() {
  const enabled = useSoundStore((s) => s.enabled);
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const Icon = enabled ? Volume2 : VolumeX;

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label="Ambient sound"
      onClick={() => setSoundEnabled(!enabled)}
      className={`group fixed top-6 right-6 z-20 grid size-11.5 cursor-pointer place-items-center rounded-full border border-current/10 backdrop-blur-md transition-colors ease-in-out focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current ${
        timeOfDay === "night" ? "bg-on-day/30 text-on-night" : "bg-on-night/30 text-on-day"
      }`}
      style={{ transitionDuration: `${duration}s` }}
    >
      <Icon
        aria-hidden
        className="size-[1.125rem] opacity-55 transition-opacity duration-500 group-hover:opacity-80 group-aria-pressed:opacity-100"
        strokeWidth={1.5}
      />
    </button>
  );
}
