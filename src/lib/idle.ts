export type IdleDeadlineLike = Pick<IdleDeadline, "timeRemaining">;

/**
 * requestIdleCallback, or for browsers without it (Safari) a short timeout
 * with an 8 ms slot. Returns a cancel function.
 */
export function requestIdle(callback: (deadline: IdleDeadlineLike) => void, timeout = 500) {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(callback, { timeout });
    return () => cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(() => {
    const start = performance.now();
    callback({ timeRemaining: () => Math.max(0, 8 - (performance.now() - start)) });
  }, 16);
  return () => window.clearTimeout(handle);
}

/**
 * Calls back once the page has loaded (the window's `load` event) and the
 * main thread is next idle. Returns a cancel function.
 */
export function afterLoadIdle(callback: () => void, timeout = 1000) {
  let cancelIdle: (() => void) | null = null;
  const start = () => {
    cancelIdle = requestIdle(callback, timeout);
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return () => {
    window.removeEventListener("load", start);
    cancelIdle?.();
  };
}
