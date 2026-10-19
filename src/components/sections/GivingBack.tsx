import { givingBack } from "@/lib/content";
import SwaraMark from "./SwaraMark";

const NUMERALS = ["i.", "ii.", "iii."];

/* Pa — what she gives back. */
export default function GivingBack() {
  return (
    <section id="giving" className="relative z-10 py-32 lg:py-48">
      <div data-exit className="mx-auto max-w-(--grid-max) px-gutter">
        <SwaraMark index={4} />
        <h2 className="headline title mt-10 font-heading" data-split="chars" data-cue data-delay="0.15">
          Giving back
        </h2>

        <div className="mt-20 grid gap-14 sm:grid-cols-3 sm:gap-8 lg:mt-28">
          {givingBack.map((g, i) => (
            <article key={g.title} className="border-t border-line pt-8" data-reveal>
              <h3 className="font-heading text-xl leading-tight tracking-tight sm:text-2xl">{g.title}</h3>
              <p className="mt-4 max-w-sm text-[0.95rem] leading-[1.8] text-muted">{g.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
