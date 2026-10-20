import { SA_HZ, SWARAS } from "@/lib/content";
import { resonance, soundChanged } from "@/lib/state/resonance";
import { isEntered } from "@/lib/state/stage";
import { gamaka as shapeGamaka, gamakaSpan, perform, scoop, type Performance } from "./expression";
import {
  mandolinPluck,
  mandolinPhrase,
  nadaswaramPhrase,
  startSruti,
  startTambura,
  violinPhrase,
  warmMandolin,
  type Stage,
} from "./instruments";
import {
  aksharas,
  DRONE_NAMES,
  INSTRUMENT_NAMES,
  RAGAS,
  rhythmFor,
  TALAS,
  type Gamaka,
  type Raga,
  type RagaNote,
  type TalaName,
} from "./ragas";
import { PRELOAD_DRONE, PRELOAD_INSTRUMENT, PRELOAD_RAGA, PRELOAD_TALA, PRELOAD_TUNING } from "./preload";
import { SITE_BACKGROUND, SITE_INSTRUMENT } from "./site";
import { tune } from "./tuning";

/*
 * The score. Two layers of strings, all synthesised in the browser:
 *
 *  - A string-section pad (think a quiet violin/cello section, bowed): each
 *    chapter has its own chord, and the harmony moves as you scroll —
 *    I → V → vi → IV → I → ii → V7 → I in A major, ending where it began,
 *    an octave up.
 *  - A plucked string (between nylon guitar and harp) plays each chapter's
 *    note as you arrive: up the scale scrolling down, back down scrolling up,
 *    and every note in between as a quick arpeggio when you jump.
 *
 * Browsers only allow sound after a click, tap or key press, so "on" (the
 * default) starts on the visitor's first gesture.
 */

/** Chord voicings, in semitones from Sa (A3). One per chapter. */
const CHORDS: number[][] = [
  [-12, -5, 4, 11], //      Sa  · A maj7
  [-17, -10, -1, 9], //     Re  · E add9
  [-15, -8, 0, 7], //       Ga  · F♯m7
  [-19, -12, -3, 4], //     Ma  · D maj7
  [-17, -12, -8, 2], //     Pa  · A add9 over E
  [-10, -7, -3, 4], //      Dha · Bm add9
  [-17, -10, -1, 5], //     Ni  · E7, leaning home
  [-12, -5, 4, 11, 14], //  Ṡa  · A maj9, opened out
];

const hz = (semitones: number) => SA_HZ * Math.pow(2, semitones / 12);
/** Where earlier versions remembered a mute; now only cleared. */
const LEGACY_STORAGE_KEY = "spandana:sound";
const ARPEGGIO_GAP = 0.11;
/** How far ahead notes are scheduled: room for a busy main thread (WebGL, scroll). */
const LOOKAHEAD = 0.06;
/** A jump across many chapters plays at most this many notes on the way. */
const MAX_ARPEGGIO = 4;
/** The harmony changes once scrolling settles on a chapter, not at every one passed. */
const CHORD_SETTLE_MS = 320;

type Voice = { oscs: OscillatorNode[]; gain: GainNode };

type Engine = {
  ctx: AudioContext;
  /** Into the hall reverb (used by the preloader's flute). */
  room: AudioNode;
  master: GainNode;
  pad: GainNode;
  plucks: GainNode;
  analyser: AnalyserNode;
  buf: Float32Array<ArrayBuffer>;
  chord: { index: number; voices: Voice[] } | null;
  cache: Map<number, AudioBuffer>;
};

let engine: Engine | null = null;

/** Freeze a ramp where it is (no click), so a release can start from there. */
function hold(param: AudioParam, t: number) {
  if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(t);
  else {
    const v = param.value;
    param.cancelScheduledValues(t);
    param.setValueAtTime(v, t);
  }
}
let current = 0;

/* ---------- Instruments ---------- */

/** A plucked string (Karplus–Strong), warm and round. Cached per pitch. */
function stringBuffer(e: Engine, semitones: number) {
  const hit = e.cache.get(semitones);
  if (hit) return hit;
  const { ctx } = e;
  const sr = ctx.sampleRate;
  const f = hz(semitones);
  const seconds = 5;
  const length = Math.floor(sr * seconds);
  const out = ctx.createBuffer(1, length, sr);
  const data = out.getChannelData(0);

  // The loop (read L back, average with the newer neighbour) delays L − ½
  // samples; a first-order allpass supplies the fraction, so every note lands
  // in tune with the strings' chords.
  let len = Math.floor(sr / f + 0.5);
  let frac = sr / f + 0.5 - len;
  if (frac < 0.1) {
    len -= 1;
    frac += 1;
  }
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(len);
  // Excite with soft noise, then comb it as if plucked a fifth of the way along:
  // the fingertip-on-nylon warmth, not a bright pick.
  const noise = new Float32Array(len);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    prev = prev * 0.72 + (Math.random() * 2 - 1) * 0.28;
    noise[i] = prev;
  }
  const at = Math.max(1, Math.floor(len * 0.2));
  for (let i = 0; i < len; i++) line[i] = noise[i] - 0.85 * (i >= at ? noise[i - at] : 0);

  const t60 = 3.2 + 2.4 * Math.min(1, 220 / f);
  const loss = Math.pow(0.001, 1 / (f * t60));
  let idx = 0;
  let peak = 0;
  let apIn = 0;
  let apOut = 0;
  for (let i = 0; i < length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % len];
    data[i] = a;
    peak = Math.max(peak, Math.abs(a));
    const v = loss * 0.5 * (a + b);
    apOut = c * v + apIn - c * apOut;
    apIn = v;
    line[idx] = apOut;
    idx = (idx + 1) % len;
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  const attack = Math.floor(sr * 0.003);
  const tail = Math.floor(sr * 0.6);
  for (let i = 0; i < length; i++) {
    let g = norm;
    if (i < attack) g *= i / attack;
    if (i > length - tail) g *= (length - i) / tail;
    data[i] *= g;
  }
  e.cache.set(semitones, out);
  return out;
}

