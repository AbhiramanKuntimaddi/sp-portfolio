"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initSound, resolveHome, setMode } from "@/lib/sound";
import { resonance } from "@/lib/resonance";

/**
 * The 404's score: switches the strings to the lost scale and starts it on the
 * visitor's first click, tap or key (browsers need one), unless they've
 * turned sound off before.
 */
export function LostTune() {
  useEffect(() => {
    setMode("lost");
    const stop = initSound({ anyGesture: true });
    return () => {
      stop();
      setMode("site");
    };
  }, []);
  return null;
}

/** "Return to Sa": with sound on, the scale finally lands before you go home. */
export function ReturnToSa({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <a
      href="/"
      className={className}
      onClick={async (e) => {
        if (!resonance.audible || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        await resolveHome();
        router.push("/");
      }}
    >
      {children}
    </a>
  );
}
