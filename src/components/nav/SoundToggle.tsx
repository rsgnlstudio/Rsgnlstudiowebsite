"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useContent } from "@/content/ContentProvider";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { useReveal } from "@/hooks/useReveal";
import { useSceneTone } from "@/hooks/useSceneTone";
import { setSoundEnabled } from "@/lib/ambient";
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
  const { ui } = useContent();
  const tone = useSceneTone();
  const reveal = useReveal<HTMLButtonElement>(0.15, useOverlayFade().hidden);

  return (
    <Button
      ref={reveal}
      variant="glass"
      size="icon-lg"
      aria-pressed={enabled}
      aria-label={ui.nav.sound}
      onClick={() => setSoundEnabled(!enabled)}
      className={`group invisible fixed top-8 right-8 z-20 opacity-0 max-md:hidden ${tone.glass}`}
      style={tone.style}
    >
      <Icon
        icon={enabled ? Volume2 : VolumeX}
        className="opacity-55 transition-opacity duration-700 ease-smooth group-hover:opacity-80 group-aria-pressed:opacity-100"
      />
    </Button>
  );
}