/** Every pitch the score can pluck: each swara, its octave halo, and the 404's misses. */
const STRING_PITCHES = (() => {
  const set = new Set<number>();
  SWARAS.forEach((s) => {
    set.add(s.step);
    set.add(s.step + 12);
  });
  [0, 2, 4, 5, 6, 7, 9, 11, 12.5, 11.5, 11.75].forEach((st) => {
    set.add(st);
    set.add(st + 12);
    set.add(st - 12);
  });
  return [...set];
})();

/**
 * Render the strings ahead of time, one per idle moment, so no note is ever
 * built mid-scroll (that stalled the page and made notes start late).
 */
function warmStrings(e: Engine) {
  const todo = STRING_PITCHES.filter((st) => !e.cache.has(st));
  // The site's own instrument, if it isn't the guitar: its chapter swaras too.
  const site = SWARAS.map((s) => s.step);
  const next = () => {
    const st = todo.shift();
    if (st !== undefined) stringBuffer(e, st);
    const swara = st === undefined ? site.shift() : undefined;
    if (swara !== undefined) {
      if (SITE_INSTRUMENT === "veena") veenaBuffer(e, swara);
      if (SITE_INSTRUMENT === "mandolin") warmMandolin(e.ctx, [{ st: swara }]);
    }
    if (st !== undefined || swara !== undefined) window.setTimeout(next, 16);
  };
  window.setTimeout(next, 16);
}

/** A chapter's swara as you scroll, on the site's instrument (./site.ts). */
function pluck(e: Engine, index: number, at: number, velocity = 1) {
  const st = SWARAS[index].step;
  const pan = -0.12 + index * 0.035;
  if (SITE_INSTRUMENT === "veena") veenaPluck(e, st, at, velocity, pan);
  else if (SITE_INSTRUMENT === "mandolin") mandolinPluck(stage(e), st, at, velocity, pan);
  else pluckStep(e, st, at, velocity, pan);
}

/** One veena note for the scroll: a single meetu, ringing long. */
function veenaPluck(e: Engine, st: number, at: number, velocity: number, pan: number) {
  const { ctx } = e;
  const src = ctx.createBufferSource();
  src.buffer = veenaBuffer(e, st);
  src.detune.value = (Math.random() - 0.5) * 3;
  const g = ctx.createGain();
  g.gain.value = 0.5 * velocity;
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  src.connect(g).connect(p).connect(e.plucks);
  src.start(at);
  window.setTimeout(() => {
    resonance.pulse = Math.min(1, resonance.pulse + 0.6 * velocity);
  }, Math.max(0, (at - ctx.currentTime) * 1000));
}

/**
 * Carnatic ornament, on the string's playback rate, as a smooth curve (see
 * ./expression.ts): from the previous swara when known (so the attack is in
 * tune), otherwise from just below the note.
 */
function applyGamaka(rate: AudioParam, at: number, kind: Gamaka, fromRatio?: number, span = 0.62) {
  shapeGamaka(rate, kind, at, span, 1, fromRatio ?? Math.pow(2, -120 / 1200));
}

/** Pluck any pitch (semitones from Sa, fractions allowed — the 404's wrong notes). */
function pluckStep(
  e: Engine,
  step: number,
  at: number,
  velocity = 1,
  pan = 0,
  gamaka?: Gamaka,
  slideFrom?: number,
  span?: number,
  halo = true,
) {
  const { ctx } = e;
  // No two plucks quite alike: a cent or two either way (the same for the
  // note and its halo, so they stay one string).
  const detune = (Math.random() - 0.5) * 3;
  // The note, and — for the site's scroll notes — a soft octave above it a
  // breath later, a harp-like halo. A raga is played as one plain string.
  const layers = [{ st: step, gain: 0.55 * velocity, pan, delay: 0 }];
  if (halo) layers.push({ st: step + 12, gain: 0.14 * velocity, pan: 0.2, delay: 0.014 });
  layers.forEach((n) => {
    const src = ctx.createBufferSource();
    src.buffer = stringBuffer(e, n.st);
    src.detune.value = detune;
    const g = ctx.createGain();
    g.gain.value = n.gain;
    const p = ctx.createStereoPanner();
    p.pan.value = n.pan;
    if (gamaka) {
      const fromRatio = slideFrom === undefined ? undefined : Math.pow(2, (slideFrom - step) / 12);
      applyGamaka(src.playbackRate, at + n.delay, gamaka, fromRatio, span);
    }
    src.connect(g).connect(p).connect(e.plucks);
    src.start(at + n.delay);
  });
  const ms = Math.max(0, (at - ctx.currentTime) * 1000);
  window.setTimeout(() => {
    resonance.pulse = Math.min(1, resonance.pulse + 0.6 * velocity);
  }, ms);
}

/** One bowed tone: three slightly detuned saws, like desks in a section. */
function bowedVoice(e: Engine, semitones: number, at: number, level: number, attack = 2.4): Voice {
  const { ctx } = e;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(level, at + attack);
  gain.connect(e.pad);
  const oscs = [-7, 0, 6].map((cents) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = hz(semitones);
    o.detune.value = cents + (Math.random() - 0.5) * 3;
    const g = ctx.createGain();
    g.gain.value = 1 / 3;
    o.connect(g).connect(gain);
    o.start(at);
    return o;
  });
  return { oscs, gain };
}

/** The site's bowed chords, when the background includes them (./site.ts). */
const SITE_STRINGS = SITE_BACKGROUND === "strings" || SITE_BACKGROUND.endsWith("AndStrings");

function setChord(e: Engine, index: number, at: number) {
  if (!SITE_STRINGS) return;
  setTones(e, index, CHORDS[index], at);
}

