"use client";

import dynamic from "next/dynamic";

// ssr: false is only allowed in Client Components, hence this wrapper.
const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

export function SceneCanvasLoader() {
  return <SceneCanvas />;
}
