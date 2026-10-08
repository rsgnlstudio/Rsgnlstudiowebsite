"use client";

import { useEffect, useRef } from "react";
import { Vector2 } from "three";

export interface WindowPointer {
  /** Pointer in normalized device coordinates (-1..1, y up). */
  position: Vector2;
  /** True while a mouse is over the page; false for touch or once it leaves. */
  active: boolean;
}

/**
 * The pointer over the whole window, for canvas code (the canvas ignores
 * pointer events). Returns a ref that is updated in place, without
 * re-renders, so useFrame can read it.
 */
export function useWindowPointer() {
  const pointer = useRef<WindowPointer>({ position: new Vector2(), active: false });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.position.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      pointer.current.active = event.pointerType === "mouse";
    };
    const onLeave = () => {
      pointer.current.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return pointer;
}
