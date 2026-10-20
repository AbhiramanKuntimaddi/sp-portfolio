/* The preloader: tracing the hero's words so the sand can spell them. */

/**
 * Rasterise the hero's own words exactly where the page lays them out (same
 * face, size, spacing and position), and hand every grain a point in them.
 * While the preloader is up the type is laid out but invisible, so the sand
 * can stand in for it — and the real letters can later condense in its place.
 * Plate space: x in [-aspect, aspect], y in [-1, 1].
 */
export function sampleElements(selector: string, aspect: number, count: number) {
  const out = new Float32Array(count * 4);
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cw = 1400;
  const k = cw / vw;
  const ch = Math.max(1, Math.round(vh * k));
  const c2 = document.createElement("canvas");
  c2.width = cw;
  c2.height = ch;
  const ctx = c2.getContext("2d", { willReadFrequently: true });
  if (!ctx || !els.length) return out;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Spell what the page shows: CSS capitals included.
    const raw = (el.textContent ?? "").trim();
    const text =
      cs.textTransform === "uppercase" ? raw.toUpperCase() : cs.textTransform === "lowercase" ? raw.toLowerCase() : raw;
    if (!text || !r.width) return;
    const size = parseFloat(cs.fontSize) * k;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${parseFloat(cs.letterSpacing || "0") * k}px`;
    }
    // Work from the element's own (untransformed) box, turned about its centre
    // by any CSS `rotate` — so a tilted signature is traced tilted.
    const w = el.offsetWidth * k;
    const h = el.offsetHeight * k;
    const turn = cs.rotate && cs.rotate !== "none" ? (parseFloat(cs.rotate) * Math.PI) / 180 : 0;
    // CSS centres the font's content box in the line box; find the baseline the same way.
    const m = ctx.measureText(text);
    const ascent = m.fontBoundingBoxAscent || size * 0.9;
    const descent = m.fontBoundingBoxDescent || size * 0.25;
    const baseline = -h / 2 + (h - (ascent + descent)) / 2 + ascent;
    ctx.save();
    ctx.translate((r.left + r.width / 2) * k, (r.top + r.height / 2) * k);
    ctx.rotate(turn);
    // Honour the element's text alignment inside its box.
    const align = cs.textAlign;
    if (align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(text, 0, baseline);
    } else if (align === "right" || align === "end") {
      ctx.textAlign = "right";
      ctx.fillText(text, w / 2, baseline);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(text, -w / 2, baseline);
    }
    ctx.restore();
  });

  const img = ctx.getImageData(0, 0, cw, ch).data;
  const pts: number[] = [];
  for (let y = 0; y < ch; y += 2) {
    for (let x = 0; x < cw; x += 2) {
      if (img[(y * cw + x) * 4 + 3] > 110) pts.push(((2 * x) / cw - 1) * aspect, 1 - (2 * y) / ch);
    }
  }
  const n = pts.length / 2;
  if (!n) return out;
  // Every grain joins the letters: nothing is left to draw the pattern.
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * n);
    out[i * 4] = pts[j * 2] + (Math.random() - 0.5) * 0.003;
    out[i * 4 + 1] = pts[j * 2 + 1] + (Math.random() - 0.5) * 0.003;
    out[i * 4 + 2] = 1;
  }
  return out;
}
