import { SA_HZ } from "@/lib/content";
import { gamaka as shapeGamaka, gamakaSpan, scoop, seeded, type Performance } from "./expression";
import type { RagaNote } from "./ragas";

/*
 * The preloader's newer instruments: the mandolin (plucked), and the violin
 * and nadaswaram (sustained, gliding voices). The guitar, veena and venu live
 * in ./sound.ts with the rest of the engine.
 *
 * Every phrase function takes the swaras (already tuned, see ./tuning.ts),
 * the performance (when each begins and how firmly, see ./expression.ts),
 * and where to play: `out` for the dry sound, `room` for the hall. Gamakas
 * are made each instrument's own way — the mandolin bends its ringing
 * string, the violin and nadaswaram slide their pitch.
 *
 * And the drones under the raga: the tambura (plucked) and the sruti box
 * (reeds).
 */

export type Stage = {
  ctx: AudioContext;
  /** The dry signal. */
  out: AudioNode;
  /** The hall send. */
  room: AudioNode;
  /** Called as each note sounds, so the sand can answer it. */
  onNote: (at: number, strength: number) => void;
};

const hz = (st: number) => SA_HZ * Math.pow(2, st / 12);


/* ---------- Mandolin ---------- */

const mandolinCache = new Map<number, AudioBuffer>();

/**
 * One mandolin string: Karplus–Strong voiced bright and short — a metal
 * string picked near the bridge, ringing a couple of seconds.
 */
function mandolinBuffer(ctx: AudioContext, st: number) {
  const key = Math.round(st * 1000);
  const hit = mandolinCache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const f = hz(st);
  const length = Math.floor(sr * 2.6);
  const out = ctx.createBuffer(1, length, sr);
  const data = out.getChannelData(0);
  // A bright loop: weight the newer sample (delay ≈ L − 0.15), with an
  // allpass for the fraction so the pitch is exact.
  const w = 0.85;
  let len = Math.floor(sr / f + (1 - w));
  let frac = sr / f + (1 - w) - len;
  if (frac < 0.1) {
    len -= 1;
    frac += 1;
  }
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(len);
  // A pick: sharp noise, combed as if struck a tenth of the way along.
  const noise = new Float32Array(len);
  for (let i = 0; i < len; i++) noise[i] = Math.random() * 2 - 1;
  const at = Math.max(1, Math.floor(len * 0.1));
  for (let i = 0; i < len; i++) line[i] = noise[i] - 0.9 * (i >= at ? noise[i - at] : 0);
  const loss = Math.pow(0.001, 1 / (f * 2.2));
  let idx = 0;
  let apIn = 0;
  let apOut = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % len];
    data[i] = a;
    peak = Math.max(peak, Math.abs(a));
    const v = loss * (w * a + (1 - w) * b);
    apOut = c * v + apIn - c * apOut;
    apIn = v;
    line[idx] = apOut;
    idx = (idx + 1) % len;
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  const attack = Math.floor(sr * 0.0015);
  const tail = Math.floor(sr * 0.4);
  for (let i = 0; i < length; i++) {
    let g = norm;
    if (i < attack) g *= i / attack;
    if (i > length - tail) g *= (length - i) / tail;
    data[i] *= g;
  }
  mandolinCache.set(key, out);
  return out;
}

/** Render a phrase's strings ahead of time, so the first notes start on time. */
export function warmMandolin(ctx: AudioContext, notes: RagaNote[]) {
  notes.forEach(({ st }) => mandolinBuffer(ctx, st + 12));
}

/**
 * The raga on the mandolin, played an octave up as the Carnatic mandolin
 * sits. Each course is a pair of strings a few cents apart; a note held long
 * enough is sustained the mandolin's way, with a quick tremolo of the pick.
 * Gamakas bend the ringing strings from the previous swara.
 */
