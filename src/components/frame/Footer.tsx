"use client";

import { SITE } from "@/lib/content";
import { scrollToSection } from "./Header";

/*
 * The site footer, separate from the Contact chapter: one quiet row on a
 * hairline, like the reference deck's footer — the name and city, a way back
 * to the first note, and the credit.
 */
export default function Footer() {
  return (
    <footer data-gated className="relative z-10 px-gutter pb-8 lg:pb-10">
      <div className="mx-auto grid max-w-(--grid-max) items-center gap-4 border-t border-line pt-6 sm:grid-cols-3">
        <p className="label text-muted">
          © {new Date().getFullYear()} {SITE.name} · {SITE.city}
        </p>
        <button
          type="button"
          onClick={() => scrollToSection("top")}
          className="label group w-fit cursor-pointer text-foreground sm:justify-self-center"
        >
          <span className="ulink">Back to Sa</span> ↑
        </button>
        <a
          href={SITE.credit.url}
          target="_blank"
          rel="noreferrer"
          className="label w-fit text-muted sm:justify-self-end"
        >
          Website brought to life by <span className="ulink text-foreground">{SITE.credit.name}</span>
        </a>
      </div>
    </footer>
  );
}
