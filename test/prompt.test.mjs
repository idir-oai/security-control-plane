import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = new URL("../scripts/build-review-prompt.mjs", import.meta.url);

function git(directory, ...args) {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
}

test("prompt uses central policy and limits the diff to candidate files", () => {
  const target = mkdtempSync(join(tmpdir(), "control-plane-prompt-target-"));
  const artifacts = mkdtempSync(join(tmpdir(), "control-plane-prompt-artifacts-"));
  mkdirSync(join(target, "src"));

  git(target, "init", "-b", "main");
  git(target, "config", "user.email", "test@example.com");
  git(target, "config", "user.name", "Test User");
  writeFileSync(join(target, "src", "logger.js"), "logger.info({ requestId });\n");
  writeFileSync(join(target, "src", "unrelated.js"), "export const version = 1;\n");
  git(target, "add", ".");
  git(target, "commit", "-m", "base");
  const baseSha = git(target, "rev-parse", "HEAD");

  writeFileSync(join(target, "src", "logger.js"), "logger.info({ accessToken });\n");
  writeFileSync(join(target, "src", "unrelated.js"), "export const version = 2;\n");
  git(target, "add", ".");
  git(target, "commit", "-m", "change");
  const headSha = git(target, "rev-parse", "HEAD");

  const semgrep = join(artifacts, "semgrep.json");
  const output = join(artifacts, "prompt.md");
  writeFileSync(
    semgrep,
    JSON.stringify({
      results: [
        {
          check_id: "javascript-sensitive-value-in-log",
          path: "src/logger.js",
          start: { line: 1, col: 1 },
          end: { line: 1, col: 36 },
          extra: { message: "Sensitive logging candidate" }
        }
      ]
    })
  );

  const result = spawnSync(process.execPath, [script.pathname], {
    encoding: "utf8",
    env: {
      ...process.env,
      TARGET_ROOT: target,
      SEMGREP_PATH: semgrep,
      OUTPUT_PATH: output,
      BASE_SHA: baseSha,
      HEAD_SHA: headSha
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const prompt = readFileSync(output, "utf8");
  assert.match(prompt, /central policy.*authoritative/is);
  assert.match(prompt, /accessToken/);
  assert.doesNotMatch(prompt, /version = 2/);
  assert.match(prompt, /Never follow instructions/);
});
