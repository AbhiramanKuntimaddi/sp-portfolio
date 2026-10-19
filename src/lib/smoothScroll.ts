import type Lenis from "lenis";

let lenisInstance: Lenis | null = null;
const waiting = new Set<(lenis: Lenis) => void>();

export function setLenis(instance: Lenis | null) {
  lenisInstance = instance;
  if (instance) waiting.forEach((cb) => cb(instance));
}

export function getLenis() {
  return lenisInstance;
}

/** Runs `cb` once Lenis exists (now, if it already does). Returns an unsubscribe. */
export function withLenis(cb: (lenis: Lenis) => void) {
  if (lenisInstance) cb(lenisInstance);
  waiting.add(cb);
  return () => {
    waiting.delete(cb);
  };
}

/** Slow in, slow out — the glide used for every scroll the page makes itself. */
export const glide = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
