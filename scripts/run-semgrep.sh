#!/usr/bin/env bash
set -euo pipefail

CONTROL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_ROOT="${TARGET_ROOT:?Set TARGET_ROOT to the checked-out target repository}"
OUTPUT_PATH="${OUTPUT_PATH:-$CONTROL_ROOT/artifacts/semgrep.json}"
CONFIG_PATH="$CONTROL_ROOT/.semgrep/sensitive-logging.yml"

mkdir -p "$(dirname "$OUTPUT_PATH")"
cd "$TARGET_ROOT"

if command -v semgrep >/dev/null 2>&1; then
  semgrep scan --config "$CONFIG_PATH" --json --output "$OUTPUT_PATH" .
elif command -v uvx >/dev/null 2>&1; then
  uvx --from semgrep==1.168.0 semgrep scan --config "$CONFIG_PATH" --json --output "$OUTPUT_PATH" .
else
  echo "Install Semgrep or uv before running the central scan." >&2
  exit 2
fi

echo "Semgrep candidates written to $OUTPUT_PATH"
