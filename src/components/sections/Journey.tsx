import Image from "next/image";
import { journey } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/* Ga — how she was formed. */
export default function Journey() {
  return (
    <section id="journey" className="relative z-10 py-32 lg:py-48">
      <div data-exit className="mx-auto max-w-(--grid-max) px-gutter">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <SwaraMark index={2} />
            <h2 className="headline title mt-10 font-heading" data-split="chars" data-cue data-delay="0.15">
              The journey
            </h2>
          </div>
          <div className="hidden items-end gap-4 lg:col-span-4 lg:col-start-9 lg:flex">
            <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-[2px]" data-reveal="image">
              <Image src="/img/atelier-material.jpg" alt="Material samples — stone, terracotta and timber" fill sizes="16vw" className="object-cover" />
            </div>
            <div className="relative mb-16 aspect-[4/5] flex-1 overflow-hidden rounded-[2px]" data-reveal="image" data-delay="0.2">
              <Image src="/img/atelier-colour.jpg" alt="Colour study with a Josef Albers quote" fill sizes="16vw" className="object-cover" />
            </div>
          </div>
        </div>

        <ol className="mt-20 lg:mt-28">
          {journey.map((j) => (
            <li
              key={j.title}
              className="group grid gap-3 border-t border-line py-9 transition-colors duration-700 last:border-b hover:border-accent lg:grid-cols-12 lg:items-baseline lg:gap-8 lg:py-12"
              data-reveal
            >
              <span className="label text-accent lg:col-span-2">{j.when}</span>
              <h3 className="font-heading text-2xl leading-tight tracking-tight transition-transform duration-700 ease-out group-hover:translate-x-3 sm:text-3xl lg:col-span-5 lg:text-[2.1rem]">
                {j.title}
              </h3>
              <div className="lg:col-span-5">
                <p className="label text-foreground">{j.sub}</p>
                <p className="mt-3 max-w-md text-[0.95rem] leading-[1.8] text-muted">{j.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
