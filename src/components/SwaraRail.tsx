"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SWARAS } from "@/lib/content";
import { resonance, tuningAt } from "@/lib/resonance";
import { scrollToId } from "./Header";

/*
 * Margin instruments. They live in the page margins (large screens only), so
 * they never sit over the copy:
 *  - right edge: the scale as a slim staff of eight ticks. The active tick
 *    lengthens in brass with its swara beside it; hover names the chapter;
 *    click travels there.
 *  - left edge: the plate's live readout, set vertically up the margin.
 */
export default function SwaraRail() {
  const staffRef = useRef<HTMLOListElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const hzRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const items = staffRef.current ? Array.from(staffRef.current.children) : [];
    let active = -1;
    let frame = 0;
    const update = () => {
      if (frame++ % 3) return;
      const t = tuningAt(resonance.swara);
      if (noteRef.current) noteRef.current.textContent = t.name;
      if (hzRef.current) hzRef.current.textContent = t.hz.toFixed(2).padStart(6, "0");
      if (modeRef.current) modeRef.current.textContent = `${t.n.toFixed(2)} : ${t.m.toFixed(2)}`;
      const now = Math.round(resonance.swara);
      if (now !== active) {
        active = now;
        items.forEach((el, i) => el.toggleAttribute("data-active", i === now));
      }
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  });

  return (
    <>
      <nav aria-label="Chapters" className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <ol ref={staffRef} className="flex flex-col items-end">
          {SWARAS.map((s) => (
            <li key={s.id} className="group/tick relative">
              <a
                href={`#${s.id}`}
                onClick={(e) => scrollToId(e, `#${s.id}`)}
                aria-label={`${s.name} — ${s.label}`}
                className="flex h-7 items-center justify-end gap-2 text-muted transition-colors duration-500 hover:text-foreground group-data-active/tick:text-accent"
              >
                {/* Chapter name: only on hover, on its own ground so it never fights the copy. */}
                <span className="label pointer-events-none absolute right-full mr-3 whitespace-nowrap bg-background px-2 py-1 opacity-0 transition-opacity duration-300 group-hover/tick:opacity-100">
                  {s.label}
                </span>
                <span className="w-7 text-right font-display text-base italic leading-none opacity-0 transition-opacity duration-500 group-hover/tick:opacity-100 group-data-active/tick:opacity-100">
                  {s.name}
                </span>
                <span className="block h-px w-3 bg-current transition-[width] duration-700 ease-out group-hover/tick:w-5 group-data-active/tick:w-6" />
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-8 left-3 z-40 hidden [writing-mode:vertical-rl] lg:block"
        style={{ transform: "rotate(180deg)" }}
      >
        <p className="label flex items-center gap-3 text-muted">
          <span ref={noteRef} className="font-display text-lg normal-case italic tracking-normal text-accent">
            Sa
          </span>
          <span>
            <span ref={hzRef} className="tabular-nums text-foreground">220.00</span> Hz
          </span>
          <span className="block h-6 w-px bg-line" />
          <span>
            mode <span ref={modeRef} className="tabular-nums">3.00 : 5.00</span>
          </span>
        </p>
      </div>
    </>
  );
}
