import { lstatSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const targetRoot = resolve(process.argv[2] ?? "target");
const blockedFiles = new Set(["AGENTS.md", "AGENTS.override.md"]);
const blockedDirectories = new Set([".codex", ".git"]);
let removed = 0;

function remove(path) {
  rmSync(path, { recursive: true, force: true });
  removed += 1;
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (blockedFiles.has(entry.name) || blockedDirectories.has(entry.name)) {
      remove(path);
      continue;
    }

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(path);
    }
  }
}

if (!lstatSync(targetRoot).isDirectory()) {
  throw new Error(`Target repository is not a directory: ${targetRoot}`);
}

walk(targetRoot);
console.log(`Removed ${removed} target-controlled Codex instruction/configuration path(s)`);
