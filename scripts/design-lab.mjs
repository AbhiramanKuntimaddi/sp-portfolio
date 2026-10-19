import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/*
 * Syncs the Design Lab into a project. Everything Lab-related lives in one
 * hidden folder at the project root, so the project's own source stays clean:
 *
 *   .design-lab/lab/            the Lab itself (gitignored, dev only)
 *   .design-lab/stub.tsx        no-op stand-in for deploys and fresh clones (committed)
 *   .design-lab/design-lab.d.ts types for the "design-lab" import (committed)
 *   .design-lab/helper.mjs       local helper for Apply and saving; dev only (committed, so dev runs on a fresh clone)
 *   .design-lab/project.json     this site's Lab settings, written by the helper (committed)
 *   .design-lab/state.json       the look in progress, written by the helper (gitignored; added here if missing)
 *
 * The one exception is app/tokens.css: it's the site's real CSS, so it sits
 * with the app and ships to production.
 */

const root = process.cwd();
const lab = resolve(root, process.env.DESIGN_LAB_DIR ?? "../DesignLab");

if (!existsSync(join(lab, "src", "index.ts"))) {
  console.log("[design-lab] not found next to this project, skipping (the stub keeps builds working)");
  process.exit(0);
}

// This script is copied into each project (scripts/design-lab.mjs). Keep that copy current: when it
// differs from the Lab's own, replace it and run the Lab's version instead, so improvements arrive by themselves.
const self = fileURLToPath(import.meta.url);
const latest = join(lab, "scripts", "sync.mjs");
if (resolve(self) !== resolve(latest) && readFileSync(self, "utf8") !== readFileSync(latest, "utf8")) {
  writeFileSync(self, readFileSync(latest, "utf8"));
  console.log("[design-lab] updated this sync script to the Lab's latest");
  await import(pathToFileURL(latest).href);
  process.exit(0);
}

const app = existsSync(join(root, "src", "app")) ? join(root, "src", "app") : join(root, "app");
const home = join(root, ".design-lab");

const write = (to, content) => {
  const prev = existsSync(to) ? readFileSync(to, "utf8") : null;
  if (prev === content) return false;
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, content);
  return true;
};

const labDest = join(home, "lab");
rmSync(labDest, { recursive: true, force: true });
mkdirSync(labDest, { recursive: true });
cpSync(join(lab, "src"), labDest, { recursive: true });

const version = (css) => css?.match(/tokens v(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number) ?? [1, 0, 0];
const tokensPath = join(app, "tokens.css");
const nextTokens = readFileSync(join(lab, "tokens.css"), "utf8");
const before = existsSync(tokensPath) ? version(readFileSync(tokensPath, "utf8")) : null;
const after = version(nextTokens);

const changed = [];
if (write(tokensPath, nextTokens)) changed.push("tokens.css");
if (before && before[0] < after[0]) {
  console.warn(
    `[design-lab] tokens.css moved from v${before.join(".")} to v${after.join(".")}, a breaking change.` +
      ` See ${join(lab, "CHANGELOG.md")} for what to update in this project.`,
  );
}
if (write(join(home, "design-lab.d.ts"), readFileSync(join(lab, "design-lab.d.ts"), "utf8"))) changed.push("types");
if (write(join(home, "helper.mjs"), readFileSync(join(lab, "scripts", "helper.mjs"), "utf8"))) changed.push("helper");
const stub = join(home, "stub.tsx");
if (!existsSync(stub) && write(stub, readFileSync(join(lab, "stub.tsx"), "utf8"))) changed.push("stub");

// The work in progress is personal: keep it out of git (the Lab copy itself should already be ignored).
const gitignore = join(root, ".gitignore");
if (existsSync(gitignore)) {
  const lines = readFileSync(gitignore, "utf8");
  // Already covered when the line itself, or the whole .design-lab folder, is ignored.
  if (!/^\/?\.design-lab\/(state\.json)?\s*$/m.test(lines)) {
    writeFileSync(gitignore, `${lines.replace(/\n*$/, "\n")}/.design-lab/state.json\n`);
    changed.push(".gitignore (+ .design-lab/state.json)");
  }
}

console.log(`[design-lab] synced${changed.length ? ` (updated: ${changed.join(", ")})` : ""}`);
