"use client";

import { X } from "lucide-react";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Closes the dialog in case the slide out never reports its end. */
const CLOSE_FALLBACK_MS = 1800;

/**
 * Size and colors per tone: the day overlay, or the night panel beside the
 * map (on mobile a shorter sheet, so the map stays in view above it).
 */
const TONES = {
  day: { panel: "h-[92dvh] bg-on-night text-on-day md:w-2/3", button: "bg-on-night" },
  night: { panel: "h-[67dvh] bg-panel-night text-on-night md:w-1/2", button: "bg-panel-night" },
} as const;

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the panel. */
  labelledBy: string;
  tone: keyof typeof TONES;
  /** The scrolling panel element, e.g. to follow its scroll. */
  panelRef?: RefObject<HTMLDivElement | null>;
  closeLabel?: string;
  children: ReactNode;
}

/**
 * A modal `<dialog>` with a panel that slides in: on desktop from the right
 * (over two thirds of the screen by day, half by night, so the map stays
 * beside it), on mobile a sheet sliding up (over nearly all of the screen by
 * day, two thirds by night). The canvas
 * slides aside in step with it (`SceneCanvas`), both timed by
 * `--overlay-duration` and `ease-overlay`. Closes with the button, Escape,
 * or a click beside the panel; the panel slides out before the dialog closes,
 * so its content should stay rendered until then. The panel scrolls natively
 * (Lenis is stopped while it is open, see `useSectionScroll`).
 */
export function SlidePanel({ open, onClose, labelledBy, tone, panelRef, closeLabel = "Schließen", children }: SlidePanelProps) {
  const reducedMotion = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ownPanelRef = useRef<HTMLDivElement>(null);
  const ref = panelRef ?? ownPanelRef;

  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = ref.current;
    if (!dialog || !panel) return;

    if (open) {
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
  }, [open, reducedMotion, ref]);

  const colors = TONES[tone];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        // Escape: slide out first instead of closing at once.
        event.preventDefault();
        onClose();
      }}
      // The browser may still close it at once (e.g. Escape pressed twice).
      onClose={onClose}
      className="group fixed inset-0 m-0 size-full max-h-none max-w-none overflow-clip bg-transparent p-0 backdrop:bg-transparent"
    >
      {/* Beside the panel: a click there closes it. */}
      <div aria-hidden onClick={onClose} className="absolute inset-0" />
      <div
        ref={ref}
        tabIndex={-1}
        data-lenis-prevent
        className={`absolute inset-x-0 bottom-0 translate-y-full overflow-y-auto overscroll-contain outline-none transition-[translate] duration-(--overlay-duration) ease-overlay group-data-open:translate-y-0 md:inset-y-0 md:right-0 md:left-auto md:h-full md:translate-x-full md:translate-y-0 md:group-data-open:translate-x-0 ${colors.panel}`}
      >
        <div className="sticky top-0 z-10 flex h-0 justify-end">
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className={`mt-6 mr-6 grid size-11.5 cursor-pointer place-items-center rounded-full border border-current/10 transition-opacity duration-700 ease-smooth hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current ${colors.button}`}
          >
            <X aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