/** Crossfade the pad to any set of tones; `key` identifies the chord. */
/** Chords still ringing out; capped so fast scrolling can't pile up oscillators. */
const releasing: Voice[][] = [];

function release(voices: Voice[], t: number, tau: number, stopAfter: number) {
  voices.forEach((v) => {
    hold(v.gain.gain, t);
    v.gain.gain.setTargetAtTime(0, t, tau);
    v.oscs.forEach((o) => {
      try {
        o.stop(t + stopAfter);
      } catch {
        // Already stopped.
      }
    });
  });
}

function setTones(e: Engine, key: number, tones: number[], at: number) {
  if (e.chord?.index === key) return;
  const t = Math.max(at, e.ctx.currentTime);
  // The old chord lets go while the new one swells in under it.
  if (e.chord) {
    release(e.chord.voices, t, 0.55, 3.2);
    releasing.push(e.chord.voices);
  }
  // Never more than one chord ringing out behind the current one.
  while (releasing.length > 1) release(releasing.shift()!, t, 0.08, 0.5);
  const level = 0.09 / tones.length;
  e.chord = { index: key, voices: tones.map((st) => bowedVoice(e, st, t, level, 1.4)) };
}

/** A soft hall: decaying stereo noise that darkens as it fades. */
function hall(ctx: AudioContext, seconds = 4.2) {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * seconds);
  const ir = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const k = 0.4 + 0.55 * t;
      lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
      d[i] = lp * Math.pow(1 - t, 2.4) * 2;
    }
  }
  return ir;
}

/* ---------- The 404: one wrong note ---------- */

/*
 * Sa Re Ga Ma Pa Dha Ni Ṡa climb as usual — but on every pass one swara is
 * off: picked at random, played 35–60 cents sharp or flat (close to a
 * quarter-tone, so it's clearly that note, and clearly wrong). The scale
 * stumbles on it, finishes over a V7 that never resolves, takes a breath and
 * tries again — and a different note goes wrong. The page names each one as
 * its pass begins (subscribeWrongNote), until "Return to Sa".
 */
const LOST_CHORD_KEY = -1;
const LOST_GAP = 0.36;
const LOST_CLIMB = [0, 2, 4, 5, 7, 9, 11, 12];
const LOST_STUMBLE = 0.32;
const LOST_BREATH = 3.2;

/** One pass of the climb, for pages that keep time with it in silence. */
export const LOST_LOOP_SECONDS = LOST_CLIMB.length * LOST_GAP + LOST_STUMBLE + LOST_BREATH;

export interface WrongNote {
  /** Index into SWARAS (0 = Sa … 7 = upper Sa). */
  index: number;
  /** How far off, in cents: negative is flat. */
  cents: number;
}

let wrong: WrongNote | null = null;
const wrongListeners = new Set<() => void>();

/** A new wrong note — never the same swara twice in a row. */
function pickWrong(): WrongNote {
  let index: number;
  do index = Math.floor(Math.random() * LOST_CLIMB.length);
  while (wrong && index === wrong.index);
  const size = 35 + Math.round(Math.random() * 25);
  return { index, cents: Math.random() < 0.5 ? -size : size };
}

function showWrong(note: WrongNote) {
  wrong = note;
  wrongListeners.forEach((cb) => cb());
}

/** The wrong note of the pass playing now (picked on first ask, in the browser). */
export function wrongNote(): WrongNote {
  wrong ??= pickWrong();
  return wrong;
}

export function subscribeWrongNote(cb: () => void) {
  wrongListeners.add(cb);
  return () => {
    wrongListeners.delete(cb);
  };
}

/** Moves on to the next wrong note without sound (the page keeps the loop's time). */
export function nextWrongNote() {
  showWrong(pickWrong());
}

let mode: "site" | "lost" = "site";
let lostTimer = 0;
let lostNext = 0;
let lostPasses = 0;
const lostShows = new Set<number>();

function lostPhrase(e: Engine, at: number) {
  // The first pass plays the note already named on the page; each later one
  // picks a new note, and the page names it as that pass begins.
  const note = lostPasses++ === 0 ? wrongNote() : pickWrong();
  if (note !== wrong) {
    const id = window.setTimeout(() => {
      lostShows.delete(id);
      showWrong(note);
    }, Math.max(0, (at - e.ctx.currentTime) * 1000));
    lostShows.add(id);
  }
  const { index, cents } = note;
  let t = at;
  LOST_CLIMB.forEach((st, k) => {
    const off = k === index;
    const step = off ? st + cents / 100 : st;
    // The wrong note is played a little firmer and held a little longer,
    // as if the player heard it too.
    pluckStep(e, step, t, (off ? 0.85 : 0.5) + k * 0.04, -0.2 + k * 0.06);
    if (k === LOST_CLIMB.length - 1) pluckStep(e, step - 12, t + 0.02, 0.35, -0.1);
    t += off ? LOST_GAP + LOST_STUMBLE : LOST_GAP;
  });
  return t + LOST_BREATH;
}

function scheduleLost() {
  const e = engine;
  if (!e || mode !== "lost") return;
  while (lostNext < e.ctx.currentTime + 0.6) lostNext = lostPhrase(e, lostNext);
}

function startLost(e: Engine, t: number) {
  setTones(e, LOST_CHORD_KEY, CHORDS[6], t);
  lostPasses = 0;
  lostNext = t + 0.5;
  window.clearInterval(lostTimer);
  lostTimer = window.setInterval(scheduleLost, 200);
  scheduleLost();
}

function stopLost() {
  window.clearInterval(lostTimer);
  lostTimer = 0;
  lostShows.forEach((id) => window.clearTimeout(id));
  lostShows.clear();
}

/** Which score plays: the site's octave, or the 404's lost scale. */
export function setMode(next: "site" | "lost") {
  if (mode === next) return;
  mode = next;
  if (next === "site") stopLost();
  else if (engine && resonance.audible) startLost(engine, engine.ctx.currentTime);
}

