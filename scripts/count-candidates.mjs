import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] ?? "artifacts/semgrep.json");
const report = JSON.parse(readFileSync(inputPath, "utf8"));

if (!Array.isArray(report.results)) {
  throw new Error("Semgrep report is missing the results array");
}

const count = report.results.length;
const hasCandidates = count > 0;

console.log(`${count} Semgrep candidate(s)`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `has_candidates=${hasCandidates}\ncount=${count}\n`
  );
}
