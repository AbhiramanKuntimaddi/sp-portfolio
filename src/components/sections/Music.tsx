import { music } from "@/lib/content";
import { SoundToggle } from "../Header";
import SwaraMark from "./SwaraMark";

/* Dha — the other half. The plate burns brightest again here. */
export default function Music() {
  return (
    <section id="music" className="relative z-10 flex min-h-dvh flex-col justify-center py-32 lg:py-48">
      <div className="mx-auto w-full max-w-(--grid-max) px-gutter">
        <SwaraMark index={5} />
        <h2 className="headline mt-10 font-heading text-[17vw] lg:text-[11vw] min-[1680px]:text-[11.5625rem]">
          <span className="block" data-split="chars" data-cue data-delay="0.15">{music.heading[0]}</span>
          <span className="block" data-split="chars" data-cue data-delay="0.3">{music.heading[1]}</span>
          <span className="block font-display italic text-accent" data-split="chars" data-cue data-delay="0.5">{music.heading[2]}</span>
        </h2>

        <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 lg:col-start-7">
            <p className="text-lg leading-relaxed sm:text-xl" data-reveal>{music.body}</p>
            <div className="mt-10" data-reveal>
              <SoundToggle className="text-accent" />
            </div>
          </div>
        </div>

        <dl className="mt-20 grid border-t border-line sm:grid-cols-3 lg:mt-28">
          {music.facts.map((f) => (
            <div
              key={f.label}
              className="border-b border-line py-8 sm:border-b-0 sm:border-r sm:px-8 sm:first:pl-0 sm:last:border-r-0"
              data-reveal
            >
              <dt className="font-display text-5xl italic sm:text-6xl">{f.value}</dt>
              <dd className="label mt-4 text-muted">{f.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
