"use client";

import { useEffect, useRef } from "react";
import { SITE } from "@/lib/content";
import { scrollToSection, withLenis } from "@/lib/scroll";
import SoundToggle from "./SoundToggle";

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
        {/* The deck's frame: a small bold name on the left, quiet actions on the right. */}
        <button
          type="button"
          onClick={() => scrollToSection("top")}
          className="shrink-0 cursor-pointer font-heading text-sm font-bold tracking-tight"
        >
          {SITE.name}
        </button>
        <span className="flex-1" />
        <SoundToggle className="shrink-0" />
        <button
          type="button"
          onClick={() => scrollToSection("contact")}
          className="label group hidden shrink-0 cursor-pointer lg:inline"
        >
          <span className="ulink">Say hello</span> <span className="arrow" data-dir="e" aria-hidden="true">→</span>
        </button>
      </div>
    </header>
  );
}
