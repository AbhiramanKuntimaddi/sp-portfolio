"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { SWARAS } from "@/lib/content";
import { resonance, tuningAt } from "@/lib/state/resonance";
import { arrive, initSound, setMode, startBow, stopBow } from "@/lib/audio/sound";
import { isEntered, whenEntered } from "@/lib/state/stage";
import { withLenis } from "@/lib/scroll";
import { buildCue, GRAIN, pluckLines, SHARP, SOFT } from "./cues";

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
          // Splitting the titles can nudge their heights; re-measure the chapter
          // boundaries (only ours — a full ScrollTrigger refresh here would
          // rewind every animation set up a moment ago).
          measure(window.scrollY);
          // The hero plays as the plate is struck; anything already passed plays too.
          for (let i = 0; i <= chapter; i++) playCue(i);

          // Secondary titles (the quote) are plucked too, as they scroll in.
          gsap.utils.toArray<HTMLElement>("[data-split]:not([data-cue])").forEach((el) => {
            const split = SplitText.create(el, { type: "lines" });
            const tl = gsap.timeline({ paused: true });
            pluckLines(tl, el, split.lines, 0, 1, () => split.revert());
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

          // Rows and tiles hang on a string (globals.css, [data-string]): the
          // hairline is drawn across first, then the row's contents settle in.
          // A tile with its own ground fades in as its string is drawn.
          const rows = gsap.utils.toArray<HTMLElement>("[data-reveal][data-string]");
          rows.forEach((row) => {
            const bg = getComputedStyle(row).backgroundColor;
            const solid = bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg);
            gsap.set(row, { autoAlpha: solid ? 0 : 1, "--string": 0 });
            // The CSS hover fade (globals.css) would drag behind every frame
            // of the reveal, so it's switched off until the row has arrived.
            gsap.set(row.children, { autoAlpha: 0, y: 14, transition: "none" });
          });
          ScrollTrigger.batch(rows, {
            start: "top 90%",
            once: true,
            onEnter: (batch) =>
              batch.forEach((row, i) => {
                const d = i * 0.14;
                gsap.to(row, { autoAlpha: 1, duration: 0.8, ease: "power2.out", delay: d });
                gsap.to(row, { "--string": 1, duration: 1.4, ease: "expo.inOut", delay: d });
                gsap.to(row.children, {
                  autoAlpha: 1,
                  y: 0,
                  duration: 1,
                  ease: "power3.out",
                  delay: d + 0.35,
                  stagger: 0.07,
                  // Handed back to CSS, which dims the other rows on hover.
                  clearProps: "opacity,visibility,transform,transition",
                });
              }),
          });

          // Everything else enters in reading order, whatever arrives together.
          const rest = "[data-reveal]:not([data-cue]):not([data-reveal='image']):not([data-prose]):not([data-string])";
          gsap.set(rest, SOFT);
          ScrollTrigger.batch(rest, {
            start: "top 88%",
            once: true,
            onEnter: (batch) => gsap.to(batch, { ...SHARP, stagger: 0.12, overwrite: true }),
          });

          // Titles scatter back into sand only as they actually leave: from the
          // moment a title's top meets the top of the screen until it's gone —
          // never while its chapter is still being read. Scrubbed, so
          // scrolling back gathers the letters again. (The closing title never
          // leaves.)
          gsap.utils.toArray<HTMLElement>("[data-exit] [data-grains]").forEach((el) => {
            const hero = !!el.closest('[data-exit="hero"]');
            gsap.fromTo(
              el.querySelectorAll(`.${GRAIN}`),
              { xPercent: 0, yPercent: 0, rotation: 0, opacity: 1 },
              {
                xPercent: "random(-90, 90)",
                yPercent: hero ? "random(-110, -20)" : "random(-170, -40)",
                rotation: "random(-40, 40)",
                opacity: 0,
                ease: "power1.in",
                stagger: { amount: 0.6, from: "random" },
                immediateRender: false,
                scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
              },
            );
          });

          // Exits: as a chapter's end leaves the screen, the rest of it recedes —
          // drifting up a little and dimming — while the next one arrives. Scrubbed to the
          // scroll, so it plays backwards when you return. (No blur: blurring
          // large areas makes scrolling stutter.)
          gsap.utils.toArray<HTMLElement>("[data-exit]").forEach((el) => {
            const hero = el.dataset.exit === "hero";
            gsap.fromTo(
              el,
              { y: 0, opacity: 1 },
              {
                y: () => -window.innerHeight * (hero ? 0.1 : 0.05),
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
    // The chapter boundaries are measured, not computed, so any change in the
    // page's height — a photo arriving, a recognition row opening on a tablet,
    // a title split into letters — would leave every later note sounding at
    // the wrong place. Re-measure whenever the page's height settles.
    // Only a real change of height counts: the observer also reports on
    // start, and refreshing for nothing restarts scroll-linked animations.
    let settle = 0;
    const main = document.querySelector("main");
    let height = main?.offsetHeight ?? 0;
    const resized = new ResizeObserver(() => {
      const now = main?.offsetHeight ?? 0;
      if (Math.abs(now - height) < 2) return;
      height = now;
      window.clearTimeout(settle);
      settle = window.setTimeout(refresh, 250);
    });
    if (main) resized.observe(main);
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
      resized.disconnect();
      window.clearTimeout(settle);
    };
  });

  return null;
}
