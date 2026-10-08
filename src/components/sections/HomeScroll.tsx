"use client";

import { homeSections } from "@/config/sections";
import { useSceneMode } from "@/hooks/useSceneMode";
import { useSectionScroll } from "@/hooks/useSectionScroll";

/** Wires the home page to the scene. Renders nothing. */
export function HomeScroll() {
  useSceneMode("home");
  useSectionScroll(homeSections);
  return null;
}
