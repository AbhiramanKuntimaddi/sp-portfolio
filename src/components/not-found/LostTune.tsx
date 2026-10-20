"use client";

import { useEffect } from "react";
import { initSound, resolveHome, setMode, tryAutoplay } from "@/lib/sound";
import { resonance } from "@/lib/resonance";

/**
 * The 404's score: switches the strings to the lost scale and starts it on the
 * visitor's first click, tap or key if the browser won't autoplay it.
 */
export function LostTune() {
  useEffect(() => {
    setMode("lost");
    const stop = initSound({ anyGesture: true });
    tryAutoplay();
    return () => {
      stop();
      setMode("site");
    };
  }, []);
  return null;
}

/** "Return to Sa": with sound on, the scale finally lands before you go home. */
export function ReturnToSa({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <a
      href="/"
      className={className}
      onClick={async (e) => {
        if (!resonance.audible || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        await resolveHome();
        // A full load, so home starts clean: preloader, sand, the lot.
        window.location.assign("/");
      }}
    >
      {children}
    </a>
  );
}
