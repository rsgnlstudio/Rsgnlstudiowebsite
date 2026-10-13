"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { NightCta, NightNavLinks } from "@/components/nav/NightNavLinks";
import { TIMES_OF_DAY, type TimeOfDay } from "@/config/scene";
import { useSceneStore } from "@/store/scene";

const ITEMS: Record<TimeOfDay, ReactNode> = {
  day: null,
  night: (
    <>
      <span aria-hidden className="mx-1 h-4 w-px bg-current opacity-20" />
      <NightNavLinks />
      <NightCta />
    </>
  ),
};

/**
 * The items after the Day/Night switch in the top navigation: none by day
 * (imprint and contact are in the footer), the consulting site's by night
 * (a divider, then services, process, about, "Erstgespräch vereinbaren").
 * Both stay rendered on top of each other: on a switch the old set fades
 * out, the slot eases to the new set's width (so the whole pill grows or
 * shrinks around it, down to the switch alone by day), and the new set
 * fades in. Widths are measured, so breakpoints that show or hide items are
 * followed too.
 */
export function NavItems() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const refs = useRef<Partial<Record<TimeOfDay, HTMLDivElement | null>>>({});
  const [widths, setWidths] = useState<Partial<Record<TimeOfDay, number>>>({});

  useLayoutEffect(() => {
    const measure = () =>
      setWidths({ day: refs.current.day?.offsetWidth, night: refs.current.night?.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    TIMES_OF_DAY.forEach((time) => {
      const el = refs.current[time];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      // Clipped across only, with room for the call to action's glow; it
      // may run a little past the right edge while the slot grows.
      className="relative self-stretch transition-[width] delay-150 duration-1000 ease-overlay [clip-path:inset(-2rem_-2rem_-2rem_0)] motion-reduce:transition-none"
      style={{ width: widths[timeOfDay] }}
    >
      {TIMES_OF_DAY.map((time) => {
        const active = time === timeOfDay;
        return (
          <div
            key={time}
            ref={(el) => {
              refs.current[time] = el;
            }}
            inert={!active}
            className={`absolute inset-y-0 left-0 flex items-center whitespace-nowrap transition-[opacity,filter,translate] ease-smooth motion-reduce:transition-none ${
              active
                ? "translate-y-0 opacity-100 blur-none delay-500 duration-1000"
                : "pointer-events-none translate-y-1 opacity-0 blur-[2px] duration-500"
            }`}
          >
            {ITEMS[time]}
          </div>
        );
      })}
    </div>
  );
}
