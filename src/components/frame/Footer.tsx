"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { SA_HZ, SITE, SWARAS } from "@/lib/content";
import { playSwara } from "@/lib/audio/sound";
import { scrollToSection } from "@/lib/scroll";

/*
 * The site footer: a slim solid band — the page's base, set apart from the
 * open, sand-lit chapters above it (Contact included). Two things only:
 *  - the string: the whole octave laid along it. Tap a swara and it plays,
 *    or run a finger (or the mouse, held down) along it and every swara you
 *    cross sounds in turn, like a glissando. The string shakes from where it
 *    was played, and the sand answers;
 *  - one row: copyright, the credit (signed in the script), back to Sa.
 */

const W = 1000;
const H = 40;
const MID = H / 2;

export default function Footer() {
  const lineRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const shake = useRef<gsap.core.Tween | null>(null);

  useEffect(() => () => void shake.current?.kill(), []);

  // Strumming: the swara under the pointer, and the last one played.
  const strum = useRef<number | null>(null);
  const swaraAt = (el: HTMLElement, clientX: number) => {
    const r = el.getBoundingClientRect();
    return Math.min(SWARAS.length - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * SWARAS.length)));
  };
  const sound = (i: number, strength: number) => {
    playSwara(i);
    pluck(((i + 0.5) / SWARAS.length) * W, strength);
  };

  // A plucked string's shape: pulled to a point at `x`, straight either side,
  // swinging back and forth and dying away.
  const pluck = (x: number, strength: number) => {
    const line = lineRef.current;
    const glow = glowRef.current;
    if (!line || !glow) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    shake.current?.kill();
    const state = { t: 0 };
    const amp = 13 * strength;
    shake.current = gsap.to(state, {
      t: 1.6,
      duration: 1.6,
      ease: "none",
      onUpdate: () => {
        const y = amp * Math.exp(-state.t * 2.6) * Math.cos(2 * Math.PI * 6 * state.t);
        const d = `M0 ${MID} L${x} ${MID + y} L${W} ${MID}`;
        line.setAttribute("d", d);
        glow.setAttribute("d", d);
        glow.style.opacity = String(Math.min(1, Math.abs(y) / 4));
      },
      onComplete: () => {
        line.setAttribute("d", `M0 ${MID} L${W} ${MID}`);
        glow.style.opacity = "0";
      },
    });
  };

  return (
    <footer
      data-gated
      // The page's own warm black, a shade deeper, fading in from clear at the
      // top to solid at the bottom: the sand thins out behind the string and
      // is gone by the last row.
      className="relative z-10 bg-linear-to-b from-transparent to-[color-mix(in_oklab,var(--color-background)_82%,black)] to-70% px-gutter pt-16 pb-6 lg:pt-20 lg:pb-8"
    >
      <div className="mx-auto max-w-(--grid-max)">
        {/* The string, with the octave along it. */}
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full overflow-visible"
            aria-hidden="true"
          >
            <path ref={lineRef} d={`M0 ${MID} L${W} ${MID}`} fill="none" stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <path
              ref={glowRef}
              d={`M0 ${MID} L${W} ${MID}`}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              style={{ opacity: 0 }}
            />
          </svg>
          <ul
            className="relative grid touch-pan-y grid-cols-8 select-none"
            aria-label="Play the scale"
            onPointerDown={(e) => {
              const i = swaraAt(e.currentTarget, e.clientX);
              strum.current = i;
              e.currentTarget.setPointerCapture(e.pointerId);
              sound(i, 1);
            }}
            onPointerMove={(e) => {
              if (strum.current === null) return;
              const i = swaraAt(e.currentTarget, e.clientX);
              if (i === strum.current) return;
              // Every swara crossed sounds, even on a quick swipe.
              const step = i > strum.current ? 1 : -1;
              for (let k = strum.current + step; k !== i + step; k += step) sound(k, 0.8);
              strum.current = i;
            }}
            onPointerUp={() => (strum.current = null)}
            onPointerCancel={() => (strum.current = null)}
          >
            {SWARAS.map((s, i) => {
              return (
                <li key={s.id} className="flex justify-center">
                  <button
                    type="button"
                    data-no-halo
                    data-no-tone
                    aria-label={`Play ${s.name}, ${Math.round(SA_HZ * s.ratio)} Hz`}
                    // Pointers play on press (above); this is for the keyboard.
                    onClick={(e) => e.detail === 0 && sound(i, 1)}
                    className="group relative flex h-20 w-full cursor-pointer flex-col items-center justify-start pt-1"
                  >
                    {/* Phones get the short letters (S R G M…): the script names'
                        swashes collided at eight to a phone's width. */}
                    <span className="label text-base leading-none text-muted transition-colors duration-300 group-hover:text-accent group-focus-visible:text-accent md:hidden">
                      {s.short}
                    </span>
                    <span className="hidden font-display text-2xl leading-none text-muted transition-colors duration-300 group-hover:text-accent group-focus-visible:text-accent md:inline">
                      {s.name}
                    </span>
                    {/* Its frequency, shown while hovered. */}
                    <span className="label mt-1.5 text-[0.65rem] text-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
                      {Math.round(SA_HZ * s.ratio)} Hz
                    </span>
                    {/* The fret: a small mark where the swara sits on the string. */}
                    <span className="mt-auto mb-4 h-2 w-px bg-line transition-colors duration-300 group-hover:bg-accent" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="label mt-3 text-center text-muted touch:hidden">Click a swara, or hold and slide along the string.</p>
        <p className="label mt-3 hidden text-center text-muted touch:block">Tap a swara, or slide a finger along the string.</p>

        <div className="mt-8 grid items-center gap-3 border-t border-line pt-5 sm:grid-cols-3">
          <p className="label text-muted">
            © {new Date().getFullYear()} {SITE.name} · {SITE.city}
          </p>
          <a
            href={SITE.credit.url}
            target="_blank"
            rel="noreferrer"
            className="label group flex w-fit items-center gap-2 text-muted sm:justify-self-center"
          >
            Website brought to life by
            {/* Signed in the script, at the size of a signature, not a title. */}
            <span className="translate-y-[0.08em] font-display text-[1.3rem] leading-none text-foreground transition-colors duration-300 group-hover:text-accent">
              {SITE.credit.name}
            </span>
          </a>
          <button
            type="button"
            onClick={() => scrollToSection("top")}
            className="label group w-fit cursor-pointer text-foreground sm:justify-self-end"
          >
            <span className="ulink">Back to Sa</span> <span className="arrow" data-dir="n" aria-hidden="true">↑</span>
          </button>
        </div>
      </div>

    </footer>
  );
}
