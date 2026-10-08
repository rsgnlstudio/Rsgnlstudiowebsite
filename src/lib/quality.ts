import type { QualityTier } from "@/config/look";

/**
 * Picks a quality tier from coarse device signals. Client-only. Phones and
 * tablets, and machines with few cores or little memory, get "low".
 * `?quality=low|high` forces a tier for testing.
 */
export function detectQualityTier(): QualityTier {
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "low" || forced === "high") return forced;

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 820;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;

  if ((coarse && smallScreen) || cores <= 4 || (memory !== undefined && memory <= 4)) {
    return "low";
  }
  return "high";
}
