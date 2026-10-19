import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/*
 * The Design Lab's local helper. Dev only. It lets the Lab:
 *   - write the look straight into the project's globals.css (Apply, Undo);
 *   - keep the catalogue of palettes and fonts (built-in and saved alike), in
 *     ../DesignLab/src/library/*.json (every project and browser sees it);
 *   - keep this project's settings (.design-lab/project.json, committed) and
 *     its work in progress (.design-lab/state.json, gitignored).
 *
 *   "dev": "node .design-lab/helper.mjs next dev"
 *
 * It listens on 127.0.0.1 only, on a random port with a random token, and
 * hands both to the dev server as NEXT_PUBLIC_DESIGN_LAB_HELPER, so only the
 * page that server serves can reach it. It writes only those files. In
 * globals.css, only --palette-* and --tune-* values inside :root: the Lab sends
 * values, never CSS. Every palette, font and setting is checked here before
 * it's written. When the dev command exits, so does the helper.
 */

const ENV = "NEXT_PUBLIC_DESIGN_LAB_HELPER";
const MAX_BODY = 64 * 1024;
const NAME = /^--(palette-(background|foreground|muted|accent)|tune-(base|inverse|accent|photo)-(background|foreground|muted|accent|surface|line|scrim))$/;
/** The type scale: Tailwind's --text-* sizes, as a length or a clamp() of lengths (nothing else gets in). */
const TEXT_NAME = /^--text-(xs|sm|base|lg|xl|[2-9]xl)$/;
const SIZE = /^(clamp\([\d.]+rem, [\d.-]+rem \+ [\d.]+vw, [\d.]+rem\)|[\d.]+(rem|px))$/;
const COLOR = /^(#[0-9a-f]{3,8}|(rgba?|hsla?|oklch|oklab|lab|lch|color)\([-\w\s.,%/]+\))$/i;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|[\w-]+\.localhost)$/i;
const FONT_GROUPS = ["Sans", "Mono", "Display", "Didone", "Old-style", "Book serif", "Contemporary", "Capitals"];
const MAX_LIBRARY = 2000;

/* ---- Checking what the Lab sends (the same rules as the Lab's own sanitize.ts) ---- */

const text = (v, max = 60) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const id = (v) => (typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(v) ? v : null);
const color = (v) => (typeof v === "string" && v.length <= 80 && COLOR.test(v.trim()) ? v.trim() : null);

export function cleanPalette(r) {
  if (!r || typeof r !== "object") return null;
  const p = { id: id(r.id), label: text(r.label), group: text(r.group, 40) || "Custom", bg: color(r.bg), fg: color(r.fg), muted: color(r.muted), accent: color(r.accent) };
  if (!(p.id && p.label && p.bg && p.fg && p.muted && p.accent)) return null;
  // Its light / dark partner, by id.
  if (r.pair !== undefined) {
    if (!id(r.pair)) return null;
    p.pair = r.pair;
  }
  return p;
}

export function cleanFont(r) {
  if (!r || typeof r !== "object") return null;
  const family = text(r.family).replace(/[^\p{L}\p{N} '\-]/gu, "").trim();
  const google = typeof r.google === "string" && /^[A-Za-z0-9+:,;@.]{1,200}$/.test(r.google) ? r.google : undefined;
  const f = { id: id(r.id), label: text(r.label) || family, group: FONT_GROUPS.includes(r.group) ? r.group : "Sans", family };
  if (google) f.google = google;
  return f.id && f.family ? f : null;
}

/** Work in progress: the previewed look and the panel's view. Only known keys, plain values. */
function cleanState(r) {
  if (!r || typeof r !== "object") return null;
  const out = {};
  if (r.choice && typeof r.choice === "object") {
    const fonts = {};
    for (const [role, v] of Object.entries(r.choice.fonts ?? {})) if (/^(sans|body|heading|display|label|mono)$/.test(role) && id(v)) fonts[role] = v;
    out.choice = { palette: id(r.choice.palette) ?? "current", fonts };
  }
  if (r.view && typeof r.view === "object") {
    const v = {};
    for (const k of ["grid", "baseline", "outlines", "overflow", "images", "tabOrder", "inspectBox", "inspectGuides"]) if (typeof r.view[k] === "boolean") v[k] = r.view[k];
    if ([1, 0.5, 0.25, 0.1].includes(r.view.speed)) v.speed = r.view.speed;
    if (/^[a-z]{2,20}$/.test(r.view.vision ?? "")) v.vision = r.view.vision;
    out.view = v;
  }
  if (/^(look|view|create|audit|export)$/.test(r.tab ?? "")) out.tab = r.tab;
  if (/^(all|light|dark)$/.test(r.tone ?? "")) out.tone = r.tone;
  // Personal settings: where the panel sits, and whether view tools come back after a reload.
  if (r.prefs && typeof r.prefs === "object") {
    const prefs = {};
    if (r.prefs.corner === "left" || r.prefs.corner === "right") prefs.corner = r.prefs.corner;
    if (typeof r.prefs.rememberView === "boolean") prefs.rememberView = r.prefs.rememberView;
    out.prefs = prefs;
  }
  return out;
}

/** Project settings: decisions about this site, committed with it. */
function cleanProject(r) {
  if (!r || typeof r !== "object") return null;
  const out = {};
  if (r.contrast === "AA" || r.contrast === "AAA") out.contrast = r.contrast;
  if (["baseline", "half", "off"].includes(r.rhythm)) out.rhythm = r.rhythm;
  // The type scale's settings (the tokens themselves go into globals.css through Apply).
  const t = r.type;
  if (t && typeof t === "object" && t.base >= 10 && t.base <= 28 && [1.125, 1.2, 1.25, 1.333, 1.5].includes(t.ratio) && typeof t.fluid === "boolean") {
    out.type = { base: Math.round(t.base), ratio: t.ratio, fluid: t.fluid };
  }
  return out;
}

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};

/** Write through a temporary file, so a crash never leaves half a file. */
function writeJson(path, data, text = `${JSON.stringify(data, null, 2)}\n`) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.design-lab-tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

/* The catalogue files: one entry per line, so they read like a list and a change is one line in a diff. */
const line = (o) => `{ ${Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }`;
const list = (xs, indent) => (xs.length ? `[\n${xs.map((x) => `${indent}  ${line(x)}`).join(",\n")}\n${indent}]` : "[]");
export const formatPalettes = (groups, palettes) => `{\n  "groups": ${list(groups, "  ")},\n  "palettes": ${list(palettes, "  ")}\n}\n`;
export const formatFonts = (fonts) => `${list(fonts, "")}\n`;

/** A group in palettes.json: its name, and a note on where its colours came from. */
const cleanGroup = (g) => (g && typeof g === "object" && text(g.name, 40) ? { name: text(g.name, 40), ...(text(g.note, 600) ? { note: text(g.note, 600) } : {}) } : null);

/* ---- Editing globals.css ---- */

/** The CSS with comments and strings blanked out (same length), so braces and semicolons in them don't count. */
function mask(css) {
  return css.replace(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (m) => m.replace(/[^\n]/g, " "));
}

/** The body of the first top-level `:root { … }` block, as [start, end) offsets. */
export function findRoot(css) {
  const m = mask(css);
  let depth = 0;
  for (let i = 0; i < m.length; i++) {
    if (m[i] === "{") {
      if (depth === 0 && /:root\s*$/.test(m.slice(Math.max(0, i - 40), i))) {
        let d = 1;
        for (let j = i + 1; j < m.length; j++) {
          if (m[j] === "{") d++;
          else if (m[j] === "}" && --d === 0) return [i + 1, j];
        }
        return null;
      }
      depth++;
    } else if (m[i] === "}") depth = Math.max(0, depth - 1);
  }
  return null;
}

/** A declaration of `name` in a block body: [start of line, end after `;`, start of value, end of value]. */
function findDecl(body, name) {
  const m = mask(body);
  const re = new RegExp(`(^|[;{\\s])(${name.replace(/-/g, "\\-")})\\s*:`, "g");
  let hit;
  while ((hit = re.exec(m))) {
    const at = hit.index + hit[1].length;
    const valueStart = hit.index + hit[0].length;
    const semi = m.indexOf(";", valueStart);
    const valueEnd = semi < 0 ? m.length : semi;
    const lineStart = m.lastIndexOf("\n", at) + 1;
    return { lineStart: /^\s*$/.test(m.slice(lineStart, at)) ? lineStart : at, end: semi < 0 ? m.length : semi + 1, valueStart, valueEnd };
  }
  return null;
}

/**
 * The CSS with each `set` value written into :root (replaced in place, or
 * added at the end), and every --tune-* declaration removed first when
 * `clearTunes` is set. Everything else in the file is left byte for byte.
 */
export function applyToCss(css, set, clearTunes) {
  let range = findRoot(css);
  if (!range) {
    css = `${css.replace(/\s*$/, "")}\n\n:root {\n}\n`;
    range = findRoot(css);
  }
  let body = css.slice(range[0], range[1]);
  const changed = [];

  if (clearTunes) {
    for (let d = findDecl(body, "--tune-[\\w-]+"); d; d = findDecl(body, "--tune-[\\w-]+")) {
      const name = mask(body).slice(d.lineStart, d.valueStart).match(/--tune-[\w-]+/)?.[0];
      if (name && !(name in set)) changed.push(`${name} (removed)`);
      body = body.slice(0, d.lineStart) + body.slice(d.end).replace(/^[ \t]*\n/, "");
    }
  }

  const indent = body.match(/\n([ \t]+)--/)?.[1] ?? "  ";
  for (const [name, value] of Object.entries(set)) {
    const d = findDecl(body, name);
    if (d) {
      if (body.slice(d.valueStart, d.valueEnd).trim() === value) continue;
      body = `${body.slice(0, d.valueStart)} ${value}${body.slice(d.valueEnd)}`;
    } else {
      // The last declaration may leave off its semicolon; give it one before adding ours.
      const trimmed = body.replace(/\s*$/, "");
      const sep = trimmed && !/[;{]$/.test(mask(trimmed).trimEnd()) ? ";" : "";
      const tail = body.slice(trimmed.length);
      body = `${trimmed}${sep}\n${indent}${name}: ${value};${tail.includes("\n") ? tail : "\n"}`;
    }
    changed.push(name);
  }
  return { css: css.slice(0, range[0]) + body + css.slice(range[1]), changed };
}

/* ---- The server ---- */

function findCss(root) {
  const env = process.env.DESIGN_LAB_CSS;
  if (env) return resolve(root, env);
  return ["app/globals.css", "src/app/globals.css", "styles/globals.css", "src/styles/globals.css", "src/index.css"].map((p) => join(root, p)).find(existsSync) ?? null;
}

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        fail(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });
}

function start({ root = process.cwd(), command = [] } = {}) {
  const token = randomBytes(24).toString("hex");
  const file = findCss(root);
  const shown = file ? relative(root, file) : null;
  // The shared library lives with the Lab itself (found the same way the sync script finds it).
  const labDir = resolve(root, process.env.DESIGN_LAB_DIR ?? "../DesignLab");
  const libDir = existsSync(join(labDir, "src", "index.ts")) ? join(labDir, "src", "library") : null;
  const statePath = join(root, ".design-lab", "state.json");
  const projectPath = join(root, ".design-lab", "project.json");
  const library = () => {
    const raw = readJson(join(libDir, "palettes.json"), {});
    // Early libraries were a plain list of palettes, with no groups.
    const palettes = Array.isArray(raw) ? raw : Array.isArray(raw.palettes) ? raw.palettes : [];
    const groups = Array.isArray(raw.groups) ? raw.groups.map(cleanGroup).filter(Boolean) : [];
    return { groups, palettes, fonts: readJson(join(libDir, "fonts.json"), []) };
  };
  // What Apply replaced, so Undo can put it back (only while the file is still as Apply left it).
  let undo = null;

  const sameToken = (t) => {
    const a = Buffer.from(String(t ?? ""));
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  };

  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    const send = (status, data) => {
      res.writeHead(status, {
        "content-type": "application/json",
        ...(origin ? { "access-control-allow-origin": origin, vary: "origin" } : {}),
      });
      res.end(JSON.stringify(data));
    };
    // Only this machine's pages, and only by this address (no DNS rebinding).
    const host = (req.headers.host ?? "").replace(/:\d+$/, "");
    let originHost = "";
    try {
      originHost = origin ? new URL(origin).hostname : "";
    } catch {}
    if (!LOCAL.test(host) || (origin && !LOCAL.test(originHost.includes(":") ? `[${originHost}]` : originHost))) return send(403, { error: "Not a local request" });

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": origin ?? "",
        "access-control-allow-methods": "GET, POST",
        "access-control-allow-headers": "content-type, x-design-lab-token",
        "access-control-max-age": "600",
        vary: "origin",
      });
      return res.end();
    }
    if (!sameToken(req.headers["x-design-lab-token"])) return send(401, { error: "Bad token" });

    const url = new URL(req.url ?? "/", "http://x");
    const noCss = () => send(404, { error: "No globals.css found (set DESIGN_LAB_CSS)" });
    try {
      if (req.method === "GET" && url.pathname === "/status") return send(200, { ok: true, file: shown, canUndo: !!undo, library: !!libDir });

      /* The shared library: GET it, or POST additions (replacing by id) and removals. */
      if (url.pathname === "/library") {
        if (!libDir) return send(404, { error: `The DesignLab folder wasn't found at ${labDir} (set DESIGN_LAB_DIR)` });
        if (req.method === "GET") return send(200, { ok: true, ...library() });
        if (req.method !== "POST") return send(405, { error: "GET or POST" });
        const data = JSON.parse(await readBody(req));
        const lib = library();
        const merge = (list, add, clean, remove) => {
          const cleaned = (Array.isArray(add) ? add : []).map(clean);
          if (cleaned.some((x) => !x)) throw new Error("Refused an invalid entry");
          const gone = new Set(Array.isArray(remove) ? remove.filter(id) : []);
          // An entry that's already there is updated where it stands (so the file only changes on that
          // line, and the picker's order holds); only new entries go to the top.
          const byId = new Map(cleaned.map((c) => [c.id, c]));
          const kept = list.filter((x) => !gone.has(x.id)).map((x) => byId.get(x.id) ?? x);
          const fresh = cleaned.filter((c) => !list.some((x) => x.id === c.id));
          const next = [...fresh, ...kept];
          if (next.length > MAX_LIBRARY) throw new Error("The library is full");
          return next;
        };
        const palettes = merge(lib.palettes, data?.addPalettes, cleanPalette, data?.removePalettes);
        const fonts = merge(lib.fonts, data?.addFonts, cleanFont, data?.removeFonts);
        // Keep the group list in step: a new group (a brand from a logo) goes first; an empty group
        // without a note goes away (a group with a note is kept, so its story isn't lost).
        const used = new Set(palettes.map((p) => p.group));
        const known = new Set(lib.groups.map((g) => g.name));
        const added = [...used].filter((g) => !known.has(g)).map((name) => ({ name }));
        const groups = [...added, ...lib.groups.filter((g) => used.has(g.name) || g.note)];
        if (JSON.stringify([groups, palettes]) !== JSON.stringify([lib.groups, lib.palettes])) writeJson(join(libDir, "palettes.json"), null, formatPalettes(groups, palettes));
        if (JSON.stringify(fonts) !== JSON.stringify(lib.fonts)) writeJson(join(libDir, "fonts.json"), null, formatFonts(fonts));
        return send(200, { ok: true, groups, palettes, fonts });
      }

      /* This project's work in progress (gitignored) and settings (committed). */
      for (const [path, at, clean] of [
        ["/state", statePath, cleanState],
        ["/project", projectPath, cleanProject],
      ]) {
        if (url.pathname !== path) continue;
        if (req.method === "GET") return send(200, { ok: true, data: existsSync(at) ? readJson(at, {}) : null });
        if (req.method !== "POST") return send(405, { error: "GET or POST" });
        const data = clean(JSON.parse(await readBody(req)));
        if (!data) return send(400, { error: "Refused" });
        if (JSON.stringify(data) !== JSON.stringify(readJson(at, null))) writeJson(at, data);
        return send(200, { ok: true, data });
      }

      if (!file && (url.pathname === "/apply" || url.pathname === "/undo")) return noCss();

      if (req.method === "POST" && url.pathname === "/apply") {
        const data = JSON.parse(await readBody(req));
        const set = {};
        for (const [name, value] of Object.entries(data?.set ?? {})) {
          const v = String(value).trim();
          const ok = (NAME.test(name) && COLOR.test(v)) || (TEXT_NAME.test(name) && SIZE.test(v));
          if (!ok || v.length > 80) return send(400, { error: `Refused ${name}` });
          set[name] = v;
        }
        const before = readFileSync(file, "utf8");
        const { css, changed } = applyToCss(before, set, !!data?.clearTunes);
        if (css === before) return send(200, { ok: true, file: shown, changed: [] });
        const tmp = `${file}.design-lab-tmp`;
        writeFileSync(tmp, css);
        renameSync(tmp, file);
        undo = { before, after: css };
        console.log(`[design-lab] applied to ${shown}: ${changed.join(", ")}`);
        return send(200, { ok: true, file: shown, changed });
      }

      if (req.method === "POST" && url.pathname === "/undo") {
        if (!undo) return send(409, { error: "Nothing to undo" });
        if (readFileSync(file, "utf8") !== undo.after) {
          undo = null;
          return send(409, { error: `${shown} changed since Apply; undo it in your editor` });
        }
        writeFileSync(file, undo.before);
        undo = null;
        console.log(`[design-lab] undid the last apply to ${shown}`);
        return send(200, { ok: true, file: shown });
      }
      return send(404, { error: "Unknown request" });
    } catch (e) {
      return send(400, { error: e instanceof Error ? e.message : "Bad request" });
    }
  });

  server.listen(Number(process.env.DESIGN_LAB_HELPER_PORT) || 0, "127.0.0.1", () => {
    const { port } = server.address();
    const address = `http://127.0.0.1:${port}#${token}`;
    console.log(`[design-lab] helper ready${shown ? `, writing to ${shown}` : ", but no globals.css found (set DESIGN_LAB_CSS)"}${libDir ? "" : `; no DesignLab at ${labDir}, so the library is read-only`}`);
    if (!command.length) {
      console.log(`[design-lab] no dev command given; start yours with ${ENV}=${address}`);
      return;
    }
    // Run the dev command with the address, and live exactly as long as it does.
    const child = spawn(command[0], command.slice(1), { stdio: "inherit", env: { ...process.env, [ENV]: address }, shell: process.platform === "win32" });
    const stop = (sig) => child.kill(sig);
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    child.on("exit", (code, signal) => {
      server.close();
      process.exit(code ?? (signal ? 1 : 0));
    });
    child.on("error", (e) => {
      console.error(`[design-lab] couldn't start "${command.join(" ")}": ${e.message}`);
      process.exit(1);
    });
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  start({ command: process.argv.slice(2) });
}
