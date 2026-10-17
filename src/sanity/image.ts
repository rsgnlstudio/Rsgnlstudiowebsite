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

/** Where to anchor the image when its slot crops it (`object-position`): the editor's hotspot, or the centre. */
export function focalPoint(image: ContentImage): string {
  const { x, y } = image.hotspot ?? { x: 0.5, y: 0.5 };
  return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`;
}
