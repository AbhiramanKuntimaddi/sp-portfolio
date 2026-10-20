import type { Tuning } from "./ragas";

/*
 * Tuning for the preloader's raga and drone (the PRELOAD_TUNING switch in
 * ./preload.ts).
 *
 * "classical": each swara at the pure ratio to Sa that Carnatic music sings
 * against the tambura, so every note sits still against the Sa–Pa drone with
 * no beating. "equal": the piano's equal temperament, every semitone the same
 * size, where Ga and Ni are noticeably sharp of the pure third and seventh.
 *
 * The engine works in semitones above Sa; a tuned swara is simply a
 * fractional semitone (Pa = 7.02, G₃ = 3.86), so every instrument and the
 * drone follow it without knowing which tuning is in use.
 */

/** The pure ratio to Sa of each of the twelve swara positions, Sa to N₃. */
const SHRUTI = [
  1, //       S
  16 / 15, // R₁
  9 / 8, //   R₂
  6 / 5, //   G₂
  5 / 4, //   G₃
  4 / 3, //   M₁
  45 / 32, // M₂
  3 / 2, //   P
  8 / 5, //   D₁
  5 / 3, //   D₂
  9 / 5, //   N₂
  15 / 8, //  N₃
];

/**
 * A swara's pitch in semitones above Sa, in the chosen tuning. Whole
 * semitones only; anything fractional (a deliberate bend) is left alone.
 */
export function tune(st: number, tuning: Tuning): number {
  if (tuning === "equal" || !Number.isInteger(st)) return st;
  const octave = Math.floor(st / 12);
  const position = st - octave * 12;
  return octave * 12 + 12 * Math.log2(SHRUTI[position]);
}
