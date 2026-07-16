import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

function run(script, args = [], env = {}) {
  return spawnSync(process.execPath, [new URL(script, root).pathname, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env }
  });
}

test("candidate count is exported for GitHub Actions", () => {
  const directory = mkdtempSync(join(tmpdir(), "control-plane-count-"));
  const report = join(directory, "semgrep.json");
  const output = join(directory, "github-output.txt");
  writeFileSync(report, JSON.stringify({ results: [{ check_id: "demo" }] }));

  const result = run("scripts/count-candidates.mjs", [report], {
    GITHUB_OUTPUT: output
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(output, "utf8"), /has_candidates=true/);
  assert.match(readFileSync(output, "utf8"), /count=1/);
});

test("empty candidate set creates a passing structured review", () => {
  const directory = mkdtempSync(join(tmpdir(), "control-plane-empty-"));
  const output = join(directory, "review.json");

  const create = run("scripts/create-empty-review.mjs", [output]);
  const enforce = run("scripts/enforce-review.mjs", [output]);

  assert.equal(create.status, 0, create.stderr);
  assert.equal(enforce.status, 0, enforce.stderr);
  assert.equal(JSON.parse(readFileSync(output, "utf8")).overall_decision, "pass");
});

test("blocking review fails deterministic enforcement", () => {
  const directory = mkdtempSync(join(tmpdir(), "control-plane-block-"));
  const review = join(directory, "review.json");
  writeFileSync(
    review,
    JSON.stringify({
      findings: [
        {
          candidate_id: "demo:1",
          verdict: "block",
          severity: "high",
          file: "src/demo.js",
          line: 2,
          data_type: "access token",
          reason: "A raw access token reaches a logger.",
          policy_reference: "Data that must never be logged in raw form",
          remediation: "Remove the token from the log event."
        }
      ],
      overall_decision: "fail",
      summary: "One blocking finding."
    })
  );

  const result = run("scripts/enforce-review.mjs", [review]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /require blocking/);
});

test("target-controlled Codex instructions and configuration are removed", () => {
  const directory = mkdtempSync(join(tmpdir(), "control-plane-target-"));
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, ".codex"));
  mkdirSync(join(directory, "src", ".codex"), { recursive: true });
  writeFileSync(join(directory, "AGENTS.md"), "untrusted");
  writeFileSync(join(directory, "src", "AGENTS.override.md"), "untrusted");
  writeFileSync(join(directory, "src", "application.js"), "export const safe = true;\n");

  const result = run("scripts/prepare-review-workspace.mjs", [directory]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(join(directory, ".git")), false);
  assert.equal(existsSync(join(directory, ".codex")), false);
  assert.equal(existsSync(join(directory, "AGENTS.md")), false);
  assert.equal(existsSync(join(directory, "src", ".codex")), false);
  assert.equal(existsSync(join(directory, "src", "AGENTS.override.md")), false);
  assert.equal(existsSync(join(directory, "src", "application.js")), true);
});
