import { overlayOpen, useSceneStore } from "@/store/scene";

/**
 * Lets the site's chrome (navigation, wordmark, sound toggle, footer) fade
 * out while the day overlay or the night panel is open, and back in after it
 * has slid away. Returns whether it is hidden and the classes for the fade.
 * A `useReveal` target takes `hidden` instead (its tween writes opacity
 * inline, and an opacity on a wrapper would switch off its backdrop blur).
 */
export function useOverlayFade() {
  const hidden = useSceneStore(overlayOpen);
  const className = `transition-opacity ease-smooth ${
    hidden ? "opacity-0 duration-700" : "opacity-100 duration-1000 delay-300"
  }`;
  return { hidden, className };
}
