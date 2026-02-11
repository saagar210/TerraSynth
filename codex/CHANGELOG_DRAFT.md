# Changelog Draft

## Theme: Worker-generation lifecycle hardening
- Added explicit generation-scoped cancellation in `ChunkWorkerBridge`.
- Added typed cancellation error and guard for expected cancellation flow.
- Integrated cancellation handling into `ChunkManager` regeneration path.
- Reduced noisy logs by suppressing expected cancellation rejections.

## Theme: Regression safety
- Added `ChunkWorkerBridge` unit tests covering:
  - successful chunk response resolution
  - cancellation rejection behavior
  - worker error fan-out to pending requests

## Environment notes
- Build remains dependent on generated wasm artifacts and `wasm-pack` availability.
