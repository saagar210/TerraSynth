# API Reference

## WASM bridge (`src/generation/WasmBridge.ts`)

### `initWasm(): Promise<void>`
Loads and initializes the generated `wasm-bindgen` module.

### `generateChunk(config, chunkX, chunkZ): ChunkData`
Generates a chunk heightmap, moisture map, and biome map.

### `erodeHeightmap(heightmap, width, height, config): void`
Mutates a heightmap using hydraulic erosion parameters from config.

## Worker bridge (`src/generation/ChunkWorkerBridge.ts`)

### `requestChunk(config, chunkX, chunkZ, generationId)`
Asynchronously requests one chunk from the terrain worker.

### `cancelGenerationRequests(generationId)`
Rejects pending requests for a stale generation cycle.
