"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SITE, SWARAS } from "@/lib/content";
import { getLenis, glide } from "@/lib/smoothScroll";
import { onSound, resonance } from "@/lib/resonance";
import { setSoundOn } from "@/lib/sound";

export function scrollToId(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  const lenis = getLenis();
  if (!lenis) return;
  e.preventDefault();
  const target = document.querySelector<HTMLElement>(href);
  if (!target) return;
  // Longer journeys take a little longer, but never drag.
  const distance = Math.abs(target.getBoundingClientRect().top) / window.innerHeight;
  lenis.scrollTo(target, { duration: Math.min(1.1 + distance * 0.22, 2.6), easing: glide, lock: true });
}

export function SoundToggle({ className = "" }: { className?: string }) {
  const [state, setState] = useState({ on: true, audible: false });
  useEffect(() => {
    const sync = () => setState({ on: resonance.soundOn, audible: resonance.audible });
    sync();
    return onSound(sync);
  }, []);

  const playing = state.on && state.audible;
  const label = !state.on ? "Sound off" : state.audible ? "Sound on" : "Tap to hear";

  return (
    <button
      type="button"
      data-sound-toggle
      onClick={() => setSoundOn(!resonance.soundOn)}
      aria-pressed={state.on}
      aria-label={state.on ? "Turn sound off" : "Turn sound on"}
      className={`label group inline-flex items-center gap-3 ${className}`}
    >
      <span className="flex h-3 items-end gap-[3px]" aria-hidden="true">
        {[0.55, 1, 0.75, 0.4].map((h, i) => (
          <span
            key={i}
            className="h-full w-px origin-bottom bg-current transition-transform duration-500"
            style={{
              transform: `scaleY(${playing ? h : 0.18})`,
              animation: playing ? `sound-bar 1.${2 + i}s ease-in-out ${i * 0.15}s infinite alternate` : "none",
            }}
          />
        ))}
      </span>
      <span className="ulink">{label}</span>
    </button>
  );
}

/**
 * The string: a hairline between the name and the controls that is a real
 * standing wave — one loop per step up the scale (Sa = 1 … upper Sa = 8). It
 * shivers on each pluck, swells with the music and sways while you bow.
 */
function HeaderString() {
  const pathRef = useRef<SVGPathElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const POINTS = 96;
    let amp = 0;
    let phase = 0;
    let shown = -1;
    const draw = (_t: number, dt: number) => {
      const path = pathRef.current;
      if (!path) return;
      const loops = Math.max(1, resonance.swara + 1);
      const target = 0.6 + resonance.pulse * 3.2 + resonance.level * 5 + resonance.morph * 1.6 + (resonance.bowing ? 2.4 : 0);
      amp += (target - amp) * Math.min(1, dt / 120);
      phase += dt * 0.006 * (1 + resonance.level * 2);
      const swing = Math.cos(phase);
      let d = "";
      for (let i = 0; i <= POINTS; i++) {
        const x = i / POINTS;
        const y = 6 + Math.sin(loops * Math.PI * x) * amp * swing;
        d += `${i ? "L" : "M"}${(x * 1000).toFixed(1)} ${y.toFixed(2)}`;
      }
      path.setAttribute("d", d);

      const now = Math.round(resonance.swara);
      if (now !== shown && labelRef.current) {
        shown = now;
        const s = SWARAS[now];
        labelRef.current.textContent = `${s.name} · ${s.label}`;
      }
    };
    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  });

  return (
    <div className="flex min-w-0 flex-1 items-center gap-4" aria-hidden="true">
      <svg viewBox="0 0 1000 12" preserveAspectRatio="none" className="h-3 min-w-0 flex-1 overflow-visible text-foreground/30">
        <path ref={pathRef} d="M0 6L1000 6" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span ref={labelRef} className="label hidden shrink-0 text-muted md:inline">
        Sa · Spandana
      </span>
    </div>
  );
}

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-(--grid-max) items-center gap-5 px-gutter py-5 lg:gap-8 lg:py-7">
        <a href="#top" onClick={(e) => scrollToId(e, "#top")} className="group flex shrink-0 items-baseline gap-3">
          <span className="font-display text-xl italic leading-none text-accent">S·P</span>
          <span className="label hidden sm:inline">{SITE.name}</span>
        </a>
        <HeaderString />
        <SoundToggle className="shrink-0" />
        <a href="#contact" onClick={(e) => scrollToId(e, "#contact")} className="label hidden shrink-0 lg:inline">
          <span className="ulink">Say hello</span>
        </a>
      </div>
    </header>
  );
}
