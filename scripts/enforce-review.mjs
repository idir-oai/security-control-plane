import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] ?? "artifacts/codex-review.json");
const review = JSON.parse(readFileSync(inputPath, "utf8"));

if (!Array.isArray(review.findings)) {
  throw new Error("Codex review is missing the findings array");
}

const validVerdicts = new Set(["allow", "block", "needs-review"]);
for (const finding of review.findings) {
  if (!validVerdicts.has(finding.verdict)) {
    throw new Error(`Invalid verdict: ${finding.verdict}`);
  }
}

const blocking = review.findings.filter(
  (finding) => finding.verdict === "block" || finding.verdict === "needs-review"
);
const expectedDecision = blocking.length === 0 ? "pass" : "fail";

if (review.overall_decision !== expectedDecision) {
  throw new Error(
    `Inconsistent overall_decision: expected ${expectedDecision}, received ${review.overall_decision}`
  );
}

const lines = [
  "# Central Sensitive Log Review",
  "",
  `Overall decision: **${review.overall_decision.toUpperCase()}**`,
  "",
  review.summary,
  "",
  "| Verdict | Severity | Location | Data type | Reason |",
  "| --- | --- | --- | --- | --- |"
];

for (const finding of review.findings) {
  const location = `${finding.file}:${finding.line}`;
  const reason = finding.reason.replaceAll("|", "\\|").replaceAll("\n", " ");
  lines.push(
    `| ${finding.verdict} | ${finding.severity} | ${location} | ${finding.data_type} | ${reason} |`
  );
}

const summary = `${lines.join("\n")}\n`;
console.log(summary);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (blocking.length > 0) {
  console.error(`${blocking.length} finding(s) require blocking or manual review.`);
  process.exit(1);
}