/**
 * "Return to Sa": the scale finally lands — Ni, then the true upper Sa over
 * the home chord. Resolves once it has rung long enough to be heard.
 */
export function resolveHome() {
  const e = engine;
  if (!e || !resonance.audible) return Promise.resolve();
  stopLost();
  const t = e.ctx.currentTime + LOOKAHEAD;
  pluckStep(e, 11, t, 0.7, 0.1);
  pluckStep(e, 12, t + 0.2, 1, 0.2);
  pluckStep(e, 0, t + 0.22, 0.4, -0.15);
  setTones(e, 7, CHORDS[7], t + 0.2);
  return new Promise<void>((done) => window.setTimeout(done, 1100));
}

/* ---------- The welcome: the raga ---------- */

// The ragas live in ./ragas.ts; which one plays, and how, in ./preload.ts.
const RAGA: Raga = RAGAS[PRELOAD_RAGA];
/** The tala it's counted in: the switch, or the raga's own. */
const TALA: TalaName = PRELOAD_TALA === "own" ? RAGA.tala : PRELOAD_TALA;
const RHYTHM = rhythmFor(RAGA, TALA);

/** For the modal: whether a raga plays, and what — the raga, its tala, the instrument. */
export const PRELOAD_RAGA_INFO = {
  playing: PRELOAD_INSTRUMENT !== "none",
  raga: RAGA.name,
  tala: TALAS[TALA].name,
  instrument: PRELOAD_INSTRUMENT === "none" ? "" : INSTRUMENT_NAMES[PRELOAD_INSTRUMENT],
  drone: PRELOAD_DRONE === "none" ? "" : DRONE_NAMES[PRELOAD_DRONE],
};
/** The phrases as played: each swara at its pitch in the chosen tuning. */
const tuned = (notes: RagaNote[]) => notes.map((n) => ({ ...n, st: tune(n.st, PRELOAD_TUNING) }));
const UP = tuned(RAGA.arohanam);
const DOWN = tuned(RAGA.avarohanam);


/**
 * The drone's other note: Pa, as a tambura is usually tuned — or Ma when the
 * raga has no Pa (Abhogi, Hindolam), so the drone never sounds a swara the
 * raga leaves out.
 */
const HAS = new Set([...RAGA.arohanam, ...RAGA.avarohanam].map((n) => ((n.st % 12) + 12) % 12));
const FIFTH = HAS.has(7) || !HAS.has(5) ? 7 : 5;
/** Which drone is sounding now, as "kind:fifth", and how to stop it. */
let drone: { key: string; stop: (at: number) => void } | null = null;

/**
 * Start a drone (replacing any other) on Sa and Pa (fifth = 7) or Ma (5).
 * The tambura's four strings, in plucking order: Pa or Ma below, Sa, Sa, Sa
 * below. The sruti box's reeds: Sa below, Pa or Ma, Sa.
 */
function startDrone(e: Engine, at: number, kind: "tambura" | "sruti" | "none", fifth: number) {
  drone?.stop(at);
  drone = null;
  if (kind === "none") return;
  const pitches = (kind === "tambura" ? [fifth - 12, 0, 0, -12] : [-12, fifth - 12, 0]).map((st) => tune(st, PRELOAD_TUNING));
  const voice = kind === "tambura" ? startTambura(stage(e), pitches, at) : startSruti(stage(e), pitches, at);
  drone = { key: `${kind}:${fifth}`, stop: voice.stop };
}

/** The site's own drone (./site.ts), always on Sa and Pa — the scale has both. */
const SITE_DRONE = SITE_BACKGROUND.startsWith("tambura") ? "tambura" : SITE_BACKGROUND.startsWith("sruti") ? "sruti" : "none";

/** Make sure the site's background is sounding (after the welcome, or when sound is turned back on). */
function siteBackground(e: Engine, at: number) {
  if (SITE_DRONE !== "none" && drone?.key !== `${SITE_DRONE}:7`) startDrone(e, at, SITE_DRONE, 7);
  if (SITE_DRONE === "none" && drone) {
    drone.stop(at);
    drone = null;
  }
  window.setTimeout(() => {
    if (engine === e && resonance.audible && !e.chord) setChord(e, current, e.ctx.currentTime + LOOKAHEAD);
  }, Math.max(0, (at - e.ctx.currentTime) * 1000));
}

/**
 * As the welcome raga ends, hand over to the site's background: the same
 * drone simply carries on; a different one (or none) takes its place.
 */
const handOver = siteBackground;
// A rhythm that doesn't match its phrase, or doesn't fill its cycle, would
// drift off the tala: say so while editing ragas.ts.
if (process.env.NODE_ENV === "development") {
  for (const [name, raga] of Object.entries(RAGAS) as [string, Raga][]) {
    for (const tala of Object.keys(TALAS) as TalaName[]) {
      for (const phrase of ["arohanam", "avarohanam"] as const) {
        const beats = rhythmFor(raga, tala)[phrase];
        const total = beats.reduce((sum, b) => sum + b, 0);
        const where = `[ragas] ${name}, ${tala}, ${phrase}:`;
        if (beats.length !== raga[phrase].length) console.warn(`${where} ${beats.length} beats for ${raga[phrase].length} swaras`);
        if (Math.abs(total - aksharas(tala)) > 1e-6) console.warn(`${where} ${total} aksharas, the cycle has ${aksharas(tala)}`);
      }
    }
  }
}

/** How long the arohana's cycle takes: the plate is struck on the next samam. */
export const AROHANAM_SECONDS = PRELOAD_INSTRUMENT === "none" ? 0 : aksharas(TALA) * RAGA.beat;

/** Scroll notes wait until this audio time, so they don't clash with the raga. */
let phraseUntil = 0;

/* ---------- The venu: a flute for the preloader ---------- */

/** The flute sits an octave above the strings, in its sweet range (A4–A5). */
const FLUTE_OCTAVE = 12;
let breathNoise: AudioBuffer | null = null;

