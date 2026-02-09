import type * as THREE from 'three';

export interface ChunkData {
  heightmap: Float32Array;
  moistureMap: Float32Array;
  biomeMap: Uint8Array;
  width: number;
  height: number;
  minHeight: number;
  maxHeight: number;
}

export interface Chunk {
  x: number;
  z: number;
  key: string;
  lod: THREE.LOD;
  heightData: Float32Array;
  biomeData: Uint8Array;
  lastUsed: number;
}

export interface WorldConfig {
  seed: number;
  chunkSize: number;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  heightMultiplier: number;
  seaLevel: number;
  viewDistance: number;
  noiseType: number; // 0=Simplex, 1=Perlin, 2=Ridged, 3=Warped
  warpStrength: number;
  erosionEnabled: boolean;
  erosionIterations: number;
  erosionInertia: number;
  erosionCapacity: number;
  erosionDeposition: number;
  erosionErosionRate: number;
  erosionEvaporation: number;
  moistureEnabled: boolean;
  generateWater: boolean;
  generateFog: boolean;
  wireframe: boolean;
  showShadows: boolean;
}

export function defaultWorldConfig(): WorldConfig {
  return {
    seed: 42,
    chunkSize: 128,
    scale: 1.0,
    octaves: 6,
    persistence: 0.5,
    lacunarity: 2.0,
    heightMultiplier: 80,
    seaLevel: 0.35,
    viewDistance: 4,
    noiseType: 0,
    warpStrength: 0.5,
    erosionEnabled: false,
    erosionIterations: 50000,
    erosionInertia: 0.05,
    erosionCapacity: 4.0,
    erosionDeposition: 0.3,
    erosionErosionRate: 0.3,
    erosionEvaporation: 0.01,
    moistureEnabled: true,
    generateWater: true,
    generateFog: true,
    wireframe: false,
    showShadows: false,
  };
}
