import { next } from "@/lib/content";
import Emphasis from "@/components/ui/Emphasis";
import SwaraMark from "./SwaraMark";

/* Ni — the leading note, pulling towards what comes next. */
export default function WhatsNext() {
  return (
    <section id="next" className="relative z-10 py-32 lg:py-48">
      <div data-exit className="mx-auto grid max-w-(--grid-max) gap-16 px-gutter lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <SwaraMark index={6} />
          <h2 className="headline title mt-10 font-heading">
            <span className="block" data-split="chars" data-cue data-delay="0.15">{next.heading[0]}</span>
            <span className="block text-accent" data-split="chars" data-cue data-delay="0.3">{next.heading[1]}</span>
          </h2>
        </div>

        <article
          data-surface="accent"
          className="self-end rounded-xs bg-background p-8 text-foreground sm:p-12 lg:col-span-5 lg:col-start-8"
          data-reveal
        >
          <span className="label">{next.eyebrow}</span>
          <h3 className="mt-16 font-heading text-5xl font-extrabold leading-none tracking-tighter sm:text-6xl">{next.title}</h3>
          <p className="mt-4 text-lg font-semibold tracking-tight">Jaipuri juttis &amp; artisanal accessories</p>
          <p className="mt-8 max-w-md leading-[1.75]">
            <Emphasis text={next.body} />
          </p>
          <div className="mt-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <p className="label">{next.launch}</p>
            <a href={next.url} target="_blank" rel="noreferrer" className="font-semibold">
              <span className="ulink">{next.urlLabel}</span> <span className="arrow" data-dir="ne" aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