export function mandolinPhrase(stage: Stage, notes: RagaNote[], perf: Performance, level = 0.42) {
  const { ctx } = stage;
  const { times } = perf;
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 2400;
  body.Q.value = 1;
  body.gain.value = 3;
  body.connect(stage.out);
  const send = ctx.createGain();
  send.gain.value = 0.35;
  body.connect(send).connect(stage.room);

  notes.forEach(({ st, gamaka }, k) => {
    const t = times[k];
    const next = k < notes.length - 1 ? times[k + 1] : t + 1.4;
    const held = next - t;
    // Tremolo on long notes: re-pick about twelve times a second.
    const picks = held > 0.7 ? Math.floor((held - 0.1) / 0.085) : 1;
    for (let p = 0; p < picks; p++) {
      const at = t + p * 0.085;
      // The second string of the course is a shade quieter and only a cent
      // apart, so the pair reads as one note, not two players.
      const shade = (Math.random() - 0.5) * 2;
      const bend = Math.floor(Math.random() * 2 ** 31);
      [
        { detune: -0.6, gain: 1 },
        { detune: 0.6, gain: 0.45 },
      ].forEach(({ detune, gain }, string) => {
        const src = ctx.createBufferSource();
        src.buffer = mandolinBuffer(ctx, st + 12);
        src.detune.value = detune + shade;
        const g = ctx.createGain();
        // Tremolo picks are lighter, and never quite even.
        const v = gain * level * perf.force[k] * (p === 0 ? 1 : 0.5 + 0.12 * Math.random());
        g.gain.setValueAtTime(v, at);
        // Each new pick (or the next note) damps the last.
        g.gain.setTargetAtTime(0, p < picks - 1 ? at + 0.085 : next + 0.02, p < picks - 1 ? 0.02 : 0.08);
        const span = gamaka && p === 0 ? gamakaSpan(t, next) : null;
        if (gamaka && span) {
          const from = k > 0 ? Math.pow(2, (notes[k - 1].st - st) / 12) : null;
          shapeGamaka(src.playbackRate, gamaka, at, span, 1, from, seeded(bend));
        }
        src.connect(g).connect(body);
        src.start(at + string * 0.002);
        src.stop(next + 0.6);
      });
    }
    stage.onNote(t, 0.55);
  });
}

/** One mandolin note for the site's scroll notes: a single pick of the course, an octave up. */
export function mandolinPluck(stage: Stage, st: number, at: number, velocity = 1, pan = 0) {
  const { ctx } = stage;
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(stage.out);
  const send = ctx.createGain();
  send.gain.value = 0.35;
  panner.connect(send).connect(stage.room);
  const shade = (Math.random() - 0.5) * 2;
  [
    { detune: -0.6, gain: 1 },
    { detune: 0.6, gain: 0.45 },
  ].forEach(({ detune, gain }, string) => {
    const src = ctx.createBufferSource();
    src.buffer = mandolinBuffer(ctx, st + 12);
    src.detune.value = detune + shade;
    const g = ctx.createGain();
    g.gain.value = 0.32 * gain * velocity;
    src.connect(g).connect(panner);
    src.start(at + string * 0.002);
  });
  stage.onNote(at, 0.6 * velocity);
}

/* ---------- Sustained voices: violin and nadaswaram ---------- */

type Voice = {
  /** Semitones above the swara: 0 for the violin, 12 for the nadaswaram. */
  octave: number;
  /** The tone source, before the body shapes it — all at one pitch (detuned layers sounded like two players). */
  waves: { type: OscillatorType; gain: number }[];
  /** Resonances of the body (violin) or the bore and bell (nadaswaram). */
  body: { f: number; q: number; gain: number }[];
  lowpass: number;
  /** Bow or breath noise, relative to the tone. */
  noise: number;
  /** Vibrato on held notes: rate (Hz) and depth (cents). */
  vibrato: { rate: number; depth: number };
  /** Seconds to reach full level. */
  attack: number;
  /** How much of the hall. */
  room: number;
};

/**
 * The Carnatic violin: tuned to Sa and Pa and played seated, its gamakas
 * made by sliding the finger along the string. A bright bowed tone, the
 * box's resonances, a little bow noise, and vibrato only on held notes.
 */
const VIOLIN: Voice = {
  octave: 0,
  waves: [
    { type: "sawtooth", gain: 0.7 },
    { type: "sawtooth", gain: 0.3 },
  ],
  body: [
    { f: 280, q: 1.2, gain: 5 },
    { f: 1100, q: 1.6, gain: 3 },
    { f: 2700, q: 1.8, gain: 4 },
  ],
  lowpass: 5200,
  noise: 0.025,
  vibrato: { rate: 5.6, depth: 14 },
  attack: 0.09,
  room: 0.5,
};

