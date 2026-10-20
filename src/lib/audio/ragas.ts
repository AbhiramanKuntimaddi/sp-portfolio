/*
 * The ragas and the talas the preloader can play. Add or edit ragas here; to
 * choose what plays, use the switches in ./preload.ts. The engine is in
 * ./sound.ts, the instruments in ./instruments.ts, the tuning in ./tuning.ts.
 *
 * The preloader plays a raga the Carnatic way over a pure Sa–Pa drone: the
 * arohana (ascent) while the plate tunes, the avarohana (descent) as the
 * plate is struck. Sa is tuned to 220 Hz.
 *
 * A raga and a tala are independent — the same raga is sung in many talas —
 * so each raga is written in two parts:
 *  - its melody, once: the swaras of each phrase and their gamakas;
 *  - its rhythm in each tala: how many aksharas each of those swaras takes
 *    (½ or ⅓ when notes share an akshara), so that each phrase fills exactly
 *    one cycle (avartanam) of that tala. A rhythm can be written out by hand
 *    (`rhythm`); any tala not written out is fitted by `fitRhythm`.
 * The plate is struck on the next samam, as the arohana's cycle ends.
 *
 * What plays, and how: the four switches in ./preload.ts.
 */

/**
 * Carnatic ornaments, applied on the string's playback rate:
 *  - jaaru: the note slides in from the previous swara;
 *  - kampita: the slide, then a gentle sway as the note settles.
 */
export type Gamaka = "jaaru" | "kampita";

/** The preloader's instruments (see ./instruments.ts and ./sound.ts). */
export type Instrument = "veena" | "venu" | "violin" | "mandolin" | "nadaswaram" | "guitar";

/** Each instrument as the modal names it. */
export const INSTRUMENT_NAMES: Record<Instrument, string> = {
  veena: "Veena",
  venu: "Venu",
  violin: "Violin",
  mandolin: "Mandolin",
  nadaswaram: "Nadaswaram",
  guitar: "Guitar",
};

/** The drone under the raga: a plucked tambura, a reed sruti box, or none. */
export type Drone = "tambura" | "sruti" | "none";

/** Each drone as the modal names it. */
export const DRONE_NAMES: Record<Exclude<Drone, "none">, string> = {
  tambura: "Tambura",
  sruti: "Sruti box",
};

/** "classical": Carnatic shruti ratios. "equal": equal temperament (see ./tuning.ts). */
export type Tuning = "classical" | "equal";

export type RagaNote = {
  /** Semitones above Sa. */
  st: number;
  gamaka?: Gamaka;
};

export type Tala = {
  name: string;
  /** The cycle's parts (angas) in aksharas, e.g. Adi = laghu 4 + drutam 2 + drutam 2. */
  angas: number[];
};

/** The talas every raga is written in. A cycle's length is the sum of its angas. */
export const TALAS = {
  /** 8 aksharas: laghu, drutam, drutam. The most common tala. */
  adi: { name: "Adi talam", angas: [4, 2, 2] },
  /** 6 aksharas: drutam, laghu. */
  rupaka: { name: "Rupaka talam", angas: [2, 4] },
  /** 7 aksharas: 3 + 2 + 2. Common in kritis and devaranamas. */
  misraChapu: { name: "Misra Chapu", angas: [3, 2, 2] },
  /** 5 aksharas: 2 + 3. */
  khandaChapu: { name: "Khanda Chapu", angas: [2, 3] },
  /** 4 aksharas: a single laghu. */
  eka: { name: "Eka talam", angas: [4] },
  /** 7 aksharas: a laghu of 3, then two drutams. */
  tisraTriputa: { name: "Tisra Triputa", angas: [3, 2, 2] },
  /** 10 aksharas: a laghu of 7, an anudrutam, a drutam. */
  jhampa: { name: "Misra Jhampa", angas: [7, 1, 2] },
  /** 14 aksharas: two laghus of 5, two drutams. The tala of many varnams. */
  ata: { name: "Khanda Ata", angas: [5, 5, 2, 2] },
} satisfies Record<string, Tala>;

export type TalaName = keyof typeof TALAS;

/** Aksharas in one cycle of a tala. */
export const aksharas = (tala: TalaName) => TALAS[tala].angas.reduce((sum, a) => sum + a, 0);

