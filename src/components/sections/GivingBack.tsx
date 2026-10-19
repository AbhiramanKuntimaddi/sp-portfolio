import { givingBack } from "@/lib/content";
import SwaraMark from "./SwaraMark";

const NUMERALS = ["i.", "ii.", "iii."];

/* Pa — what she gives back. */
export default function GivingBack() {
  return (
    <section id="giving" className="relative z-10 py-32 lg:py-48">
      <div className="mx-auto max-w-(--grid-max) px-gutter">
        <SwaraMark index={4} />
        <h2 className="headline mt-10 font-heading text-[17vw] lg:text-[9.5vw] min-[1680px]:text-[160px]" data-split="chars" data-cue data-delay="0.15">
          Giving <em className="font-display">back</em>
        </h2>

        <div className="mt-20 grid gap-14 sm:grid-cols-3 sm:gap-8 lg:mt-28">
          {givingBack.map((g, i) => (
            <article key={g.title} className="border-t border-line pt-8" data-reveal>
              <span className="font-display text-4xl italic text-accent">{NUMERALS[i]}</span>
              <h3 className="mt-8 font-heading text-2xl leading-tight sm:text-3xl">{g.title}</h3>
              <p className="mt-4 max-w-sm leading-relaxed text-muted">{g.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
