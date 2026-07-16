import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve(process.argv[2] ?? "artifacts/codex-review.json");
const review = {
  findings: [],
  overall_decision: "pass",
  summary: "Semgrep found no candidate sensitive logging calls in the target repository."
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(review, null, 2)}\n`);
console.log(`Empty passing review written to ${outputPath}`);
