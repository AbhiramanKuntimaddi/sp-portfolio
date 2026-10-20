import { givingBack } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/*
 * Pa — what she gives back. Three solid tiles: what she does (a small label),
 * the key fact in big type, and one plain sentence. Each hangs on a string
 * (globals.css, [data-string]) like the other lists on the page.
 */
export default function GivingBack() {
  return (
    <section id="giving" className="relative z-10 py-32 lg:py-48">
      <div data-exit className="mx-auto max-w-(--grid-max) px-gutter">
        <SwaraMark index={4} />
        <h2 className="headline title mt-10 font-heading" data-split="chars" data-cue data-delay="0.15">
          Giving back
        </h2>

        <div className="mt-16 grid gap-4 sm:grid-cols-3 lg:mt-24" data-strings>
          {givingBack.map((g) => (
            <article
              key={g.figure}
              data-no-halo
              data-reveal
              data-string
              className="flex flex-col overflow-hidden rounded-xs bg-surface p-7 lg:p-9"
            >
              <span className="label text-accent">{g.kicker}</span>
              <h3 data-string-title className="mt-14 font-heading text-3xl font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-4xl">
                {g.figure}
              </h3>
              <p className="mt-4 max-w-xs text-[0.95rem] leading-[1.75] text-muted">{g.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
