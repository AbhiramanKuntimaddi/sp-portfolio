import Image from "next/image";
import { hero, profile, SITE } from "@/lib/content";
import Emphasis from "@/components/ui/Emphasis";
import SwaraMark from "./SwaraMark";

/* Re — who she is. */
export default function Profile() {
  return (
    <section id="profile" className="relative z-10 py-32 lg:py-48">
      <div data-exit className="mx-auto max-w-(--grid-max) px-gutter">
        <SwaraMark index={1} />
        <h2 className="headline title mt-10 font-heading" data-split="chars" data-cue data-delay="0.15">
          Introduction
        </h2>

        <div className="mt-16 grid gap-16 lg:mt-24 lg:grid-cols-12 lg:gap-8">
          <div className="relative lg:col-span-5">
            <div className="relative aspect-3/4 w-[82%] overflow-hidden rounded-xs" data-reveal="image">
              <Image
                src="/img/portrait.jpg"
                alt="Spandana Puppala"
                fill
                sizes="(min-width: 1024px) 34vw, 82vw"
                className="object-cover object-[55%_75%]"
              />
            </div>
            <div
              className="absolute -bottom-12 right-0 aspect-3/4 w-[44%] overflow-hidden rounded-xs ring-8 ring-background lg:-bottom-20"
              data-reveal="image"
              data-delay="0.3"
            >
              <Image
                src="/img/atelier-painting.jpg"
                alt="Spandana hand-painting florals onto a door panel on site"
                fill
                sizes="(min-width: 1024px) 18vw, 44vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            {/* The lead: larger and lighter than everything around it. */}
            <p
              className="font-heading text-[1.6rem] font-medium leading-tight tracking-tight sm:text-3xl lg:text-[2.2rem]"
              data-split="lines"
              data-cue
              data-delay="0.45"
            >
              <Emphasis text={profile.lead} />
            </p>
            <div className="mt-10 grid gap-6 text-[0.95rem] leading-[1.8] text-muted sm:grid-cols-2">
              {profile.body.map((p) => (
                <p key={p.slice(0, 20)} data-reveal>
                  {p}
                </p>
              ))}
            </div>

            {/* Her words, set apart: a brass mark, then the line in the body voice. */}
            <figure className="mt-14 border-t border-line pt-10">
              <span aria-hidden="true" className="block font-heading text-6xl font-extrabold leading-[0.6] text-accent">
                “
              </span>
              <blockquote
                className="mt-2 font-heading text-xl font-medium leading-snug tracking-tight sm:text-2xl"
                data-split="lines"
              >
                {profile.quote}
              </blockquote>
              <figcaption className="label mt-5 text-muted" data-reveal>
                — {hero.first} {hero.last}
              </figcaption>
            </figure>

            <p className="mt-12 text-sm text-muted" data-reveal>
              {profile.studioLine}{" "}
              <a href={SITE.studioUrl} target="_blank" rel="noreferrer" className="font-semibold text-foreground">
                <span className="ulink">SP Design Studio</span> <span className="arrow" data-dir="ne" aria-hidden="true">↗</span>
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
