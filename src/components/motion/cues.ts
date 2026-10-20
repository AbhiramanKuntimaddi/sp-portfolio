import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

/*
 * Chapter entrances, played by the Conductor when each chapter's note sounds:
 * titles condense out of the sand and ring, lines are plucked, swara marks
 * tune in, script words are written in.
 */

// Copy settles in place: a short rise and a fade, no blur (it smeared fine
// type and made scrolling heavy).
export const SOFT = { autoAlpha: 0, y: 16 };
export const SHARP = { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out" };

const EASE = "power4.out";
const QUIET_FROM = { autoAlpha: 0, y: 12 };
const QUIET_TO = { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" };

/**
 * Ring a set of pieces (letters or lines) like a plucked string: a standing
 * wave across them that rings down to rest. `loops` is the wave's shape — the
 * chapter's place in the octave (Sa = 1 bow, Re = 2 loops, Ga = 3…), so every
 * chapter's title rings a little differently.
 */
export function ring(tl: gsap.core.Timeline, parts: Element[], at: number, loops: number, amp: number, onDone?: () => void) {
  const n = parts.length;
  const RING = 1.5; // seconds to ring down
  const HZ = 5.5; // visible vibrations per second
  const state = { t: 0 };
  const setY = parts.map((p) => gsap.quickSetter(p, "y", "px"));
  tl.to(
    state,
    {
      t: RING,
      duration: RING,
      ease: "none",
      onUpdate: () => {
        const t = state.t;
        const decay = Math.exp(-t * 3.2);
        parts.forEach((_, i) => {
          const x = (i + 0.5) / n;
          setY[i](amp * Math.sin(loops * Math.PI * x) * decay * Math.sin(2 * Math.PI * HZ * t));
        });
      },
      onComplete: () => {
        gsap.set(parts, { y: 0 });
        onDone?.();
      },
    },
    at,
  );
}

/** Lines (the profile lead, the quote) appear in place and ring. */
export function pluckLines(tl: gsap.core.Timeline, el: HTMLElement, lines: Element[], at: number, loops: number, onDone: () => void) {
  const fontSize = parseFloat(getComputedStyle(el).fontSize) || 48;
  tl.set(el, { autoAlpha: 1 }, at);
  tl.fromTo(lines, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power1.out", stagger: { amount: 0.2 } }, at);
  ring(tl, lines, at, loops, fontSize * 0.035, onDone);
}

/*
 * A title is made of grains. It arrives the way sand finds a nodal line:
 * the letters come in from scattered places, settle into the word, and the
 * word rings once as the chapter's note sounds. On the way out (see the
 * exits below) the letters scatter back into sand.
 */
export const GRAIN = "grain";
function condenseTitle(tl: gsap.core.Timeline, el: HTMLElement, chars: Element[], at: number, loops: number) {
  const fontSize = parseFloat(getComputedStyle(el).fontSize) || 48;
  el.dataset.grains = "";
  tl.set(el, { autoAlpha: 1 }, at);
  tl.fromTo(
    chars,
    { autoAlpha: 0, xPercent: "random(-70, 70)", yPercent: "random(50, 150)", rotation: "random(-28, 28)" },
    {
      autoAlpha: 1,
      xPercent: 0,
      yPercent: 0,
      rotation: 0,
      duration: 1.1,
      ease: "expo.out",
      stagger: { amount: Math.min(0.45, chars.length * 0.04), from: "random" },
    },
    at,
  );
  ring(tl, chars, at + 0.55, loops, fontSize * 0.045);
}

/**
 * One chapter's entrance: its swara mark, its title and anything else marked
 * `data-cue`, placed on a timeline at their `data-delay`. Played when the
 * chapter's note sounds, so the music and the words arrive together.
 */
export function buildCue(section: HTMLElement, loops = 1) {
  const tl = gsap.timeline({ paused: true });
  section.querySelectorAll<HTMLElement>("[data-cue]").forEach((el) => {
    const at = parseFloat(el.dataset.delay ?? "0");
    const kind = el.dataset.cue;

    // The hero's name condenses out of the sand that spelled it: no masks, the
    // letters sharpen from a blur in random order, exactly where the grains were.
    // A script word condenses as one piece (splitting it would break its joins).
    if (el.dataset.emerge === "whole") {
      tl.fromTo(
        el,
        { autoAlpha: 0, filter: "blur(16px)" },
        { autoAlpha: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out" },
        at,
      );
      return;
    }

    // A script word is written in: revealed left to right, like a pen stroke.
    // The insets reach past the box so swashes and descenders aren't cut.
    if (kind === "write") {
      tl.set(el, { autoAlpha: 1 }, at);
      tl.fromTo(
        el,
        { clipPath: "inset(-40% 100% -40% -10%)" },
        { clipPath: "inset(-40% -10% -40% -10%)", duration: 1.5, ease: "power2.inOut" },
        at,
      );
      return;
    }

    // The letters stay split afterwards: the exit scatters them back to sand.
    if (el.dataset.emerge !== undefined) {
      const split = SplitText.create(el, { type: "words,chars", wordsClass: `${GRAIN}-word`, charsClass: GRAIN, tag: "span" });
      el.dataset.grains = "";
      tl.set(el, { autoAlpha: 1 }, at);
      tl.fromTo(
        split.chars,
        { autoAlpha: 0, filter: "blur(14px)" },
        { autoAlpha: 1, filter: "blur(0px)", duration: 1.3, ease: "power3.out", stagger: { amount: 0.55, from: "random" }, clearProps: "filter" },
        at,
      );
      return;
    }

    // Titles condense out of the sand (see condenseTitle) and stay split into
    // letters (inline blocks, so they still reflow on resize). Lines are
    // plucked, then handed back to the browser.
    if (el.dataset.split) {
      if (el.dataset.split === "chars") {
        const split = SplitText.create(el, { type: "words,chars", wordsClass: `${GRAIN}-word`, charsClass: GRAIN, tag: "span" });
        condenseTitle(tl, el, split.chars, at, loops);
      } else {
        const split = SplitText.create(el, { type: "lines" });
        pluckLines(tl, el, split.lines, at, loops, () => split.revert());
      }
      return;
    }

    // The mark tunes in: its line draws, and the frequency counts up from the
    // last chapter's note to this one's, like a tuner settling on pitch.
    if (kind === "mark") {
      tl.set(el, { autoAlpha: 1 }, at);
      tl.from(el.querySelectorAll("[data-mark-line]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 1.1, ease: "expo.inOut" }, at);
      tl.from(el.querySelectorAll("[data-mark-part]"), { autoAlpha: 0, y: 10, duration: 0.9, ease: EASE, stagger: 0.08 }, at + 0.15);
      const hz = el.querySelector<HTMLElement>("[data-hz-from]");
      if (hz) {
        const from = Number(hz.dataset.hzFrom);
        const to = Number(hz.dataset.hz);
        const dial = { v: from };
        hz.textContent = `${from} Hz`;
        tl.to(dial, { v: to, duration: 1.3, ease: "power3.out", onUpdate: () => (hz.textContent = `${Math.round(dial.v)} Hz`) }, at + 0.2);
      }
      return;
    }

    // A row of script words, written in one after another like a pen moving
    // along the line. The insets reach past each word so swashes aren't cut.
    if (kind === "scribe") {
      tl.set(el, { autoAlpha: 1 }, at);
      Array.from(el.children).forEach((word, i) =>
        tl.fromTo(
          word,
          { clipPath: "inset(-40% 100% -40% -10%)" },
          { clipPath: "inset(-40% -10% -40% -10%)", duration: 1, ease: "power2.inOut", clearProps: "clipPath" },
          at + i * 0.45,
        ),
      );
      return;
    }

    if (kind === "stagger") {
      tl.set(el, { autoAlpha: 1 }, at);
      tl.fromTo(el.children, QUIET_FROM, { ...QUIET_TO, stagger: 0.07 }, at);
      return;
    }

    // Small supporting text: a short, clean rise — no blur on fine type.
    if (kind === "quiet") {
      tl.fromTo(el, QUIET_FROM, QUIET_TO, at);
      return;
    }

    tl.fromTo(el, SOFT, SHARP, at);
  });
  return tl;
}
