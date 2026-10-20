import type { Metadata } from "next";
import Link from "next/link";
import Cymatics from "@/components/cymatics/Cymatics";
import ReadingVeil from "@/components/cymatics/ReadingVeil";
import SoundToggle from "@/components/frame/SoundToggle";
import { LostTune, ReturnToSa, WrongNoteLine } from "@/components/not-found/LostTune";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: `Off the scale · ${SITE.name}`,
};

/*
 * 404 — a note that isn't in the octave. The plate is tuned between modes,
 * so the sand never quite finds its lines, and the strings climb the scale
 * with one swara out of tune, a different one each visit — until you choose
 * to return.
 */
const OFF_SCALE = { name: "—", hz: 404, n: 4.37, m: 6.13, sign: 0.41, intensity: 0.75 };

export default function NotFound() {
  return (
    <>
      <Cymatics tuning={OFF_SCALE} restless={0.9} />
      <ReadingVeil />
      {/* Hold the page back until the visitor has chosen (see LostTune). */}
      <script
        dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.stage='loading'" }}
      />
      <LostTune />
      <main data-gated className="relative z-10 flex min-h-dvh flex-col justify-between px-gutter py-5 lg:py-7">
        <div className="mx-auto flex w-full max-w-(--grid-max) items-center justify-between">
          <Link href="/" className="label">
            {SITE.name}
          </Link>
          <div className="flex items-center gap-6">
            <span className="label hidden text-muted sm:inline">Error 404</span>
            <SoundToggle />
          </div>
        </div>

        <div className="mx-auto w-full max-w-(--grid-max)">
          <p className="label flex items-baseline gap-3 text-muted">
            <span className="text-accent">404.00 Hz</span>
            <span className="h-px w-8 translate-y-[-0.25em] bg-line" aria-hidden="true" />
            <span>Out of tune</span>
          </p>
          <h1 className="headline title--closing mt-8 font-heading">
            Off the <span className="text-accent">scale.</span>
          </h1>
          <div className="mt-12 flex flex-col gap-10 lg:mt-16 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-md text-lg leading-relaxed text-muted">
              This page doesn’t exist, or it has moved.
              <span className="mt-4 block text-base">One note in the scale here is wrong.</span>
              <WrongNoteLine className="mt-1 block text-base text-accent" />
            </p>
            <ReturnToSa className="text-2xl font-semibold tracking-tight text-accent">
              <span className="ulink">Return to Sa</span> <span className="arrow" data-dir="ne" aria-hidden="true">↗</span>
            </ReturnToSa>
          </div>
        </div>

        <p className="label mx-auto w-full max-w-(--grid-max) text-muted">
          © {new Date().getFullYear()} {SITE.name} · {SITE.city}
        </p>
      </main>
    </>
  );
}
