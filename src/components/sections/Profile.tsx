import Image from "next/image";
import { hero, profile, SITE } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/* Re — who she is. */
export default function Profile() {
  return (
    <section id="profile" className="relative z-10 py-32 lg:py-48">
      <div className="mx-auto grid max-w-(--grid-max) gap-16 px-gutter lg:grid-cols-12 lg:gap-8">
        <div className="relative lg:col-span-5">
          <div className="relative aspect-[3/4] w-[82%] overflow-hidden rounded-[2px]" data-reveal="image">
            <Image
              src="/img/portrait.jpg"
              alt="Spandana Puppala"
              fill
              sizes="(min-width: 1024px) 34vw, 82vw"
              className="object-cover object-[55%_75%]"
            />
          </div>
          <div className="absolute -bottom-12 right-0 aspect-[3/4] w-[44%] overflow-hidden rounded-[2px] ring-8 ring-background lg:-bottom-20" data-reveal="image" data-delay="0.3">
            <Image
              src="/img/atelier-painting.jpg"
              alt="Spandana hand-painting florals onto a door panel on site"
              fill
              sizes="(min-width: 1024px) 18vw, 44vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
          <SwaraMark index={1} />
          <p className="mt-10 font-heading text-[2rem] leading-[1.12] sm:text-5xl lg:text-[3.4rem]" data-split="lines" data-cue data-delay="0.2">
            {profile.lead}
          </p>
          <div className="mt-12 grid gap-6 text-base leading-relaxed text-muted sm:grid-cols-2">
            {profile.body.map((p) => (
              <p key={p.slice(0, 20)} data-reveal>
                {p}
              </p>
            ))}
          </div>

          <figure className="mt-20 border-t border-line pt-8">
            <blockquote className="font-display text-3xl italic leading-tight sm:text-4xl" data-split="lines">
              “{profile.quote}”
            </blockquote>
            <figcaption className="label mt-5 text-muted" data-reveal>
              {hero.first} {hero.last}
            </figcaption>
          </figure>

          <p className="mt-16 text-sm text-muted" data-reveal>
            {profile.studioLine}{" "}
            <a href={SITE.studioUrl} target="_blank" rel="noreferrer" className="text-foreground">
              <span className="ulink">SP Design Studio ↗</span>
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
