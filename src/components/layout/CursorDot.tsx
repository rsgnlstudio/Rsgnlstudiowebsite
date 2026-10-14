"use client";

import { useEffect, useRef } from "react";
import { useSceneStore } from "@/store/scene";

/** Elements the dot grows over, as the pointer cursor would show. */
const INTERACTIVE = "a, button, [role='button'], label, select, summary, input, textarea";

/**
 * The mouse cursor, on every page: a small dot that inverts what's beneath
 * it. It replaces the system cursor (hidden in globals.css while it is
 * mounted, for fine pointers only) and grows over links, buttons and a
 * hovered flower bed (`hoveredBed`). It follows the pointer without
 * re-renders. It lives in the top layer as a popover, re-raised whenever a
 * modal dialog opens, so it stays above the project overlay. In view
 * transitions it is its own live layer (`cursor-dot` in globals.css), so the
 * page slide doesn't carry it off with the root snapshot.
 */
export function CursorDot() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    root.classList.add("cursor-dot");
    el.showPopover();

    let overLink = false;
    const grow = () => {
      el.dataset.grow = String(overLink || useSceneStore.getState().hoveredBed !== null);
    };
    const onMove = (event: PointerEvent) => {
      // Mouse and pen; a finger needs no cursor.
      const shown = event.pointerType !== "touch";
      el.dataset.visible = String(shown);
      if (!shown) return;
      el.style.translate = `${event.clientX}px ${event.clientY}px`;
      overLink = event.target instanceof Element && event.target.closest(INTERACTIVE) !== null;
      grow();
    };
    const onLeave = () => {
      el.dataset.visible = "false";
    };
    const onDown = () => {
      el.dataset.down = "true";
    };
    const onUp = () => {
      el.dataset.down = "false";
    };
    // A modal dialog joins the top layer above the dot: raise the dot again.
    const raise = new MutationObserver(() => {
      el.hidePopover();
      el.showPopover();
    });
    raise.observe(document.body, { subtree: true, attributeFilter: ["open"] });
    const unsubscribe = useSceneStore.subscribe((state, prev) => {
      if (state.hoveredBed !== prev.hoveredBed) grow();
    });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("cursor-dot");
      raise.disconnect();
      unsubscribe();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, []);

  return (
    <div
      ref={ref}
      popover="manual"
      aria-hidden
      data-visible="false"
      className="group pointer-events-none fixed [view-transition-name:cursor-dot] inset-auto top-0 left-0 m-0 overflow-visible border-0 bg-transparent p-0 opacity-0 mix-blend-difference transition-opacity duration-300 ease-smooth data-[visible=true]:opacity-100"
    >
      <div className="size-2 -translate-1/2 rounded-full bg-foreground transition-[scale] duration-500 ease-reveal group-data-[grow=true]:scale-[3.5] group-data-[down=true]:scale-75 group-data-[grow=true]:group-data-[down=true]:scale-[2.8]" />
    </div>
  );
}
