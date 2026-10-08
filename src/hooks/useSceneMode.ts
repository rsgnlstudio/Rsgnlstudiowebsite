"use client";

import { useEffect } from "react";
import { DEFAULT_SCENE_MODE, type SceneMode } from "@/config/scene";
import { useSceneStore } from "@/store/scene";

/** Claims the canvas for the calling page; releases it on unmount. */
export function useSceneMode(mode: SceneMode) {
  useEffect(() => {
    const { setSceneMode } = useSceneStore.getState();
    setSceneMode(mode);
    return () => setSceneMode(DEFAULT_SCENE_MODE);
  }, [mode]);
}