function noiseBuffer(ctx: AudioContext) {
  if (breathNoise) return breathNoise;
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  breathNoise = b;
  return b;
}

/**
 * One breath of the venu: a single legato voice that glides from note to note,
 * so gamakas are real slides rather than bent plucks. A soft flute tone (a
 * fundamental with a little second and third harmonic), breath noise, and a
 * vibrato that blooms on held notes; into the hall.
 * `times[k]` is when note k begins; the voice ends at `end`.
 */
function venuPhrase(e: Engine, notes: RagaNote[], perf: Performance, end: number, level = 0.16) {
  const { times } = perf;
  const { ctx } = e;
  const f = (st: number) => hz(st + FLUTE_OCTAVE);
  const start = times[0];

  const voice = ctx.createGain();
  voice.gain.setValueAtTime(0, start);
  voice.gain.linearRampToValueAtTime(level, start + 0.12);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  tone.Q.value = 0.3;
  voice.connect(tone);
  tone.connect(e.master);
  const send = ctx.createGain();
  send.gain.value = 0.55;
  tone.connect(send).connect(e.room);

  // Pitch: one frequency the partials follow.
  const pitch = ctx.createConstantSource();
  // Set just before the first note, so its own curve has the moment to itself.
  pitch.offset.setValueAtTime(f(notes[0].st), start - 0.01);
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5.2;
  const vibratoDepth = ctx.createGain();
  vibratoDepth.gain.setValueAtTime(0, start);
  vibrato.connect(vibratoDepth);

  const partials = [
    { mult: 1, gain: 1 },
    { mult: 2, gain: 0.16 },
    { mult: 3, gain: 0.05 },
  ].map(({ mult, gain }) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 0;
    const m = ctx.createGain();
    m.gain.value = mult;
    pitch.connect(m).connect(o.frequency);
    const vm = ctx.createGain();
    vm.gain.value = mult;
    vibratoDepth.connect(vm).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g).connect(voice);
    return o;
  });

  // Breath: soft band-passed noise riding along with the tone.
  const breath = ctx.createBufferSource();
  breath.buffer = noiseBuffer(ctx);
  breath.loop = true;
  const breathBand = ctx.createBiquadFilter();
  breathBand.type = "bandpass";
  breathBand.frequency.value = f(notes[0].st) * 2.2;
  breathBand.Q.value = 0.9;
  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.05;
  breath.connect(breathBand).connect(breathGain).connect(voice);

  const cents = (hzv: number, c: number) => hzv * Math.pow(2, c / 1200);
  notes.forEach(({ st, gamaka }, k) => {
    const t = times[k];
    const target = f(st);
    const next = k < notes.length - 1 ? times[k + 1] : end;
    // Breath follows the phrasing: firmer notes blow a little harder.
    const breathLevel = level * (0.8 + 0.3 * perf.force[k]);
    if (k > 0) {
      // A light articulation between notes, as a flautist's finger change.
      voice.gain.setValueAtTime(breathLevel, t - 0.03);
      voice.gain.linearRampToValueAtTime(breathLevel * 0.78, t);
      voice.gain.linearRampToValueAtTime(breathLevel, t + 0.08);
    }
    // Every ornament fits inside its own note (overlapping pitch moves would
    // fight and jump); a plain note gets a small scoop instead.
    const prev = k > 0 ? f(notes[k - 1].st) : null;
    const span = gamaka ? gamakaSpan(t, next) : null;
    if (gamaka && span) shapeGamaka(pitch.offset, gamaka, t, span, target, prev ?? cents(target, -110));
    else scoop(pitch.offset, t, target, prev, next - t);
    breathBand.frequency.setTargetAtTime(target * 2.2, t, 0.05);
    // Vibrato blooms only on notes held long enough to sing.
    vibratoDepth.gain.setValueAtTime(0, t);
    if (next - t > 0.55) vibratoDepth.gain.linearRampToValueAtTime(target * 0.006, t + Math.min(0.6, next - t - 0.1));
    window.setTimeout(() => {
      resonance.pulse = Math.min(1, resonance.pulse + 0.45);
    }, Math.max(0, (t - ctx.currentTime) * 1000));
  });

  voice.gain.setValueAtTime(level, end - 0.5);
  voice.gain.linearRampToValueAtTime(0, end);
  [pitch, vibrato, breath, ...partials].forEach((n) => {
    n.start(start);
    n.stop(end + 0.1);
  });
}

/* ---------- The veena ---------- */


/**
 * The raga on the site's own plucked guitar: one warm string, notes ringing
 * into each other, without the octave halo the scroll notes have (with a
 * gamaka bending both, it sounded like two players). Gamakas bend the ringing string,
 * sliding from the previous swara so every attack is in tune.
 */
function guitarPhrase(e: Engine, notes: RagaNote[], perf: Performance, level = 0.85) {
  const n = notes.length - 1;
  notes.forEach(({ st, gamaka }, k) => {
    const t = perf.times[k];
    const next = k < n ? perf.times[k + 1] : t + 1.6;
    const span = gamaka ? gamakaSpan(t, next) : null;
    const rise = k / Math.max(1, n);
    pluckStep(
      e,
      st,
      t,
      level * perf.force[k],
      -0.15 + rise * 0.3,
      span ? gamaka : undefined,
      k > 0 ? notes[k - 1].st : undefined,
      span ?? undefined,
      false,
    );
  });
}

const veenaCache = new Map<number, AudioBuffer>();

/**
 * A veena string: Karplus–Strong again, but voiced for the veena — plucked
 * close to the bridge (bright), a loop that keeps its upper partials and rings
 * long, and a soft clip in the loop for the jawari-like buzz of its bridge.
 */
