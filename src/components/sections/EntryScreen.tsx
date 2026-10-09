"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const choice =
  "flex cursor-pointer items-center justify-center gap-2.5 rounded-full border px-6 py-3 text-body transition-[background-color,opacity] duration-700 ease-smooth focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current";

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

  return (
    <div
      data-ready={ready || undefined}
      className={`group fixed inset-0 z-40 grid place-items-center bg-radial from-on-day/55 to-transparent to-75% px-gutter text-on-night transition-[opacity,visibility] duration-1200 ease-smooth ${
        entered ? "invisible opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <p className="font-display text-heading italic">Welcome to the meadow</p>
        <p className="mt-3 text-body opacity-75">
          A painted world that answers your cursor, with sound composed live as you move. It is
          best experienced with sound, ideally with headphones.
        </p>

        <div className="mt-10 grid w-full">
          <p
            aria-live="polite"
            className="col-start-1 row-start-1 animate-pulse self-center text-caption tracking-widest uppercase opacity-55 transition-opacity duration-1000 ease-smooth group-data-ready:invisible group-data-ready:opacity-0"
          >
            Loading
          </p>
          <div className="invisible col-start-1 row-start-1 mx-auto flex w-full max-w-xs translate-y-3 flex-col items-stretch gap-3 opacity-0 transition-[opacity,translate,visibility] duration-1800 ease-reveal group-data-ready:visible group-data-ready:translate-y-0 group-data-ready:opacity-100">
            <button
              ref={enterRef}
              type="button"
              onClick={() => enter(true)}
              className={`${choice} border-transparent bg-on-night text-on-day hover:opacity-85`}
            >
              <Volume2 aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
              Enter with sound
            </button>
            <span aria-hidden className="text-center text-caption opacity-55">
              or
            </span>
            <button
              type="button"
              onClick={() => enter(false)}
              className={`${choice} border-current/25 bg-on-day/30 backdrop-blur-md hover:bg-on-day/50`}
            >
              <VolumeX aria-hidden className="size-[1.125rem] opacity-75" strokeWidth={1.5} />
              Enter without sound
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
