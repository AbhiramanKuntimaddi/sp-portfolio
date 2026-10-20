"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { honours } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/*
 * Ma — recognition. Editorial rows; with a mouse, the photo for a row floats
 * beside the cursor. On touch screens (no hover) the rows tap open one at a
 * time, the photo unfolding beneath its row.
 */
export default function Honours() {
  const scope = useRef<HTMLElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  // Touch screens (iPad, phones): one row's photo open at a time, on tap.
  const [open, setOpen] = useState<number | null>(null);

  const { contextSafe } = useGSAP({ scope });

  // contextSafe only wraps these handlers; the refs are read when they run, not during render.
  /* eslint-disable react-hooks/refs */
  const show = contextSafe((i: number | null) => {
    const el = floatRef.current;
    if (!el) return;
    const frames = Array.from(el.children) as HTMLElement[];
    frames.forEach((f, j) => gsap.to(f, { autoAlpha: j === i ? 1 : 0, duration: 0.5, ease: "power2.out" }));
    gsap.to(el, { scale: i === null ? 0.85 : 1, duration: 0.6, ease: "expo.out" });
  });

  const follow = contextSafe((e: React.PointerEvent) => {
    const el = floatRef.current;
    if (!el || e.pointerType !== "mouse") return;
    gsap.to(el, { x: e.clientX + 32, y: e.clientY - el.offsetHeight / 2, duration: 0.9, ease: "expo.out" });
  });
  /* eslint-enable react-hooks/refs */

  return (
    <section id="honours" ref={scope} className="relative z-10 py-32 lg:py-48" onPointerMove={follow}>
      <div data-exit className="mx-auto max-w-(--grid-max) px-gutter">
        <SwaraMark index={3} />
        <h2 className="headline title mt-10 font-heading" data-split="chars" data-cue data-delay="0.15">
          Recognition
        </h2>
        <p className="mt-8 max-w-md text-muted" data-reveal>
          Awards, jury work and talks.
        </p>

        <ul className="mt-20 border-b border-line lg:mt-24" onPointerLeave={() => show(null)} data-strings>
          {honours.map((h, i) => {
            const isOpen = open === i;
            return (
              <li
                key={h.title}
                data-string
                onPointerEnter={(e) => e.pointerType === "mouse" && show(h.img ? i : null)}
                data-reveal
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`honour-${i}`}
                    className="grid w-full gap-4 py-9 text-left fine:cursor-default lg:grid-cols-12 lg:items-baseline lg:gap-8 lg:py-11"
                  >
                    <span className="label flex items-center justify-between text-accent lg:col-span-2">
                      {h.year}
                      {/* On touch, a quiet + that turns to × when open. */}
                      <span
                        aria-hidden="true"
                        className={`hidden font-display text-2xl leading-none text-foreground transition-transform duration-500 touch:inline lg:hidden ${isOpen ? "rotate-45" : ""}`}
                      >
                        +
                      </span>
                    </span>
                    <span data-string-title className="block font-heading text-2xl leading-tight tracking-tight sm:text-3xl lg:col-span-7 lg:text-[2.1rem]">
                      {h.title}
                    </span>
                    <span className="flex items-baseline justify-between gap-6 text-muted lg:col-span-3">
                      {h.by}
                      <span
                        aria-hidden="true"
                        className={`hidden shrink-0 font-display text-2xl leading-none text-foreground transition-transform duration-500 lg:touch:inline ${isOpen ? "rotate-45" : ""}`}
                      >
                        +
                      </span>
                    </span>
                  </button>
                </h3>
                {h.img && (
                  <div
                    id={`honour-${i}`}
                    role="region"
                    aria-label={h.title}
                    className="grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] fine:hidden"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="relative mb-9 aspect-4/3 w-full overflow-hidden rounded-xs sm:aspect-16/10">
                        <Image
                          src={h.img}
                          alt={h.alt}
                          fill
                          sizes="100vw"
                          className={`object-cover transition-[transform,opacity] duration-1400 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div
        ref={floatRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-30 hidden aspect-3/4 w-[22vw] max-w-80 fine:block"
      >
        {honours.map((h) =>
          h.img ? (
            <div key={h.title} className="invisible absolute inset-0 overflow-hidden rounded-xs opacity-0">
              <Image src={h.img} alt="" fill sizes="22vw" className="object-cover" />
            </div>
          ) : (
            <div key={h.title} className="invisible absolute inset-0" />
          ),
        )}
      </div>
    </section>
  );
}
