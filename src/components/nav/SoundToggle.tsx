"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { useReveal } from "@/hooks/useReveal";
import { UI } from "@/content/consulting";
import { setSoundEnabled } from "@/lib/ambient";
import { useSceneStore } from "@/store/scene";
import { useSoundStore } from "@/store/sound";

/**
 * Round button at the top right that turns the ambient sound on and off
 * (from `md` up; below, it is in the mobile menu, `MobileMenu`).
 * Styled like the top navigation, so its colors cross over with the scene.
 * The entry screen decides whether sound starts (its click is the gesture
 * browsers need); it swells in with the intro. It appears after the intro,
 * just after the navigation, and fades out while an overlay is open.
 */
export function SoundToggle() {
  const enabled = useSoundStore((s) => s.enabled);

  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const Icon = enabled ? Volume2 : VolumeX;
  const reveal = useReveal<HTMLButtonElement>(0.15, useOverlayFade().hidden);

  return (
    <Button
      ref={reveal}
      variant="glass"
      size="icon-lg"
      aria-pressed={enabled}
      aria-label={UI.nav.sound}
      onClick={() => setSoundEnabled(!enabled)}
      className={`group invisible fixed top-8 right-8 z-20 opacity-0 max-md:hidden ${
        timeOfDay === "night" ? "bg-on-day/30 text-on-night" : "bg-on-night/30 text-on-day"
      }`}
      style={{ transitionDuration: `${duration}s` }}
    >
      <Icon
        aria-hidden
        className="size-[1.125rem] opacity-55 transition-opacity duration-700 ease-smooth group-hover:opacity-80 group-aria-pressed:opacity-100"
        strokeWidth={1.5}
      />
    </Button>
  );
}