function veenaBuffer(e: Engine, st: number) {
  const hit = veenaCache.get(st);
  if (hit) return hit;
  const { ctx } = e;
  const sr = ctx.sampleRate;
  const f = hz(st);
  const length = Math.floor(sr * 6);
  const out = ctx.createBuffer(1, length, sr);
  const data = out.getChannelData(0);
  // Brighter loop filter: weight the current sample more (delay ≈ L − 0.2).
  const w = 0.8;
  let len = Math.floor(sr / f + (1 - w));
  let frac = sr / f + (1 - w) - len;
  if (frac < 0.1) {
    len -= 1;
    frac += 1;
  }
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(len);
  // A plectrum-sharp excitation, plucked about an eighth of the way along.
  const noise = new Float32Array(len);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    prev = prev * 0.35 + (Math.random() * 2 - 1) * 0.65;
    noise[i] = prev;
  }
  const at = Math.max(1, Math.floor(len * 0.12));
  for (let i = 0; i < len; i++) line[i] = noise[i] - 0.9 * (i >= at ? noise[i - at] : 0);
  const t60 = 9;
  const loss = Math.pow(0.001, 1 / (f * t60));
  let idx = 0;
  let apIn = 0;
  let apOut = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % len];
    data[i] = a;
    peak = Math.max(peak, Math.abs(a));
    // The jawari: a gentle soft clip adds a buzz that fades as the string calms.
    let v = loss * (w * a + (1 - w) * b);
    v = v - 0.12 * v * v * v;
    apOut = c * v + apIn - c * apOut;
    apIn = v;
    line[idx] = apOut;
    idx = (idx + 1) % len;
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  const attack = Math.floor(sr * 0.002);
  const tail = Math.floor(sr * 0.8);
  for (let i = 0; i < length; i++) {
    let g = norm;
    if (i < attack) g *= i / attack;
    if (i > length - tail) g *= (length - i) / tail;
    data[i] *= g;
  }
  veenaCache.set(st, out);
  return out;
}

/**
 * The raga on the veena: each swara plucked (meetu), its gamakas made the
 * veena way — by bending the ringing string. A jaaru starts on the previous
 * swara and slides into the new one, so every attack is in tune; a kampita
 * then sways gently above the note.
 */
function veenaPhrase(e: Engine, notes: RagaNote[], perf: Performance, level = 0.75) {
  const { times } = perf;
  const { ctx } = e;
  // The body: a warm low resonance and the hollow mid of the kudam.
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 170;
  body.Q.value = 1.1;
  body.gain.value = 4;
  const hollow = ctx.createBiquadFilter();
  hollow.type = "peaking";
  hollow.frequency.value = 820;
  hollow.Q.value = 1.4;
  hollow.gain.value = 3;
  body.connect(hollow).connect(e.plucks);

  notes.forEach(({ st, gamaka }, k) => {
    const t = times[k];
    const next = k < notes.length - 1 ? times[k + 1] : t + 1.6;
    const src = ctx.createBufferSource();
    src.buffer = veenaBuffer(e, st);
    const g = ctx.createGain();
    const v = level * perf.force[k];
    src.detune.value = (Math.random() - 0.5) * 3;
    g.gain.setValueAtTime(v, t);
    // A new pluck damps the last one, as the finger moves on.
    if (k < notes.length - 1) g.gain.setTargetAtTime(0, next + 0.02, 0.08);
    const span = gamaka ? gamakaSpan(t, next) : null;
    if (gamaka && span) {
      // The finger pulls the ringing string from the previous swara.
      const from = k > 0 ? Math.pow(2, (notes[k - 1].st - st) / 12) : null;
      shapeGamaka(src.playbackRate, gamaka, t, span, 1, from);
    }
    src.connect(g).connect(body);
    src.start(t);
    src.stop(next + 0.5);
    window.setTimeout(() => {
      resonance.pulse = Math.min(1, resonance.pulse + 0.55);
    }, Math.max(0, (t - ctx.currentTime) * 1000));
  });
}

/** Where the newer instruments (./instruments.ts) play: the master bus and the hall. */
function stage(e: Engine): Stage {
  return {
    ctx: e.ctx,
    out: e.master,
    room: e.room,
    onNote: (at, strength) =>
      window.setTimeout(() => {
        resonance.pulse = Math.min(1, resonance.pulse + strength);
      }, Math.max(0, (at - e.ctx.currentTime) * 1000)),
  };
}

/** One phrase on the chosen instrument; `end` is when a sustained voice stops. */
function playPhrase(e: Engine, notes: RagaNote[], perf: Performance, end: number, descending: boolean) {
  switch (PRELOAD_INSTRUMENT) {
    case "guitar":
      return guitarPhrase(e, notes, perf, descending ? 0.9 : 0.85);
    case "veena":
      return veenaPhrase(e, notes, perf, descending ? 0.8 : 0.75);
    case "venu":
      return venuPhrase(e, notes, perf, end, descending ? 0.16 : 0.15);
    case "mandolin":
      return mandolinPhrase(stage(e), notes, perf);
    case "violin":
      return violinPhrase(stage(e), notes, perf, end);
    case "nadaswaram":
      return nadaswaramPhrase(stage(e), notes, perf, end);
  }
}

/** The phrase as a person would play it: the tala's pulse, breathing (see ./expression.ts). */
const shape = (beats: number[], at: number, rising: boolean) => perform(beats, RAGA.beat, at, TALAS[TALA].angas, rising);

function playArohanam(e: Engine, at: number) {
  const perf = shape(RHYTHM.arohanam, at, true);
  // Breathe on the upper Sa before the plate is struck.
  const end = perf.times[UP.length - 1] + 1.1;
  playPhrase(e, UP, perf, end, false);
  phraseUntil = Math.max(phraseUntil, end);
}

function playAvarohanam(e: Engine, at: number) {
  // Sa lands on its beat, is held, then let go.
  const perf = shape(RHYTHM.avarohanam, at, false);
  const end = perf.times[DOWN.length - 1] + 1.8;
  playPhrase(e, DOWN, perf, end, true);
  phraseUntil = end;
  handOver(e, end - 0.6);
}

