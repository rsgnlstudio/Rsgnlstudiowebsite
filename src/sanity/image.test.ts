import { describe, expect, it } from "vitest";
import type { ContentImage } from "@/content/schema";
import { focalPoint, imageLoader } from "@/sanity/image";

const image: ContentImage = { asset: { _ref: "image-abc123-1600x1200-jpg" }, alt: "Ein Bild" };

describe("focalPoint", () => {
  it("follows the hotspot", () => {
    expect(focalPoint({ ...image, hotspot: { x: 0.25, y: 0.8, width: 0.3, height: 0.3 } })).toBe("25% 80%");
  });
  it("centres without a hotspot", () => {
    expect(focalPoint(image)).toBe("50% 50%");
  });
});

describe("imageLoader", () => {
  it("asks the Sanity CDN for the requested width in a modern format", () => {
    const url = imageLoader(image)({ src: "", width: 640 });
    expect(url).toContain("abc123-1600x1200.jpg");
    expect(url).toContain("w=640");
    expect(url).toContain("auto=format");
  });
  it("applies the editor's crop", () => {
    const url = imageLoader({ ...image, crop: { top: 0.1, bottom: 0, left: 0, right: 0 } })({ src: "", width: 640 });
    expect(url).toContain("rect=");
  });
});
