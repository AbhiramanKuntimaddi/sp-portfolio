"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { SA_HZ, SITE } from "@/lib/content";
import { setSoundOn } from "@/lib/sound";
import { isEntered, markEntered } from "@/lib/stage";
import { withLenis } from "@/lib/smoothScroll";
import { resonance } from "@/lib/resonance";

const MIN_MS = 1800;
const MAX_MS = 7000;

/*
 * Tuning the plate. While the page loads, the sand gathers out of noise into
 * her name and the readout climbs from 0 to 220 Hz with the real loading
 * (fonts, then the page's assets). Then the visitor enters — with sound or in
 * silence ("Listen in" / "or read in silence"). That click strikes the plate: the name bursts back into sand, and
 * it's also what lets the browser play music.
 */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const hzRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const firstButton = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(() => typeof window !== "undefined" && isEntered());

  useEffect(() => {
    if (isEntered()) return;
    // The sand gathers into her name while the page tunes.
    resonance.form = 1;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const stopLenis = withLenis((lenis) => {
      lenis.scrollTo(0, { immediate: true });
      lenis.stop();
    });

    const shown = { p: 0 };
    let target = 0;
    const paint = () => {
      if (hzRef.current) hzRef.current.textContent = (shown.p * SA_HZ).toFixed(2).padStart(6, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown.p})`;
    };
    const toward = (t: number) => {
      target = Math.max(target, t);
      gsap.to(shown, { p: target, duration: target >= 1 ? 1.1 : 1.6, ease: "power2.out", onUpdate: paint, overwrite: true });
    };

    const start = performance.now();
    const fonts = document.fonts.ready.then(() => toward(0.45));
    const loaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    }).then(() => toward(0.85));
    const minTime = new Promise((r) => setTimeout(r, MIN_MS));
    const cap = new Promise((r) => setTimeout(r, MAX_MS));
    toward(0.12);

    let alive = true;
    Promise.race([Promise.all([fonts, loaded, minTime]), cap]).then(() => {
      if (!alive) return;
      gsap.to(shown, {
        p: 1,
        duration: Math.max(0.6, 1.1 - (performance.now() - start) / 10000),
        ease: "power2.inOut",
        onUpdate: paint,
        overwrite: true,
        onComplete: () => alive && setReady(true),
      });
    });

    return () => {
      alive = false;
      stopLenis();
      gsap.killTweensOf(shown);
    };
  }, []);

  useEffect(() => {
    if (!ready || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.to("[data-pre='status']", { autoAlpha: 0, y: -10, duration: 0.5, ease: "power2.in" });
      gsap.fromTo(
        "[data-pre='choice']",
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.1,
          delay: 0.35,
          onStart: () => firstButton.current?.focus({ preventScroll: true }),
        },
      );
    }, root);
    return () => ctx.revert();
  }, [ready]);

  // No `disabled` attribute on the buttons: Firefox/Zen restores it across
  // reloads, which breaks hydration. They're invisible (so neither clickable
  // nor focusable) until tuned, and this guard covers the rest.
  const entering = useRef(false);
  const enter = (withSound: boolean) => {
    if (!ready || entering.current) return;
    entering.current = true;
    setSoundOn(withSound);
    const el = root.current;
    if (!el) return;
    gsap
      .timeline({
        onComplete: () => setGone(true),
      })
      .to(el.querySelectorAll("[data-pre='content'] > *"), {
        autoAlpha: 0,
        y: -24,
        filter: "blur(6px)",
        duration: 0.7,
        ease: "power3.in",
        stagger: 0.05,
      })
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
        markEntered();
        withLenis((lenis) => lenis.start())();
      }, "-=0.2")
      .to(el, { autoAlpha: 0, duration: 0.6, ease: "power2.out" }, "<");
  };

  if (gone) return null;

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`Welcome to ${SITE.name}'s portfolio`}
      className="preloader fixed inset-0 z-50 flex items-end justify-center px-gutter pb-[10vh]"
    >
      <div data-pre="content" className="flex w-full max-w-md flex-col items-center text-center">
        <p className="label text-muted">Personal portfolio · {SITE.city}</p>

        <p className="mt-6 flex items-baseline gap-4">
          <span className="font-display text-4xl italic text-accent">Sa</span>
          <span className="font-mono text-3xl font-light tabular-nums sm:text-4xl">
            <span ref={hzRef}>000.00</span>
            <span className="label ml-2 text-muted">Hz</span>
          </span>
        </p>

        <span className="mt-8 block h-px w-48 overflow-hidden bg-line" aria-hidden="true">
          <span ref={barRef} className="block h-full origin-left scale-x-0 bg-foreground" />
        </span>

        <div className="relative mt-10 h-24 w-full">
          <p data-pre="status" className="label absolute inset-x-0 top-0 text-muted" aria-live="polite">
            {ready ? "Tuned" : "Tuning the plate"}
          </p>
          <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-5">
            <button
              ref={firstButton}
              type="button"
              data-pre="choice"
              data-sound-toggle
              onClick={() => enter(true)}
              className="invisible font-display text-3xl italic opacity-0"
            >
              <span className="ulink">Listen in</span>
            </button>
            <button
              type="button"
              data-pre="choice"
              data-sound-toggle
              onClick={() => enter(false)}
              className="label invisible text-muted opacity-0 transition-colors hover:text-foreground"
            >
              <span className="ulink">or read in silence</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
