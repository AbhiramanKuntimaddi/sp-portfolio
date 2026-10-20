/*
 * The page has two stages: "loading" (the preloader is up, content waits) and
 * "entered". The visitor's click to enter is also what lets the browser
 * start the music, so everything that should begin with the page — headline
 * entrances, scrolling, sound — waits for it.
 */

let entered = false;
const waiting = new Set<() => void>();

export function isEntered() {
  return entered;
}

export function markEntered() {
  if (entered) return;
  entered = true;
  document.documentElement.dataset.stage = "entered";
  waiting.forEach((cb) => cb());
  waiting.clear();
}

/** Resolves once the visitor has entered (immediately, if they already have). */
export function whenEntered() {
  return new Promise<void>((resolve) => {
    if (entered) resolve();
    else waiting.add(resolve);
  });
}
