/* How hard the sand works: steps down on slower machines (see Cymatics.tsx). */

/*
 * Quality steps, best first. The canvas resolution (pixel ratio) is what costs
 * most on a weak GPU — every frame is cleared, blended and composited under
 * the page at that size — so it goes first; then fewer grains are drawn (a
 * random subset, so the pattern reads the same, just sparser, with slightly
 * larger grains); then the plate runs at 30 fps.
 */
export const QUALITY = [
  { dpr: 2, grains: 1, fps: 60 },
  { dpr: 1.5, grains: 1, fps: 60 },
  { dpr: 1, grains: 0.7, fps: 60 },
  { dpr: 1, grains: 0.5, fps: 30 },
  { dpr: 0.75, grains: 0.4, fps: 30 },
] as const;

/**
 * Where to start: full quality, unless the browser is drawing WebGL in
 * software. (Core counts and memory aren't used: privacy-minded browsers such
 * as Firefox and Zen report 2 cores on any machine, which put fast computers
 * on the lowest step.)
 */
export function startingQuality(gl: WebGL2RenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer) ? QUALITY.length - 1 : 0;
}
