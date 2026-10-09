"use client";

import { INTRO_UI_AT } from "@/config/scene";
import { useSceneStore } from "@/store/scene";

/**
 * True once the intro build-up has got far enough for the UI to appear
 * (INTRO_UI_AT). Only re-renders when that flips. If the scene never gets
 * going, EntryScreen finishes the intro, so this turns true then too.
 */
export function useIntroRevealed(): boolean {
  return useSceneStore((s) => s.intro >= INTRO_UI_AT);
}
