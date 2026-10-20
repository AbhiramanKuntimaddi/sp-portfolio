"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { SWARAS } from "@/lib/content";
import { resonance, tuningAt } from "@/lib/resonance";
import { arrive, initSound, setMode, startBow, stopBow } from "@/lib/sound";
import { isEntered, whenEntered } from "@/lib/stage";
import { withLenis } from "@/lib/smoothScroll";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// A note changes while the next chapter's top edge travels from 72% to 28% of
// the screen: the same distance at every boundary, whatever the sections'
// heights. The note sounds (and the chapter's title rises) about halfway,
// when that edge is near the middle of the screen.
const RETUNE_FROM = 0.72;
const RETUNE_TO = 0.28;

const EASE = "power4.out";
const SOFT = { autoAlpha: 0, y: 24, filter: "blur(8px)" };
const SHARP = { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: EASE };
const QUIET_FROM = { autoAlpha: 0, y: 12 };
const QUIET_TO = { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" };

/**
 * One chapter's entrance: its swara mark, its title and anything else marked
 * `data-cue`, placed on a timeline at their `data-delay`. Played when the
 * chapter's note sounds, so the music and the words arrive together.
 */
/**
 * Pluck a title like a string. The pieces (letters or lines) appear in place,
 * then vibrate as a standing wave across the word that rings down to rest —
 * no masks, no sliding, no zoom. `loops` is the wave's shape: the chapter's
 * place in the octave (Sa = 1 bow, Re = 2 loops, Ga = 3…), so every
 * chapter's title rings a little differently.
 */
function pluckTitle(
  tl: gsap.core.Timeline,
  el: HTMLElement,
  parts: Element[],
  at: number,
  loops: number,
  onDone: () => void,
) {
  const n = parts.length;
  const fontSize = parseFloat(getComputedStyle(el).fontSize) || 48;
  // Letters swing further than whole lines.
  const amp = fontSize * (n > 6 ? 0.07 : 0.035);
  const RING = 1.5; // seconds to ring down
  const HZ = 5.5; // visible vibrations per second
  const spread = Math.min(0.35, n * 0.03);

  tl.set(el, { autoAlpha: 1 }, at);
  tl.fromTo(parts, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power1.out", stagger: { amount: spread } }, at);

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
          const shape = Math.sin(loops * Math.PI * x);
          setY[i](amp * shape * decay * Math.sin(2 * Math.PI * HZ * t));
        });
      },
      onComplete: () => {
        gsap.set(parts, { clearProps: "transform" });
        onDone();
      },
    },
    at,
  );
}

