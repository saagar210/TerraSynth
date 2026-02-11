import type { WorldConfig } from '../types/terrain';

interface WasmModule {
  default: (input?: RequestInfo | URL) => Promise<void>;
  TerrainConfig: new (seed: bigint) => WasmTerrainConfig;
  generate_chunk: (config: WasmTerrainConfig, chunkX: number, chunkZ: number) => WasmChunkData;
}

interface WasmTerrainConfig {
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

interface ChunkRequestMessage {
  type: 'generate';
  requestId: number;
  generationId: number;
  chunkX: number;
  chunkZ: number;
  config: WorldConfig;
}

interface ChunkResponseMessage {
  type: 'chunk';
  requestId: number;
  generationId: number;
  chunkX: number;
  chunkZ: number;
  data: {
    width: number;
    height: number;
    minHeight: number;
    maxHeight: number;
    heightmap: Float32Array;
    moistureMap: Float32Array;
    biomeMap: Uint8Array;
  };
}

interface ChunkErrorMessage {
  type: 'error';
  requestId: number;
  generationId: number;
  message: string;
}

let wasmModule: WasmModule | null = null;
let wasmReady: Promise<void> | null = null;
const workerScope = self as unknown as {
  addEventListener: typeof self.addEventListener;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};


async function ensureWasm(): Promise<WasmModule> {
  if (!wasmModule) {
    const mod = await import('../generation/wasm-pkg/terra_wasm.js') as unknown as WasmModule;
    wasmReady = mod.default().then(() => {
      wasmModule = mod;
    });
  }

  if (wasmReady) {
    await wasmReady;
  }

  if (!wasmModule) {
    throw new Error('Failed to initialize WASM in terrain worker');
  }

  return wasmModule;
}

function createWasmConfig(wasm: WasmModule, config: WorldConfig): WasmTerrainConfig {
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

workerScope.addEventListener('message', async (event: MessageEvent<ChunkRequestMessage>) => {
  const msg = event.data;
  if (!msg || msg.type !== 'generate') return;

  try {
    const wasm = await ensureWasm();

    const wasmConfig = createWasmConfig(wasm, msg.config);
    try {
      const result = wasm.generate_chunk(wasmConfig, msg.chunkX, msg.chunkZ);

      const response: ChunkResponseMessage = {
        type: 'chunk',
        requestId: msg.requestId,
        generationId: msg.generationId,
        chunkX: msg.chunkX,
        chunkZ: msg.chunkZ,
        data: {
          width: result.width,
          height: result.height,
          minHeight: result.min_height,
          maxHeight: result.max_height,
          heightmap: result.get_heightmap(),
          moistureMap: result.get_moisture_map(),
          biomeMap: result.get_biome_map(),
        },
      };

      result.free();

      workerScope.postMessage(response, [
        response.data.heightmap.buffer,
        response.data.moistureMap.buffer,
        response.data.biomeMap.buffer,
      ]);
    } finally {
      wasmConfig.free();
    }
  } catch (err) {
    const errorMessage: ChunkErrorMessage = {
      type: 'error',
      requestId: msg.requestId,
      generationId: msg.generationId,
      message: err instanceof Error ? err.message : String(err),
    };
    workerScope.postMessage(errorMessage);
  }
});
