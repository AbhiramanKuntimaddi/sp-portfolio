"use client";

import { useEffect, useState } from "react";
import { onSound, resonance } from "@/lib/state/resonance";
import { setSoundOn } from "@/lib/audio/sound";

/** "Sound on / off": four small bars that move while music plays. */
export default function SoundToggle({ className = "" }: { className?: string }) {
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
      <span className="flex h-3 items-end gap-0.75" aria-hidden="true">
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
