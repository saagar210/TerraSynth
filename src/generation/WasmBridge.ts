import type { ChunkData, WorldConfig } from '../types/terrain';

// The WASM module types (matches wasm-bindgen output)
interface WasmModule {
  default: (input?: RequestInfo | URL) => Promise<void>;
  TerrainConfig: new (seed: bigint) => WasmTerrainConfig;
  generate_chunk: (config: WasmTerrainConfig, chunkX: number, chunkZ: number) => WasmChunkData;
  erode_heightmap: (heightmap: Float32Array, width: number, height: number, config: WasmTerrainConfig) => void;
}

interface WasmTerrainConfig {
  seed: bigint;
  chunk_size: number;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  height_multiplier: number;
  sea_level: number;
  erosion_iterations: number;
  erosion_inertia: number;
  erosion_capacity: number;
  erosion_deposition: number;
  erosion_erosion_rate: number;
  erosion_evaporation: number;
  moisture_enabled: boolean;
  erosion_enabled: boolean;
  noise_type: number;
  warp_strength: number;
  free: () => void;
}

interface WasmChunkData {
  width: number;
  height: number;
  min_height: number;
  max_height: number;
  get_heightmap: () => Float32Array;
  get_moisture_map: () => Float32Array;
  get_biome_map: () => Uint8Array;
  free: () => void;
}

let wasmModule: WasmModule | null = null;

export async function initWasm(): Promise<void> {
  const wasmModulePath = './wasm-pkg/terra_wasm.js';

  try {
    const mod = await import(/* @vite-ignore */ wasmModulePath) as unknown as WasmModule;
    await mod.default();
    wasmModule = mod;
  } catch (error) {
    throw new Error(
      `Failed to load WASM module at ${wasmModulePath}. Run \"pnpm build:wasm\" first.`,
      { cause: error },
    );
  }
}

function getWasm(): WasmModule {
  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }
  return wasmModule;
}

export function createWasmConfig(config: WorldConfig): WasmTerrainConfig {
  const wasm = getWasm();
  const wasmConfig = new wasm.TerrainConfig(BigInt(config.seed));

  wasmConfig.chunk_size = config.chunkSize;
  wasmConfig.scale = config.scale;
  wasmConfig.octaves = config.octaves;
  wasmConfig.persistence = config.persistence;
  wasmConfig.lacunarity = config.lacunarity;
  wasmConfig.height_multiplier = config.heightMultiplier;
  wasmConfig.sea_level = config.seaLevel;
  wasmConfig.erosion_iterations = config.erosionIterations;
  wasmConfig.erosion_inertia = config.erosionInertia;
  wasmConfig.erosion_capacity = config.erosionCapacity;
  wasmConfig.erosion_deposition = config.erosionDeposition;
  wasmConfig.erosion_erosion_rate = config.erosionErosionRate;
  wasmConfig.erosion_evaporation = config.erosionEvaporation;
  wasmConfig.moisture_enabled = config.moistureEnabled;
  wasmConfig.erosion_enabled = config.erosionEnabled;
  wasmConfig.noise_type = config.noiseType;
  wasmConfig.warp_strength = config.warpStrength;

  return wasmConfig;
}

export function generateChunk(config: WorldConfig, chunkX: number, chunkZ: number): ChunkData {
  const wasm = getWasm();
  const wasmConfig = createWasmConfig(config);

  try {
    const result = wasm.generate_chunk(wasmConfig, chunkX, chunkZ);

    const data: ChunkData = {
      heightmap: result.get_heightmap(),
      moistureMap: result.get_moisture_map(),
      biomeMap: result.get_biome_map(),
      width: result.width,
      height: result.height,
      minHeight: result.min_height,
      maxHeight: result.max_height,
    };

    result.free();
    return data;
  } finally {
    wasmConfig.free();
  }
}

export function erodeHeightmap(
  heightmap: Float32Array,
  width: number,
  height: number,
  config: WorldConfig,
): void {
  const wasm = getWasm();
  const wasmConfig = createWasmConfig(config);

  try {
    wasm.erode_heightmap(heightmap, width, height, wasmConfig);
  } finally {
    wasmConfig.free();
  }
}
