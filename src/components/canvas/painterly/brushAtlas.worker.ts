import { createBrushAtlasData } from "./brushAtlas";

/** Simulates the brush atlas off the main thread and hands its pixels back. */
const atlas = createBrushAtlasData();
self.postMessage(atlas, { transfer: [atlas.data.buffer] });
