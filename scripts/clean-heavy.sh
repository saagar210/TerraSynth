#!/usr/bin/env bash
set -euo pipefail

# Remove only heavy build artifacts; keep dependencies for fast iteration.
paths=(
  "node_modules/.vite"
  "dist"
  ".vite"
  ".cache"
  ".turbo"
  "rust/target"
)

for path in "${paths[@]}"; do
  if [ -e "${path}" ]; then
    rm -rf "${path}"
    echo "removed ${path}"
  else
    echo "skip ${path} (not present)"
  fi
done
