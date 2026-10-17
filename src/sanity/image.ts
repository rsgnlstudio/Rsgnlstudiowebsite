import { createImageUrlBuilder } from "@sanity/image-url";
import type { ImageLoader } from "next/image";
import type { ContentImage } from "@/content/schema";
import { dataset, projectId } from "@/sanity/env";

const builder = createImageUrlBuilder({ projectId, dataset });

/**
 * A `next/image` loader that asks Sanity's image CDN for each width, with the
 * editor's crop applied. Next's own optimizer is never involved.
 */
export const imageLoader =
  (image: ContentImage): ImageLoader =>
  ({ width, quality }) =>
    builder.image(image).width(width).quality(quality ?? 75).auto("format").url();

/**
 * Where to anchor the image when its slot cuts it (`object-position`): the
 * editor's hotspot, moved into the cropped image the loader delivers, or the centre.
 */
export function focalPoint(image: ContentImage): string {
  const { x, y } = image.hotspot ?? { x: 0.5, y: 0.5 };
  const { top, bottom, left, right } = image.crop ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const inCrop = (v: number, start: number, end: number) => Math.min(1, Math.max(0, (v - start) / (1 - start - end || 1)));
  return `${Math.round(inCrop(x, left, right) * 100)}% ${Math.round(inCrop(y, top, bottom) * 100)}%`;
}