/** The plate is struck and she enters: the raga's descent home, if sound is playing. */
/** The plate was struck before the audio had woken: play its note once it has. */
let homecomingMissed = false;

export function playHomecoming() {
  const e = engine;
  if (!e || !resonance.audible) {
    homecomingMissed = resonance.soundOn;
    return;
  }
  const t = e.ctx.currentTime + LOOKAHEAD;
  // A silent preloader: the background is already sounding; strike the note.
  if (PRELOAD_INSTRUMENT === "none") {
    pluck(e, current, t + 0.1, 0.8);
    return;
  }
  playAvarohanam(e, t);
}

/* ---------- Engine ---------- */

function build(): Engine {
  const ctx = new AudioContext({ latencyHint: "playback" });
  const master = ctx.createGain();
  master.gain.value = 0;

  const room = ctx.createConvolver();
  room.buffer = hall(ctx);

  // Pad: low-passed, gently breathing, mostly in the hall.
  const pad = ctx.createGain();
  const padTone = ctx.createBiquadFilter();
  padTone.type = "lowpass";
  padTone.frequency.value = 1100;
  padTone.Q.value = 0.6;
  const breath = ctx.createOscillator();
  breath.frequency.value = 0.07;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 260;
  breath.connect(breathDepth).connect(padTone.frequency);
  breath.start();
  const padLow = ctx.createBiquadFilter();
  padLow.type = "highpass";
  padLow.frequency.value = 70;
  pad.connect(padLow).connect(padTone);
  const padWet = ctx.createGain();
  padWet.gain.value = 0.6;
  padTone.connect(master);
  padTone.connect(padWet).connect(room);

  // Plucks: a warm body, a little air, some hall.
  const plucks = ctx.createGain();
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 210;
  body.Q.value = 0.9;
  body.gain.value = 2;
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 3600;
  plucks.connect(body).connect(soften);
  const pluckWet = ctx.createGain();
  pluckWet.gain.value = 0.38;
  soften.connect(master);
  soften.connect(pluckWet).connect(room);

  room.connect(master);

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 4;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  master.connect(limiter).connect(ctx.destination);
  limiter.connect(analyser);

  return { ctx, room, master, pad, plucks, analyser, buf: new Float32Array(analyser.fftSize), chord: null, cache: new Map() };
}

let starting = false;

async function begin({ intro = false }: { intro?: boolean } = {}) {
  // Autoplay and a first click can race; only one may start the music.
  if (starting || resonance.audible) return;
  starting = true;
  engine ??= build();
  const e = engine;
  try {
    await e.ctx.resume();
  } finally {
    starting = false;
  }
  if (!resonance.soundOn || resonance.audible) return;
  const t = e.ctx.currentTime + LOOKAHEAD;
  // Fade in from wherever the volume is now (no jump if a fade-out was mid-way).
  hold(e.master.gain, e.ctx.currentTime);
  // The raga starts almost at once, so it needs the volume up quickly.
  e.master.gain.setTargetAtTime(1, t, intro ? 0.08 : 0.9);
  stringBuffer(e, SWARAS[current].step);
  warmStrings(e);
  if (mode === "lost") startLost(e, t);
  else {
    // From the preloader: the ascent over a Sa–Pa drone, while the plate
    // tunes. Otherwise this chapter's chord and note.
    if (intro && current === 0) {
      // Silent preloader: no raga, so the site's own music starts now —
      // nothing waits on the plate being struck, which may already have
      // happened if the audio took a moment to wake (Bluetooth headphones,
      // a sleeping device).
      if (PRELOAD_INSTRUMENT === "none") {
        resonance.audible = true;
        soundChanged();
        siteBackground(e, t);
        if (homecomingMissed) pluck(e, current, t + 0.1, 0.8);
        homecomingMissed = false;
        return;
      }
      // Under the raga, the drone (PRELOAD_DRONE): a tambura or a sruti box.
      startDrone(e, t, PRELOAD_DRONE, FIFTH);
      // Render the plucked instruments' strings now, so the first notes start on time.
      const ragaPitches = new Set([...UP, ...DOWN].map((n) => n.st));
      if (PRELOAD_INSTRUMENT === "veena") ragaPitches.forEach((st) => veenaBuffer(e, st));
      if (PRELOAD_INSTRUMENT === "guitar") ragaPitches.forEach((st) => stringBuffer(e, st));
      if (PRELOAD_INSTRUMENT === "mandolin") warmMandolin(e.ctx, [...UP, ...DOWN]);
      playArohanam(e, t + 0.2);
    } else {
      siteBackground(e, t);
      pluck(e, current, t + 0.25, 0.8);
    }
  }
  resonance.audible = true;
  soundChanged();
}

function hush() {
  const e = engine;
  stopLost();
  drone?.stop(e ? e.ctx.currentTime : 0);
  drone = null;
  resonance.audible = false;
  soundChanged();
  if (!e) return;
  const t = e.ctx.currentTime;
  hold(e.master.gain, t);
  e.master.gain.setTargetAtTime(0, t, 0.5);
  window.clearTimeout(chordTimer);
  window.setTimeout(() => {
    if (!resonance.soundOn) void e.ctx.suspend();
  }, 3000);
}

/* ---------- Public API ---------- */

/**
 * Start every visit with sound on, and arm the first-gesture start. Call once on
 * the client (home: after the preloader; 404: on any gesture). Returns a cleanup.
 */
/** Some browsers suspend (or "interrupt") audio in a background tab; pick it back up. */
function wake() {
  const e = engine;
  if (!e || document.hidden || !resonance.soundOn || !resonance.audible) return;
  if (e.ctx.state !== "running") void e.ctx.resume();
}

