"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { SA_HZ, SITE } from "@/lib/content";
import { isEntered, markEntered } from "@/lib/stage";
import { withLenis } from "@/lib/smoothScroll";
import { resonance } from "@/lib/resonance";
import { AROHANAM_SECONDS, PRELOAD_RAGA_INFO, playHomecoming, setSoundOn } from "@/lib/sound";

const MIN_MS = 1800;
const MAX_MS = 7000;

/*
 * The welcome. It asks first — this is an experience, best with sound — so
 * the visitor's click (the gesture browsers require) comes before the music,
 * and the preloader itself can play:
 *  1. A small modal opens at once; behind it the sand starts gathering into
 *     her name and the page loads.
 *  2. "Enter with sound": the arohanam of the raga (lib/sound.ts) climbs while the plate
 *     tunes — the readout reaches 220 Hz as the ascent reaches the upper Sa.
 *     "Enter in silence" (or Escape) tunes without it.
 *  3. Tuned, the plate is struck: the name bursts back into sand, the real
 *     type condenses, and the avarohanam descends home.
 */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const hzRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const beginRef = useRef<HTMLButtonElement>(null);
  const shown = useRef({ p: 0 });
  const choseAt = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [choice, setChoice] = useState<null | boolean>(null);
  const [gone, setGone] = useState(() => typeof window !== "undefined" && isEntered());

  const paint = () => {
    const p = shown.current.p;
    if (hzRef.current) hzRef.current.textContent = (p * SA_HZ).toFixed(2).padStart(6, "0");
    if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
  };

  // Loading: the readout climbs with the real loading, holding short of 220 Hz
  // until the visitor has chosen (the last stretch is tuned to the music).
  useEffect(() => {
    if (isEntered()) return;
    // Hold the page back while the preloader is up. The inline script only sets
    // this on a fresh load of "/", so arriving by a link (e.g. from the 404)
    // needs it set here too, or the hero would show through.
    document.documentElement.dataset.stage = "loading";
    // The sand gathers into her name while the page tunes.
    resonance.form = 1;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const stopLenis = withLenis((lenis) => {
      lenis.scrollTo(0, { immediate: true });
      lenis.stop();
    });

    const state = shown.current;
    let target = 0;
    const toward = (t: number) => {
      target = Math.max(target, t);
      gsap.to(state, { p: target, duration: 1.6, ease: "power2.out", onUpdate: paint, overwrite: true });
    };

    const fonts = document.fonts.ready.then(() => toward(0.45));
    const page = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    }).then(() => toward(0.8));
    const minTime = new Promise((r) => setTimeout(r, MIN_MS));
    const cap = new Promise((r) => setTimeout(r, MAX_MS));
    toward(0.12);

    let alive = true;
    Promise.race([Promise.all([fonts, page, minTime]), cap]).then(() => alive && setLoaded(true));

    // Ask straight away.
    const ask = gsap.context(() => {
      gsap.to("[data-pre='scrim']", { autoAlpha: 1, duration: 0.8, delay: 0.35, ease: "power2.out" });
      gsap.fromTo(
        "[data-pre='modal']",
        { y: 18, scale: 0.97 },
        {
          y: 0,
          scale: 1,
          duration: 0.9,
          delay: 0.35,
          ease: "power3.out",
          onStart: () => beginRef.current?.focus({ preventScroll: true }),
        },
      );
    }, root);

    return () => {
      alive = false;
      stopLenis();
      gsap.killTweensOf(state);
      ask.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No `disabled` on these buttons: Firefox/Zen restores it across reloads and
  // breaks hydration. The guard below covers double clicks.
  const choose = (withSound: boolean) => {
    if (choice !== null) return;
    setChoice(withSound);
    choseAt.current = performance.now();
    // Inside the click, so the browser lets the music start: the arohanam.
    setSoundOn(withSound, { intro: withSound });
    const el = root.current;
    if (!el) return;
    gsap.to(el.querySelector("[data-pre='modal']"), { autoAlpha: 0, y: -12, duration: 0.5, ease: "power2.in" });
    gsap.to(el.querySelector("[data-pre='scrim']"), { autoAlpha: 0, duration: 0.8, ease: "power2.out" });
  };

  // Chosen and loaded: finish tuning — with sound, in time with the ascent —
  // then strike the plate.
  useEffect(() => {
    if (!loaded || choice === null) return;
    const el = root.current;
    if (!el) return;
    // With sound, reach 220 Hz as the ascent reaches the upper Sa — whatever is
    // left of it if the click came before the page had finished loading.
    const elapsed = (performance.now() - choseAt.current) / 1000;
    const tune = choice ? Math.max(0.6, AROHANAM_SECONDS - elapsed) : 0.9;
    const tl = gsap
      .timeline({ onComplete: () => setGone(true) })
      .to(shown.current, { p: 1, duration: tune, ease: choice ? "none" : "power2.inOut", onUpdate: paint })
      .to(el.querySelectorAll("[data-pre='content'] > *"), {
        autoAlpha: 0,
        y: -24,
        filter: "blur(6px)",
        duration: 0.6,
        ease: "power3.in",
        stagger: 0.05,
      }, "+=0.15")
      .add(() => {
        // Strike the plate: the sand lets go of the letters and scatters into
        // Sa, in the same instant the real type starts condensing in its place.
        resonance.burst = 1;
        gsap
          .timeline()
          .to(resonance, { form: 0, duration: 0.7, ease: "power2.inOut" }, 0)
          // Fly out to every corner of the plate, then let the pattern take over.
          .to(resonance, { scatter: 1, duration: 0.35, ease: "power2.out" }, 0)
          .to(resonance, { scatter: 0, duration: 1.6, ease: "power2.inOut" }, 0.9);
        // …and the raga comes home.
        playHomecoming();
        markEntered();
        withLenis((lenis) => lenis.start())();
      }, "-=0.2")
      .to(el, { autoAlpha: 0, duration: 0.6, ease: "power2.out" }, "<");
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, choice]);

  if (gone) return null;

  return (
    <div
      ref={root}
      role="status"
      aria-label={`Loading ${SITE.name}'s portfolio`}
      className="preloader fixed inset-0 z-50 flex items-end px-gutter pb-8 lg:pb-12"
    >
      {/* A slim row along the foot, laid out like the hero's own: the name in
          sand owns the middle of the screen. */}
      <div data-pre="content" className="mx-auto flex w-full max-w-(--grid-max) flex-col gap-4">
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <p className="label text-muted">Personal portfolio · {SITE.city}</p>
            <p className="label text-foreground" aria-live="polite">
              {choice === null ? "Waiting for you" : "Tuning the plate"}
            </p>
          </div>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-xl text-accent">Sa</span>
            <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
              <span ref={hzRef}>000.00</span>
              <span className="label ml-2 text-muted">Hz</span>
            </span>
          </p>
        </div>
        <span className="block h-px w-full overflow-hidden bg-line" aria-hidden="true">
          <span ref={barRef} className="block h-full origin-left scale-x-0 bg-accent" />
        </span>
      </div>

      {/* Once tuned: the question, as a small modal over the name in sand. */}
      <div
        data-pre="scrim"
        className="invisible fixed inset-0 z-10 flex items-center justify-center bg-background/45 px-gutter opacity-0"
      >
        <div
          data-pre="modal"
          data-no-halo
          role="dialog"
          aria-modal="true"
          aria-labelledby="experience-title"
          aria-describedby="experience-note"
          data-sound-toggle
          onKeyDown={(e) => {
            if (e.key === "Escape") choose(false);
          }}
          className="w-full max-w-md rounded-xs border border-line bg-background/90 p-8 backdrop-blur-md sm:p-10"
        >
          <p className="label text-accent">An experience</p>
          <h2 id="experience-title" className="headline mt-4 text-5xl sm:text-6xl">
            Best with sound
          </h2>
          <p id="experience-note" className="mt-5 leading-relaxed text-muted">
            Strings play as you move through her story
            {PRELOAD_RAGA_INFO.playing ? (
              <>
                {" "}— it opens with {PRELOAD_RAGA_INFO.favourite ? "her favourite raga" : "raga"} {PRELOAD_RAGA_INFO.name}.
              </>
            ) : (
              "."
            )}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <button
              ref={beginRef}
              type="button"
              data-sound-toggle
              onClick={() => choose(true)}
              className="rounded-xs bg-accent px-5 py-3 font-semibold tracking-tight text-background transition-opacity hover:opacity-90"
            >
              Enter with sound
            </button>
            <button
              type="button"
              data-sound-toggle
              onClick={() => choose(false)}
              className="label py-3 text-muted transition-colors hover:text-foreground"
            >
              <span className="ulink">Enter in silence</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