/** A raga's rhythm in one tala: the aksharas of each swara, in order. */
export type Rhythm = { arohanam: number[]; avarohanam: number[] };

export type Raga = {
  /** As the modal names it. */
  name: string;
  /** The tala it's best known in: what plays when PRELOAD_TALA is "own". */
  tala: TalaName;
  /** Seconds per akshara: the tempo. */
  beat: number;
  arohanam: RagaNote[];
  avarohanam: RagaNote[];
  /** Rhythms written out by hand; any tala left out is fitted (fitRhythm). */
  rhythm?: Partial<Record<TalaName, Rhythm>>;
};

/**
 * Fit a phrase of `n` swaras to one cycle of a tala, the way it would be
 * counted in practice:
 *  - as many aksharas as swaras or more: each swara takes the same whole
 *    number of aksharas (a slower kalam in the long talas), and the last
 *    swara holds what's left;
 *  - more swaras than aksharas: the last swara still lands on a full
 *    akshara, and the others share the rest two or three to an akshara, the
 *    busier aksharas falling towards the end of the phrase.
 */
export function fitRhythm(n: number, tala: TalaName): number[] {
  const cycle = aksharas(tala);
  if (n <= cycle) {
    const each = Math.floor(cycle / n);
    return [...Array<number>(n - 1).fill(each), cycle - each * (n - 1)];
  }
  const slots = cycle - 1;
  const notes = n - 1;
  const base = Math.floor(notes / slots);
  const busier = notes % slots;
  const beats: number[] = [];
  for (let i = 0; i < slots; i++) {
    const k = base + (i >= slots - busier ? 1 : 0);
    for (let j = 0; j < k; j++) beats.push(1 / k);
  }
  return [...beats, 1];
}

/** A raga's rhythm in a tala: written out if it is, otherwise fitted. */
export function rhythmFor(raga: Raga, tala: TalaName): Rhythm {
  return (
    raga.rhythm?.[tala] ?? {
      arohanam: fitRhythm(raga.arohanam.length, tala),
      avarohanam: fitRhythm(raga.avarohanam.length, tala),
    }
  );
}

// Shorthand for notes that share an akshara.
const H = 1 / 2;
const T = 1 / 3;

/*
 * Each raga below is written the same way:
 *   Name — what it is.
 *     Arohana:    the ascent in swaras
 *     Avarohana:  the descent in swaras
 *   Gamakas: which notes slide (jaaru) or sway (kampita).
 *   Own tala, the tempo, and a well-known piece in that tala.
 *   Rhythms written out by hand, laid out on their aksharas: "|" between
 *   the angas, (brackets) for notes sharing one akshara, "–" for a held one.
 *   Every other tala is fitted (fitRhythm).
 */
