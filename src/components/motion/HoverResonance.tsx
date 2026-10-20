"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { resonance } from "@/lib/state/resonance";
import { hoverTone } from "@/lib/audio/sound";
import { isEntered } from "@/lib/state/stage";

const INTERACTIVE = "a, button, [data-hover]";

/*
 * Sympathetic resonance. Hovering anything interactive (mouse or trackpad):
 *  - the sand nearby gathers into a soft, glowing ring around it, as if the
 *    plate were resonating under the cursor (see the uRing uniform);
 *  - with sound on, a quiet harmonic of the current note swells and fades.
 * Moving away lets the ring dissolve back into the pattern.
 */
export default function HoverResonance() {
  useEffect(() => {
    let current: HTMLElement | null = null;

    const enter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !isEntered()) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(INTERACTIVE);
      if (!el || el === current || el.closest(".preloader")) return;
      current = el;
      resonance.hoverEl = el;
      gsap.to(resonance, { hoverStrength: 1, duration: 0.55, ease: "power2.out", overwrite: true });
      const r = el.getBoundingClientRect();
      hoverTone(((r.left + r.width / 2) / window.innerWidth) * 2 - 1);
    };

    const leave = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget as Node | null;
      if (to && current.contains(to)) return;
      const was = current;
      current = null;
      gsap.to(resonance, {
        hoverStrength: 0,
        duration: 0.9,
        ease: "power2.inOut",
        overwrite: true,
        onComplete: () => {
          if (resonance.hoverEl === was) resonance.hoverEl = null;
        },
      });
    };

    document.addEventListener("pointerover", enter);
    document.addEventListener("pointerout", leave);
    return () => {
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      resonance.hoverEl = null;
      resonance.hoverStrength = 0;
    };
  }, []);

  return null;
}
