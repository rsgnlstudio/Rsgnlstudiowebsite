"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FEATURED_FLOWERS } from "@/config/flowers";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";

/** Closes the dialog in case the slide out never reports its end. */
const CLOSE_FALLBACK_MS = 1500;

/**
 * The project a featured flower opens (`openFlower`, set by the canvas on a
 * click or tap). A modal `<dialog>`: on desktop a panel sliding in from the
 * right over two thirds of the screen, on mobile a sheet sliding up from the
 * bottom over nearly all of it. The canvas slides aside in step with it
 * (`SceneCanvas`), both timed by `--overlay-duration` and `ease-overlay`.
 * Closes with the button, Escape, or a click beside the panel; the panel
 * slides out before the dialog closes, so the last project stays rendered
 * until then. The panel scrolls natively (Lenis is stopped while it is open,
 * see `useSectionScroll`).
 */
export function ProjectOverlay() {
  const openFlower = useSceneStore((s) => s.openFlower);
  const reducedMotion = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the last project while the panel slides out.
  const [shown, setShown] = useState(openFlower);
  if (openFlower && openFlower !== shown) setShown(openFlower);
  const project = FEATURED_FLOWERS.find((flower) => flower.id === shown);

  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!dialog || !panel) return;

    if (openFlower) {
      if (!dialog.open) {
        dialog.showModal();
        // Without scrolling: focusing the panel while it waits off-screen
        // would scroll it into view and skip the slide.
        panel.focus({ preventScroll: true });
        // Lay out the closed state first, so the slide in transitions.
        void panel.offsetWidth;
      }
      dialog.toggleAttribute("data-open", true);
      return;
    }

    dialog.toggleAttribute("data-open", false);
    if (!dialog.open) return;
    if (reducedMotion) {
      dialog.close();
      return;
    }
    const close = () => dialog.close();
    const onEnd = (event: TransitionEvent) => {
      if (event.target === panel && event.propertyName === "translate") close();
    };
    panel.addEventListener("transitionend", onEnd);
    const timer = window.setTimeout(close, CLOSE_FALLBACK_MS);
    return () => {
      panel.removeEventListener("transitionend", onEnd);
      window.clearTimeout(timer);
    };
  }, [openFlower, reducedMotion]);

  const close = () => useSceneStore.getState().setOpenFlower(null);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="project-title"
      onCancel={(event) => {
        // Escape: slide out first instead of closing at once.
        event.preventDefault();
        close();
      }}
      // The browser may still close it at once (e.g. Escape pressed twice).
      onClose={close}
      className="group fixed inset-0 m-0 size-full max-h-none max-w-none overflow-clip bg-transparent p-0 text-on-day backdrop:bg-transparent"
    >
      {/* Beside the panel: a click there closes it. */}
      <div aria-hidden onClick={close} className="absolute inset-0" />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-lenis-prevent
        className="absolute inset-x-0 bottom-0 h-[92dvh] translate-y-full overflow-y-auto overscroll-contain bg-on-night outline-none transition-[translate] duration-(--overlay-duration) ease-overlay group-data-open:translate-y-0 md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-2/3 md:translate-x-full md:translate-y-0 md:group-data-open:translate-x-0"
      >
        <div className="sticky top-0 z-10 flex h-0 justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="mt-6 mr-6 grid size-11.5 cursor-pointer place-items-center rounded-full border border-current/10 bg-on-night transition-opacity hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <X aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
          </button>
        </div>
        {project && (
          <article className="px-gutter pt-24 pb-section md:px-edge">
            <h2 id="project-title" className="font-display text-heading italic md:text-display">
              {project.title}
            </h2>
            <p className="mt-4 max-w-prose text-body opacity-70">{project.teaser}</p>
            {/* Placeholder until the real project content exists. */}
            <div className="mt-12 grid gap-gutter">
              <div className="aspect-video bg-current/5" />
              <div className="grid gap-gutter md:grid-cols-2">
                <div className="aspect-4/5 bg-current/5" />
                <div className="aspect-4/5 bg-current/5" />
              </div>
            </div>
          </article>
        )}
      </div>
    </dialog>
  );
}
