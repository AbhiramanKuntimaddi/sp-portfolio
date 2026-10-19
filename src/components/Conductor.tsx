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
function buildCue(section: HTMLElement) {
  const tl = gsap.timeline({ paused: true });
  section.querySelectorAll<HTMLElement>("[data-cue]").forEach((el) => {
    const at = parseFloat(el.dataset.delay ?? "0");
    const kind = el.dataset.cue;

    // The hero's name condenses out of the sand that spelled it: no masks, the
    // letters sharpen from a blur in random order, exactly where the grains were.
    if (el.dataset.emerge !== undefined) {
      const split = SplitText.create(el, { type: "chars" });
      tl.set(el, { autoAlpha: 1 }, at);
      tl.fromTo(
        split.chars,
        { autoAlpha: 0, filter: "blur(14px)", scale: 1.06 },
        { autoAlpha: 1, filter: "blur(0px)", scale: 1, duration: 1.3, ease: "power3.out", stagger: { amount: 0.55, from: "random" } },
        at,
      );
      tl.call(() => split.revert(), [], at + 1.9);
      return;
    }

    if (el.dataset.split) {
      const byChar = el.dataset.split === "chars";
      const split = SplitText.create(el, { type: byChar ? "lines,chars" : "lines", mask: "lines", linesClass: "split" });
      const parts = byChar ? split.chars : split.lines;
      const spread = byChar ? Math.min(0.5, parts.length * 0.045) : (parts.length - 1) * 0.1;
      const duration = byChar ? 1.4 : 1.2;
      tl.set(el, { autoAlpha: 1 }, at);
      tl.from(parts, { yPercent: 108, duration, ease: "expo.out", stagger: { amount: spread, ease: "power1.in" } }, at);
      // Hand the text back to the browser so it reflows on resize.
      tl.call(() => split.revert(), [], at + duration + spread + 0.45);
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
    const conduct = (scroll: number, velocity: number) => {
      const vh = window.innerHeight;
      let pos = 0;
      for (let i = 1; i < tops.length; i++) {
        pos += smoothstep(vh * RETUNE_FROM, vh * RETUNE_TO, tops[i] - scroll);
      }
      resonance.swara = pos;
      resonance.morph = Math.sin((pos % 1) * Math.PI);
      resonance.velocity = velocity;
      // The reading veil: nearly clear where the sand is the point (Sa, Dha),
      // about half where there's copy to read.
      const veil = 0.06 + (1 - tuningAt(pos).intensity) * 0.62;
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
            cues.set(i, buildCue(section));
            // A safety net if a note is skipped (a resize, a jump): play once
            // the chapter is well into view anyway.
            ScrollTrigger.create({ trigger: section, start: "top 40%", once: true, onEnter: () => playCue(i) });
          });
          // The hero plays as the plate is struck; anything already passed plays too.
          for (let i = 0; i <= chapter; i++) playCue(i);

          // Secondary lines (quotes) still split as they scroll in.
          gsap.utils.toArray<HTMLElement>("[data-split]:not([data-cue])").forEach((el) => {
            gsap.set(el, { autoAlpha: 1 });
            SplitText.create(el, {
              type: "lines",
              mask: "lines",
              linesClass: "split",
              autoSplit: true,
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent: 105,
                  duration: 1.15,
                  ease: EASE,
                  stagger: 0.11,
                  scrollTrigger: { trigger: el, start: "top 86%", once: true },
                }),
            });
          });

          // Photos open like a shutter, the picture settling as it does.
          gsap.utils.toArray<HTMLElement>('[data-reveal="image"]').forEach((el) => {
            const img = el.querySelector("img");
            gsap.set(el, { autoAlpha: 1 });
            const tl = gsap.timeline({
              delay: parseFloat(el.dataset.delay ?? "0"),
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            });
            tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut" });
            if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2, ease: "expo.out" }, 0.1);
          });

          // Rows and copy enter in reading order, whatever arrives together,
          // each row's hairline drawing in first.
          const rest = "[data-reveal]:not([data-cue]):not([data-reveal='image'])";
          gsap.set(rest, SOFT);
          ScrollTrigger.batch(rest, {
            start: "top 88%",
            once: true,
            onEnter: (batch) => gsap.to(batch, { ...SHARP, stagger: 0.12, overwrite: true }),
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
