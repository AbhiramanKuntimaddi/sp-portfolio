"use client";

import { useEffect, useRef } from "react";
import { resonance, tuningAt, type Tuning } from "@/lib/state/resonance";
import { soundLevel } from "@/lib/audio/sound";
import { compile, readColour, uniforms } from "./gl";
import { QUALITY, startingQuality } from "./quality";
import { DRAW_FS, DRAW_VS, QUAD_VS, SIM_FS } from "./shaders";
import { sampleElements } from "./spell";

const PLATE_SCALE = 0.82;

/**
 * `tuning` pins the plate to one mode instead of following the scroll;
 * `restless` keeps the sand from ever fully settling (the 404); `spellFrom`
 * selects the page text the sand spells while resonance.form is up (the
 * preloader).
 */
export default function Cymatics({
  tuning,
  restless = 0,
  spellFrom,
}: { tuning?: Tuning; restless?: number; spellFrom?: string } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      depth: false,
      stencil: false,
      powerPreference: "default",
    });
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) {
      canvas.style.display = "none";
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = window.innerWidth < 768 ? 150 : 256;
    const count = W * W;

    let sim: WebGLProgram, draw: WebGLProgram;
    try {
      sim = compile(gl, QUAD_VS, SIM_FS);
      draw = compile(gl, DRAW_VS, DRAW_FS);
    } catch (err) {
      console.warn("[cymatics]", err);
      canvas.style.display = "none";
      return;
    }
    const uSim = uniforms(gl, sim, ["uState", "uTime", "uDt", "uAspect", "uScale", "uEnergy", "uSettle", "uPointer", "uN", "uM", "uS", "uTargets", "uForm", "uScatter", "uRing"]);
    const uDraw = uniforms(gl, draw, ["uState", "uWidth", "uAspect", "uScale", "uSize", "uIntensity", "uInk", "uGlintInk", "uStrength", "uN", "uM", "uS", "uTargets", "uForm", "uRing"]);

    // One big triangle covers the sim target.
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const simVao = gl.createVertexArray();
    gl.bindVertexArray(simVao);
    const aPos = gl.getAttribLocation(sim, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const drawVao = gl.createVertexArray();

    // Grain state ping-pongs between two float textures: (x, y, seed, -).
    let aspect = window.innerWidth / window.innerHeight;
    const init = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      init[i * 4] = (Math.random() * 2 - 1) * aspect;
      init[i * 4 + 1] = Math.random() * 2 - 1;
      init[i * 4 + 2] = Math.random();
    }
    const targets = [0, 1].map(() => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, W, 0, gl.RGBA, gl.FLOAT, init);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo };
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let read = 0;

    // Where each grain goes when the sand spells the word (texture unit 1).
    const nameTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, nameTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, W, 0, gl.RGBA, gl.FLOAT, new Float32Array(count * 4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    let alive = true;
    const spell = () => {
      if (!spellFrom || !alive) return;
      gl.bindTexture(gl.TEXTURE_2D, nameTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, W, gl.RGBA, gl.FLOAT, sampleElements(spellFrom, aspect, count));
    };
    if (spellFrom) void document.fonts.ready.then(() => requestAnimationFrame(spell));
    let respell = 0;

    let level = startingQuality(gl);
    let drawn = Math.round(count * QUALITY[level].grains);
    const applyQuality = () => {
      drawn = Math.round(count * QUALITY[level].grains);
      // Lets the page lighten its own costs too (see globals.css).
      document.documentElement.dataset.quality = level >= 3 ? "low" : level >= 1 ? "medium" : "high";
    };
    applyQuality();

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, QUALITY[level].dpr);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      aspect = window.innerWidth / window.innerHeight;
      if (spellFrom && resonance.form > 0) {
        window.clearTimeout(respell);
        respell = window.setTimeout(spell, 150);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let lastX = 0;
    let lastY = 0;
    const onPointer = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      resonance.pointer.x = x * aspect;
      resonance.pointer.y = y;
      resonance.pointer.force = Math.min(1, resonance.pointer.force + speed * 0.02);
    };
    if (!reduced) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerdown", onPointer, { passive: true });
    }

    let ink: [number, number, number] = [0.93, 0.9, 0.85];
    let glint: [number, number, number] = [0.78, 0.64, 0.43];
    let intensity = 0;
    // The hover ring, in plate space; kept where it was while it fades out.
    const ring = { x: 0, y: 0, r: 0.1 };
    let strength = 0.55;
    let energy = 1.5;
    let frame = 0;
    let last = performance.now();
    let raf = 0;
    const start = performance.now();

    // Watching the frame rate. Every 2 seconds of frames, take the typical
    // (median) gap between them; only if two windows in a row are clearly
    // slow — under ~40 fps — step down one level, then wait and see. One-off
    // hitches (loading, a tab switch, splitting the titles) don't move the
    // median, so a capable machine keeps the full plate. It never steps back
    // up, so it can't flicker between levels.
    const gaps: number[] = [];
    let slowWindows = 0;
    let watchFrom = start + 4000; // past the preloader's busiest moments
    const watch = (now: number, gap: number) => {
      if (now < watchFrom || level === QUALITY.length - 1) return;
      gaps.push(gap);
      if (gaps.length < 120) return;
      gaps.sort((x, y) => x - y);
      const median = gaps[gaps.length >> 1];
      gaps.length = 0;
      // At 30 fps every frame is meant to take ~33 ms.
      const budget = QUALITY[level].fps === 30 ? 42 : 25;
      slowWindows = median > budget ? slowWindows + 1 : 0;
      if (slowWindows < 2) return;
      slowWindows = 0;
      level++;
      applyQuality();
      resize();
      watchFrom = now + 3000;
    };

    let lost = false;
    const onLost = (e: Event) => {
      // The GPU dropped the context (a driver reset, too many tabs): stop
      // drawing and hide the plate rather than throw on every frame.
      e.preventDefault();
      lost = true;
      cancelAnimationFrame(raf);
      canvas.style.display = "none";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || lost) {
        last = now;
        return;
      }
      const gap = now - last;
      // 30 fps steps skip every other display frame.
      if (QUALITY[level].fps === 30 && gap < 1000 / 30 - 4) return;
      watch(now, gap);
      const dt = Math.min(gap / 16.667, 3);
      last = now;
      frame++;
      if (frame % 45 === 1) {
        ink = readColour("--palette-foreground", ink);
        glint = readColour("--palette-accent", glint);
        // Grain opacity: the --sand-strength knob in globals.css.
        strength = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sand-strength")) || 0.55;
      }

      const tune = tuning ?? tuningAt(resonance.swara);
      const hovered = resonance.hoverEl;
      if (hovered) {
        const r = hovered.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        ring.x = (((r.left + r.width / 2) / vw) * 2 - 1) * aspect;
        ring.y = -(((r.top + r.height / 2) / vh) * 2 - 1);
        // Just outside the element, in plate units (the plate is 2 units tall).
        ring.r = Math.min(0.32, (Math.max(r.width, r.height) / 2 / vh) * 2 * 1.15 + 0.035);
      }
      resonance.level = soundLevel();
      resonance.pulse *= Math.pow(0.9, dt);
      resonance.pointer.force *= Math.pow(0.93, dt);
      resonance.burst *= Math.pow(0.965, dt);
      // Bowing: the pointer keeps driving the plate for as long as it's held.
      if (resonance.bowing) resonance.pointer.force = Math.max(resonance.pointer.force, 0.95);

      const target = reduced
        ? 0.3 + resonance.morph * 0.8 + resonance.burst
        : 0.32 + restless + resonance.morph * 2.4 + Math.min(Math.abs(resonance.velocity) * 0.06, 1.4) + resonance.level * 4 + resonance.pulse * 1.2 + resonance.burst * 3.5;
      energy += (target - energy) * Math.min(1, 0.12 * dt);
      intensity += (tune.intensity - intensity) * Math.min(1, 0.05 * dt);

      // 1. Step the sand.
      gl.useProgram(sim);
      gl.bindVertexArray(simVao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1 - read].fbo);
      gl.viewport(0, 0, W, W);
      gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[read].tex);
      gl.uniform1i(uSim.uState, 0);
      gl.uniform1f(uSim.uTime, ((now - start) / 1000) % 1000);
      gl.uniform1f(uSim.uDt, dt);
      gl.uniform1f(uSim.uAspect, aspect);
      gl.uniform1f(uSim.uScale, PLATE_SCALE);
      gl.uniform1f(uSim.uEnergy, energy);
      gl.uniform1f(uSim.uSettle, 0.06);
      gl.uniform3f(uSim.uPointer, resonance.pointer.x, resonance.pointer.y, resonance.pointer.force);
      gl.uniform1f(uSim.uN, tune.n);
      gl.uniform1f(uSim.uM, tune.m);
      gl.uniform1f(uSim.uS, tune.sign);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, nameTex);
      gl.uniform1i(uSim.uTargets, 1);
      gl.uniform1f(uSim.uForm, spellFrom ? resonance.form : 0);
      gl.uniform1f(uSim.uScatter, resonance.scatter);
      gl.uniform4f(uSim.uRing, ring.x, ring.y, ring.r, resonance.hoverStrength);
      gl.activeTexture(gl.TEXTURE0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      read = 1 - read;

      // 2. Draw it.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(draw);
      gl.bindVertexArray(drawVao);
      gl.bindTexture(gl.TEXTURE_2D, targets[read].tex);
      gl.uniform1i(uDraw.uState, 0);
      gl.uniform1i(uDraw.uWidth, W);
      gl.uniform1f(uDraw.uAspect, aspect);
      gl.uniform1f(uDraw.uScale, PLATE_SCALE);
      // Grains grow with the screen above 1680px, like the rest of the layout.
      // Fewer grains are drawn a little larger, so the pattern keeps its weight.
      const sparse = 1 / Math.sqrt(QUALITY[level].grains);
      gl.uniform1f(uDraw.uSize, 1.5 * dpr * Math.max(1, window.innerWidth / 1680) * Math.min(sparse, 1.4));
      gl.uniform1f(uDraw.uIntensity, intensity);
      gl.uniform3f(uDraw.uInk, ink[0], ink[1], ink[2]);
      gl.uniform3f(uDraw.uGlintInk, glint[0], glint[1], glint[2]);
      gl.uniform1f(uDraw.uStrength, strength);
      gl.uniform1f(uDraw.uN, tune.n);
      gl.uniform1f(uDraw.uM, tune.m);
      gl.uniform1f(uDraw.uS, tune.sign);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, nameTex);
      gl.uniform1i(uDraw.uTargets, 1);
      gl.uniform1f(uDraw.uForm, spellFrom ? resonance.form : 0);
      gl.uniform4f(uDraw.uRing, ring.x, ring.y, ring.r, resonance.hoverStrength);
      gl.activeTexture(gl.TEXTURE0);
      gl.drawArrays(gl.POINTS, 0, drawn);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      alive = false;
      window.clearTimeout(respell);
      gl.deleteTexture(nameTex);
      targets.forEach(({ tex, fbo }) => {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      });
      gl.deleteProgram(sim);
      gl.deleteProgram(draw);
      gl.deleteBuffer(quad);
    };
  // The tuning is fixed for the life of a page; re-running would rebuild the GL state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen"
    />
  );
}
