"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SWARAS } from "@/lib/content";
import { resonance } from "@/lib/resonance";
import { scrollToId } from "./Header";

const ROW = 28; // px per chapter (h-7)
const PAD = 22; // string runs a little past the first and last tick
const HEIGHT = SWARAS.length * ROW + PAD * 2;
const WIDTH = 40;
const MID = WIDTH / 2;

/*
 * The string: one vertical string down the right margin (large screens only),
 * clear of the copy, with the eight chapters marked along it like frets. It
 * holds a standing wave with one loop per step up the scale (Sa = 1 … upper
 * Sa = 8); each new chapter plucks it and it rings down; notes from the music
 * pluck it gently; it sways for as long as you bow. The current chapter's
 * mark lengthens in brass; hover names it; click travels there. Each
 * section's own marker carries the note in the content, so nothing repeats.
 */
export default function SwaraRail() {
  const staffRef = useRef<HTMLOListElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useGSAP(() => {
    const items = staffRef.current ? Array.from(staffRef.current.children) : [];
    const POINTS = 80;
    let active = -1;
    let lastPulse = 0;
    let ring = 0;
    let ringPhase = 0;
    let bow = 0;
    let t = 0;

    const draw = (_time: number, dt: number) => {
      t += dt;
      const now = Math.round(resonance.swara);
      if (now !== active) {
        // A new chapter plucks the string hard (not on first paint).
        if (active !== -1) {
          ring = 7;
          ringPhase = 0;
        }
        active = now;
        items.forEach((el, i) => el.toggleAttribute("data-active", i === now));
      }
      // A note from the music plucks it gently.
      if (resonance.pulse > lastPulse + 0.15) ring = Math.max(ring, 4);
      lastPulse = resonance.pulse;

      ring *= Math.exp(-dt / 800);
      ringPhase += dt * 0.03;
      bow += ((resonance.bowing ? 4 : 0) - bow) * Math.min(1, dt / 220);

      const path = pathRef.current;
      if (!path) return;
      const loops = Math.max(1, resonance.swara + 1);
      const rest = 0.5 + resonance.level * 3.5 + resonance.morph * 1.5;
      const a = rest * Math.cos(t * 0.002) + ring * Math.cos(ringPhase) + bow * Math.sin(t * 0.017);
      let d = "";
      for (let i = 0; i <= POINTS; i++) {
        const u = i / POINTS;
        const x = MID + Math.sin(loops * Math.PI * u) * a;
        d += `${i ? "L" : "M"}${x.toFixed(2)} ${(u * HEIGHT).toFixed(1)}`;
      }
      path.setAttribute("d", d);
    };
    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  });

  return (
    <nav
      aria-label="Chapters"
      className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      {/* The string, fixed at both ends like a real one. */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        className="pointer-events-none absolute inset-0 overflow-visible text-foreground/40"
      >
        <path ref={pathRef} d={`M${MID} 0L${MID} ${HEIGHT}`} fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx={MID} cy={0} r={1.5} className="fill-current" />
        <circle cx={MID} cy={HEIGHT} r={1.5} className="fill-current" />
      </svg>

      <ol ref={staffRef} className="absolute inset-x-0 flex flex-col" style={{ top: PAD }}>
        {SWARAS.map((s) => (
          <li key={s.id} className="group/tick relative">
            <a
              href={`#${s.id}`}
              onClick={(e) => scrollToId(e, `#${s.id}`)}
              aria-label={`${s.name} — ${s.label}`}
              className="flex items-center justify-center text-muted transition-colors duration-500 hover:text-foreground group-data-active/tick:text-accent"
              style={{ height: ROW }}
            >
              {/* Swara and chapter only on hover, on their own ground so they never fight the copy. */}
              <span className="pointer-events-none absolute right-full mr-1 flex items-baseline gap-2 whitespace-nowrap bg-background px-2 py-1 opacity-0 transition-opacity duration-300 group-hover/tick:opacity-100">
                <span className="font-display text-base italic leading-none text-accent">{s.name}</span>
                <span className="label">{s.label}</span>
              </span>
              <span className="block h-px w-2 bg-current transition-[width] duration-700 ease-out group-hover/tick:w-4 group-data-active/tick:w-6" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
