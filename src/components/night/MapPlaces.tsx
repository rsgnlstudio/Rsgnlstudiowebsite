"use client";

import { ArrowUpRight } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { AREAS, CLEARING_RADIUS, CLEARINGS, type Place, PLACES } from "@/config/nightMap";
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

/** Gap between a place and its preview card, in pixels (clearings: past their grove). */
const CARD_GAP = 26;
const GROVE_CARD_GAP = 12;

/** Radius of a clearing's grove with its crowns, in metres (its button covers it). */
const GROVE_RADIUS = CLEARING_RADIUS + 2;
/** Smallest grove button, in pixels (the size of the other places' buttons). */
const GROVE_MIN = 48;

/** Metres between the first two clearings, to measure the map's scale on screen. */
const SCALE_METRES = Math.hypot(
  CLEARINGS[0].position[0] - CLEARINGS[1].position[0],
  CLEARINGS[0].position[1] - CLEARINGS[1].position[1],
);

/** Places grouped for the keyboard and screen readers, in this order. */
const GROUPS = [
  { label: UI.map.challenges, kinds: ["clearing"] },
  { label: UI.categories.services, kinds: ["service"] },
  { label: UI.map.more, kinds: ["summit", "goal", "meadow", "lantern", "testimonial"] },
] as const;

/**
 * The places of the night map as real buttons, over their lights in the
 * canvas: tab and enter reach every one, and hover or focus shows its
 * preview (one or two lines) beside it. A click opens the panel. On touch
 * screens the first tap lights the place and shows its preview in a card at
 * the bottom centre, which says it can be opened; a second tap (on the place
 * or the card) opens it, a tap anywhere else lets it go. The
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
  // The touch card keeps its last place while it fades out.
  const [card, setCard] = useState<number | null>(null);
  if (touchPreview !== null && touchPreview !== card) setCard(touchPreview);

  // Follow the canvas: move every place to its light, hide those off screen.
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const clearingIndex = CLEARINGS.map((c) => PLACES.findIndex((p) => p.id === `clearing:${c.id}`));
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const screen = useSceneStore.getState().placeScreen;
      const width = window.innerWidth;
      // The groves' buttons cover their groves on screen (the map is seen
      // from straight above, so two clearings give its scale), so
      // neighbouring clearings don't overlap when the map is small.
      const [a, b] = clearingIndex;
      const scale = Math.hypot(screen[a * 3] - screen[b * 3], screen[a * 3 + 1] - screen[b * 3 + 1]) / SCALE_METRES;
      const grove = `${Math.max(GROVE_MIN, 2 * GROVE_RADIUS * scale)}px`;
      buttons.current.forEach((el, i) => {
        if (!el) return;
        const x = screen[i * 3];
        const y = screen[i * 3 + 1];
        const on = screen[i * 3 + 2] > 0;
        if (PLACES[i].kind === "clearing") el.style.setProperty("--grove", grove);
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
        el.style.translate = `${x}px ${y - 88}px`;
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

  // A tap beside the places and the card lets the touch preview go.
  useEffect(() => {
    if (touchPreview === null) return;
    const onDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-place], [data-touch-card]")) return;
      setTouchPreview(null);
      useSceneStore.getState().setHoveredPlace(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [touchPreview]);

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

  // Beside the place for mouse and keyboard; touch has its card instead.
  const shown = active && touchPreview === null ? hoveredPlace : null;
  const cardPreview = card !== null ? previewOf(PLACES[card], activePath) : null;

  return (
    <nav
      aria-label={UI.map.label}
      inert={!active}
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
              const grove = place.kind === "clearing";
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
                    data-place
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
                    className={`pointer-events-auto absolute -translate-1/2 cursor-pointer rounded-full ${grove ? "size-(--grove)" : "size-12"} focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-on-night`}
                  >
                    <span className="sr-only">
                      {area ? `${AREA_TITLES[area]}: ` : ""}
                      {preview.line}
                      {preview.detail ? ` ${preview.detail}` : ""}
                    </span>
                  </button>
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute top-0 w-max max-w-80 -translate-y-1/2 rounded-2xl border border-current/10 bg-panel-night/75 px-5 py-4 text-on-night backdrop-blur-md transition-[opacity,translate] duration-700 ease-reveal group-data-[flip=true]/place:right-[var(--gap)] group-data-[flip=false]/place:left-[var(--gap)] ${
                      shown === i ? "opacity-100" : "translate-x-1 opacity-0"
                    }`}
                    style={
                      { "--gap": grove ? `calc(var(--grove) / 2 + ${GROVE_CARD_GAP}px)` : `${CARD_GAP}px` } as CSSProperties
                    }
                  >
                    <p className="text-body">{preview.line}</p>
                    {preview.detail && <p className="mt-1 text-caption italic opacity-65">{preview.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {/* Touch: the tapped place's preview, fixed at the bottom centre. */}
      <button
        type="button"
        data-touch-card
        inert={touchPreview === null}
        onClick={() => card !== null && open(card)}
        className={`fixed inset-x-6 bottom-24 mx-auto flex max-w-sm cursor-pointer items-center gap-4 rounded-2xl border border-current/10 bg-panel-night/90 px-5 py-4 text-left text-on-night backdrop-blur-md transition-[opacity,translate] duration-700 ease-reveal ${
          touchPreview !== null ? "pointer-events-auto opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body">{cardPreview?.line}</span>
          {cardPreview?.detail && <span className="mt-1 block text-caption italic opacity-65">{cardPreview.detail}</span>}
          <span className="mt-2 block text-caption tracking-wide opacity-55">{UI.map.tapToOpen}</span>
        </span>
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full border border-current/20">
          <ArrowUpRight className="size-[1.125rem]" strokeWidth={1.5} />
        </span>
      </button>
    </nav>
  );
}
