"use client";

import { useLayoutEffect } from "react";
import { DEFAULT_SCENE_MODE, type SceneMode } from "@/config/scene";
import { useSceneStore } from "@/store/scene";

/**
 * Claims the canvas for the calling page; releases it on unmount. A layout
 * effect, so the canvas shows before a view transition snapshots the page
 * (React runs passive effects only once the transition has finished, which
 * would slide the page back in without its scene).
 */
export function useSceneMode(mode: SceneMode) {
  useLayoutEffect(() => {
    const { setSceneMode } = useSceneStore.getState();
    setSceneMode(mode);
    return () => setSceneMode(DEFAULT_SCENE_MODE);
  }, [mode]);
}
