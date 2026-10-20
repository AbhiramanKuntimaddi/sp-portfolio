import type { Drone, Instrument, RAGAS, TalaName, Tuning } from "./ragas";

/*
 * The preloader's music: five switches. Change a value here and nothing
 * else — the raga, its tala, the instrument, the drone and the tuning all
 * follow, and the entry modal names what will play. The ragas and talas
 * themselves are in ./ragas.ts.
 */

/**
 * Which raga opens the site: "mohanam", "yamunakalyani", "hamsadhwani",
 * "mayamalavagowla", "shankarabharanam", "kalyani", "kharaharapriya",
 * "abhogi" or "hindolam".
 */
export const PRELOAD_RAGA: keyof typeof RAGAS = "mohanam";

/**
 * Which tala it's counted in: "adi", "rupaka", "misraChapu", "khandaChapu",
 * "eka", "tisraTriputa", "jhampa" or "ata" — or "own" for the tala the raga
 * is best known in (see each raga in ./ragas.ts).
 */
export const PRELOAD_TALA = "own" as TalaName | "own";

/**
 * Which instrument plays it: "veena", "venu" (flute), "violin", "mandolin",
 * "nadaswaram" or "guitar" — or "none" for a silent preloader (the site's
 * own music then starts as the plate is struck). Nothing else needs changing.
 */
export const PRELOAD_INSTRUMENT = "none" as Instrument | "none";

/**
 * The drone under the raga: "tambura" (plucked, round and round), "sruti"
 * (a sruti box's reeds, one breathing chord), or "none". Either sounds Sa
 * with Pa, or with Ma when the raga has no Pa (Abhogi, Hindolam), as a
 * tambura is tuned for those ragas.
 */
export const PRELOAD_DRONE = "tambura" as Drone;

/**
 * How the raga and its drone are tuned: "classical", the pure ratios of
 * Carnatic shruti with every swara in tune against the Sa–Pa drone, or
 * "equal", the piano's equal temperament (see ./tuning.ts).
 */
export const PRELOAD_TUNING = "equal" as Tuning;
