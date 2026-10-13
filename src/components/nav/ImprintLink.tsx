import Link from "next/link";
import { IMPRINT_HREF } from "@/config/site";

/** The quiet imprint item in the top navigation (`TopNav`). */
export function ImprintLink() {
  return (
    <Link
      href={IMPRINT_HREF}
      className="rounded-full px-3 py-1.5 text-body opacity-55 transition-opacity duration-700 ease-smooth hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current sm:px-4 md:px-6"
    >
      Imprint
    </Link>
  );
}
