import { SA_HZ, SWARAS } from "@/lib/content";
import { resonance, soundChanged } from "@/lib/resonance";
import { isEntered } from "@/lib/stage";

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
const STORAGE_KEY = "spandana:sound";
const ARPEGGIO_GAP = 0.11;

type Voice = { oscs: OscillatorNode[]; gain: GainNode };

type Engine = {
  ctx: AudioContext;
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

function pluck(e: Engine, index: number, at: number, velocity = 1) {
  pluckStep(e, SWARAS[index].step, at, velocity, -0.12 + index * 0.035);
}

/** Pluck any pitch (semitones from Sa, fractions allowed — the 404's wrong notes). */
function pluckStep(e: Engine, step: number, at: number, velocity = 1, pan = 0) {
  const { ctx } = e;
  // The note, and a soft octave above it a breath later — a harp-like halo.
  [
    { st: step, gain: 0.55 * velocity, pan, delay: 0 },
    { st: step + 12, gain: 0.14 * velocity, pan: 0.2, delay: 0.014 },
  ].forEach((n) => {
    const src = ctx.createBufferSource();
    src.buffer = stringBuffer(e, n.st);
    const g = ctx.createGain();
    g.gain.value = n.gain;
    const p = ctx.createStereoPanner();
    p.pan.value = n.pan;
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

function setChord(e: Engine, index: number, at: number) {
  setTones(e, index, CHORDS[index], at);
}

/** Crossfade the pad to any set of tones; `key` identifies the chord. */
function setTones(e: Engine, key: number, tones: number[], at: number) {
  if (e.chord?.index === key) return;
  const t = Math.max(at, e.ctx.currentTime);
  // The old chord lets go slowly while the new one swells in under it.
  e.chord?.voices.forEach((v) => {
    hold(v.gain.gain, t);
    v.gain.gain.setTargetAtTime(0, t, 1.1);
    v.oscs.forEach((o) => o.stop(t + 7));
  });
  const level = 0.09 / tones.length;
  e.chord = { index: key, voices: tones.map((st) => bowedVoice(e, st, t, level)) };
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

/* ---------- The 404: a scale that can't find home ---------- */

/*
 * Sa Re Ga Ma Pa Dha Ni climb as usual — and the upper Sa never comes. The
 * last note lands a quarter-tone sharp, or slips back between Ni and Sa, and
 * hangs over a V7 that never resolves. A breath, and it tries again.
 */
const LOST_CHORD_KEY = -1;
const LOST_MISSES = [12.5, 11.5, 12.5, 11.75];
const LOST_GAP = 0.36;

let mode: "site" | "lost" = "site";
let lostTimer = 0;
let lostNext = 0;
let lostRound = 0;

function lostPhrase(e: Engine, at: number) {
  const climb = [0, 2, 4, 5, 7, 9, 11];
  climb.forEach((st, k) => pluckStep(e, st, at + k * LOST_GAP, 0.5 + k * 0.05, -0.2 + k * 0.06));
  const miss = LOST_MISSES[lostRound % LOST_MISSES.length];
  const land = at + climb.length * LOST_GAP + 0.3;
  pluckStep(e, miss, land, 1, 0.25);
  pluckStep(e, miss - 12, land + 0.02, 0.35, -0.1);
  lostRound++;
  return land + 3.4;
}

function scheduleLost() {
  const e = engine;
  if (!e || mode !== "lost") return;
  while (lostNext < e.ctx.currentTime + 0.6) lostNext = lostPhrase(e, lostNext);
}

function startLost(e: Engine, t: number) {
  setTones(e, LOST_CHORD_KEY, CHORDS[6], t);
  lostNext = t + 0.5;
  window.clearInterval(lostTimer);
  lostTimer = window.setInterval(scheduleLost, 200);
  scheduleLost();
}

function stopLost() {
  window.clearInterval(lostTimer);
  lostTimer = 0;
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
  const t = e.ctx.currentTime + 0.03;
  pluckStep(e, 11, t, 0.7, 0.1);
  pluckStep(e, 12, t + 0.2, 1, 0.2);
  pluckStep(e, 0, t + 0.22, 0.4, -0.15);
  setTones(e, 7, CHORDS[7], t + 0.2);
  return new Promise<void>((done) => window.setTimeout(done, 1100));
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

  return { ctx, master, pad, plucks, analyser, buf: new Float32Array(analyser.fftSize), chord: null, cache: new Map() };
}

async function begin() {
  engine ??= build();
  const e = engine;
  await e.ctx.resume();
  if (!resonance.soundOn) return;
  const t = e.ctx.currentTime;
  e.master.gain.cancelScheduledValues(t);
  e.master.gain.setTargetAtTime(1, t, 0.9);
  if (mode === "lost") startLost(e, t);
  else {
    setChord(e, current, t);
    pluck(e, current, t + 0.25, 0.8);
  }
  resonance.audible = true;
  soundChanged();
}

function hush() {
  const e = engine;
  stopLost();
  resonance.audible = false;
  soundChanged();
  if (!e) return;
  const t = e.ctx.currentTime;
  e.master.gain.cancelScheduledValues(t);
  e.master.gain.setTargetAtTime(0, t, 0.5);
  window.setTimeout(() => {
    if (!resonance.soundOn) void e.ctx.suspend();
  }, 3000);
}

/* ---------- Public API ---------- */

/**
 * Restore the visitor's choice and arm the first-gesture start. Call once on
 * the client (home: after the preloader; 404: on any gesture). Returns a cleanup.
 */
export function initSound({ anyGesture = false }: { anyGesture?: boolean } = {}) {
  try {
    resonance.soundOn = localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    resonance.soundOn = true;
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
  return () => events.forEach((t) => window.removeEventListener(t, unlock, { capture: true }));
}

/** The toggle. Called from a click, so the browser lets audio start. */
export function setSoundOn(on: boolean) {
  resonance.soundOn = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice just isn't remembered.
  }
  if (on) void begin();
  else hush();
  soundChanged();
}

/**
 * The page moved from one chapter to another: play every note crossed, in
 * order, and let the harmony follow.
 */
export function arrive(index: number) {
  const from = current;
  current = index;
  const e = engine;
  if (!e || !resonance.audible || from === index) return;
  const dir = index > from ? 1 : -1;
  const steps: number[] = [];
  for (let i = from + dir; dir > 0 ? i <= index : i >= index; i += dir) steps.push(i);
  const t = e.ctx.currentTime + 0.02;
  steps.forEach((s, k) => {
    const last = k === steps.length - 1;
    pluck(e, s, t + k * ARPEGGIO_GAP, last ? 1 : 0.55);
  });
  setChord(e, index, t + (steps.length - 1) * ARPEGGIO_GAP);
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

/** Loudness 0–1, read once per frame by the sand. */
export function soundLevel() {
  const e = engine;
  if (!e || e.ctx.state !== "running") return 0;
  e.analyser.getFloatTimeDomainData(e.buf);
  let sum = 0;
  for (let i = 0; i < e.buf.length; i += 4) sum += e.buf[i] * e.buf[i];
  return Math.min(1, Math.sqrt(sum / (e.buf.length / 4)) * 3);
}
