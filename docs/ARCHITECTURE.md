# TerraSynth Architecture

TerraSynth uses a hybrid architecture:

- **Rust/WASM generation** for deterministic terrain, erosion, moisture, and biome maps.
- **Three.js rendering** for chunk meshes, camera motion, water, and fog.
- **TypeScript orchestration** for chunk lifecycle, UI controls, state, and exports.

## Runtime Flow

1. `src/main.ts` initializes WASM and scene services.
2. `ChunkManager` requests chunks near the camera.
3. `ChunkWorkerBridge` forwards requests to `terrainWorker.ts`.
4. Worker calls Rust `generate_chunk` and posts typed arrays back.
5. `TerrainChunk` converts maps to geometry + biome vertex colors.
6. UI updates URL hash and triggers regeneration when settings change.

## Major Boundaries

- `src/generation/` is the only frontend boundary that knows the WASM API shape.
- `src/engine/` does not call Rust directly; it consumes typed `ChunkData`.
- `rust/src/` owns pure generation logic and test coverage for correctness.
