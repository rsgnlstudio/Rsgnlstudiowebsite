import type { BrushAtlasData } from "./brushAtlas";

let pending: Promise<BrushAtlasData> | null = null;

/**
 * Simulates the brush atlas (brushAtlas.ts) in a Web Worker, once; later
 * calls share the result. Free of three, so the canvas loader can start it
 * before the scene's code has loaded. Without workers it runs on the main
 * thread instead.
 */
export function loadBrushAtlas() {
  pending ??= new Promise<BrushAtlasData>((resolve) => {
    const fallback = () => import("./brushAtlas").then((m) => resolve(m.createBrushAtlasData()));
    let worker: Worker;
    try {
      worker = new Worker(new URL("./brushAtlas.worker.ts", import.meta.url), { type: "module" });
    } catch {
      void fallback();
      return;
    }
    worker.onmessage = (event: MessageEvent<BrushAtlasData>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = () => {
      worker.terminate();
      void fallback();
    };
  });
  return pending;
}
