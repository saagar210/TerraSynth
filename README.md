# TerraSynth

**Infinite procedural worlds, generated in real-time.**

TerraSynth is a procedural terrain generator that creates infinite landscapes—mountains, rivers, forests, deserts, oceans—using layered noise functions, hydraulic erosion simulation, and biome classification. Explore in real-time with a flying camera. Export heightmaps and biome maps as images.

![TerraSynth Screenshot](https://via.placeholder.com/800x450/87ceeb/000000?text=TerraSynth)

## ✨ Features

- **🌍 Infinite Terrain Generation** — Fly in any direction, terrain generates infinitely with seamless chunk boundaries
- **⛰️ Advanced Noise Types** — Simplex, Perlin, Ridged Multifractal, and Domain-Warped noise for varied landscapes
- **💧 Hydraulic Erosion** — Particle-based simulation (50K–200K iterations) carves realistic rivers and valleys
- **🏞️ Biome Classification** — 12 distinct biomes: oceans, beaches, deserts, grasslands, forests, tundra, mountains, and more
- **🎨 Real-Time Rendering** — Three.js WebGL rendering at 60fps with 3-level LOD system
- **🎮 Fly Camera** — WASD movement + mouse look with pointer lock, adjustable speed
- **🎛️ Full Control Panel** — Tweak every parameter: seed, scale, octaves, persistence, sea level, erosion parameters
- **🗺️ Live Minimap** — Top-down biome-colored view with camera position indicator
- **📦 Export Tools** — Export heightmaps, biome maps, normal maps (PNG), screenshots, and settings JSON
- **🔗 Shareable URLs** — Configuration stored in URL hash for easy sharing
- **🎭 8 Terrain Presets** — Archipelago, Alpine, Desert Canyon, Tropical Islands, Volcanic, Flat Plains, Warped Alien

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Terrain Generation** | Rust → WebAssembly | Near-native speed noise generation and erosion simulation |
| **Rendering** | Three.js (r170+) | WebGL terrain meshes, LOD, camera, lighting, fog |
| **UI** | Vanilla TypeScript | Lightweight custom control panel—no framework overhead |
| **Noise** | `noise` crate (Rust) | Perlin, Simplex, multi-octave layering |
| **Build** | Vite + wasm-pack | Fast dev server, WASM plugin support |

**Why this stack?** Rust/WASM for CPU-bound terrain generation runs 5–20× faster than pure JavaScript. Three.js handles WebGL complexity while staying performant. Vanilla TypeScript proves you can build rich UIs without React/Vue.

## 📦 Installation

### Prerequisites
- **Node.js** 18+ (tested with v22)
- **Rust** 1.70+ with `wasm-pack` installed
- **pnpm** (or npm/yarn)

### Setup

```bash
# Clone the repository
git clone https://github.com/saagar210/TerraSynth.git
cd TerraSynth

# Install dependencies
pnpm install

# Build the Rust WASM module
cd rust
./build.sh
cd ..

# Start the dev server
pnpm dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
pnpm build
```

Outputs to `dist/` — deploy as a static site to Vercel, Netlify, or GitHub Pages.

## 🎮 Controls

| Action | Control |
|--------|---------|
| **Fly Camera** | Click viewport to engage pointer lock |
| **Move** | WASD |
| **Look** | Mouse movement |
| **Up/Down** | Space / Shift |
| **Adjust Speed** | Scroll wheel or +/- keys |
| **Teleport** | Click minimap |
| **Exit Pointer Lock** | ESC |

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│              Browser                     │
│  ┌────────────────────────────────────┐ │
│  │      Three.js Renderer              │ │
│  │  Terrain Mesh (LOD) | Water | Fog  │ │
│  └──────────────┬──────────────────────┘ │
│                 │ heightmap data          │
│  ┌──────────────┴──────────────────────┐ │
│  │        Rust WASM Module             │ │
│  │  Noise Gen | Erosion | Biome Map   │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │      TypeScript App Layer           │ │
│  │  ChunkManager | Camera | UI | LOD   │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Key Concepts

- **Chunk System** — Terrain divided into 128×128 vertex chunks. Only chunks near the camera are loaded. As you fly, new chunks generate and distant chunks unload.
- **LOD (Level of Detail)** — Chunks near camera use full resolution; distant chunks use simplified meshes (half/quarter resolution).
- **Seamless Boundaries** — Noise sampling uses absolute world coordinates, ensuring adjacent chunks have matching edge vertices—no visible seams.
- **Hydraulic Erosion** — Simulates thousands of water droplets flowing downhill, picking up and depositing sediment. Creates realistic river channels and valleys.

## 📁 Project Structure

```
TerraSynth/
├── src/
│   ├── engine/          # Three.js scene, camera, chunk manager, LOD
│   ├── generation/      # WASM bridge, biome colors
│   ├── ui/              # Control panel, minimap, FPS counter, export
│   ├── controls/        # Fly camera controls
│   ├── utils/           # Export functions, URL hash state
│   └── types/           # TypeScript type definitions
├── rust/
│   └── src/
│       ├── noise/       # Simplex, Perlin, Ridged, Warped noise
│       ├── erosion/     # Hydraulic erosion simulation
│       ├── biome/       # Moisture map, biome classifier
│       └── chunk.rs     # Main generation pipeline
├── index.html
├── vite.config.ts
└── package.json
```

## 🧪 Testing

### Rust Tests
```bash
cd rust
cargo test
```
18 unit tests covering:
- Noise determinism (same seed → same output)
- Chunk boundary continuity
- Biome classification coverage
- Erosion conservation laws

### TypeScript Type Check
```bash
npx tsc --noEmit
```
Strict mode, zero `any` types.

## 🎨 Presets

Try these curated terrain configurations:

| Preset | Description |
|--------|-------------|
| **Archipelago** | Scattered islands, low sea level |
| **Alpine** | Towering mountain ranges with ridged peaks |
| **Desert Canyon** | Ridged noise + heavy erosion = dramatic canyons |
| **Tropical Islands** | Warm biomes, shallow water, coral colors |
| **Volcanic** | Extreme height variation, sharp ridges |
| **Flat Plains** | Gentle rolling hills, grassland dominant |
| **Warped Alien** | Domain-warped noise for organic, alien landscapes |

## 🔧 Configuration

All parameters are exposed in the control panel:

**World**
- Seed (randomizable)
- Scale (world size multiplier)
- Height (vertical scale)
- Sea Level

**Noise**
- Type (Simplex, Perlin, Ridged, Warped)
- Octaves (1–8)
- Persistence (amplitude decay)
- Lacunarity (frequency multiplier)
- Warp Strength (for domain warping)

**Erosion**
- Enable/Disable
- Iterations (10K–200K)
- Inertia, Capacity, Erosion Rate, Deposition

**Rendering**
- View Distance (chunk count)
- Water, Fog, Wireframe toggles

## 📤 Export

Export your terrain in multiple formats:

- **Heightmap PNG** — Grayscale elevation map
- **Biome Map PNG** — Color-coded biome regions
- **Normal Map PNG** — Surface normals for external use
- **Screenshot** — Current viewport render
- **Settings JSON** — Export/import generation parameters


## ✅ Quality Gates

```bash
pnpm lint
pnpm test
pnpm build
cd rust && cargo test
```

## 🌐 Deployment

TerraSynth is a static site with zero backend requirements. Deploy to:

- **Vercel** — `vercel deploy` (recommended)
- **Netlify** — Drag `dist/` folder
- **GitHub Pages** — Push `dist/` to `gh-pages` branch

All WASM and assets are self-contained in the `dist/` output.

## 📊 Performance

Tested on M1 MacBook Pro:

| Metric | Result |
|--------|--------|
| **FPS** | 60fps at 1080p (81 chunks loaded) |
| **Frame Time** | 16.7ms |
| **Chunk Generation** | <50ms per chunk (WASM) |
| **Erosion (50K)** | <1 second |
| **Erosion (200K)** | <3 seconds |
| **Bundle Size** | 159KB gzipped (total) |
| **WASM Binary** | 14.8KB gzipped |
| **Memory** | <500MB at max view distance |

## 🛠️ Development

```bash
# Dev server with hot reload
pnpm dev

# Rebuild WASM after Rust changes
cd rust && ./build.sh

# Type check
npx tsc --noEmit

# Run Rust tests
cd rust && cargo test

# Production build
pnpm build
```

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **Noise algorithms** — Based on Ken Perlin's original work and the Rust `noise` crate
- **Hydraulic erosion** — Inspired by Sebastian Lague's procedural terrain generation series
- **Three.js** — For making WebGL approachable
- **Rust/WASM** — For bringing near-native performance to the browser

---

**Built with Rust 🦀 + Three.js + TypeScript**

*Infinite worlds, zero backend.*
