declare module '*terra_wasm.js' {
  export default function init(input?: RequestInfo | URL): Promise<void>;

  export class TerrainConfig {
    constructor(seed: bigint);
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
    free(): void;
  }

  export function generate_chunk(config: TerrainConfig, chunkX: number, chunkZ: number): {
    width: number;
    height: number;
    min_height: number;
    max_height: number;
    get_heightmap(): Float32Array;
    get_moisture_map(): Float32Array;
    get_biome_map(): Uint8Array;
    free(): void;
  };

  export function erode_heightmap(
    heightmap: Float32Array,
    width: number,
    height: number,
    config: TerrainConfig,
  ): void;
}
