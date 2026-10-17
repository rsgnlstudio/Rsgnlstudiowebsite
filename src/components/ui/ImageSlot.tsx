import Image from "next/image";
import type { ContentImage } from "@/content/schema";
import { focalPoint, imageLoader } from "@/sanity/image";

/**
 * A slot of fixed aspect (set by `className`, e.g. `aspect-4/5`): the image
 * from Sanity, cropped around the editor's focal point, or a quiet
 * placeholder until one is set.
 */
export function ImageSlot({ image, sizes, className = "" }: { image?: ContentImage; sizes: string; className?: string }) {
  if (!image) return <div aria-hidden className={`bg-current/5 ${className}`} />;
  return (
    <div className={`relative overflow-hidden bg-current/5 ${className}`}>
      <Image
        src={image.asset._ref}
        loader={imageLoader(image)}
        alt={image.alt}
        fill
        sizes={sizes}
        placeholder={image.lqip ? "blur" : "empty"}
        blurDataURL={image.lqip}
        className="object-cover"
        style={{ objectPosition: focalPoint(image) }}
      />
    </div>
  );
}
