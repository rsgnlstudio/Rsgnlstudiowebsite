"use client";

import { EffectComposer } from "@react-three/postprocessing";

/** Post-processing stack. Mounted with no effects; add them as children. */
export function Effects() {
  return <EffectComposer>{[]}</EffectComposer>;
}
