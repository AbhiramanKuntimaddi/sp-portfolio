import type { Metadata } from "next";
import Link from "next/link";
import Cymatics from "@/components/cymatics/Cymatics";
import ReadingVeil from "@/components/ReadingVeil";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: `Off the scale · ${SITE.name}`,
};

/*
 * 404 — a note that isn't in the octave. The plate is tuned between modes,
 * so the sand never quite finds its lines.
 */
const OFF_SCALE = { name: "—", hz: 404, n: 4.37, m: 6.13, sign: 0.41, intensity: 0.75 };

export default function NotFound() {
  return (
    <>
      <Cymatics tuning={OFF_SCALE} restless={0.9} />
      <ReadingVeil />
      <main className="relative z-10 flex min-h-dvh flex-col justify-between px-gutter py-5 lg:py-7">
        <div className="mx-auto flex w-full max-w-(--grid-max) items-center justify-between">
          <Link href="/" className="label">
            {SITE.name}
          </Link>
          <span className="label text-muted">Error 404</span>
        </div>

        <div className="mx-auto w-full max-w-(--grid-max)">
          <p className="label flex items-baseline gap-3 text-muted">
            <span className="font-display text-xl normal-case italic tracking-normal text-accent">404.00 Hz</span>
            <span className="h-px w-8 translate-y-[-0.25em] bg-line" aria-hidden="true" />
            <span>Out of tune</span>
          </p>
          <h1 className="headline mt-8 font-heading text-[22vw] lg:text-[14vw] min-[1680px]:text-[235px]">
            Off the <em className="font-display">scale.</em>
          </h1>
          <div className="mt-12 flex flex-col gap-10 lg:mt-16 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-md text-lg leading-relaxed text-muted">
              This page isn’t part of the octave — it may have moved, or it never existed. The sand can’t find its
              lines here either.
            </p>
            <Link href="/" className="font-display text-3xl italic text-accent">
              <span className="ulink">Return to Sa ↗</span>
            </Link>
          </div>
        </div>

        <p className="label mx-auto w-full max-w-(--grid-max) text-muted">
          © {new Date().getFullYear()} {SITE.name} · {SITE.city}
        </p>
      </main>
    </>
  );
}
