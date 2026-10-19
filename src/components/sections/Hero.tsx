import { hero } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/* Sa — the name, defined. The plate rings at its brightest behind it. */
export default function Hero() {
  return (
    <section id="top" className="relative z-10 flex min-h-dvh flex-col justify-between px-gutter pb-24 pt-28 lg:pb-28 lg:pt-36">
      <div className="mx-auto flex w-full max-w-(--grid-max) items-start justify-between gap-6">
        <SwaraMark index={0} delay="1.15" />
        <p className="label hidden text-right text-muted sm:block" data-cue="quiet" data-delay="1.2">
          Hyderabad, India
        </p>
      </div>

      <div className="mx-auto w-full max-w-(--grid-max)">
        <p className="label mb-4 text-accent lg:mb-6" data-cue="quiet" data-delay="0.95">
          <span className="font-display text-base normal-case italic tracking-normal">{hero.scripts}</span>
          <span className="ml-3">(n.)</span>
        </p>

        <h1 className="font-heading">
          <span className="headline block text-[25vw] lg:text-[17.5vw] min-[1680px]:text-[290px]" data-split="chars" data-cue data-emerge data-sand data-delay="0.05">
            {hero.first}
          </span>
          <span className="mt-2 flex flex-col gap-6 lg:mt-0 lg:flex-row lg:items-end lg:justify-between">
            <span className="block max-w-sm font-display text-2xl italic leading-snug text-accent lg:order-1 lg:text-3xl" data-cue="quiet" data-delay="1.0">
              {hero.definition}
            </span>
            <span className="headline block self-end font-display text-[16vw] italic lg:order-2 lg:text-[9vw] min-[1680px]:text-[150px]" data-split="chars" data-cue data-emerge data-sand data-delay="0.25">
              {hero.last}
            </span>
          </span>
        </h1>
      </div>

      <div className="mx-auto flex w-full max-w-(--grid-max) flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <ul className="label flex flex-wrap gap-x-3 gap-y-1 text-foreground" data-cue="stagger" data-delay="1.3">
          {hero.roles.map((r, i) => (
            <li key={r} className="flex gap-3">
              {i > 0 && <span className="text-muted" aria-hidden="true">/</span>}
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
