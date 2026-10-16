"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { afterLoadIdle } from "@/lib/idle";
import { loadBrushAtlas } from "./painterly/loadBrushAtlas";

// ssr: false is only allowed in Client Components, hence this wrapper.
const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/**
 * Mounts the canvas once the page has loaded and the main thread is idle,
 * so loading three.js and building the world don't hold up the page itself
 * (the entry screen covers the wait). The brush atlas starts simulating in
 * its worker right away, so it is ready by the time the scene needs it.
 */
export function SceneCanvasLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    void loadBrushAtlas();
    return afterLoadIdle(() => setMounted(true));
  }, []);

  return mounted ? <SceneCanvas /> : null;
}
