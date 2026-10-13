"use client";

import { BRAND } from "@/content/consulting";
import { useSceneStore } from "@/store/scene";

/**
 * The consulting brand at the top left by night: the name (a stand-in for
 * the logo) and the plain line that says at any time where the visitor has
 * landed. It crosses over with the scene.
 */
export function NightBrand() {
  const shown = useSceneStore((s) => s.timeOfDay === "night" && s.night > 0.5);
  return (
    <div
      lang="de"
      aria-hidden={!shown}
      className={`pointer-events-none fixed top-6 left-6 z-20 hidden max-w-60 text-on-night transition-opacity duration-1500 ease-smooth lg:block ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="font-display text-body italic">{BRAND.name}</p>
      <p className="mt-0.5 text-caption opacity-65">{BRAND.claim}</p>
    </div>
  );
}