export function initSound({ anyGesture = false }: { anyGesture?: boolean } = {}) {
  // Sound is on at the start of every visit: a mute is never remembered.
  // (Earlier versions saved "off" in localStorage; clear it so it can't
  // override the default.)
  resonance.soundOn = true;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
  }
  soundChanged();

  const unlock = (ev: Event) => {
    // The toggle and the preloader's buttons handle their own clicks, and on
    // the home page nothing plays before the visitor has entered (the 404 has
    // no preloader, so any gesture there will do).
    if ((!anyGesture && !isEntered()) || (ev.target as Element | null)?.closest?.("[data-sound-toggle]")) return;
    if (resonance.soundOn && !resonance.audible) void begin();
  };
  const events = ["pointerdown", "keydown", "touchend"] as const;
  events.forEach((t) => window.addEventListener(t, unlock, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  return () => {
    events.forEach((t) => window.removeEventListener(t, unlock, { capture: true }));
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("focus", wake);
  };
}

/**
 * Sound is on by default, so try to start it without waiting for a click.
 * Whether that's allowed is the browser's call: Chrome permits it on sites
 * you've interacted with before; Safari and Firefox/Zen block it unless the
 * visitor has allowed sound for the site. If it's blocked nothing breaks —
 * the first click, tap or key starts the music instead (see initSound).
 */
export function tryAutoplay() {
  if (!resonance.soundOn || resonance.audible) return;
  engine ??= build();
  const e = engine;
  // resume() can hang while blocked, so don't wait on it for long.
  void Promise.race([e.ctx.resume(), new Promise((r) => window.setTimeout(r, 400))]).then(() => {
    if (e.ctx.state === "running" && resonance.soundOn && !resonance.audible) void begin();
  });
}

/** The toggle. Called from a click, so the browser lets audio start. */
export function setSoundOn(on: boolean, { intro = false }: { intro?: boolean } = {}) {
  resonance.soundOn = on;
  if (on) void begin({ intro });
  else hush();
  soundChanged();
}

/**
 * The page moved from one chapter to another: play every note crossed, in
 * order, and let the harmony follow.
 */
let chordTimer = 0;

export function arrive(index: number) {
  const from = current;
  current = index;
  const e = engine;
  // Sound is on but never got going (the start was interrupted): scrolling
  // starts it — the audio was already unlocked by the click to enter.
  if (e && resonance.soundOn && !resonance.audible && e.ctx.state === "running" && isEntered()) {
    void begin();
    return;
  }
  if (!e || !resonance.audible || from === index) return;
  const dir = index > from ? 1 : -1;
  let steps: number[] = [];
  for (let i = from + dir; dir > 0 ? i <= index : i >= index; i += dir) steps.push(i);
  // A long jump plays only the last few notes into the destination.
  steps = steps.slice(-MAX_ARPEGGIO);
  const t = e.ctx.currentTime + LOOKAHEAD;
  // While the welcome raga is still playing, let it finish: the harmony
  // still follows below, only the scroll notes wait.
  if (t < phraseUntil) steps = [];
  steps.forEach((s, k) => {
    const last = k === steps.length - 1;
    pluck(e, s, t + k * ARPEGGIO_GAP, last ? 0.9 : 0.45);
  });
  // The harmony follows once the scroll settles, so flying past chapters
  // doesn't stack a chord for each one.
  window.clearTimeout(chordTimer);
  chordTimer = window.setTimeout(() => {
    const en = engine;
    if (en && resonance.audible) setChord(en, current, en.ctx.currentTime + LOOKAHEAD);
  }, CHORD_SETTLE_MS);
}

let bow: Voice[] | null = null;

/** Press and hold: a bowed string sustains the current chapter's note. */
export function startBow() {
  const e = engine;
  if (!e || !resonance.audible || bow) return;
  const t = e.ctx.currentTime;
  const step = SWARAS[current].step;
  bow = [bowedVoice(e, step, t, 0.055, 0.35), bowedVoice(e, step - 12, t, 0.03, 0.5)];
}

/** …and lets it ring out when released. */
export function stopBow() {
  const e = engine;
  if (!e || !bow) return;
  const t = e.ctx.currentTime;
  bow.forEach((v) => {
    hold(v.gain.gain, t);
    v.gain.gain.setTargetAtTime(0, t, 0.45);
    v.oscs.forEach((o) => o.stop(t + 3.5));
  });
  bow = null;
}

let lastHoverTone = 0;

/**
 * Sympathetic resonance: hovering something interactive sounds a soft
 * harmonic of the current chapter's note — an octave up, no attack, swelling
 * in and fading like a string ringing in sympathy (never a pluck). `pan` is
 * where the element sits, -1 (left) to 1 (right).
 */
export function hoverTone(pan = 0) {
  const e = engine;
  if (!e || !resonance.audible || mode !== "site") return;
  const now = e.ctx.currentTime;
  // A quick sweep across a menu shouldn't machine-gun notes.
  if (now - lastHoverTone < 0.14) return;
  lastHoverTone = now;
  const { ctx } = e;
  const t = now + 0.02;
  const f = hz(SWARAS[current].step + 12);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.028, t + 0.09);
  out.gain.setTargetAtTime(0, t + 0.14, 0.5);
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
  out.connect(p);
  p.connect(e.master);
  const send = ctx.createGain();
  send.gain.value = 0.7;
  p.connect(send).connect(e.room);
  [
    { mult: 1, gain: 0.7 },
    { mult: 2, gain: 0.18 },
    { mult: 3, gain: 0.05 },
  ].forEach(({ mult, gain }) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f * mult;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 3);
  });
}

/** Loudness 0–1, read once per frame by the sand. */
export function soundLevel() {
  const e = engine;
  if (!e || e.ctx.state !== "running") return 0;
  e.analyser.getFloatTimeDomainData(e.buf);
  let sum = 0;
  for (let i = 0; i < e.buf.length; i += 4) sum += e.buf[i] * e.buf[i];
  return Math.min(1, Math.sqrt(sum / (e.buf.length / 4)) * 3);
}
