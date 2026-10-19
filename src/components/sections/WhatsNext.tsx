import { next } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/* Ni — the leading note, pulling towards what comes next. */
export default function WhatsNext() {
  return (
    <section id="next" className="relative z-10 py-32 lg:py-48">
      <div className="mx-auto grid max-w-(--grid-max) gap-16 px-gutter lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <SwaraMark index={6} />
          <h2 className="headline mt-10 font-heading text-[19vw] lg:text-[10vw] min-[1680px]:text-[170px]">
            <span className="block" data-split="chars" data-cue data-delay="0.15">{next.heading[0]}</span>
            <em className="block font-display" data-split="chars" data-cue data-delay="0.3">{next.heading[1]}</em>
          </h2>
        </div>

        <article
          data-surface="accent"
          className="self-end rounded-[2px] bg-background p-8 text-foreground sm:p-12 lg:col-span-5 lg:col-start-8"
          data-reveal
        >
          <div className="flex items-center justify-between gap-4">
            <span className="label">{next.eyebrow}</span>
            <span className="label rounded-full border border-line px-3 py-1.5">Dec 2026</span>
          </div>
          <h3 className="mt-20 font-heading text-6xl leading-none sm:text-7xl">{next.title}</h3>
          <p className="mt-4 font-display text-2xl italic">Jaipuri juttis &amp; artisanal accessories</p>
          <p className="mt-10 max-w-md leading-relaxed">{next.body}</p>
          <p className="label mt-12">{next.launch}</p>
        </article>
      </div>
    </section>
  );
}
