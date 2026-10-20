import { music } from "@/lib/content";
import Emphasis from "@/components/ui/Emphasis";
import SoundToggle from "@/components/frame/SoundToggle";
import SwaraMark from "./SwaraMark";

/*
 * Dha — the other half. One compact block: the title on the left; beside it,
 * from the top of the title down, the words, the sound control and the facts
 * as a tight list — so nothing floats in empty space or drifts off below.
 */
export default function Music() {
  return (
    <section id="music" className="relative z-10 py-32 lg:py-48">
      <div data-exit className="mx-auto w-full max-w-(--grid-max) px-gutter">
        <SwaraMark index={5} />

        <div className="mt-10 grid gap-14 lg:grid-cols-12 lg:items-start lg:gap-8">
          <h2 className="headline title font-heading lg:col-span-6">
            <span className="block" data-split="chars" data-cue data-delay="0.15">{music.heading[0]}</span>
            <span className="block" data-split="chars" data-cue data-delay="0.3">{music.heading[1]}</span>
            <span className="block text-accent" data-split="chars" data-cue data-delay="0.45">{music.heading[2]}</span>
          </h2>

          <div className="lg:col-span-5 lg:col-start-8 lg:pt-4">
            <p className="text-lg leading-[1.7]" data-reveal>
              <Emphasis text={music.body} />
            </p>
            <div className="mt-6 flex items-center gap-4" data-reveal>
              <span className="label text-muted">{music.listen}</span>
              <SoundToggle className="text-accent" />
            </div>

            <dl className="mt-10 border-b border-line" data-strings>
              {music.facts.map((f) => (
                <div
                  key={f.label}
                  data-reveal
                  data-string
                  className="flex items-baseline justify-between gap-6 py-5"
                >
                  <dt data-string-title className="font-heading text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">{f.value}</dt>
                  <dd className="label text-right text-muted">{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
