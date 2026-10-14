import { DM_Sans } from "next/font/google";

// DM Sans, the text face: body copy, navigation, footer and buttons. Exposed
// as --font-dm-sans and wired into the font tokens in globals.css.
export const dmSans = DM_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
});
