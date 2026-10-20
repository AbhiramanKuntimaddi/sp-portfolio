/*
 * Playing like a person, not a sequencer. What made the ragas sound machine-
 * like was mostly here: every note exactly on the grid, every note equally
 * loud, and gamakas drawn with straight lines (a kampita was a triangle wave,
 * the same every time). This file shapes a phrase before an instrument plays
 * it:
 *  - timing that breathes: a gentle start, notes a few milliseconds early or
 *    late, and a slowing as the phrase arrives on Sa;
 *  - dynamics: the samam and each anga leaned on, the arohana swelling to the
 *    top and the avarohana easing home, never two notes quite alike;
 *  - gamakas as smooth curves: a jaaru eases out of the previous swara and
 *    settles with a touch of overshoot; a kampita sways two or three times
 *    above the note, each sway smaller, at a slightly different speed every
 *    time.
 */

/** A phrase as performed: when each note begins and how firmly it's played (0–1). */
export type Performance = { times: number[]; force: number[] };

/** Random in [-1, 1], weighted towards the middle (most deviations are small). */
const wobble = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;

/**
 * Shape a phrase. `beats` are each note's aksharas, `beat` the seconds per
 * akshara, `angas` the tala's parts (to find the samam and the anga starts),
 * and `rising` whether it's the arohana.
 */
export function perform(beats: number[], beat: number, at: number, angas: number[], rising: boolean): Performance {
  const n = beats.length;
  // Where each anga begins, in aksharas from the samam.
  const starts = angas.reduce<number[]>((list, a) => [...list, list[list.length - 1] + a], [0]).slice(0, -1);

  const times: number[] = [];
  const force: number[] = [];
  let t = at;
  let position = 0;
  for (let k = 0; k < n; k++) {
    // Settle into the pulse over the first notes, and slow into the last two.
    const settle = k === 0 ? 1.06 : k === 1 ? 1.03 : 1;
    const arrive = k === n - 2 ? 1.08 : k === n - 3 ? 1.04 : 1;
    const late = 0.012 * wobble();
    times.push(Math.max(k ? times[k - 1] + 0.04 : at, t + late));

    const onSamam = Math.abs(position) < 1e-6;
    const onAnga = starts.some((s) => Math.abs(s - position) < 1e-6);
    const contour = rising ? 0.08 + 0.14 * (k / Math.max(1, n - 1)) : 0.2 - 0.12 * (k / Math.max(1, n - 1));
    const accent = onSamam ? 0.14 : onAnga ? 0.07 : 0;
    force.push(Math.min(1, Math.max(0.45, 0.68 + contour + accent + 0.05 * wobble())));

    t += beats[k] * beat * settle * arrive;
    position += beats[k];
  }
  return { times, force };
}

const cents = (c: number) => Math.pow(2, c / 1200);
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/**
 * A gamaka as a smooth curve, written onto `param` with setValueCurveAtTime.
 * Values are multiples of `base` (a playback rate, or a frequency in Hz):
 * `from` is where the note slides in from (the previous swara), or null to
 * start on the note. It fills `span` seconds from `at`, and must not overlap
 * any other automation on the same param.
 */
export function gamaka(
  param: AudioParam,
  kind: "jaaru" | "kampita",
  at: number,
  span: number,
  base: number,
  from: number | null,
  random: () => number = Math.random,
) {
  const steps = Math.max(24, Math.round(span * 120));
  const curve = new Float32Array(steps);
  // The slide: a held start on the previous swara, then an eased glide in
  // the pitch (log) domain — fast in the middle, gentle at both ends.
  const hold = 0.08 + 0.04 * random();
  const land = (kind === "jaaru" ? 0.55 : 0.32) * (0.9 + 0.2 * random());
  const ratio = from === null ? 1 : from / base;
  // The sway: two or three cycles above the note, each smaller than the last.
  const swayFrom = land;
  const cycles = Math.max(2, Math.round(span * (1 - swayFrom) * (5.2 + 1.2 * random())));
  const depth = 38 * (0.85 + 0.3 * random());
  const overshoot = 7 * (0.6 + 0.8 * random());

  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    let v: number;
    if (x < hold) v = ratio;
    else if (x < land) v = Math.pow(ratio, 1 - smoother((x - hold) / (land - hold)));
    else v = 1;
    if (x >= land) {
      const y = (x - land) / (1 - land);
      if (kind === "kampita") {
        // 0 → depth → 0, cycles times, shrinking as it goes.
        const decay = 1 - 0.65 * y;
        v *= cents(depth * decay * (0.5 - 0.5 * Math.cos(2 * Math.PI * cycles * y)));
      } else if (from !== null) {
        // Arrive with a touch of overshoot, then settle.
        v *= cents(overshoot * Math.sin(Math.PI * Math.min(1, y * 1.6)) * (1 - y));
      }
    }
    curve[i] = base * v;
  }
  writeCurve(param, curve, at, span, base);
}

/**
 * Write a curve, or — if something else is already scheduled in that window
 * (a very quick note) — simply set the note's pitch, rather than throwing
 * and silencing the rest of the phrase.
 */
function writeCurve(param: AudioParam, curve: Float32Array<ArrayBuffer>, at: number, span: number, fallback: number) {
  try {
    param.setValueCurveAtTime(curve, at, span);
  } catch {
    param.setValueAtTime(fallback, at);
  }
}

/** How long a gamaka may take: inside its own note, never into the next. Null if too quick for one. */
export function gamakaSpan(t: number, next: number) {
  const room = next - t - 0.012;
  return room < 0.08 ? null : Math.min(0.62, room);
}

/**
 * A repeatable random sequence: the same seed gives the same "random" gamaka,
 * so two strings sounding one note (a mandolin's course) bend together.
 */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * For sustained voices: the small scoop a singer or violinist makes into a
 * plain note — from a little below, eased in over a few dozen milliseconds.
 */
export function scoop(param: AudioParam, at: number, base: number, from: number | null, room: number) {
  const span = Math.min(0.07 + 0.03 * Math.random(), room - 0.012);
  if (span < 0.03) {
    param.setValueAtTime(base, at);
    return;
  }
  const start = from === null ? base * cents(-22) : Math.max(Math.min(from, base * cents(20)), base * cents(-30));
  const steps = 16;
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) curve[i] = start * Math.pow(base / start, smoother(i / (steps - 1)));
  writeCurve(param, curve, at, span, base);
}
