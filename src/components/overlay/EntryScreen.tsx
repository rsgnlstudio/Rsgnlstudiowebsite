"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useContent } from "@/content/ContentProvider";
import { setSoundEnabled } from "@/lib/ambient";
import { useSceneStore } from "@/store/scene";

/** Offers the choices anyway if the scene never gets going (e.g. no WebGL). */
const FALLBACK_MS = 6000;
/**
 * After entering, finishes the intro at once if it hasn't started moving by
 * then (the scene isn't running, e.g. no WebGL), so the UI, the flowers and
 * the sound (which swells with `intro`) don't wait for it forever.
 */
const STALL_MS = 4000;

/**
 * The first thing on screen. The world waits behind it, at the opening
 * frame of the intro (INTRO_BUILD_FROM: sky and far land painted, the meadow
 * still dark). Once the scene has rendered (`sceneReady`) it offers two
 * choices: enter with sound or without. The click is the gesture browsers
 * need before they play audio, so the sound can swell in with the intro,
 * which starts with it (`entered`). Then it fades away. Should the scene
 * never get going, it skips the intro (STALL_MS).
 */
export function EntryScreen() {
  const { entry } = useContent().studio;
  const entered = useSceneStore((s) => s.entered);
  const sceneReady = useSceneStore((s) => s.sceneReady);
  const [timedOut, setTimedOut] = useState(false);
  const ready = sceneReady || timedOut;
  const enterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (sceneReady) return;
    const timer = window.setTimeout(() => setTimedOut(true), FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [sceneReady]);

  useEffect(() => {
    if (!entered) return;
    let timer = 0;
    const check = () => {
      const { intro, setIntro } = useSceneStore.getState();
      if (intro > 0) return;
      // A background tab renders no frames either; ask again once it shows.
      if (document.hidden) timer = window.setTimeout(check, STALL_MS);
      else setIntro(1);
    };
    timer = window.setTimeout(check, STALL_MS);
    return () => window.clearTimeout(timer);
  }, [entered]);

  // Once the choices have turned visible (they can't take focus before).
  useEffect(() => {
    if (!ready || entered) return;
    const timer = window.setTimeout(() => enterRef.current?.focus({ preventScroll: true }), 100);
    return () => window.clearTimeout(timer);
  }, [ready, entered]);

  const enter = (withSound: boolean) => {
    setSoundEnabled(withSound);
    useSceneStore.getState().setEntered(true);
  };

  // Inert once entered: the choices set `visible` themselves, so `invisible`
  // alone would leave them clickable (and focusable) over the meadow.
  return (
    <div
      inert={entered}
      data-ready={ready || undefined}
      className={`group fixed inset-0 z-40 grid place-items-center bg-radial from-on-day/55 to-transparent to-75% px-gutter text-on-night transition-[opacity,visibility] duration-1200 ease-smooth ${
        entered ? "invisible opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <p className="font-display text-heading italic">{entry.title}</p>
        <p className="mt-3 text-body opacity-75">
          {entry.text}
        </p>

        <div className="mt-10 grid w-full">
          <p
            aria-live="polite"
            className="col-start-1 row-start-1 animate-pulse self-center font-display text-body italic opacity-55 transition-opacity duration-1000 ease-smooth group-data-ready:invisible group-data-ready:opacity-0"
          >
            {entry.loading}
          </p>
          <div className="invisible col-start-1 row-start-1 mx-auto flex w-full max-w-xs translate-y-3 flex-col items-stretch gap-3 opacity-0 transition-[opacity,translate,visibility] duration-1800 ease-reveal group-data-ready:visible group-data-ready:translate-y-0 group-data-ready:opacity-100">
            <Button ref={enterRef} variant="solid" block onClick={() => enter(true)}>
              <Icon icon={Volume2} />
              {entry.withSound}
            </Button>
            <span aria-hidden className="text-center text-caption opacity-55">
              {entry.or}
            </span>
            <Button variant="outline" block onClick={() => enter(false)}>
              <Icon icon={VolumeX} className="opacity-75" />
              {entry.withoutSound}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