export const RAGAS = {
  /*
   * Mohanam — pentatonic, with no Ma and no Ni.
   *   Arohana:    S R₂ G₃ P D₂ Ṡ
   *   Avarohana:  Ṡ D₂ P G₃ R₂ S
   * Gamakas: in both phrases, Ga sways (kampita) and Dha slides in (jaaru).
   * Own tala: Adi, one akshara = 0.42 s — as in the varnam "Ninnukori".
   * Written out below; every other tala fitted.
   *   Adi           S R G P | D Ṡ | – –           Ṡ D P G | R S | – –
   *   Rupaka        S R | G P D Ṡ                 Ṡ D | P G R S
   *   Misra Chapu   S R G | P D | Ṡ –             Ṡ D P | G R | S –
   *   Khanda Chapu  (S R) G | P D Ṡ               (Ṡ D) P | G R S
   */
  mohanam: {
    name: "Mohanam",
    tala: "adi",
    beat: 0.42,
    arohanam: [{ st: 0 }, { st: 2 }, { st: 4, gamaka: "kampita" }, { st: 7 }, { st: 9, gamaka: "jaaru" }, { st: 12 }],
    avarohanam: [{ st: 12 }, { st: 9, gamaka: "jaaru" }, { st: 7 }, { st: 4, gamaka: "kampita" }, { st: 2 }, { st: 0 }],
    rhythm: {
      adi: { arohanam: [1, 1, 1, 1, 1, 3], avarohanam: [1, 1, 1, 1, 1, 3] },
      rupaka: { arohanam: [1, 1, 1, 1, 1, 1], avarohanam: [1, 1, 1, 1, 1, 1] },
      misraChapu: { arohanam: [1, 1, 1, 1, 1, 2], avarohanam: [1, 1, 1, 1, 1, 2] },
      khandaChapu: { arohanam: [H, H, 1, 1, 1, 1], avarohanam: [H, H, 1, 1, 1, 1] },
    },
  },

  /*
   * Yamunakalyani — the raised Ma (M₂), with turns back through Ga and Dha
   * in the arohana; Shuddha Ma (M₁) as the anya swara in the avarohana.
   *   Arohana:    S R₂ G₃ P M₂ G₃ P D₂ N₃ D₂ Ṡ
   *   Avarohana:  Ṡ N₃ D₂ P M₂ G₃ M₁ R₂ S
   * Gamakas: Ga sways in both phrases (kampita); M₂ slides down from Pa, Ga back
   * from M₂, and Dha into and back from Ni (jaaru).
   * Own tala: Misra Chapu, one akshara = 0.4 s — as in "Krishna Nee Begane
   * Baaro".
   * Written out below; every other tala fitted.
   *   Adi           S R (G P) (M G) | P D | (N D) Ṡ        Ṡ N D P | M G | (M R) S
   *   Rupaka        (S R) (G P) | (M G) P (D N D) Ṡ        (Ṡ N) D | (P M) G (M R) S
   *   Misra Chapu   S R (G P) | (M G) P | (D N D) Ṡ        Ṡ N D | (P M) G | (M R) S
   *   Khanda Chapu  (S R) (G P) | (M G P) (D N D) Ṡ        (Ṡ N) (D P) | (M G) (M R) S
   */
  yamunakalyani: {
    name: "Yamunakalyani",
    tala: "misraChapu",
    beat: 0.4,
    arohanam: [
      { st: 0 },
      { st: 2 },
      { st: 4, gamaka: "kampita" },
      { st: 7 },
      { st: 6, gamaka: "jaaru" },
      { st: 4, gamaka: "jaaru" },
      { st: 7 },
      { st: 9, gamaka: "jaaru" },
      { st: 11 },
      { st: 9, gamaka: "jaaru" },
      { st: 12 },
    ],
    avarohanam: [
      { st: 12 },
      { st: 11 },
      { st: 9, gamaka: "jaaru" },
      { st: 7 },
      { st: 6, gamaka: "jaaru" },
      { st: 4, gamaka: "kampita" },
      { st: 5 },
      { st: 2 },
      { st: 0 },
    ],
    rhythm: {
      adi: { arohanam: [1, 1, H, H, H, H, 1, 1, H, H, 1], avarohanam: [1, 1, 1, 1, 1, 1, H, H, 1] },
      rupaka: { arohanam: [H, H, H, H, H, H, 1, T, T, T, 1], avarohanam: [H, H, 1, H, H, 1, H, H, 1] },
      misraChapu: { arohanam: [1, 1, H, H, H, H, 1, T, T, T, 1], avarohanam: [1, 1, 1, H, H, 1, H, H, 1] },
      khandaChapu: { arohanam: [H, H, H, H, T, T, T, T, T, T, 1], avarohanam: [H, H, H, H, H, H, H, H, 1] },
    },
  },

  /*
   * Hamsadhwani — bright and short: pentatonic, with no Ma and no Dha. Each
   * phrase turns once before it ends: Ni–Sa at the top, Ga–Ri at the bottom.
   *   Arohana:    S R₂ G₃ P N₃ Ṡ N₃ Ṡ
   *   Avarohana:  Ṡ N₃ P G₃ R₂ G₃ R₂ S
   * Gamakas: the upper Sa slides in from Ni (jaaru); Ga sways in the
   * avarohana (kampita).
   * Own tala: Adi, one akshara = 0.36 s — as in "Vatapi Ganapatim".
   * Written out below; every other tala fitted.
   *   Adi           S R G P | N Ṡ | N Ṡ              Ṡ N P G | R G | R S
   *   Rupaka        S R | G P (N Ṡ) (N Ṡ)           (Ṡ N) P | G (R G) R S
   *   Misra Chapu   S R G | P N | (Ṡ N) Ṡ           Ṡ N P | G R | (G R) S
   *   Khanda Chapu  (S R) (G P) | (N Ṡ) N Ṡ         (Ṡ N) (P G) | (R G) R S
   */
  hamsadhwani: {
    name: "Hamsadhwani",
    tala: "adi",
    beat: 0.36,
    arohanam: [
      { st: 0 },
      { st: 2 },
      { st: 4 },
      { st: 7 },
      { st: 11 },
      { st: 12, gamaka: "jaaru" },
      { st: 11 },
      { st: 12, gamaka: "jaaru" },
    ],
    avarohanam: [
      { st: 12 },
      { st: 11 },
      { st: 7 },
      { st: 4, gamaka: "kampita" },
      { st: 2 },
      { st: 4 },
      { st: 2 },
      { st: 0 },
    ],
    rhythm: {
      adi: { arohanam: [1, 1, 1, 1, 1, 1, 1, 1], avarohanam: [1, 1, 1, 1, 1, 1, 1, 1] },
      rupaka: { arohanam: [1, 1, 1, 1, H, H, H, H], avarohanam: [H, H, 1, 1, H, H, 1, 1] },
      misraChapu: { arohanam: [1, 1, 1, 1, 1, H, H, 1], avarohanam: [1, 1, 1, 1, 1, H, H, 1] },
      khandaChapu: { arohanam: [H, H, H, H, H, H, 1, 1], avarohanam: [H, H, H, H, H, H, 1, 1] },
    },
  },

  /*
   * Mayamalavagowla — the 15th melakarta, and the first raga a student
   * learns.
   *   Arohana:    S R₁ G₃ M₁ P D₁ N₃ Ṡ
   *   Avarohana:  Ṡ N₃ D₁ P M₁ G₃ R₁ S
   * Gamakas: Ga sways in both phrases (kampita); Ni slides in from Dha, and
   * Dha from Ni in the avarohana (jaaru).
   * Own tala: Adi, one akshara = 0.4 s — as in the sarali varisai.
   * Every tala fitted.
   */
  mayamalavagowla: {
    name: "Mayamalavagowla",
    tala: "adi",
    beat: 0.4,
    arohanam: [
      { st: 0 },
      { st: 1 },
      { st: 4, gamaka: "kampita" },
      { st: 5 },
      { st: 7 },
      { st: 8 },
      { st: 11, gamaka: "jaaru" },
      { st: 12 },
    ],
    avarohanam: [
      { st: 12 },
      { st: 11 },
      { st: 8, gamaka: "jaaru" },
      { st: 7 },
      { st: 5 },
      { st: 4, gamaka: "kampita" },
      { st: 1 },
      { st: 0 },
    ],
  },

  /*
   * Shankarabharanam — the 29th melakarta: every swara in its natural place.
   *   Arohana:    S R₂ G₃ M₁ P D₂ N₃ Ṡ
   *   Avarohana:  Ṡ N₃ D₂ P M₁ G₃ R₂ S
   * Gamakas: Ga sways in both phrases (kampita); Ni slides in from Dha, and
   * Dha from Ni in the avarohana (jaaru).
   * Own tala: Adi, one akshara = 0.4 s — as in "Swara Raga Sudha".
   * Every tala fitted.
   */
  shankarabharanam: {
    name: "Shankarabharanam",
    tala: "adi",
    beat: 0.4,
    arohanam: [
      { st: 0 },
      { st: 2 },
      { st: 4, gamaka: "kampita" },
      { st: 5 },
      { st: 7 },
      { st: 9 },
      { st: 11, gamaka: "jaaru" },
      { st: 12 },
    ],
    avarohanam: [
      { st: 12 },
      { st: 11 },
      { st: 9, gamaka: "jaaru" },
      { st: 7 },
      { st: 5 },
      { st: 4, gamaka: "kampita" },
      { st: 2 },
      { st: 0 },
    ],
  },

  /*
   * Kalyani — the 65th melakarta, with the raised Ma (M₂).
   *   Arohana:    S R₂ G₃ M₂ P D₂ N₃ Ṡ
   *   Avarohana:  Ṡ N₃ D₂ P M₂ G₃ R₂ S
   * Gamakas: M₂ slides in from Ga in the arohana and from Pa in the avarohana
   * (jaaru); Ga sways in the avarohana (kampita).
   * Own tala: Misra Chapu, one akshara = 0.4 s — as in "Nidhi Chala Sukhama".
   * Every tala fitted.
   */
  kalyani: {
    name: "Kalyani",
    tala: "misraChapu",
    beat: 0.4,
    arohanam: [
      { st: 0 },
      { st: 2 },
      { st: 4 },
      { st: 6, gamaka: "jaaru" },
      { st: 7 },
      { st: 9 },
      { st: 11 },
      { st: 12 },
    ],
    avarohanam: [
      { st: 12 },
      { st: 11 },
      { st: 9 },
      { st: 7 },
      { st: 6, gamaka: "jaaru" },
      { st: 4, gamaka: "kampita" },
      { st: 2 },
      { st: 0 },
    ],
  },

  /*
   * Kharaharapriya — the 22nd melakarta, rich in gamaka.
   *   Arohana:    S R₂ G₂ M₁ P D₂ N₂ Ṡ
   *   Avarohana:  Ṡ N₂ D₂ P M₁ G₂ R₂ S
   * Gamakas: Ga and Ni sway in both phrases (kampita).
   * Own tala: Adi, one akshara = 0.4 s — as in "Chakkani Raja".
   * Every tala fitted.
   */
  kharaharapriya: {
    name: "Kharaharapriya",
    tala: "adi",
    beat: 0.4,
    arohanam: [
      { st: 0 },
      { st: 2 },
      { st: 3, gamaka: "kampita" },
      { st: 5 },
      { st: 7 },
      { st: 9 },
      { st: 10, gamaka: "kampita" },
      { st: 12 },
    ],
    avarohanam: [
      { st: 12 },
      { st: 10, gamaka: "kampita" },
      { st: 9 },
      { st: 7 },
      { st: 5 },
      { st: 3, gamaka: "kampita" },
      { st: 2 },
      { st: 0 },
    ],
  },

  /*
   * Abhogi — pentatonic, with no Pa and no Ni.
   *   Arohana:    S R₂ G₂ M₁ D₂ Ṡ
   *   Avarohana:  Ṡ D₂ M₁ G₂ R₂ S
   * Gamakas: in both phrases, Ga sways (kampita) and Dha slides in (jaaru).
   * Own tala: Adi, one akshara = 0.42 s — as in the varnam "Evvari Bodhana".
   * Every tala fitted.
   */
  abhogi: {
    name: "Abhogi",
    tala: "adi",
    beat: 0.42,
    arohanam: [
      { st: 0 },
      { st: 2 },
      { st: 3, gamaka: "kampita" },
      { st: 5 },
      { st: 9, gamaka: "jaaru" },
      { st: 12 },
    ],
    avarohanam: [
      { st: 12 },
      { st: 9, gamaka: "jaaru" },
      { st: 5 },
      { st: 3, gamaka: "kampita" },
      { st: 2 },
      { st: 0 },
    ],
  },

  /*
   * Hindolam — pentatonic, with no Ri and no Pa.
   *   Arohana:    S G₂ M₁ D₁ N₂ Ṡ
   *   Avarohana:  Ṡ N₂ D₁ M₁ G₂ S
   * Gamakas: in both phrases, Ga and Ni sway (kampita) and Dha slides in
   * (jaaru).
   * Own tala: Adi, one akshara = 0.42 s — as in "Samaja Vara Gamana".
   * Every tala fitted.
   */
  hindolam: {
    name: "Hindolam",
    tala: "adi",
    beat: 0.42,
    arohanam: [
      { st: 0 },
      { st: 3, gamaka: "kampita" },
      { st: 5 },
      { st: 8, gamaka: "jaaru" },
      { st: 10, gamaka: "kampita" },
      { st: 12 },
    ],
    avarohanam: [
      { st: 12 },
      { st: 10, gamaka: "kampita" },
      { st: 8, gamaka: "jaaru" },
      { st: 5 },
      { st: 3, gamaka: "kampita" },
      { st: 0 },
    ],
  },
} satisfies Record<string, Raga>;
