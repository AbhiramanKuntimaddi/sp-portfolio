"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SWARAS } from "@/lib/content";
import { resonance, tuningAt } from "@/lib/state/resonance";
import { scrollToSection } from "@/lib/scroll";

const WIDTH = 44;
const MID = WIDTH / 2;
const VB_H = 1000; // the string's viewBox height; it stretches to whatever height the screen allows

/*
 * The instrument, centred in the right margin (large screens only, clear of the copy):
 *  - top: the current swara, and where it sits in the octave (02/08);
 *  - middle: one string, fixed at both ends. It holds a standing wave with
 *    one loop per step up the scale, is plucked by every new chapter and every
 *    note of the music, and sways while you bow. A brass bead rides it to
 *    mark your place in the octave. Hover the string to see a chapter; click
 *    to travel there;
 *  - bottom: the live readout — frequency and the plate's mode — set vertically.
 */
export default function SwaraRail() {
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const beadRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const hzRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const POINTS = 90;
    const last = SWARAS.length - 1;
    let active = -1;
    let lastPulse = 0;
    let ring = 0;
    let ringPhase = 0;
    let bow = 0;
    let t = 0;
    let frame = 0;

    const draw = (_time: number, dt: number) => {
      t += dt;
      frame++;
      const now = Math.round(resonance.swara);
      if (now !== active) {
        if (active !== -1) {
          ring = 7;
          ringPhase = 0;
        }
        active = now;
        const s = SWARAS[now];
        if (noteRef.current) noteRef.current.textContent = s.name;
        if (chapterRef.current) chapterRef.current.textContent = `${String(now + 1).padStart(2, "0")}/${String(last + 1).padStart(2, "0")}`;
      }
      if (resonance.pulse > lastPulse + 0.15) ring = Math.max(ring, 4);
      lastPulse = resonance.pulse;
      ring *= Math.exp(-dt / 800);
      ringPhase += dt * 0.03;
      bow += ((resonance.bowing ? 4 : 0) - bow) * Math.min(1, dt / 220);

      // The wave: x offset along the string, u = 0 at the top to 1 at the bottom.
      const loops = Math.max(1, resonance.swara + 1);
      const rest = 0.5 + resonance.level * 3.5 + resonance.morph * 1.5;
      const a = rest * Math.cos(t * 0.002) + ring * Math.cos(ringPhase) + bow * Math.sin(t * 0.017);
      const offset = (u: number) => Math.sin(loops * Math.PI * u) * a;

      if (pathRef.current) {
        let d = "";
        for (let i = 0; i <= POINTS; i++) {
          const u = i / POINTS;
          d += `${i ? "L" : "M"}${(MID + offset(u)).toFixed(2)} ${(u * VB_H).toFixed(1)}`;
        }
        pathRef.current.setAttribute("d", d);
      }

      // The bead rides the string at your place in the octave.
      if (beadRef.current && svgRef.current) {
        const u = Math.min(Math.max(resonance.swara / last, 0), 1);
        const h = svgRef.current.clientHeight;
        // The string is drawn in 44 viewBox units; scale its sway to the rail's real width.
        const sx = svgRef.current.clientWidth / WIDTH;
        beadRef.current.style.transform = `translate(${(offset(u) * sx).toFixed(2)}px, ${(u * h).toFixed(1)}px)`;
      }

      if (frame % 3 === 0) {
        const tune = tuningAt(resonance.swara);
        if (hzRef.current) hzRef.current.textContent = tune.hz.toFixed(2).padStart(6, "0");
        if (modeRef.current) modeRef.current.textContent = `${tune.n.toFixed(2)} : ${tune.m.toFixed(2)}`;
      }
    };
    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  });

  return (
    <aside
      aria-label="Chapters"
      className="fixed right-[calc(var(--grid-margin)/2)] top-1/2 z-40 hidden translate-x-1/2 -translate-y-1/2 flex-col items-center gap-7 lg:flex"
      style={{ width: `${WIDTH / 16}rem` }}
    >
      {/* Top: the note, and its place in the octave. */}
      <p className="flex flex-col items-center gap-4 pt-2 text-center">
        <span ref={noteRef} className="font-display text-lg leading-none text-accent">
          Sa
        </span>
        <span ref={chapterRef} className="label tabular-nums text-muted">
          01/08
        </span>
      </p>

      {/* Middle: the string, with the bead and an invisible fret per chapter. */}
      <div className="relative h-[min(30vh,16.25rem)]" style={{ width: `${WIDTH / 16}rem` }}>
        <svg
          ref={svgRef}
          aria-hidden="true"
          viewBox={`0 0 ${WIDTH} ${VB_H}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-foreground/40"
        >
          <path
            ref={pathRef}
            d={`M${MID} 0L${MID} ${VB_H}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span aria-hidden="true" className="absolute -top-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground/50" />
        <span aria-hidden="true" className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground/50" />
        <span
          ref={beadRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 ml-[-3.5px] mt-[-3.5px] size-1.75 rounded-full bg-accent"
        />
        <nav aria-label="Jump to a chapter" className="absolute inset-0">
          <ol className="flex h-full flex-col justify-between">
            {SWARAS.map((s) => (
              <li key={s.id} className="group/fret relative h-0">
                <button
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  aria-label={`${s.name} — ${s.label}`}
                  className="absolute inset-x-0 -top-3 block h-6 w-full cursor-pointer"
                >
                  <span className="pointer-events-none absolute right-full top-1/2 mr-1 flex -translate-y-1/2 items-baseline gap-2 whitespace-nowrap bg-background px-2 py-1 opacity-0 transition-opacity duration-300 group-hover/fret:opacity-100">
                    <span className="font-display text-base leading-none text-accent">{s.name}</span>
                    <span className="label">{s.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Bottom: the live readout, set vertically. */}
      <p aria-hidden="true" className="label flex items-center gap-3 text-muted [writing-mode:vertical-rl]">
        <span>
          <span ref={hzRef} className="tabular-nums text-foreground">220.00</span> Hz
        </span>
        <span className="block h-5 w-px bg-line" />
        <span>
          mode <span ref={modeRef} className="tabular-nums">3.00 : 5.00</span>
        </span>
      </p>
    </aside>
  );
}
