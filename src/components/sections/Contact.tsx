import { SITE } from "@/lib/content";
import SwaraMark from "./SwaraMark";

/* Ṡa — the octave resolves. Same pattern as the opening Sa, mirrored. */
export default function Contact() {
  return (
    <section id="contact" className="relative z-10 flex min-h-dvh flex-col justify-between pb-24 pt-32 lg:pb-8 lg:pt-48">
      <div className="mx-auto w-full max-w-(--grid-max) px-gutter">
        <SwaraMark index={7} />
        <h2 className="headline title--closing mt-10 font-heading">
          <span className="block" data-split="chars" data-cue data-delay="0.15">Let’s</span>
          <span className="block" data-split="chars" data-cue data-delay="0.3">connect</span>
        </h2>

        <div className="mt-16 grid gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7" data-reveal>
            <p className="label text-muted">Speaking, collaborations, music &amp; press</p>
            <a href={`mailto:${SITE.email}`} className="mt-4 inline-block font-heading text-2xl tracking-tight [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
              <span className="ulink">{SITE.email}</span>
            </a>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:text-right" data-reveal>
            <p className="label text-muted">An interior project?</p>
            <a href={SITE.studioUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xl font-semibold tracking-tight">
              <span className="ulink">{SITE.studioName}</span> ↗
            </a>
          </div>
        </div>
      </div>

      <footer className="mx-auto mt-24 flex w-full max-w-(--grid-max) flex-col gap-3 px-gutter sm:flex-row sm:justify-between">
        <span className="label text-muted">
          © {new Date().getFullYear()} {SITE.name} · {SITE.city}
        </span>
        <a href={SITE.credit.url} target="_blank" rel="noreferrer" className="label text-muted">
          Website brought to life by <span className="ulink text-foreground">{SITE.credit.name}</span>
        </a>
      </footer>
    </section>
  );
}
