import { hero } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/*
 * Sa — the name, set like the deck's cover and centred both ways: "spandana"
 * in heavy lowercase, her surname signed beneath it in brass; her roles and
 * the hint along the foot.
 * During loading the sand spells both, each where it will sit.
 */
export default function Hero() {
  return (
    <section id="top" className="relative z-10 flex min-h-dvh flex-col justify-between px-gutter pb-16 pt-28 lg:pb-12 lg:pt-32">
      <div data-exit className="mx-auto flex w-full max-w-(--grid-max) items-start justify-between gap-6">
        <SwaraMark index={0} delay="1.15" />
        <p className="label hidden text-right text-muted sm:block" data-cue="quiet" data-delay="1.25">
          Hyderabad, India
        </p>
      </div>

      {/* The name, centred both ways between the top row and the foot. */}
      <div data-exit="hero" className="mx-auto my-12 w-full max-w-(--grid-max) text-center">
        {/* Above the name, on the left: the word in her scripts. */}
        <p className="label mb-4 text-left text-accent lg:mb-6" data-cue="quiet" data-delay="0.95">
          {hero.scripts} <span className="ml-1">(n.)</span>
        </p>

        <h1 className="relative font-heading">
          {/* Her name keeps its capital: the headline style lowercases everything else. */}
          <span
            className="headline block text-[19vw] lg:text-[18vw] min-[1680px]:text-[19rem]"
            style={{ textTransform: "none" }}
            data-split="chars"
            data-cue
            data-emerge
            data-sand
            data-delay="0.05"
          >
            {hero.first}
          </span>
          {/* Her surname, signed centred beneath the name — clear of the letters
              (the tilt lifts its far end, hence the room above). */}
          <span
            className="signature mx-auto mt-[4vw] block w-fit text-[17vw] lg:mt-[2.5vw] lg:text-[9vw] min-[1680px]:mt-10 min-[1680px]:text-[9.5rem]"
            data-cue
            data-emerge="whole"
            data-sand
            data-delay="0.45"
          >
            {hero.last}
          </span>
        </h1>

        {/* Below the name, on the left: what it means. */}
        <p className="mt-6 text-left text-lg text-accent sm:text-xl lg:mt-8" data-cue="quiet" data-delay="1.05">
          {hero.definition}
        </p>
      </div>

      {/* The foot: her roles on the left, the hint on the right. */}
      <div data-exit className="mx-auto flex w-full max-w-(--grid-max) flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <ul className="label flex flex-wrap gap-x-3 gap-y-1 text-foreground" data-cue="stagger" data-delay="1.3">
          {hero.roles.map((r, i) => (
            <li key={r} className="flex gap-3">
              {i > 0 && (
                <span className="text-muted" aria-hidden="true">
                  /
                </span>
              )}
              {r}
            </li>
          ))}
        </ul>
        <p className="label max-w-xs text-muted sm:text-right" data-cue="quiet" data-delay="1.5">
          Scroll to climb the octave — every chapter is a note. Press and hold anywhere to bow the plate.
        </p>
      </div>
    </section>
  );
}