/**
 * The nadaswaram: a double reed with a long conical bore and a wide bell,
 * loud and bright, played in temples and weddings. A reedy tone (square and
 * saw), a strong nasal resonance, breath, and a quick, narrow vibrato.
 */
const NADASWARAM: Voice = {
  octave: 12,
  waves: [
    { type: "square", gain: 0.45 },
    { type: "sawtooth", gain: 0.55 },
  ],
  body: [
    { f: 1250, q: 1.3, gain: 9 },
    { f: 2900, q: 1.6, gain: 5 },
  ],
  lowpass: 6500,
  noise: 0.035,
  vibrato: { rate: 6.2, depth: 9 },
  attack: 0.05,
  room: 0.42,
};

function noise(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * One continuous voice through the whole phrase, gliding from swara to swara
 * so gamakas are real slides: a jaaru starts on the previous swara and slides
 * into the new one, a kampita then sways above it.
 */
function sustainedPhrase(stage: Stage, voice: Voice, notes: RagaNote[], perf: Performance, end: number, level: number) {
  const { ctx } = stage;
  const { times } = perf;
  const f = (st: number) => hz(st + voice.octave);
  const start = times[0];

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(level, start + voice.attack);
  let node: AudioNode = amp;
  voice.body.forEach(({ f: freq, q, gain }) => {
    const peak = ctx.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = freq;
    peak.Q.value = q;
    peak.gain.value = gain;
    node.connect(peak);
    node = peak;
  });
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = voice.lowpass;
  node.connect(lowpass);
  // Body filters add a lot of gain; bring it back to the others' level.
  const trim = ctx.createGain();
  trim.gain.value = 0.32;
  lowpass.connect(trim).connect(stage.out);
  const send = ctx.createGain();
  send.gain.value = voice.room;
  trim.connect(send).connect(stage.room);

  // Pitch: one frequency every wave follows, plus vibrato.
  const pitch = ctx.createConstantSource();
  // Set just before the first note, so its own curve has the moment to itself.
  pitch.offset.setValueAtTime(f(notes[0].st), start - 0.01);
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = voice.vibrato.rate;
  const vibratoDepth = ctx.createGain();
  vibratoDepth.gain.setValueAtTime(0, start);
  vibrato.connect(vibratoDepth);

  // No player holds pitch dead still: two slow, unrelated drifts of a few
  // cents, and a vibrato whose speed wanders a little.
  const drift = [0.21 + 0.08 * Math.random(), 0.53 + 0.15 * Math.random()].map((rate, i) => {
    const o = ctx.createOscillator();
    o.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 3.5 : 2;
    o.connect(g);
    return { o, g };
  });
  const wander = ctx.createOscillator();
  wander.frequency.value = 0.4;
  const wanderDepth = ctx.createGain();
  wanderDepth.gain.value = voice.vibrato.rate * 0.08;
  wander.connect(wanderDepth).connect(vibrato.frequency);

  const sources: AudioScheduledSourceNode[] = [pitch, vibrato, wander, ...drift.map((d) => d.o)];
  voice.waves.forEach(({ type, gain }) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = 0;
    pitch.connect(o.frequency);
    vibratoDepth.connect(o.frequency);
    drift.forEach((d) => d.g.connect(o.detune));
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g).connect(amp);
    sources.push(o);
  });

  const hiss = ctx.createBufferSource();
  hiss.buffer = noise(ctx);
  hiss.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3000;
  band.Q.value = 0.7;
  const hissGain = ctx.createGain();
  hissGain.gain.value = voice.noise;
  hiss.connect(band).connect(hissGain).connect(amp);
  sources.push(hiss);

  notes.forEach(({ st, gamaka }, k) => {
    const t = times[k];
    const target = f(st);
    const next = k < notes.length - 1 ? times[k + 1] : end;
    // Firmer notes are bowed or blown harder, and a held note swells a
    // little through its length, as a player leans into it.
    const firm = level * (0.75 + 0.35 * perf.force[k]);
    if (k > 0) {
      // A light articulation: a bow change, or the tongue on the reed.
      amp.gain.setValueAtTime(firm, t - 0.025);
      amp.gain.linearRampToValueAtTime(firm * 0.72, t);
      amp.gain.linearRampToValueAtTime(firm, t + 0.07);
    }
    if (next - t > 0.6) amp.gain.linearRampToValueAtTime(firm * 1.12, next - 0.05);
    const prev = k > 0 ? f(notes[k - 1].st) : null;
    const span = gamaka ? gamakaSpan(t, next) : null;
    if (gamaka && span) shapeGamaka(pitch.offset, gamaka, t, span, target, prev);
    else scoop(pitch.offset, t, target, prev, next - t);
    // Vibrato blooms only on notes held long enough to sing.
    vibratoDepth.gain.setValueAtTime(0, t);
    if (next - t > 0.5) {
      const depth = target * (Math.pow(2, voice.vibrato.depth / 1200) - 1);
      vibratoDepth.gain.linearRampToValueAtTime(depth, t + Math.min(0.5, next - t - 0.1));
    }
    stage.onNote(t, 0.45);
  });

  amp.gain.setValueAtTime(level, end - 0.4);
  amp.gain.linearRampToValueAtTime(0, end);
  sources.forEach((s) => {
    s.start(start);
    s.stop(end + 0.1);
  });
}

