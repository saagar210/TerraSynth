#!/usr/bin/env bash
set -euo pipefail

# Run Vite using ephemeral caches so the repository stays small after exit.
LEAN_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/terrasynth-lean.XXXXXX")"
VITE_CACHE_DIR="${LEAN_TMP_DIR}/vite-cache"
CARGO_TARGET_DIR="${LEAN_TMP_DIR}/cargo-target"

cleanup() {
  rm -rf "${LEAN_TMP_DIR}"
}

trap cleanup EXIT INT TERM

export VITE_CACHE_DIR
export CARGO_TARGET_DIR

echo "[lean-dev] temp cache root: ${LEAN_TMP_DIR}"
pnpm dev
