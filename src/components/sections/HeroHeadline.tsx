"use client";

import { useEffect, useRef } from "react";
import { nightFor, type TimeOfDay } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";
import { useSceneStore } from "@/store/scene";

const PREFIX = "Simone macht";
const WORDS: Record<TimeOfDay, { text: string; italic: boolean }> = {
  day: { text: "Kunst", italic: true },
  night: { text: "Business", italic: false },
};

/** Seconds per typed and per erased character. */
const TYPE_SPEED = 0.07;
const ERASE_SPEED = 0.04;

/** Tweens the visible length of `text` in `el` one character at a time. */
const typeTo = (tl: gsap.core.Timeline, el: HTMLElement, text: string, from: number, to: number) => {
  const chars = Math.abs(to - from);
  if (chars === 0) return;
  const counter = { length: from };
  tl.to(counter, {
    length: to,
    duration: chars * (to > from ? TYPE_SPEED : ERASE_SPEED),
    ease: `steps(${chars})`,
    onUpdate: () => {
      el.textContent = text.slice(0, Math.round(counter.length));
    },
  });
};

/**
 * Big white headline at the bottom left, on two lines: "Simone macht /
 * Kunst" by day (Kunst in italics), "Simone macht / Business" by night.
 * Typed in on mount and retyped with a GSAP typewriter whenever the
 * Day/Night switch changes, starting halfway through the world's morph
 * (when `night` crosses 0.5): the old word is erased, the new one typed. The full text sits in an sr-only copy, the
 * typed copy is aria-hidden. It fades out while a project overlay is open.
 */
export function HeroHeadline() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const projectOpen = useSceneStore((s) => s.openFlower !== null);
  const reducedMotion = usePrefersReducedMotion();
  const prefixRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  // One caret per line; the line being typed shows its own.
  const prefixCaretRef = useRef<HTMLSpanElement>(null);
  const wordCaretRef = useRef<HTMLSpanElement>(null);
  const word = WORDS[timeOfDay];

  useEffect(() => {
    const prefixEl = prefixRef.current;
    const wordEl = wordRef.current;
    const prefixCaret = prefixCaretRef.current;
    const wordCaret = wordCaretRef.current;
    if (!prefixEl || !wordEl || !prefixCaret || !wordCaret) return;
    const target = WORDS[timeOfDay];
    const setItalic = () => {
      wordEl.style.fontStyle = target.italic ? "italic" : "normal";
    };

    let tl: gsap.core.Timeline | undefined;
    const start = () => {
      if (reducedMotion) {
        prefixEl.textContent = PREFIX;
        wordEl.textContent = target.text;
        setItalic();
        return;
      }

      // Start from what is on screen, so a switch mid-typing carries on from there.
      const prefixShown = prefixEl.textContent ?? "";
      const wordShown = wordEl.textContent ?? "";
      const keepWord =
        target.text.startsWith(wordShown) &&
        (wordShown === "" || (wordEl.style.fontStyle === "italic") === target.italic);

      tl = gsap.timeline({ delay: prefixShown === "" ? 0.4 : 0 });
      const typingPrefix = prefixShown.length < PREFIX.length;
      tl.set(prefixCaret, { opacity: typingPrefix ? 1 : 0 });
      tl.set(wordCaret, { opacity: typingPrefix ? 0 : 1 });
      if (!keepWord) typeTo(tl, wordEl, wordShown, wordShown.length, 0);
      tl.call(setItalic);
      typeTo(tl, prefixEl, PREFIX, prefixShown.length, PREFIX.length);
      tl.set(prefixCaret, { opacity: 0 });
      tl.set(wordCaret, { opacity: 1 });
      typeTo(tl, wordEl, target.text, keepWord ? wordShown.length : 0, target.text.length);
      // Blink the caret a few times, then let it go.
      tl.to(wordCaret, { opacity: 0, duration: 0.5, ease: "steps(1)", repeat: 5, yoyo: true });
      tl.set(wordCaret, { opacity: 0 });
    };

    // Retype once the world is halfway through its morph toward the target.
    const goal = nightFor[timeOfDay];
    const halfway = (night: number) => (goal === 1 ? night >= 0.5 : night <= 0.5);
    let unsubscribe: (() => void) | undefined;
    if (halfway(useSceneStore.getState().night)) start();
    else {
      unsubscribe = useSceneStore.subscribe((state) => {
        if (!halfway(state.night)) return;
        unsubscribe?.();
        unsubscribe = undefined;
        start();
      });
    }

    return () => {
      unsubscribe?.();
      tl?.kill();
    };
  }, [timeOfDay, reducedMotion]);

  const caret =
    "ml-[0.04em] inline-block h-[0.8em] w-[0.06em] translate-y-[0.08em] bg-current opacity-0";

  return (
    <h1
      className={`pointer-events-none fixed bottom-edge left-edge z-20 max-w-[calc(100vw-2*var(--spacing-edge))] font-display text-headline text-foreground transition-opacity ease-out ${
        projectOpen ? "opacity-0 duration-300" : "opacity-100 duration-700 delay-300"
      }`}
    >
      <span className="sr-only">
        {PREFIX} {word.italic ? <em>{word.text}</em> : word.text}
      </span>
      <span aria-hidden className="block">
        <span ref={prefixRef} />
        <span ref={prefixCaretRef} className={caret} />
      </span>
      <span aria-hidden className="block">
        <span ref={wordRef} />
        <span ref={wordCaretRef} className={caret} />
      </span>
    </h1>
  );
}
