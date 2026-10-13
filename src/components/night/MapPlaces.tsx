"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { AREAS, CLEARINGS, type Place, PLACES } from "@/config/nightMap";
import {
  ABOUT,
  AREA_TITLES,
  BAFA_TEXT,
  CHALLENGES,
  CONTACT,
  firstSentence,
  RESULTS,
  SERVICES,
  TESTIMONIALS,
  type TwoLines,
  UI,
} from "@/content/consulting";
import { PORTRAIT_ASPECT } from "@/config/scene";
import { useSceneStore } from "@/store/scene";

/** The hover preview of a place: one or two lines. */
function previewOf(place: Place, activePath: string | null): TwoLines {
  const p = place.panel;
  switch (p.kind) {
    case "path":
      return CHALLENGES[p.id];
    case "service":
      return { line: SERVICES[p.id].title, detail: SERVICES[p.id].preview.line };
    case "results": {
      const result = activePath ? CHALLENGES[activePath as keyof typeof CHALLENGES].result : null;
      return result ?? RESULTS.preview;
    }
    case "contact":
      return { line: CONTACT.preview, detail: UI.nav.contact };
    case "about":
      return { line: ABOUT.name, detail: ABOUT.role };
    case "bafa":
      return { line: BAFA_TEXT.title, detail: "" };
    case "testimonial":
      return { line: `„${firstSentence(TESTIMONIALS[p.index]?.quote ?? "")}“`, detail: UI.categories.testimonial };
    default:
      return { line: "", detail: "" };
  }
}

/** Whether a place takes part at all (the lantern only on subsidised paths, decided per frame). */
const exists = (place: Place) => place.panel.kind !== "testimonial" || place.panel.index < TESTIMONIALS.length;

/** Gap between a place and its preview card, in pixels. */
const CARD_GAP = 26;

/** Places grouped for the keyboard and screen readers, in this order. */
const GROUPS = [
  { label: UI.map.challenges, kinds: ["clearing"] },
  { label: UI.categories.services, kinds: ["service"] },
  { label: UI.map.more, kinds: ["summit", "goal", "meadow", "lantern", "testimonial"] },
] as const;

/**
 * The places of the night map as real buttons, over their lights in the
 * canvas: tab and enter reach every one, and hover or focus shows its
 * preview (one or two lines) beside it. A click opens the panel; on touch
 * screens the first tap shows the preview and the second opens it. The
 * canvas projects every place to the screen each frame (`placeScreen`);
 * a frame loop here moves the buttons there without re-renders. The map
 * takes clicks once the night intro is done and the camera has landed, and
 * steps aside while the panel is open (a click beside the panel closes it).
 */