/** The raga on the violin. `end` is when the bow leaves the string. */
export function violinPhrase(stage: Stage, notes: RagaNote[], perf: Performance, end: number, level = 0.2) {
  sustainedPhrase(stage, VIOLIN, notes, perf, end, level);
}

/** The raga on the nadaswaram. `end` is when the breath stops. */
export function nadaswaramPhrase(stage: Stage, notes: RagaNote[], perf: Performance, end: number, level = 0.16) {
  sustainedPhrase(stage, NADASWARAM, notes, perf, end, level);
}

/* ---------- Tambura ---------- */

const tamburaCache = new Map<number, AudioBuffer>();

/**
 * One tambura string. Karplus–Strong with a soft, fingertip pluck and a long
 * ring, then the jawari: the curved bridge that makes a tambura buzz. Here
 * the string's own sound is folded through a soft saturation that blooms a
 * moment after the pluck and fades slowly, so the upper harmonics swell and
 * shimmer the way a tambura's do.
 */
function tamburaBuffer(ctx: AudioContext, st: number) {
  const key = Math.round(st * 1000);
  const hit = tamburaCache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const f = hz(st);
  const seconds = 9;
  const length = Math.floor(sr * seconds);
  const out = ctx.createBuffer(1, length, sr);
  const data = out.getChannelData(0);
  let len = Math.floor(sr / f + 0.5);
  let frac = sr / f + 0.5 - len;
  if (frac < 0.1) {
    len -= 1;
    frac += 1;
  }
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(len);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    // A soft fingertip: dark noise, so the attack is a bloom, not a pick.
    prev = prev * 0.85 + (Math.random() * 2 - 1) * 0.15;
    line[i] = prev;
  }
  const loss = Math.pow(0.001, 1 / (f * 10));
  let idx = 0;
  let apIn = 0;
  let apOut = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % len];
    const v = loss * 0.5 * (a + b);
    apOut = c * v + apIn - c * apOut;
    apIn = v;
    line[idx] = apOut;
    idx = (idx + 1) % len;
    // The jawari: blooms over the first ~0.4 s, then fades with the string.
    const time = i / sr;
    const bloom = Math.min(1, time / 0.5) * Math.exp(-time / 5);
    data[i] = a + bloom * (Math.tanh(a * 4) / 4 - a);
    peak = Math.max(peak, Math.abs(data[i]));
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  const attack = Math.floor(sr * 0.04);
  const tail = Math.floor(sr * 2);
  for (let i = 0; i < length; i++) {
    let g = norm;
    if (i < attack) g *= i / attack;
    if (i > length - tail) g *= (length - i) / tail;
    data[i] *= g;
  }
  tamburaCache.set(key, out);
  return out;
}

/**
 * Start a tambura: its strings (`pitches`, in plucking order) plucked one
 * after another, round and round, never quite evenly, until stopped. Returns
 * a handle whose `stop(at)` lets it fade from `at`.
 */