function buildCue(section: HTMLElement, loops = 1) {
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

    if (el.dataset.emerge !== undefined) {
      const split = SplitText.create(el, { type: "chars" });
      tl.set(el, { autoAlpha: 1 }, at);
      tl.fromTo(
        split.chars,
        { autoAlpha: 0, filter: "blur(14px)" },
        { autoAlpha: 1, filter: "blur(0px)", duration: 1.3, ease: "power3.out", stagger: { amount: 0.55, from: "random" } },
        at,
      );
      tl.call(() => split.revert(), [], at + 1.9);
      return;
    }

    // Titles are plucked like a string (see pluckTitle); afterwards the text
    // is handed back to the browser so it reflows on resize.
    if (el.dataset.split) {
      const byChar = el.dataset.split === "chars";
      const split = SplitText.create(el, { type: byChar ? "words,chars" : "lines" });
      pluckTitle(tl, el, byChar ? split.chars : split.lines, at, loops, () => split.revert());
      return;
    }

    if (kind === "mark") {
      tl.set(el, { autoAlpha: 1 }, at);
      tl.from(el.querySelectorAll("[data-mark-line]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 1.1, ease: "expo.inOut" }, at);
      tl.from(el.querySelectorAll("[data-mark-part]"), { autoAlpha: 0, y: 10, duration: 0.9, ease: EASE, stagger: 0.08 }, at + 0.15);
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

/*
 * Conducts the page: turns Lenis's scroll into a position in the octave
 * (which tunes the sand and the strings), plays each chapter's entrance as its
 * note sounds, reveals the rest of the copy in reading order, and lets the
 * visitor bow the plate by pressing and holding.
 */
export default function Conductor() {
  useGSAP(() => {
    let tops: number[] = [];
    const measure = (scroll: number) => {
      tops = SWARAS.map((s) => {
        const el = document.getElementById(s.id);
        return el ? el.getBoundingClientRect().top + scroll : Infinity;
      });
    };

    const cues = new Map<number, gsap.core.Timeline>();
    const playCue = (i: number) => {
      if (isEntered()) cues.get(i)?.play();
    };

    let chapter = 0;
    let lastVeil = -1;
    // The veil's two knobs live in globals.css (--veil-min, --veil-reading).
    let veilMin = 0.06;
    let veilReading = 0.42;
    const readVeilKnobs = () => {
      const cs = getComputedStyle(document.documentElement);
      veilMin = parseFloat(cs.getPropertyValue("--veil-min")) || 0;
      veilReading = parseFloat(cs.getPropertyValue("--veil-reading")) || 0;
    };
    readVeilKnobs();
    const conduct = (scroll: number, velocity: number) => {
      const vh = window.innerHeight;
      let pos = 0;
      for (let i = 1; i < tops.length; i++) {
        pos += smoothstep(vh * RETUNE_FROM, vh * RETUNE_TO, tops[i] - scroll);
      }
      resonance.swara = pos;
      resonance.morph = Math.sin((pos % 1) * Math.PI);
      resonance.velocity = velocity;
      // The reading veil: light where the sand is the point (Sa, Dha), about
      // two thirds where there's copy to read.
      const veil = Math.min(1, veilMin + (1 - tuningAt(pos).intensity) * veilReading);
      if (Math.abs(veil - lastVeil) > 0.004) {
        lastVeil = veil;
        document.documentElement.style.setProperty("--veil", veil.toFixed(3));
      }
      // A chapter's note sounds once you're past halfway into its retune; the
      // small dead band stops a page resting on a boundary from fluttering.
      if (pos > chapter + 0.55 || pos < chapter - 0.55) {
        const next = Math.round(pos);
        // Every chapter passed on the way gets its entrance, in order.
        for (let i = Math.min(chapter, next); i <= Math.max(chapter, next); i++) playCue(i);
        chapter = next;
        arrive(chapter);
      }
    };

    setMode("site");
    const stopSound = initSound();

    let detach = () => {};
    const stopLenis = withLenis((lenis) => {
      detach();
      const onScroll = () => conduct(lenis.scroll, lenis.velocity);
      const onRefresh = () => {
        readVeilKnobs();
        lastVeil = -1;
        measure(lenis.scroll);
        onScroll();
      };
      const off = lenis.on("scroll", onScroll);
      ScrollTrigger.addEventListener("refresh", onRefresh);
      onRefresh();
      detach = () => {
        off();
        ScrollTrigger.removeEventListener("refresh", onRefresh);
      };
    });

    // Hold to bow: press anywhere that isn't a control and the plate keeps
    // ringing under the pointer — with sound on, a bowed string sustains the
    // chapter's note until you let go.
    const bowStart = (e: PointerEvent) => {
      if (!isEntered() || e.button !== 0 || e.pointerType === "touch") return;
      if ((e.target as Element | null)?.closest?.("a, button, input, textarea, select, [role='dialog']")) return;
      resonance.bowing = true;
      startBow();
    };
    const bowEnd = () => {
      if (!resonance.bowing) return;
      resonance.bowing = false;
      stopBow();
    };
    window.addEventListener("pointerdown", bowStart);
    window.addEventListener("pointerup", bowEnd);
    window.addEventListener("pointercancel", bowEnd);
    window.addEventListener("blur", bowEnd);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
      // Entrances wait for the visitor to enter (the preloader) and for the real
      // fonts, so lines never break differently mid-animation.
      void Promise.all([document.fonts.ready, whenEntered()]).then(() =>
        ctx.add(() => {
          SWARAS.forEach((s, i) => {
            const section = document.getElementById(s.id);
            if (!section) return;
            // The title's standing wave follows the chapter's note (Sa = 1 loop…).
            cues.set(i, buildCue(section, Math.min(i + 1, 4)));
            // A safety net if a note is skipped (a resize, a jump): play once
            // the chapter is well into view anyway.
            ScrollTrigger.create({ trigger: section, start: "top 40%", once: true, onEnter: () => playCue(i) });
          });
          // The hero plays as the plate is struck; anything already passed plays too.
          for (let i = 0; i <= chapter; i++) playCue(i);

          // Secondary titles (the quote) are plucked too, as they scroll in.
          gsap.utils.toArray<HTMLElement>("[data-split]:not([data-cue])").forEach((el) => {
            const split = SplitText.create(el, { type: "lines" });
            const tl = gsap.timeline({ paused: true });
            pluckTitle(tl, el, split.lines, 0, 1, () => split.revert());
            ScrollTrigger.create({ trigger: el, start: "top 86%", once: true, onEnter: () => tl.play() });
          });

          // Photos open like a shutter — nothing else: no zoom, no drift.
          gsap.utils.toArray<HTMLElement>('[data-reveal="image"]').forEach((el) => {
            gsap.set(el, { autoAlpha: 1 });
            const tl = gsap.timeline({
              delay: parseFloat(el.dataset.delay ?? "0"),
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            });
            tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut" });
          });

          // Long paragraphs fade in line by line — no masks (they clipped the
          // reading halo), no sliding; the split is undone afterwards.
          gsap.utils.toArray<HTMLElement>("p[data-reveal]:not([data-delay]):not([data-cue])").forEach((el) => {
            if ((el.textContent ?? "").trim().length < 90) return;
            el.dataset.prose = "";
            gsap.set(el, { autoAlpha: 1 });
            SplitText.create(el, {
              type: "lines",
              autoSplit: true,
              onSplit: (self) =>
                gsap.from(self.lines, {
                  autoAlpha: 0,
                  duration: 0.9,
                  ease: "power2.out",
                  stagger: 0.12,
                  scrollTrigger: { trigger: el, start: "top 88%", once: true },
                  onComplete: () => self.revert(),
                }),
            });
          });

          // Everything else enters in reading order, whatever arrives together.
          // List rows also wipe in from the left as they rise.
          const rest = "[data-reveal]:not([data-cue]):not([data-reveal='image']):not([data-prose])";
          gsap.set(rest, SOFT);
          ScrollTrigger.batch(rest, {
            start: "top 88%",
            once: true,
            onEnter: (batch) => {
              gsap.to(batch, { ...SHARP, stagger: 0.12, overwrite: true });
              const rows = batch.filter((el) => el.tagName === "LI" || el.tagName === "ARTICLE");
              if (rows.length) {
                gsap.fromTo(
                  rows,
                  { clipPath: "inset(-20% 100% -20% 0%)" },
                  {
                    clipPath: "inset(-20% 0% -20% 0%)",
                    duration: 1.3,
                    ease: "expo.inOut",
                    stagger: 0.12,
                    clearProps: "clipPath",
                  },
                );
              }
            },
          });

          // Exits: as a chapter's end leaves the screen, it recedes — drifting up
          // and dimming — while the next one arrives. Scrubbed to the
          // scroll, so it plays backwards when you return. (No blur: blurring
          // large areas makes scrolling stutter.)
          gsap.utils.toArray<HTMLElement>("[data-exit]").forEach((el) => {
            const hero = el.dataset.exit === "hero";
            gsap.fromTo(
              el,
              { y: 0, opacity: 1 },
              {
                y: () => -window.innerHeight * (hero ? 0.16 : 0.07),
                opacity: hero ? 0.15 : 0.2,
                ease: "none",
                scrollTrigger: hero
                  ? // The name lifts away at its own pace as soon as you scroll.
                    { trigger: el.closest("section") ?? el, start: "top top", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true }
                  : { trigger: el, start: "bottom 45%", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true },
              },
            );
          });
        }),
      );
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-reveal], [data-split], [data-cue]", { autoAlpha: 1 });
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      stopLenis();
      detach();
      stopSound();
      bowEnd();
      window.removeEventListener("pointerdown", bowStart);
      window.removeEventListener("pointerup", bowEnd);
      window.removeEventListener("pointercancel", bowEnd);
      window.removeEventListener("blur", bowEnd);
      window.removeEventListener("load", refresh);
    };
  });

  return null;
}
