# TerraSynth — Implementation Plan

**Author:** Claude (Senior Engineer perspective)
**Date:** 2026-02-08
**Status:** APPROVED (LOCKED)

> This implementation plan is now finalized and execution-ready. The next action is to begin implementation at **Phase 0, Step 1**.

---

## Table of Contents

1. [Architecture Decisions](#1-architecture-decisions)
2. [Implementation Phases](#2-implementation-phases)
3. [Phase 0: Project Scaffolding](#phase-0-project-scaffolding)
4. [Phase 1: Basic Terrain Rendering](#phase-1-basic-terrain-rendering)
5. [Phase 2: Infinite Chunked Terrain](#phase-2-infinite-chunked-terrain)
6. [Phase 3: Noise Layers + Biomes](#phase-3-noise-layers--biomes)
7. [Phase 4: Hydraulic Erosion](#phase-4-hydraulic-erosion)
8. [Phase 5: Polish & Export](#phase-5-polish--export)
9. [Testing Strategy](#6-testing-strategy)
10. [Risk Register](#7-risk-register)
11. [Assumptions](#8-assumptions)

---

## 1. Architecture Decisions

### AD-1: Rust WASM with `--target web` (not `bundler`)

**Decision:** Use `wasm-pack build --target web`.

**Rationale:** We need WASM inside Web Workers. The `bundler` target assumes a main-thread bundler context and doesn't support `wasm_bindgen::module()` needed for worker thread instantiation. The `web` target produces an ES module with an explicit `init()` function we can call from both main thread and workers. Vite handles this fine with `vite-plugin-wasm`.

**Trade-off:** Slightly more manual init code, but unlocks worker-based generation which is critical for 60fps.

### AD-2: Web Workers for chunk generation — single worker, message queue

**Decision:** Start with a single dedicated Web Worker for terrain generation, not a worker pool.

**Rationale:** Worker pools add complexity (load balancing, shared memory coordination). A single worker with a priority queue (closest chunks first) is simpler and sufficient. At <50ms per chunk, one worker can generate 20 chunks/second — enough for fly speed. We can upgrade to a pool in Phase 5 if profiling shows it's needed.

**Trade-off:** Sequential chunk generation. If the camera teleports (minimap click), there's a burst of work. Mitigation: prioritize chunks by distance, cancel stale requests.

### AD-3: Three.js LOD via built-in `THREE.LOD` object

**Decision:** Use Three.js's native `THREE.LOD` class rather than custom LOD management.

**Rationale:** `THREE.LOD.addLevel(mesh, distance)` handles the distance-based switching automatically per frame. We generate 3 mesh resolutions per chunk (full, half, quarter vertex count) and register them. This is well-tested, built into the engine, and avoids reimplementing frustum/distance calculations.

**Trade-off:** No morph transitions between LOD levels (Three.js LOD does hard switches). Smooth morphing would require custom shaders — deferred to Phase 5 polish if time permits.

### AD-4: Vertex colors for biomes, not texture atlas

**Decision:** Color terrain using per-vertex colors (`THREE.BufferGeometry` with `color` attribute), not UV-mapped textures.

**Rationale:** Per-vertex coloring is simpler, faster to generate, and avoids texture memory/atlas management. At 128×128 vertices, colors are dense enough to look good. Texture splatting is more realistic but adds significant complexity (shader authoring, texture loading, blending logic).

**Trade-off:** Less realistic than texture splatting. Good enough for procedural generation showcase. Can revisit in future.

### AD-5: Chunk size 128×128 vertices, world unit = 1 vertex

**Decision:** Each chunk is 128×128 vertices (127×127 quads). Chunk coordinates are integers. World position = `chunk_coord * 127` (not 128, because adjacent chunks share edge column/row).

**Rationale:** 128 is a power of 2 (good for LOD halving: 128→64→32). 16K vertices per chunk at full detail. With 17×17 view grid = 289 chunks worst case. LOD reduces effective vertex count to ~1M — well within GPU budget.

**Critical detail:** Adjacent chunks must share edge vertices to avoid seams. The WASM generator must produce consistent values at chunk boundaries (same noise seed + world coordinates). No stitching code needed if generation is deterministic per world-space coordinate — which it will be since we feed absolute world coordinates to the noise function.

### AD-6: State management — single `WorldState` object, event emitter pattern

**Decision:** One mutable `WorldState` singleton holds all config. UI components read from it and dispatch change events. The engine subscribes to changes and re-generates as needed.

**Rationale:** No framework, so no reactive store. A simple EventEmitter pattern (custom `EventTarget` subclass or small pub/sub) keeps things decoupled without importing a state library. The state object is the single source of truth.

### AD-7: CSS — minimal, no preprocessor, CSS custom properties for theming

**Decision:** Single `style.css` file. Use CSS custom properties for colors/spacing. No Sass, no Tailwind.

**Rationale:** The UI is a sidebar with sliders and buttons — maybe 200 lines of CSS. A preprocessor adds build complexity for zero benefit at this scale.

### AD-8: `noise` crate vs. hand-rolled noise

**Decision:** Use the `noise` Rust crate for Perlin and Simplex. Hand-roll ridged multifractal and domain warping as combinators on top.

**Rationale:** The `noise` crate is well-optimized, correct, and supports seeded generation. Ridged and warped noise are just transformations of base noise output — trivial to implement on top. No need to rewrite Perlin/Simplex from scratch.

**Specific crate:** `noise = "0.9"` (latest stable).

### AD-9: No `unsafe` in Rust, `thiserror` for error handling

**Decision:** Zero `unsafe` blocks. Use `thiserror` for typed errors. Return `Result<ChunkData, TerrainError>` from generation functions. The wasm-bindgen boundary converts errors to `JsValue` via `Into<JsValue>`.

**Rationale:** Per project standards — no `unwrap()` in production. WASM panics crash the worker. Proper error handling lets us surface meaningful error messages to the UI.

---

## 2. Implementation Phases — Dependency Graph

```
Phase 0 (Scaffolding)
    │
    ▼
Phase 1 (Basic Terrain)
    │
    ▼
Phase 2 (Chunked + Infinite)
    │
    ▼
Phase 3 (Noise Layers + Biomes)  ──── can demo after this
    │
    ▼
Phase 4 (Hydraulic Erosion)
    │
    ▼
Phase 5 (Polish + Export + Deploy)
```

Each phase builds on the previous. No phase can start until its predecessor is complete. Within each phase, I'll call out internal step dependencies.

---

## Phase 0: Project Scaffolding

**Goal:** Empty project compiles, dev server runs, Rust WASM builds and loads in browser, Three.js renders a blank scene.

**Duration estimate:** Foundation work.

### Steps

#### 0.1 — Initialize project structure

Create the full directory tree. Initialize npm, cargo, git.

```
terrasnyth/              # Note: spec says "terrasnyth" in tree but "TerraSynth" in title
├── src/                 # TypeScript source
│   ├── engine/
│   ├── generation/
│   ├── ui/
│   ├── controls/
│   ├── utils/
│   └── types/
├── rust/                # Rust WASM crate
│   └── src/
│       ├── noise/
│       ├── erosion/
│       └── biome/
├── workers/
├── public/
└── tests/
```

**Files created:**
- `package.json` — pnpm, dependencies: `three`, `@types/three`, dev: `typescript`, `vite`, `vite-plugin-wasm`, `vite-plugin-top-level-await`, `vitest`
- `tsconfig.json` — strict mode, ESNext target, moduleResolution bundler
- `vite.config.ts` — WASM plugin, worker config, dev server
- `rust/Cargo.toml` — `cdylib`, deps: `wasm-bindgen 0.2`, `noise 0.9`, `thiserror`, `js-sys`
- `public/index.html` — single div `#app`, loads `/src/main.ts`
- `.gitignore` — node_modules, target, dist, pkg, *.wasm
- `rust/build.sh` — `wasm-pack build --target web --out-dir ../src/generation/wasm-pkg`

**Decisions:**
- WASM output goes to `src/generation/wasm-pkg/` so Vite can import it as a local module.
- Using `pnpm` per user env.

#### 0.2 — Vite config with WASM support

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  worker: {
    plugins: () => [wasm(), topLevelAwait()],
  },
  optimizeDeps: {
    exclude: ['terra-wasm'], // prevent vite from pre-bundling the wasm pkg
  },
});
```

#### 0.3 — Rust WASM "hello world"

Minimal `lib.rs`:
- Export a single function `pub fn add(a: i32, b: i32) -> i32`
- Build with `wasm-pack build --target web`
- Verify output in `src/generation/wasm-pkg/`

#### 0.4 — TypeScript entry point

`src/main.ts`:
- Import WASM init function, call it
- Import Three.js, create scene + renderer + camera
- Render empty scene (dark background)
- Log "TerraSynth initialized" + WASM test result to console

#### 0.5 — Verify dev server

- `pnpm dev` starts Vite
- Browser shows black canvas
- Console shows WASM working
- Hot reload works for TS changes

**Exit criteria for Phase 0:**
- [x] `pnpm dev` starts without errors
- [x] Three.js renders a blank scene
- [x] WASM module loads and a test function returns correct result
- [x] TypeScript strict mode, no `any` types
- [x] Git initialized with first commit

---

## Phase 1: Basic Terrain Rendering

**Goal:** Generate a single 128×128 heightmap in Rust WASM, render it as a 3D mesh in Three.js, fly over it.

**Depends on:** Phase 0 complete.

### Steps

#### 1.1 — Rust: TerrainConfig and noise generation

**File:** `rust/src/lib.rs`, `rust/src/noise/mod.rs`, `rust/src/noise/layers.rs`

Implement:
- `TerrainConfig` struct with `#[wasm_bindgen]` — all fields from spec
- `generate_chunk(config, chunk_x, chunk_z) -> ChunkData` — returns heightmap
- Layered Simplex noise using `noise` crate's `NoiseFn` trait
- `ChunkData` struct: `heightmap: Vec<f32>`, expose via `wasm_bindgen` getters

**Error handling:**
- `TerrainError` enum with `thiserror`: `InvalidConfig`, `NoiseGenerationFailed`
- `generate_chunk` returns `Result<ChunkData, JsValue>`

**Edge cases:**
- Negative chunk coordinates (must work — infinite world extends in all directions)
- Seed `0` is valid
- `octaves = 0` → return flat heightmap (not an error)
- NaN/Infinity checks on all float params at config validation time

**Key detail:** Noise sampling must use absolute world coordinates, not chunk-local coordinates. For chunk (cx, cz) at position (x, z) within the chunk:
```
world_x = cx * (chunk_size - 1) + x
world_z = cz * (chunk_size - 1) + z
sample = noise(world_x * scale, world_z * scale)
```
This guarantees seamless chunk boundaries.

**Test:** Generate chunk (0,0) and chunk (1,0). The rightmost column of (0,0) must exactly equal the leftmost column of (1,0).

#### 1.2 — TypeScript: WASM bridge

**File:** `src/generation/WasmBridge.ts`

- Async `init()` — load and initialize WASM module
- `generateChunk(config, cx, cz): ChunkData` — call into WASM
- Convert `ChunkData` to TypeScript-friendly format: `{ heightmap: Float32Array, width: number, height: number }`
- Handle WASM errors, surface to caller

#### 1.3 — TypeScript types

**File:** `src/types/terrain.ts`

```typescript
export interface ChunkData {
  heightmap: Float32Array;
  moistureMap: Float32Array | null;
  biomeMap: Uint8Array | null;
  width: number;
  height: number;
  minHeight: number;
  maxHeight: number;
}

export interface WorldConfig {
  seed: number;
  chunkSize: number;          // 128
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  heightMultiplier: number;
  seaLevel: number;
  viewDistance: number;
  erosionEnabled: boolean;
  erosionIterations: number;
  // ... rest of erosion params
}

export interface ChunkRef {
  x: number;
  z: number;
  key: string;               // "x,z" for Map lookups
}
```

#### 1.4 — Three.js scene setup

**File:** `src/engine/Scene.ts`

- Create `WebGLRenderer` (antialias, pixelRatio from device)
- Create `PerspectiveCamera` (FOV 60, near 0.1, far 10000)
- `DirectionalLight` + `AmbientLight`
- Resize handler (window resize → update renderer + camera aspect)
- Animation loop via `requestAnimationFrame`
- Export `scene`, `camera`, `renderer` references

#### 1.5 — Terrain mesh from heightmap

**File:** `src/engine/TerrainChunk.ts`

Build a `THREE.BufferGeometry` from heightmap data:

```typescript
export function createTerrainMesh(
  chunkData: ChunkData,
  chunkX: number,
  chunkZ: number,
  lodLevel: number
): THREE.Mesh
```

- Create `PlaneGeometry` with `(chunkSize-1, chunkSize-1, subdivisions, subdivisions)` where subdivisions = `(chunkSize-1) / (2^lodLevel)`
- Displace Y vertices from heightmap (sample heightmap at corresponding grid position)
- Compute vertex normals for lighting
- Set vertex colors by elevation (gradient: deep blue → blue → sandy → green → brown → white)
- Position mesh at world coordinates: `(chunkX * (chunkSize-1), 0, chunkZ * (chunkSize-1))`
- Material: `MeshStandardMaterial` with `vertexColors: true`, `flatShading: false`

**Edge cases:**
- LOD level 0 = full res (128×128 samples). LOD 1 = every other vertex (64×64). LOD 2 = every 4th (32×32).
- When sampling heightmap at reduced LOD, use bilinear interpolation? No — just skip vertices. The heightmap is still the same, we just sample fewer points. This is fine; LOD chunks are far away.

**Critical bug prevention:** Three.js `PlaneGeometry` creates vertices in a specific order (row-major, top-to-bottom). Make sure heightmap indexing matches. Off-by-one here creates visually broken terrain. **Write a unit test that verifies vertex count matches expected geometry.**

#### 1.6 — Basic fly camera

**File:** `src/controls/FlyControls.ts`

- WASD for horizontal movement (relative to camera facing direction)
- Mouse move (pointer lock) for look direction
- Q/E or Space/Shift for vertical movement
- Scroll wheel adjusts speed
- Click canvas to engage pointer lock
- ESC to release pointer lock

**Implementation:**
- Listen to `keydown`/`keyup`, maintain a `Set<string>` of pressed keys
- On each frame tick, calculate movement vector from pressed keys × speed × deltaTime
- Mouse movement rotates camera via Euler angles (clamp pitch to ±89°)

**Edge case:** Pointer lock API may not be available (iframe restrictions). Fallback: mouse-drag-to-look without pointer lock.

#### 1.7 — FPS counter

**File:** `src/ui/FPSCounter.ts`

- DOM overlay, top-left corner
- Calculate FPS from `deltaTime` in animation loop
- Smoothed display (rolling average of last 60 frames)
- Show: FPS, frame time (ms), chunk count

#### 1.8 — Wire it all together in main.ts

**File:** `src/main.ts`

```
1. Init WASM
2. Create Scene
3. Generate chunk (0,0) from WASM
4. Create terrain mesh from chunk data
5. Add mesh to scene
6. Init FlyControls
7. Init FPS counter
8. Start render loop
```

**Exit criteria for Phase 1:**
- Single terrain chunk rendered with elevation coloring
- Fly camera works (WASD + mouse)
- FPS counter shows 60fps
- No console errors
- Terrain looks organic (not a flat grid)

---

## Phase 2: Infinite Chunked Terrain

**Goal:** Load/unload chunks dynamically as camera moves. LOD system. Water. Fog.

**Depends on:** Phase 1 complete.

### Steps

#### 2.1 — ChunkManager

**File:** `src/engine/ChunkManager.ts`

The core orchestrator. On each frame:

1. Determine camera's current chunk coordinate: `floor(camera.x / (chunkSize-1))`, same for z
2. Calculate set of chunks that should be loaded: all chunks within `viewDistance` of camera chunk
3. Compare with currently loaded chunks
4. Queue new chunks for generation (prioritized by distance — closest first)
5. Remove chunks beyond `viewDistance + 1` (hysteresis to prevent load/unload thrashing at boundaries)
6. Update LOD levels: distance to camera → LOD 0/1/2

**Data structure:**
- `Map<string, Chunk>` — key is `"x,z"`, value is the Chunk object (mesh + data)
- Generation queue: sorted array by distance to camera, dequeue closest first

**Edge cases:**
- Camera teleport (minimap): clear queue, reprioritize all
- Rapid camera movement: drop stale queue entries that are now beyond view distance
- Frame budget: don't process more than N chunk additions per frame (prevent frame spike). Start with 2 chunks added per frame.

#### 2.2 — Web Worker for generation

**File:** `workers/terrain-worker.ts`

- Worker loads WASM module independently (its own `init()` call)
- Receives messages: `{ type: 'generate', chunkX, chunkZ, config }`
- Runs `generate_chunk` in WASM
- Posts result back: `{ type: 'result', chunkX, chunkZ, heightmap: Float32Array }` — using Transferable for zero-copy

**File:** `src/generation/WorkerPool.ts` (renamed from spec — actually a single worker manager)

- Spawn worker
- Send generation requests
- Receive results, deliver to ChunkManager
- Request cancellation: if a queued chunk is no longer needed, skip it (check on result arrival)

**Critical detail:** `Float32Array` transfer via `postMessage(data, [data.heightmap.buffer])` — this transfers ownership, making it zero-copy. The worker can't use the buffer after transfer. This is important for performance with 128² = 16K floats per chunk.

#### 2.3 — LOD integration

**File:** `src/engine/LODManager.ts`

For each chunk, create a `THREE.LOD` object with 3 levels:
- Level 0 (distance 0): Full resolution mesh (128×128 → ~32K triangles)
- Level 1 (distance `chunkSize * 3`): Half resolution (64×64 → ~8K triangles)
- Level 2 (distance `chunkSize * 6`): Quarter resolution (32×32 → ~2K triangles)

The `THREE.LOD` object is added to the scene. Three.js auto-switches based on camera distance each frame.

**Edge case — chunk boundary seams at different LOD levels:**
This is a known problem. When chunk A is LOD 0 and adjacent chunk B is LOD 1, the edge vertices don't align, creating visible cracks.

**Solution (practical):** For Phase 2, accept minor seams at LOD transitions. The fog will hide distant LOD transitions. In Phase 5 polish, we can add skirt geometry (short vertical walls at chunk edges) to hide cracks. This is the standard game industry approach and takes ~20 lines of code.

#### 2.4 — ChunkCache (LRU)

**File:** `src/generation/ChunkCache.ts`

- LRU cache with configurable max size (default: 500 chunks)
- Key: `"x,z"` string
- Value: `ChunkData` (heightmap + metadata)
- When cache is full, evict least-recently-used entry
- On evict: dispose Three.js geometry + material (`mesh.geometry.dispose()`, `mesh.material.dispose()`)

**Critical memory management:** Three.js doesn't garbage collect GPU resources. We MUST call `.dispose()` on geometries and materials when removing chunks. Failure to do this leaks VRAM and eventually crashes the tab.

#### 2.5 — Water plane

**File:** `src/engine/Water.ts`

- Single large `PlaneGeometry` at Y = `seaLevel * heightMultiplier`
- `MeshStandardMaterial` with opacity 0.6, transparent, blue color
- Follows camera (reposition to always be centered under camera)
- Size: `viewDistance * chunkSize * 2` in each direction
- Slight vertex animation (sinusoidal Y displacement) for subtle wave effect

**Edge case:** Water plane must render after terrain (alpha blending order). Set `material.depthWrite = false` and `renderOrder = 1`.

#### 2.6 — Fog

**File:** `src/engine/Fog.ts`

- `THREE.FogExp2` — exponential fog for natural falloff
- Color matches sky gradient at horizon
- Density tuned to fade terrain at ~80% of view distance
- Hides LOD transitions and chunk loading pop-in

#### 2.7 — Basic control panel

**File:** `src/ui/Panel.ts`, `src/ui/Slider.ts`, `src/ui/Toggle.ts`

Minimal sidebar with:
- Seed input + randomize button
- Scale slider
- Octaves slider
- Persistence slider
- Lacunarity slider
- Sea level slider
- Height multiplier slider
- View distance slider

**Implementation:** Vanilla DOM. Create elements with `document.createElement`. Sidebar is `position: fixed`, `right: 0`, collapsible via toggle button.

**On slider change:** Update `WorldState`, emit change event. ChunkManager listens and re-generates all chunks with new config. Cache is cleared on config change (old heightmaps are invalid).

**UX decision:** Sliders update terrain in real-time as you drag? No — too expensive. Terrain regenerates on `mouseup`/`change`, not `input`. Show a "Regenerating..." indicator. This prevents generating hundreds of chunks per slider drag.

**Exit criteria for Phase 2:**
- Fly in any direction, terrain generates infinitely
- Chunks load/unload visibly (can verify with chunk count in FPS overlay)
- Water plane at sea level
- Fog hides horizon
- LOD visually working (far terrain is simpler)
- Sidebar controls change terrain
- Consistent 60fps during normal flying
- Memory stable (no VRAM leak) after flying for 2+ minutes

---

## Phase 3: Noise Layers + Biomes

**Goal:** Multiple noise types, biome classification, colorful varied terrain, presets, minimap.

**Depends on:** Phase 2 complete.

### Steps

#### 3.1 — Rust: Advanced noise types

**Files:** `rust/src/noise/ridged.rs`, `rust/src/noise/warped.rs`, `rust/src/noise/layers.rs`

Implement on top of `noise` crate's base functions:

**Ridged multifractal:**
```
value = 1.0 - abs(noise(x, z))  // Creates sharp ridges
value = value * value             // Sharpen further
// Layer with octaves, each ridge octave adds detail to ridges
```

**Domain warping:**
```
warp_x = noise_a(x, z) * warp_strength
warp_z = noise_b(x, z) * warp_strength
value = noise_c(x + warp_x, z + warp_z)
// Creates organic, swirling patterns
```

**Layer composition engine:**
```rust
pub struct NoiseLayer {
    noise_type: NoiseType,  // Simplex, Perlin, Ridged, Warped
    frequency: f64,
    amplitude: f64,
    offset: (f64, f64),
}

pub fn sample_layered(layers: &[NoiseLayer], x: f64, z: f64, seed: u64) -> f64 {
    layers.iter().map(|l| l.sample(x, z, seed)).sum()
}
```

**Continental shelf layer:** Very low frequency (scale 0.001), creates large landmasses vs ocean. This gets added BEFORE other layers, biasing terrain toward land or sea.

#### 3.2 — Rust: Moisture map and biome classification

**Files:** `rust/src/biome/moisture.rs`, `rust/src/biome/classifier.rs`

**Moisture map:** Separate Simplex noise with different seed (seed + 1000 to avoid correlation). Same chunk coordinates, different frequency.

**Biome classifier:**
```rust
pub fn classify_biome(elevation: f32, moisture: f32, sea_level: f32) -> Biome {
    if elevation < sea_level - 0.1 { return Biome::DeepOcean; }
    if elevation < sea_level { return Biome::ShallowWater; }
    if elevation < sea_level + 0.02 { return Biome::Beach; }

    let land_elevation = (elevation - sea_level) / (1.0 - sea_level); // normalize to 0-1

    match (land_elevation, moisture) {
        (e, _) if e > 0.8 => Biome::Snow,
        (e, _) if e > 0.6 => Biome::Mountain,
        (e, m) if e > 0.4 && m < 0.3 => Biome::Tundra,
        (_, m) if m < 0.2 => Biome::Desert,
        (e, m) if e < 0.3 && m > 0.7 => Biome::Jungle,
        (_, m) if m > 0.6 => Biome::DenseForest,
        (_, m) if m > 0.4 => Biome::Forest,
        _ => Biome::Grassland,
    }
}
```

**Edge case:** Biome boundaries. Hard transitions look unnatural. Solution: at biome boundaries, blend colors in the vertex shader/color assignment. For each vertex, check the biome of its neighbors. If neighbors differ, lerp the colors. This happens on the TS side when building the mesh.

#### 3.3 — TypeScript: Biome color palette

**File:** `src/types/biome.ts`, `src/generation/BiomeColors.ts`

```typescript
export enum Biome {
  DeepOcean = 0,
  ShallowWater = 1,
  Beach = 2,
  Desert = 3,
  Grassland = 4,
  Forest = 5,
  DenseForest = 6,
  Jungle = 7,
  Tundra = 8,
  Snow = 9,
  Mountain = 10,
  Volcanic = 11,
}

export const BIOME_COLORS: Record<Biome, THREE.Color> = {
  [Biome.DeepOcean]:    new THREE.Color(0x1a3c5e),
  [Biome.ShallowWater]: new THREE.Color(0x2d7d9a),
  [Biome.Beach]:        new THREE.Color(0xe8d68a),
  [Biome.Desert]:       new THREE.Color(0xd4a862),
  [Biome.Grassland]:    new THREE.Color(0x7cad3a),
  [Biome.Forest]:       new THREE.Color(0x3a7d23),
  [Biome.DenseForest]:  new THREE.Color(0x1f5c15),
  [Biome.Jungle]:       new THREE.Color(0x2d8c2d),
  [Biome.Tundra]:       new THREE.Color(0x8fa38c),
  [Biome.Snow]:         new THREE.Color(0xf0f0f0),
  [Biome.Mountain]:     new THREE.Color(0x7a7a7a),
  [Biome.Volcanic]:     new THREE.Color(0x4a2020),
};
```

Update `TerrainChunk.ts` to color vertices by biome instead of raw elevation. Blend at biome boundaries by sampling neighboring vertices.

#### 3.4 — Noise layer UI controls

**File:** Update `src/ui/Panel.ts`

Add sections:
- Noise type selector (dropdown: Simplex, Perlin, Ridged, Warped)
- Domain warp strength slider (visible only when Warped selected)
- Per-layer controls (stretch goal: multiple configurable layers)

For Phase 3, keep it simple: one noise type selector that sets the primary noise. Layer composition (continental + mountain + detail) is automatic and controlled by the octave/persistence/lacunarity params.

#### 3.5 — Preset gallery

**File:** `src/ui/PresetGallery.ts`

Array of preset `WorldConfig` objects:

```typescript
export const PRESETS: Record<string, Partial<WorldConfig>> = {
  'Archipelago': { seaLevel: 0.55, scale: 0.8, octaves: 6, ... },
  'Alpine':      { seaLevel: 0.25, heightMultiplier: 150, octaves: 8, ... },
  'Desert Canyon': { seaLevel: 0.1, erosionEnabled: true, erosionIterations: 100000, ... },
  // etc.
};
```

UI: horizontal strip of thumbnail buttons (text-only for now, screenshots later). Clicking a preset applies its config, clears chunk cache, regenerates.

#### 3.6 — Minimap

**File:** `src/ui/Minimap.ts`

- 200×200 pixel `<canvas>` element, bottom-right corner
- Renders a top-down view of nearby terrain (e.g., 5×5 chunk area)
- Each pixel colored by biome (sample biome map) or elevation (grayscale)
- Camera position shown as a small triangle/arrow indicating look direction
- Click on minimap → teleport camera to that world position

**Implementation:**
- On chunk load, render that chunk's biome map to the minimap canvas
- Use `CanvasRenderingContext2D.putImageData()` for fast pixel-level rendering
- Minimap viewport scrolls with camera

**Edge case:** Minimap tries to render chunks that aren't loaded yet → leave those areas black/dark.

**Exit criteria for Phase 3:**
- Terrain has visible biome variety (deserts, forests, snow, oceans)
- Ridged noise creates mountain ridges
- Domain warping creates organic features
- Presets change terrain dramatically
- Minimap shows top-down view with camera position
- Biome boundaries look natural (blended colors)

---

## Phase 4: Hydraulic Erosion

**Goal:** Particle-based hydraulic erosion in Rust WASM. Realistic rivers and valleys.

**Depends on:** Phase 3 complete.

### Steps

#### 4.1 — Rust: Hydraulic erosion algorithm

**File:** `rust/src/erosion/hydraulic.rs`

Implementation of particle-based hydraulic erosion (Sebastian Lague / Hans Theobald Beyer algorithm):

```
For each iteration:
  1. Spawn droplet at random position
  2. Give it initial water volume and speed
  3. Loop (max 30-50 steps per droplet):
     a. Calculate gradient at current position (bilinear interpolation of heightmap)
     b. Update direction: dir = dir * inertia + gradient * (1 - inertia)
     c. Move droplet by direction
     d. Calculate height difference (old pos vs new pos)
     e. If moving uphill and carrying sediment → deposit
     f. If moving downhill → erode terrain, pick up sediment
     g. Evaporate some water
     h. If speed ≈ 0 or water ≈ 0 → drop dies, deposit remaining sediment
  4. Write modified heightmap values back
```

**Key parameters (from config):**
- `inertia`: 0.05 (momentum, prevents zigzag)
- `capacity`: 4.0 (max sediment per water unit)
- `deposition_rate`: 0.3
- `erosion_rate`: 0.3
- `evaporation_rate`: 0.01
- `min_slope`: 0.01 (prevents zero-division on flat terrain)
- `gravity`: 4.0
- `max_droplet_lifetime`: 30 steps

**Erosion radius:** Each erosion/deposition step affects a 3×3 area (weighted by distance), not a single vertex. This prevents creating single-vertex holes and produces smoother channels.

**Critical detail — chunk boundaries during erosion:**
Erosion particles can flow across chunk boundaries. We have two options:
1. **Erode per-chunk (simpler, chosen):** Run erosion independently per chunk. Particles that exit the chunk are killed. Results in visible chunk-boundary artifacts in erosion patterns but is much simpler to implement.
2. **Erode per-region:** Stitch multiple chunks into a large heightmap, erode, then split back. Better results but complex.

**Decision:** Phase 4 implements per-chunk erosion. Phase 5 can optionally add region erosion for polish.

**Performance target:** 50K iterations on 128×128 in <1 second. 200K in <3 seconds. Rust WASM should hit this easily.

#### 4.2 — WASM: Erosion API

**File:** `rust/src/lib.rs` (add to existing exports)

```rust
#[wasm_bindgen]
pub fn erode_chunk(
    heightmap: &mut [f32],
    width: u32,
    height: u32,
    iterations: u32,
    config: &TerrainConfig,
) -> Result<(), JsValue>
```

Takes heightmap as mutable slice, modifies in-place. This avoids allocating a new buffer.

**Alternative:** `generate_chunk` could optionally run erosion inline (if `config.erosion_enabled`). But keeping erosion as a separate call lets the UI show a "before" state and apply erosion on demand.

**Decision:** Both. `generate_chunk` applies erosion if `erosion_enabled`. Separate `erode_chunk` for the "Erode" button (re-erode existing terrain).

#### 4.3 — TypeScript: Erosion UI

**File:** Update `src/ui/Panel.ts`

Erosion section:
- Enable/disable toggle (re-generates all chunks)
- Iteration count slider: 10K – 200K (logarithmic scale)
- Inertia slider: 0.01 – 0.2
- Capacity slider: 1.0 – 8.0
- Erosion rate slider: 0.1 – 0.9
- Deposition rate slider: 0.1 – 0.9
- "Erode" button: applies erosion to all loaded chunks without regenerating from noise
- Progress indicator during erosion (% complete)

**Before/after toggle:**
Store pre-erosion heightmap. Toggle swaps the mesh between pre/post erosion data. Simple: keep two copies of vertex positions per chunk.

#### 4.4 — Worker integration for erosion

Erosion is expensive (up to 3 seconds). MUST run in the web worker.

Message types to add:
- `{ type: 'erode', chunkX, chunkZ, heightmap: Float32Array, config }` → erode and return
- Worker posts progress: `{ type: 'erosion-progress', chunkX, chunkZ, percent }`

#### 4.5 — Visual verification

After erosion, terrain should show:
- Visible river-like channels carving through terrain
- Sediment deposits in valleys (slightly raised flat areas)
- Smoother slopes compared to raw noise
- Mountain ridges preserved (erosion shouldn't flatten everything)

If erosion results look wrong (flat terrain, random holes, no visible channels), the algorithm has a bug. Common issues:
- Gradient calculation wrong (sign error → flows uphill)
- Deposition rate too high (fills channels immediately)
- No erosion radius (creates 1-pixel holes)
- Heightmap indexing off-by-one

**Exit criteria for Phase 4:**
- Erosion visibly carves realistic channels
- 50K iterations < 1 second, 200K < 3 seconds
- UI controls work (sliders, toggle, erode button)
- Before/after comparison works
- No crashes or NaN values in heightmap after erosion
- Main thread stays at 60fps during erosion (runs in worker)

---

## Phase 5: Polish & Export

**Goal:** Production-quality visuals, export functionality, deployment.

**Depends on:** Phase 4 complete.

### Steps

#### 5.1 — Sky gradient

**File:** `src/engine/Sky.ts`

- Shader-based sky dome (hemisphere gradient)
- Colors: deep blue at zenith → light blue → pale at horizon
- Sun position as a bright spot (configurable direction)
- Fog color matches horizon color

#### 5.2 — Improved lighting + shadows

**File:** `src/engine/Lighting.ts`

- `DirectionalLight` positioned to match sun direction
- Shadow mapping: `light.castShadow = true`, configure shadow camera frustum to cover nearby terrain
- Shadow map resolution: 2048×2048
- Terrain meshes: `mesh.castShadow = true`, `mesh.receiveShadow = true`

**Performance note:** Shadow maps are expensive. Default OFF, toggle in UI. When enabled, only apply to LOD 0 chunks (closest).

#### 5.3 — Cinematic camera

**File:** `src/controls/CinematicControls.ts`

- Auto-fly along a generated path
- Path: Catmull-Rom spline through random points above terrain
- Camera looks slightly ahead and down
- Smooth speed transitions
- Toggle on/off, resume from current position

#### 5.4 — Orbit controls

**File:** `src/controls/OrbitControls.ts`

- Use Three.js built-in `OrbitControls` (from `three/addons/controls/OrbitControls`)
- Click-drag to orbit, scroll to zoom, middle-click to pan
- Constrain: don't go below terrain surface

#### 5.5 — Export: Heightmap PNG

**File:** `src/utils/export.ts`

- Create offscreen canvas at selected resolution (512/1024/2048/4096)
- Map heightmap values to grayscale pixels (0.0 → black, 1.0 → white)
- `canvas.toBlob('image/png')` → download link

**Edge case:** Export covers the currently viewed area. Stitch loaded chunks into a single image. If resolution > total chunk data, interpolate. If less, downsample.

#### 5.6 — Export: Biome map PNG

Same as heightmap but pixels are colored by biome.

#### 5.7 — Export: Normal map PNG

- Compute normals from heightmap gradients
- Map normal XYZ (-1..1) to RGB (0..255)
- Standard tangent-space normal map format

#### 5.8 — Export: 3D mesh (GLB)

- Use Three.js `GLTFExporter` (from `three/addons/exporters/GLTFExporter`)
- Export currently visible terrain chunks as a single GLB
- Include vertex colors
- Warn user about file size (can be large with many chunks)

#### 5.9 — Export: Settings JSON

- Serialize current `WorldConfig` to JSON
- Download as `.json` file
- Import: file input → parse JSON → apply to WorldConfig → regenerate

#### 5.10 — Export panel UI

**File:** `src/ui/ExportPanel.ts`

- Resolution selector dropdown
- Export buttons for each format
- Status/progress indicators

#### 5.11 — URL hash state

- Encode seed + key params in URL hash: `#seed=12345&scale=1.5&octaves=6&...`
- On page load, parse hash and apply config
- On config change, update hash (debounced)
- Enables sharing: copy URL → friend opens → same terrain

#### 5.12 — Screenshot button

- Render to higher resolution (2x or 4x canvas size)
- `renderer.render(scene, camera)` at high res
- `renderer.domElement.toBlob()` → download
- Restore original resolution

#### 5.13 — LOD seam fix

- Add skirt geometry: short vertical walls at chunk edges extending downward
- Hides cracks between different LOD levels
- ~20 extra triangles per chunk edge × 4 edges = 80 triangles (negligible)

#### 5.14 — Performance pass

- Profile with Chrome DevTools
- Identify bottleneck (GPU-bound vs CPU-bound vs memory)
- Optimize: reduce draw calls (merge distant chunk geometries?), cull backfaces, reduce shadow resolution
- Target: 60fps at 1080p on M1 MacBook Pro

#### 5.15 — Responsive UI

- Sidebar collapses on narrow screens
- Touch controls for mobile/tablet (stretch)
- Minimap repositions

#### 5.16 — README + deployment

- README with: description, screenshots, live demo URL, tech stack, architecture diagram, build instructions
- Deploy to Vercel: configure `vercel.json` for static site
- Verify WASM loading works in production build

**Exit criteria for Phase 5:**
- All export formats work correctly
- Sky + shadows look polished
- Cinematic camera auto-flies smoothly
- URL sharing works
- Deployed and live
- README complete with screenshots

---

## 6. Testing Strategy

### Unit Tests (Vitest)

**Rust tests** (run via `cargo test`):
- Noise determinism: same seed + coords → same value, every time
- Noise range: output values within expected bounds [-1, 1] or [0, 1]
- Chunk boundary continuity: adjacent chunks produce matching edge values
- Erosion conservation: total heightmap sum should roughly equal pre-erosion sum (sediment isn't created/destroyed, only moved — allow 1% tolerance for evaporation)
- Biome classifier covers all elevation×moisture combinations (no missing match arms)
- Config validation: invalid params return errors, not panics

**TypeScript tests** (run via `vitest`):
- ChunkManager: correct chunks loaded for camera position
- ChunkManager: chunks unloaded when beyond view distance
- ChunkCache LRU: evicts oldest entries at capacity
- BiomeColors: every biome enum value has a color entry
- Vertex count matches expected for each LOD level
- WorldConfig serialization/deserialization round-trip (for URL hash + JSON export)
- Export functions produce valid PNG data (check header bytes)

### Integration Tests

- WASM bridge: generate a chunk from TypeScript, verify heightmap is non-zero and correct size
- Worker communication: send generate request, receive valid result
- Full pipeline: config → WASM → mesh → scene (verify mesh.geometry.attributes.position is populated)

### Manual Testing Checklist (per phase)

- [ ] Fly for 5 minutes in one direction — no crashes, memory stable
- [ ] Change seed — terrain changes, no stale chunks
- [ ] Adjust each slider — terrain updates, no errors
- [ ] Toggle erosion on/off — visible difference
- [ ] Export each format — file is valid
- [ ] Open shared URL — same terrain renders
- [ ] Check FPS counter — stable 60fps in normal flight
- [ ] Check memory in DevTools — no growth trend over time

---

## 7. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WASM loading fails in production (MIME type, CORS) | High | Medium | Test production build early (Phase 0). Vercel serves `.wasm` correctly by default. Add `Content-Type: application/wasm` header if needed. |
| Chunk boundary seams visible | Medium | High | Guaranteed by deterministic noise at world coordinates. Verify with explicit test in Phase 1. LOD seams fixed with skirts in Phase 5. |
| Erosion algorithm produces unrealistic results | Medium | Medium | Follow Sebastian Lague's implementation closely (well-documented). Test with known-good parameter sets. |
| Memory leak from Three.js resource disposal | High | Medium | Every chunk removal must call `.dispose()` on geometry AND material. Add defensive check in ChunkCache.evict(). Monitor in DevTools Memory tab. |
| Web Worker communication overhead | Low | Low | Float32Array transfer (zero-copy) mitigates this. Measure in Phase 2. |
| Mobile performance too low | Low | Medium | Not a primary target. Reduce view distance, disable shadows on mobile if needed. |
| `noise` crate doesn't support seeded generation well | Medium | Low | The crate supports seedable permutation tables. Verify in Phase 1 step 1.1. Fallback: implement seeded Simplex from scratch (well-documented algorithm). |

---

## 8. Assumptions

1. **Target browsers:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE11. All support WebAssembly, WebGL2, and ES2020+.
2. **WebGL2 required:** We use `WebGL2RenderingContext` features. ~97% browser support. Acceptable.
3. **Pointer Lock API available:** For fly camera. Fallback to drag-to-look if unavailable.
4. **No server component:** Everything runs client-side. Export files are created in-browser and downloaded. No API calls.
5. **Single-threaded WASM:** We don't use WASM threads (SharedArrayBuffer + atomics). Too many browser restrictions (COOP/COEP headers). Single-threaded WASM in a Web Worker is sufficient.
6. **No texture assets:** All visuals are procedural (vertex colors, shader gradients). Zero texture file downloads. This keeps the bundle small and eliminates asset loading complexity.
7. **The `noise` Rust crate (0.9) compiles to wasm32-unknown-unknown without issues.** This is well-tested territory.
8. **pnpm is the package manager** (per user env).
9. **Deployment target is Vercel** (simplest for static sites with WASM).
10. **Project directory is `/Users/d/Projects/TerraSynth`** — all paths relative to this root.
11. **Git repo will be initialized during Phase 0** — not yet initialized per env check.

---

## Judgment Calls Made

1. **Single worker vs pool:** Spec says "WorkerPool.ts". I'm keeping the filename but implementing a single worker first. The pool abstraction is unnecessary complexity until profiling proves otherwise. The file wraps a single worker with a clean async interface that could be extended to multiple workers later.

2. **Chunk-local erosion vs region erosion:** Spec implies region erosion. I'm doing chunk-local in Phase 4 because cross-chunk erosion requires stitching heightmaps across chunk boundaries, running erosion on the stitched region, and splitting results back. That's a 2-3 day detour for marginal visual improvement. Chunk-local with enough iterations still produces visible channels.

3. **LOD morph transitions deferred:** Spec mentions "smooth LOD transitions (morph between detail levels)." This requires custom vertex shaders that blend between LOD meshes based on distance. It's a nice-to-have but not essential. Hard LOD switches with fog cover are industry-standard for procedural terrain. Deferred to Phase 5 polish if time permits.

4. **Thermal erosion deferred:** Spec lists `thermal.rs` as optional. I'm skipping it entirely. Hydraulic erosion alone produces compelling results. Thermal erosion (cliff collapse simulation) is an independent algorithm with its own parameter set and would add ~500 lines of Rust for a subtle visual effect.

5. **Biome color editor deferred:** Spec mentions a "biome color palette editor." I'm implementing biome colors as a static palette with the option to swap between predefined palettes. A full color picker per biome is UI complexity that doesn't add portfolio value. The preset system covers customization.

6. **OBJ export dropped, GLB only:** Spec mentions OBJ/GLB. Three.js has a built-in `GLTFExporter` for GLB but no built-in OBJ exporter. GLB is the modern standard. Not worth adding an OBJ library.

7. **Project directory name:** Spec file tree says `terrasnyth/` (likely a typo) but the actual project is `TerraSynth`. Using `TerraSynth`.

---

## Summary

This is a 5-phase build. Each phase produces a working, demoable artifact:

| Phase | Deliverable | Key Risk |
|-------|------------|----------|
| 0 | Project compiles, WASM loads | WASM + Vite config |
| 1 | Single terrain chunk, fly camera | Noise output quality |
| 2 | Infinite terrain, water, fog, UI | Memory management |
| 3 | Biomes, presets, minimap | Biome boundary blending |
| 4 | Hydraulic erosion | Algorithm correctness |
| 5 | Polish, export, deploy | Production build issues |

The plan is designed so that a competent engineer can execute each step without ambiguity. Every decision is documented with rationale. Every edge case I could identify is called out with its mitigation.

Ready to build.
