import type Lenis from "lenis";

/*
 * Scrolling: the one Lenis instance (created by SmoothScrollProvider) and the
 * glides the page makes itself.
 */

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

/**
 * Glide to a chapter by its id. Buttons call this instead of "#id" links, so
 * the address never picks up a hash.
 */
export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const lenis = getLenis();
  if (!lenis) {
    target.scrollIntoView({ behavior: "smooth" });
    return;
  }
  // Longer journeys take a little longer, but never drag.
  const distance = Math.abs(target.getBoundingClientRect().top) / window.innerHeight;
  lenis.scrollTo(target, { duration: Math.min(1.1 + distance * 0.22, 2.6), easing: glide, lock: true });
}
