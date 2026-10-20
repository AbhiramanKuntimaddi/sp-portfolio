"use client";

import type { ReactNode, RefObject } from "react";

/*
 * The question asked before any page plays: "An experience — best with
 * sound". The visitor's click is the gesture browsers require before music
 * can start. Used by the home preloader and the 404.
 *
 * It renders hidden; the page that shows it animates `[data-pre='scrim']`
 * and `[data-pre='modal']` in and out.
 */
export default function EnterModal({
  note,
  details,
  onChoose,
  beginRef,
}: {
  note: ReactNode;
  /** What will play, as a short list (the raga, its tala, the instrument). */
  details?: { label: string; value: string }[];
  onChoose: (withSound: boolean) => void;
  beginRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div
      data-pre="scrim"
      className="invisible fixed inset-0 z-50 flex items-center justify-center bg-background/45 px-gutter opacity-0"
    >
      <div
        data-pre="modal"
        data-no-halo
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-title"
        aria-describedby="experience-note"
        data-sound-toggle
        onKeyDown={(e) => {
          if (e.key === "Escape") onChoose(false);
        }}
        className="w-full max-w-md rounded-xs border border-line bg-background/90 p-8 backdrop-blur-md sm:p-10"
      >
        <p className="label text-accent">An experience</p>
        <h2 id="experience-title" className="headline mt-4 text-5xl sm:text-6xl">
          Best with sound
        </h2>
        <p id="experience-note" className="mt-5 leading-relaxed text-muted">
          {note}
        </p>
        {details && (
          // One row each, label left and value right, so long names
          // (Shankarabharanam, Mayamalavagowla) never break mid-word.
          <dl className="mt-6 border-b border-line">
            {details.map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-6 border-t border-line py-2.5">
                <dt className="label text-muted">{label}</dt>
                <dd className="text-right font-semibold tracking-tight text-accent">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {/* No `disabled` on these buttons: Firefox/Zen restores it across
            reloads and breaks hydration. The pages guard double clicks. */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <button
            ref={beginRef}
            type="button"
            data-sound-toggle
            onClick={() => onChoose(true)}
            className="rounded-xs bg-accent px-5 py-3 font-semibold tracking-tight text-background transition-opacity hover:opacity-90"
          >
            Enter with sound
          </button>
          <button
            type="button"
            data-sound-toggle
            onClick={() => onChoose(false)}
            className="label py-3 text-muted transition-colors hover:text-foreground"
          >
            <span className="ulink">Enter in silence</span>
          </button>
        </div>
      </div>
    </div>
  );
}
