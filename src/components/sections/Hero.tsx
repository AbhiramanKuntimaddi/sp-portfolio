import { hero } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/*
 * Sa — the name, set like the deck's cover and centred on the screen: "Spandana"
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

      {/* The name, centred on the screen itself (not between the top row and the
          foot, which pulled it low), sitting a touch above the middle. On very
          short screens (a phone on its side) it falls back into the flow so
          nothing overlaps. */}
      <div className="my-12 [@media(min-height:600px)]:absolute [@media(min-height:600px)]:inset-x-0 [@media(min-height:600px)]:top-[45%] [@media(min-height:600px)]:my-0 [@media(min-height:600px)]:-translate-y-1/2 [@media(min-height:600px)]:px-gutter">
        <div data-exit="hero" className="mx-auto w-full max-w-(--grid-max) text-center">
          {/* Above the name, on the left: the word as a dictionary gives it —
            her scripts, the part of speech, then what it means. */}
          <p className="label mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-left lg:mb-6" data-cue="quiet" data-delay="0.95">
            <span className="text-accent">{hero.scripts}</span>
            <span className="text-muted">(n.)</span>
            <span className="text-foreground">{hero.definition}</span>
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
        </div>
      </div>

      {/* The foot: her roles on the left, the hint on the right. */}
      <div data-exit className="mx-auto flex w-full max-w-(--grid-max) flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        {/* Her roles in the heading face, with thin brass slashes between —
            quiet enough to leave the name and the signature in charge; written
            in one after another. */}
        <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-2" data-cue="scribe" data-delay="1.3">
          {hero.roles.map((r, i) => (
            <li key={r} className="flex items-baseline gap-4">
              {i > 0 && (
                <span className="text-xl font-light text-accent sm:text-2xl" aria-hidden="true">
                  /
                </span>
              )}
              <span className="font-heading text-lg font-bold tracking-[-0.03em] text-foreground sm:text-xl lg:text-[1.4rem]">
                {r}
              </span>
            </li>
          ))}
        </ul>
        <p className="label max-w-xs shrink-0 text-muted sm:text-right" data-cue="quiet" data-delay="1.9">
          Each section plays a note as you scroll. Press and hold anywhere to move the sand.
        </p>
      </div>
    </section>
  );
}
