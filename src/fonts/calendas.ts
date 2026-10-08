import localFont from "next/font/local";

// Calendas Plus, the brand typeface. Exposed as --font-calendas and wired
// into the font tokens in globals.css.
export const calendas = localFont({
  src: [
    { path: "./calendas-plus.woff2", weight: "400", style: "normal" },
    { path: "./calendas-plus-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-calendas",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});
