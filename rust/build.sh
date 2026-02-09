#!/bin/bash
set -e
wasm-pack build --target web --out-dir ../src/generation/wasm-pkg --release
echo "WASM build complete → src/generation/wasm-pkg/"
