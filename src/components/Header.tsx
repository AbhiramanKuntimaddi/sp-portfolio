"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/content";
import { getLenis, glide, withLenis } from "@/lib/smoothScroll";
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

/*
 * The header gets out of the way: it rests over the hero, slides up as you
 * read down the page, and returns — on a soft fade to the page — the moment
 * you scroll back up (or tab into it).
 */
export default function Header() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let lastY = 0;
    let travel = 0;
    const set = (hidden: boolean, solid: boolean) => {
      const el = ref.current;
      if (!el) return;
      el.toggleAttribute("data-hidden", hidden);
      el.toggleAttribute("data-solid", solid);
    };
    let off = () => {};
    const stop = withLenis((lenis) => {
      off();
      off = lenis.on("scroll", () => {
        const y = lenis.scroll;
        const dy = y - lastY;
        lastY = y;
        // Count travel in one direction, so a twitch of the wheel doesn't flicker it.
        travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
        if (y < 120) set(false, y > 24);
        else if (travel > 12) set(true, true);
        else if (travel < -12) set(false, true);
      });
    });
    return () => {
      stop();
      off();
    };
  }, []);

  return (
    <header
      ref={ref}
      onFocusCapture={() => ref.current?.removeAttribute("data-hidden")}
      className="group/header fixed inset-x-0 top-0 z-40 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] data-hidden:-translate-y-full"
    >
      {/* The fade behind it when it returns over the copy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[170%] bg-linear-to-b from-background via-background/85 to-transparent opacity-0 transition-opacity duration-700 group-data-solid/header:opacity-100"
      />
      <div className="relative mx-auto flex max-w-(--grid-max) items-center gap-5 px-gutter py-5 lg:gap-8 lg:py-7">
        <a href="#top" onClick={(e) => scrollToId(e, "#top")} className="flex shrink-0 items-baseline gap-3">
          <span className="font-display text-xl italic leading-none text-accent">S·P</span>
          <span className="label hidden sm:inline">{SITE.name}</span>
        </a>
        <span className="flex-1" />
        <SoundToggle className="shrink-0" />
        <a href="#contact" onClick={(e) => scrollToId(e, "#contact")} className="label hidden shrink-0 lg:inline">
          <span className="ulink">Say hello</span>
        </a>
      </div>
    </header>
  );
}
