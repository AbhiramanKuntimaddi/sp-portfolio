import { SA_HZ, SWARAS } from "@/lib/content";

/** "Re · 270 Hz — Profile": the note each chapter tunes the plate to. */
export default function SwaraMark({ index, className = "", delay }: { index: number; className?: string; delay?: string }) {
  const s = SWARAS[index];
  return (
    <p className={`label flex items-baseline gap-3 text-muted ${className}`} data-cue="mark" data-delay={delay}>
      <span data-mark-part className="font-display text-xl normal-case italic tracking-normal text-accent">{s.name}</span>
      <span data-mark-part className="tabular-nums">{Math.round(SA_HZ * s.ratio)} Hz</span>
      <span data-mark-line className="h-px w-8 translate-y-[-0.25em] bg-line" aria-hidden="true" />
      <span data-mark-part>{s.label}</span>
    </p>
  );
}
