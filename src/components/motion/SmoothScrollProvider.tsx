"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis } from "@/lib/smoothScroll";

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

// Lets the Design Lab's motion-speed control slow GSAP down too (dev only).
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as { gsap: typeof gsap }).gsap = gsap;
}

/*
 * Lenis owns the scroll. It runs first on GSAP's ticker (priority), so
 * ScrollTrigger and the conductor always read this frame's position, never
 * the last one.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.075,
      wheelMultiplier: 0.9,
      smoothWheel: !reduced,
      syncTouch: false,
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf, false, true);
    gsap.ticker.lagSmoothing(0);
    setLenis(lenis);

    return () => {
      setLenis(null);
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
