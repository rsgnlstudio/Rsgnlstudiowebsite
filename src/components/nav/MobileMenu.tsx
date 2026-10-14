"use client";

import { Menu, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayNightSwitch } from "@/components/nav/DayNightSwitch";
import { NightCta } from "@/components/nav/NightNavLinks";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { NIGHT_SECTIONS } from "@/config/navigation";
import { useContent } from "@/content/ContentProvider";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { useReveal } from "@/hooks/useReveal";
import { useSceneTone } from "@/hooks/useSceneTone";
import { setSoundEnabled } from "@/lib/ambient";
import { openPanel } from "@/store/scene";
import { useSoundStore } from "@/store/sound";

const divider = <span aria-hidden className="mx-4 my-2 block h-px bg-current opacity-15" />;

/**
 * Swallows the click that ends the current tap, so a tap beside the menu
 * only closes it (it would otherwise open a flower bed under it, see
 * `FlowerBeds`). A gesture that ends without a click (a swipe) lets it go
 * when the next one starts.
 */
function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    done();
  };
  const done = () => {
    window.removeEventListener("click", swallow, true);
    window.removeEventListener("pointerdown", done, true);
  };
  window.addEventListener("click", swallow, true);
  window.addEventListener("pointerdown", done, true);
}

/**
 * The navigation below `md`, where the top navigation (`TopNav`) and the
 * sound toggle don't fit beside the wordmark: a round burger button at the
 * top right, across from the wordmark, so both always stay in view. It
 * opens a frosted menu below it, across the full width, with the Day/Night switch, by night the
 * consulting site's sections and its call to action, and the sound. A
 * choice closes it (except the sound), as do the button, Escape and a tap
 * beside it. Its colors cross over with the scene like the top navigation's;
 * it appears after the intro and fades out while an overlay is open.
 */
export function MobileMenu() {
  const { ui } = useContent();
  const tone = useSceneTone();
  const sound = useSoundStore((s) => s.enabled);
  const fade = useOverlayFade();
  const reveal = useReveal<HTMLDivElement>(0, fade.hidden);
  const rootRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // An overlay opening (e.g. from the menu) closes it.
  if (open && fade.hidden) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      swallowNextClick();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);


  return (
    <nav ref={rootRef} aria-label={ui.nav.main} className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 pt-6 md:hidden">
      <div ref={reveal} className="invisible flex flex-col items-end opacity-0">
        <Button
          ref={buttonRef}
          variant="glass"
          size="icon"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? ui.nav.closeMenu : ui.nav.menu}
          onClick={() => setOpen(!open)}
          className={`pointer-events-auto mr-2 ${tone.glass}`}
          style={tone.style}
        >
          <Icon icon={open ? X : Menu} />
        </Button>
        <div
          id="mobile-menu"
          inert={!open}
          // A choice closes the menu; the sound keeps it open to show its state.
          onClick={(event) => {
            const target = event.target as Element;
            if (target.closest("button") && !target.closest("[data-keep-open]")) setOpen(false);
          }}
          className={`mt-4 flex w-full origin-top flex-col items-stretch gap-1 rounded-3xl border border-current/10 p-4 backdrop-blur-md transition-[opacity,translate,scale,color,background-color] ease-reveal ${
            tone.menu
          } ${open ? "pointer-events-auto translate-y-0 scale-100 opacity-100 duration-500" : "-translate-y-1 scale-[0.98] opacity-0 duration-300"}`}
        >
          {/* The switch's two halves share the row, with their sun and moon (hidden in the pill on narrow screens). */}
          <div className="[&_button]:flex-1 [&_svg]:block [&>div]:w-full">
            <DayNightSwitch />
          </div>
          {tone.night && (
            <>
              {divider}
              {NIGHT_SECTIONS.map((s) => (
                <Button key={s.key} variant="ghost" block align="start" onClick={() => openPanel(s.panel)}>
                  {ui.nav[s.key]}
                </Button>
              ))}
              <div className="mt-2">
                <NightCta block />
              </div>
            </>
          )}
          {divider}
          <Button variant="ghost" block align="start" data-keep-open aria-pressed={sound} onClick={() => setSoundEnabled(!sound)}>
            <Icon icon={sound ? Volume2 : VolumeX} />
            {ui.nav.sound}
          </Button>
        </div>
      </div>
    </nav>
  );
}