export function MapPlaces() {
  const ready = useSceneStore((s) => s.nightIntro === "done" && s.timeOfDay === "night" && s.night > 0.98);
  const panelOpen = useSceneStore((s) => s.panel !== null);
  const hoveredPlace = useSceneStore((s) => s.hoveredPlace);
  const activePath = useSceneStore((s) => s.activePath);
  const active = ready && !panelOpen;

  const buttons = useRef<(HTMLLIElement | null)[]>([]);
  const areas = useRef<(HTMLLIElement | null)[]>([]);
  const lastPointer = useRef<string>("mouse");
  const [touchPreview, setTouchPreview] = useState<number | null>(null);

  // Follow the canvas: move every place to its light, hide those off screen.
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const clearingIndex = CLEARINGS.map((c) => PLACES.findIndex((p) => p.id === `clearing:${c.id}`));
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const screen = useSceneStore.getState().placeScreen;
      const width = window.innerWidth;
      buttons.current.forEach((el, i) => {
        if (!el) return;
        const x = screen[i * 3];
        const y = screen[i * 3 + 1];
        const on = screen[i * 3 + 2] > 0;
        el.style.translate = `${x}px ${y}px`;
        el.dataset.on = String(on);
        el.dataset.flip = String(x > width - 320);
      });
      // Area names above their two clearings (not on portrait screens, where
      // the map is turned and the pairs stand side by side).
      const portrait = width / window.innerHeight < PORTRAIT_ASPECT;
      AREAS.forEach((area, k) => {
        const el = areas.current[k];
        if (!el) return;
        const pair = CLEARINGS.map((c, i) => (c.area === area.id ? clearingIndex[i] : -1)).filter((i) => i >= 0);
        const x = pair.reduce((sum, i) => sum + screen[i * 3], 0) / pair.length;
        const y = Math.min(...pair.map((i) => screen[i * 3 + 1]));
        el.style.translate = `${x}px ${y - 64}px`;
        el.dataset.on = String(!portrait && pair.every((i) => screen[i * 3 + 2] > 0));
      });
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  // Leaving the map (night ends, the panel opens) clears the hover.
  if (!active && touchPreview !== null) setTouchPreview(null);
  useEffect(() => {
    if (!active) useSceneStore.getState().setHoveredPlace(null);
  }, [active]);

  const hover = (index: number | null) => useSceneStore.getState().setHoveredPlace(index);
  const open = (index: number) => {
    const place = PLACES[index];
    if (lastPointer.current === "touch" && touchPreview !== index) {
      setTouchPreview(index);
      hover(index);
      return;
    }
    setTouchPreview(null);
    useSceneStore.getState().setPanel(place.panel);
  };

  const shown = hoveredPlace ?? touchPreview;

  return (
    <nav
      aria-label={UI.map.label}
      inert={!active}
      lang="de"
      className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-1000 ease-smooth ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <ul aria-hidden>
        {AREAS.map((area, k) => (
          <li
            key={area.id}
            ref={(el) => {
              areas.current[k] = el;
            }}
            data-on="false"
            className="absolute top-0 left-0 -translate-x-1/2 text-caption tracking-widest whitespace-nowrap text-on-night uppercase opacity-0 transition-opacity duration-700 ease-smooth data-[on=true]:opacity-55"
          >
            {AREA_TITLES[area.id]}
          </li>
        ))}
      </ul>
      {GROUPS.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <ul>
            {PLACES.map((place, i) => {
              if (!(group.kinds as readonly string[]).includes(place.kind) || !exists(place)) return null;
              const preview = previewOf(place, activePath);
              const area = place.panel.kind === "path" ? CLEARINGS.find((c) => c.id === place.id.split(":")[1])?.area : null;
              return (
                <li
                  key={place.id}
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  data-on="false"
                  className="group/place absolute top-0 left-0 data-[on=false]:invisible"
                >
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      lastPointer.current = event.pointerType;
                    }}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") hover(i);
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === "mouse") hover(null);
                    }}
                    onFocus={() => hover(i)}
                    onBlur={() => hover(null)}
                    onKeyDown={() => {
                      lastPointer.current = "keyboard";
                    }}
                    onClick={() => open(i)}
                    className="pointer-events-auto absolute size-12 -translate-1/2 cursor-pointer rounded-full focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-on-night"
                  >
                    <span className="sr-only">
                      {area ? `${AREA_TITLES[area]}: ` : ""}
                      {preview.line}
                      {preview.detail ? ` ${preview.detail}` : ""}
                    </span>
                  </button>
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute top-0 w-max max-w-72 -translate-y-1/2 rounded-2xl border border-current/10 bg-panel-night/75 px-4 py-3 text-on-night backdrop-blur-md transition-[opacity,translate] duration-700 ease-reveal group-data-[flip=true]/place:right-[var(--gap)] group-data-[flip=false]/place:left-[var(--gap)] ${
                      shown === i ? "opacity-100" : "translate-x-1 opacity-0"
                    }`}
                    style={{ "--gap": `${CARD_GAP}px` } as CSSProperties}
                  >
                    <p className="text-body">{preview.line}</p>
                    {preview.detail && <p className="text-caption italic opacity-65">{preview.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
