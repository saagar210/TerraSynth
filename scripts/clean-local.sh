#!/usr/bin/env bash
set -euo pipefail

# Remove reproducible local artifacts. Source files and git history stay untouched.
./scripts/clean-heavy.sh

paths=(
  "node_modules"
)

for path in "${paths[@]}"; do
  if [ -e "${path}" ]; then
    rm -rf "${path}"
    echo "removed ${path}"
  else
    echo "skip ${path} (not present)"
  fi
done
