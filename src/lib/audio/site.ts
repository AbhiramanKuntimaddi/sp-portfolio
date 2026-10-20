/*
 * The site's own music, under the scroll: two switches. (The preloader's
 * raga has its own, in ./preload.ts.)
 *
 * As you scroll, each chapter plays its swara; underneath it sits the
 * background. Change a value here and nothing else.
 */

/** What sounds under the scroll notes. */
export type SiteBackground = "strings" | "tambura" | "sruti" | "tamburaAndStrings" | "srutiAndStrings" | "none";

/** What plays each chapter's swara. */
export type SiteInstrument = "guitar" | "veena" | "mandolin";

/**
 * The background: "strings" (a soft bowed chord that changes with each
 * chapter), "tambura" (the plucked drone, Sa and Pa, carrying on from the
 * preloader through the whole site), "sruti" (the sruti box's reeds, the
 * same), "tamburaAndStrings" or "srutiAndStrings" (the drone with the
 * chords above it), or "none" (the scroll notes alone).
 */
export const SITE_BACKGROUND = "strings" as SiteBackground;

/**
 * The instrument that plays each chapter's swara as you scroll: "guitar"
 * (warm nylon, with a soft octave above), "veena" or "mandolin".
 */
export const SITE_INSTRUMENT = "guitar" as SiteInstrument;