export function startTambura(stage: Stage, pitches: number[], at: number, level = 0.075) {
  const { ctx } = stage;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, at);
  bus.gain.linearRampToValueAtTime(level, at + 1.2);
  // The tambura's gourd: a warm low body and a nasal shimmer high up.
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 180;
  body.Q.value = 0.9;
  body.gain.value = 3;
  const shimmer = ctx.createBiquadFilter();
  shimmer.type = "peaking";
  shimmer.frequency.value = 1600;
  shimmer.Q.value = 1.1;
  shimmer.gain.value = 4;
  bus.connect(body).connect(shimmer).connect(stage.out);
  const send = ctx.createGain();
  send.gain.value = 0.5;
  shimmer.connect(send).connect(stage.room);
  pitches.forEach((st) => tamburaBuffer(ctx, st));

  // Plucked slowly — about a second apart, a longer breath after the low Sa —
  // and ringing long, so it reads as one continuous drone under the raga
  // rather than a second player.
  const gaps = pitches.map((_, i) => (i === pitches.length - 1 ? 1.6 : 1.05));
  let next = at + 0.05;
  let i = 0;
  let stopAt = Infinity;
  const schedule = () => {
    while (next < Math.min(ctx.currentTime + 1, stopAt)) {
      const src = ctx.createBufferSource();
      src.buffer = tamburaBuffer(ctx, pitches[i]);
      src.detune.value = (Math.random() - 0.5) * 2;
      const g = ctx.createGain();
      g.gain.value = 0.85 + 0.25 * Math.random();
      src.connect(g).connect(bus);
      src.start(next);
      src.stop(next + 9);
      next += gaps[i] * (0.94 + 0.12 * Math.random());
      i = (i + 1) % pitches.length;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 200);

  return {
    stop(when: number) {
      const t = Math.max(when, ctx.currentTime);
      stopAt = t;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.setTargetAtTime(0, t, 0.9);
      window.setTimeout(() => window.clearInterval(timer), Math.max(0, (t - ctx.currentTime) * 1000) + 100);
      window.setTimeout(() => bus.disconnect(), Math.max(0, (t - ctx.currentTime) * 1000) + 10000);
    },
  };
}

/* ---------- Sruti box ---------- */

/**
 * Start a sruti box: small reeds kept sounding by hand bellows — one steady
 * chord of Sa and its fifth (or fourth), no plucks at all. Each reed is a
 * bright buzz (saw and square at one pitch) softened by the box; the bellows
 * make the whole sound breathe slowly. Returns a handle whose `stop(at)` lets
 * it fade from `at`.
 */
export function startSruti(stage: Stage, pitches: number[], at: number, level = 0.045) {
  const { ctx } = stage;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, at);
  bus.gain.linearRampToValueAtTime(level, at + 1.8);
  // The box: reeds are bright, the wooden case takes the edge off.
  const box = ctx.createBiquadFilter();
  box.type = "lowpass";
  box.frequency.value = 1900;
  box.Q.value = 0.4;
  const nasal = ctx.createBiquadFilter();
  nasal.type = "peaking";
  nasal.frequency.value = 950;
  nasal.Q.value = 1;
  nasal.gain.value = 4;
  // The bellows: a slow swell and ease, never quite regular.
  const breath = ctx.createGain();
  breath.gain.value = 1;
  const bellows = [0.13, 0.31].map((rate, i) => {
    const o = ctx.createOscillator();
    o.frequency.value = rate * (0.9 + 0.2 * Math.random());
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.14 : 0.05;
    o.connect(g).connect(breath.gain);
    return o;
  });
  bus.connect(breath).connect(box).connect(nasal).connect(stage.out);
  const send = ctx.createGain();
  send.gain.value = 0.45;
  nasal.connect(send).connect(stage.room);

  const reeds = pitches.flatMap((st, i) => {
    const f = hz(st);
    // Lower reeds sound a little fuller.
    const weight = i === 0 ? 1 : 0.75;
    return (["sawtooth", "square"] as const).map((type) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = weight * (type === "sawtooth" ? 0.6 : 0.25);
      o.connect(g).connect(bus);
      return o;
    });
  });
  const sources = [...reeds, ...bellows];
  sources.forEach((o) => o.start(at));

  return {
    stop(when: number) {
      const t = Math.max(when, ctx.currentTime);
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.setTargetAtTime(0, t, 1.1);
      sources.forEach((o) => o.stop(t + 7));
      window.setTimeout(() => bus.disconnect(), Math.max(0, (t - ctx.currentTime) * 1000) + 7500);
    },
  };
}
