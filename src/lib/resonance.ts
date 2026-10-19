import { SA_HZ, SWARAS } from "@/lib/content";

/*
 * Shared, mutable state for everything that moves with the music: the scroll
 * conductor writes it, the sand plate, the strings and the readout read it each
 * frame. Plain object on purpose — no React renders in the hot path.
 */
export const resonance = {
  /** Continuous position in the octave: 0 = Sa … 7 = upper Sa. */
  swara: 0,
  /** 0 → 1 → 0 while crossing from one swara to the next. */
  morph: 0,
  /** Lenis scroll velocity (px per frame, signed). */
  velocity: 0,
  /** Pointer in plate space (x scaled by aspect, y up), and how hard it's moving. */
  pointer: { x: 0, y: 0, force: 0 },
  /** Music loudness, 0–1, from the analyser. */
  level: 0,
  /** Spikes on every plucked note, then decays. */
  pulse: 0,
  /** A strike of the whole plate (entering the site): decays slowly. */
  burst: 0,
  /** 0–1: how strongly the sand is drawn into her name instead of the pattern. */
  form: 0,
  /** 0–1: on release, how strongly grains fly to their own spot across the plate. */
  scatter: 0,
  /** True while the visitor presses and holds to bow the plate. */
  bowing: false,
  /** The element under the cursor, if it's interactive: the sand rings around it. */
  hoverEl: null as HTMLElement | null,
  /** 0–1: how strongly the sand gathers into that ring (eased in and out). */
  hoverStrength: 0,
  /** The visitor's choice (on by default). */
  soundOn: true,
  /** True once the browser has let audio start (it needs a click, tap or key first). */
  audible: false,
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Tuning {
  name: string;
  hz: number;
  n: number;
  m: number;
  sign: number;
  intensity: number;
}

/** The plate's tuning at any point between two swaras. */
export function tuningAt(pos: number): Tuning {
  const max = SWARAS.length - 1;
  const p = Math.min(Math.max(pos, 0), max);
  const i = Math.min(Math.floor(p), max - 1);
  const t = smooth(p - i);
  const a = SWARAS[i];
  const b = SWARAS[i + 1];
  return {
    name: (t < 0.5 ? a : b).name,
    hz: SA_HZ * lerp(a.ratio, b.ratio, t),
    n: lerp(a.mode[0], b.mode[0], t),
    m: lerp(a.mode[1], b.mode[1], t),
    sign: lerp(a.mode[2], b.mode[2], t),
    intensity: lerp(a.intensity, b.intensity, t),
  };
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Tell the toggles that soundOn or audible changed. */
export function soundChanged() {
  listeners.forEach((l) => l());
}

export function onSound(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
