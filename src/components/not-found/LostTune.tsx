"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import {
  initSound,
  LOST_LOOP_SECONDS,
  nextWrongNote,
  resolveHome,
  setMode,
  setSoundOn,
  subscribeWrongNote,
  wrongNote,
} from "@/lib/audio/sound";
import { SWARAS } from "@/lib/content";
import { resonance } from "@/lib/state/resonance";
import { isEntered, markEntered } from "@/lib/state/stage";
import EnterModal from "@/components/entry/EnterModal";

/**
 * The 404's welcome and score. Like the home page it asks first, in the same
 * modal; the page waits behind it (data-gated), and the choice starts the
 * lost scale — or doesn't.
 */
export function LostTune() {
  const root = useRef<HTMLDivElement>(null);
  const beginRef = useRef<HTMLButtonElement>(null);
  const chosen = useRef(false);
  const [gone, setGone] = useState(() => typeof window !== "undefined" && isEntered());

  useEffect(() => {
    setMode("lost");
    const stopSound = initSound();
    // In silence the wrong notes still move on, in time with the loop the
    // music would play; with sound on, the music moves them itself.
    const silent = window.setInterval(() => {
      if (!resonance.audible) nextWrongNote();
    }, LOST_LOOP_SECONDS * 1000);
    const stop = () => {
      stopSound();
      window.clearInterval(silent);
    };
    if (isEntered()) return stop;
    // The inline script in not-found.tsx sets this on a fresh load; a client
    // navigation here needs it set too.
    document.documentElement.dataset.stage = "loading";
    const ask = gsap.context(() => {
      gsap.to("[data-pre='scrim']", { autoAlpha: 1, duration: 0.8, delay: 0.35, ease: "power2.out" });
      gsap.fromTo(
        "[data-pre='modal']",
        { y: 18, scale: 0.97 },
        {
          y: 0,
          scale: 1,
          duration: 0.9,
          delay: 0.35,
          ease: "power3.out",
          onStart: () => beginRef.current?.focus({ preventScroll: true }),
        },
      );
    }, root);
    return () => {
      stop();
      ask.revert();
      setMode("site");
    };
  }, []);

  const choose = (withSound: boolean) => {
    if (chosen.current) return;
    chosen.current = true;
    // Inside the click, so the browser lets the lost scale start.
    setSoundOn(withSound);
    const el = root.current;
    if (!el) return;
    gsap.to(el.querySelector("[data-pre='modal']"), { autoAlpha: 0, y: -12, duration: 0.5, ease: "power2.in" });
    gsap.to(el.querySelector("[data-pre='scrim']"), {
      autoAlpha: 0,
      duration: 0.8,
      ease: "power2.out",
      onStart: markEntered,
      onComplete: () => setGone(true),
    });
  };

  if (gone) return null;
  return (
    <div ref={root}>
      <EnterModal beginRef={beginRef} onChoose={choose} note="Even this page has its own tune." />
    </div>
  );
}

/**
 * Names the wrong note of the pass playing now — "This time it's Ma, 42 cents
 * flat." — and changes with every pass. Picked in the browser, so the server
 * renders nothing here.
 */
export function WrongNoteLine({ className = "" }: { className?: string }) {
  const note = useSyncExternalStore(subscribeWrongNote, wrongNote, () => null);
  if (!note) return null;
  const name = note.index === SWARAS.length - 1 ? "the upper Sa" : SWARAS[note.index].name;
  return (
    <span aria-live="polite" className={className}>
      <span key={`${note.index}${note.cents}`} className="animate-[note-in_0.8s_ease-out]">
        This time it’s {name}, {Math.abs(note.cents)} cents {note.cents < 0 ? "flat" : "sharp"}.
      </span>
    </span>
  );
}

/** "Return to Sa": with sound on, the scale finally lands before you go home. */
export function ReturnToSa({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    // A plain <a> on purpose: going home is a full page load (see below), not a client navigation.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
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
