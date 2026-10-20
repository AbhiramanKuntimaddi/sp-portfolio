"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const INTERACTIVE = "a, button, [role='button'], label, summary";
/** The resting frame around the crosshair, and the room around a framed control. */
const REST = 26;
const PAD = 8;

/*
 * A drafting cursor (mouse, trackpad and Apple Pencil; fingers keep the
 * system's touch behaviour), from
 * her other discipline: a fine crosshair, as on an architect's drawing
 * screen, inside four small corner marks. Over anything you can click, the
 * marks leave the crosshair and snap around the control — framing it the way
 * a drawing program frames the object you've selected — and follow it if the
 * page scrolls. Pressing draws the frame in a little.
 *
 * Built to cost almost nothing per frame (the first version made scrolling
 * choppy): every piece is its own fixed element moved only by transform —
 * nothing animates width, height or position, so the page never re-lays out
 * — the moves are reused quickTo tweens rather than a new tween per mouse
 * event, and nothing uses a blend mode, which forced the browser to re-blend
 * the cursor with the animating sand on every frame.
 *
 * The system cursor is only hidden once this one has appeared, so if anything
 * stops it from working the normal cursor is still there.
 */
export default function Cursor() {
  const crossRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const cross = crossRef.current;
    const marks = markRefs.current.filter((m): m is HTMLSpanElement => !!m);
    if (!cross || marks.length !== 4) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Each mark is placed by its outer corner and turned to face inwards.
    // (Done here, not with CSS `translate`: GSAP folds that property into its
    // own transform, which threw the frame off-centre.)
    gsap.set(marks[1], { xPercent: -100 });
    gsap.set(marks[2], { yPercent: -100 });
    gsap.set(marks[3], { xPercent: -100, yPercent: -100 });

    const crossX = gsap.quickTo(cross, "x", { duration: 0.04, ease: "power3.out" });
    const crossY = gsap.quickTo(cross, "y", { duration: 0.04, ease: "power3.out" });
    const markTo = marks.map((m) => ({
      x: gsap.quickTo(m, "x", { duration: reduced ? 0 : 0.38, ease: "expo.out" }),
      y: gsap.quickTo(m, "y", { duration: reduced ? 0 : 0.38, ease: "expo.out" }),
    }));

    let shown = false;
    let target: Element | null = null;
    let pressed = false;
    let px = 0;
    let py = 0;

    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      document.documentElement.classList.toggle("has-cursor", on);
      gsap.to([cross, ...marks], { autoAlpha: on ? 1 : 0, duration: 0.25, overwrite: "auto" });
    };

    // Where the four marks go: a small square round the pointer, or the
    // corners of the control under it.
    const place = (instant = false) => {
      let left = px - REST / 2;
      let top = py - REST / 2;
      let right = px + REST / 2;
      let bottom = py + REST / 2;
      if (target) {
        const r = target.getBoundingClientRect();
        left = r.left - PAD;
        top = r.top - PAD;
        right = r.right + PAD;
        bottom = r.bottom + PAD;
      }
      const inset = pressed ? 3 : 0;
      const corners = [
        [left + inset, top + inset],
        [right - inset, top + inset],
        [left + inset, bottom - inset],
        [right - inset, bottom - inset],
      ];
      corners.forEach(([x, y], k) => {
        if (instant) gsap.set(marks[k], { x, y });
        else {
          markTo[k].x(x);
          markTo[k].y(y);
        }
      });
    };

    // A mouse, a trackpad, or an Apple Pencil hovering over an iPad's screen
    // (and touching it); a finger on the glass hides the cursor instead.
    const pointing = (e: PointerEvent) => e.pointerType === "mouse" || e.pointerType === "pen";

    const move = (e: PointerEvent) => {
      if (!pointing(e)) return;
      px = e.clientX;
      py = e.clientY;
      const first = !shown;
      if (first) gsap.set(cross, { x: px, y: py });
      crossX(px);
      crossY(py);
      const next = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
      const changed = next !== target;
      if (changed) {
        target = next;
        // (GSAP owns this element's transform, so the shrink is a GSAP tween too.)
        gsap.to(cross, { scale: target ? 0.55 : 1, duration: 0.3, ease: "power3.out", overwrite: "auto" });
        marks.forEach((m) => m.classList.toggle("is-framing", !!target));
      }
      // Snap on arriving at (or leaving) a control; while framing one, the
      // marks only need moving when it does (see scroll).
      if (changed || !target || first) place(first);
      show(true);
    };

    // A framed control can move under a still pointer (scrolling): keep up.
    const follow = () => {
      if (target) place();
    };

    const down = (e: PointerEvent) => {
      if (!pointing(e)) {
        show(false);
        return;
      }
      pressed = true;
      place();
    };
    const up = () => {
      if (!pressed) return;
      pressed = false;
      place();
    };
    // Leaving the window, or a Pencil lifted out of hover range.
    const leave = (e: PointerEvent) => {
      if (!e.relatedTarget && pointing(e)) show(false);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.addEventListener("pointerout", leave);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", follow);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.removeEventListener("pointerout", leave);
    };
  }, []);

  return (
    <>
      {["tl", "tr", "bl", "br"].map((corner, k) => (
        <span
          key={corner}
          ref={(el) => {
            markRefs.current[k] = el;
          }}
          aria-hidden="true"
          className="cursor-mark"
          data-corner={corner}
        />
      ))}
      <div ref={crossRef} aria-hidden="true" className="cursor-cross" />
    </>
  );
}
