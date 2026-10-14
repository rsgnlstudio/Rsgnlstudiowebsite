import type { ReactNode } from "react";

/**
 * The line at the bottom centre telling what to do (by day the beds, by
 * night the clearings). It rises and fades in while `shown`. `className`
 * sets its color.
 */
export function BottomHint({ shown, className = "", children }: { shown: boolean; className?: string; children: ReactNode }) {
  return (
    <p
      aria-hidden={!shown}
      className={`pointer-events-none fixed bottom-24 left-1/2 z-20 w-max max-w-[calc(100vw-2*var(--spacing-gutter))] -translate-x-1/2 text-center font-display text-body italic transition-[opacity,translate] duration-1500 ease-reveal md:bottom-edge ${className} ${
        shown ? "translate-y-0 opacity-80" : "translate-y-2 opacity-0"
      }`}
    >
      {children}
    </p>
  );
}
