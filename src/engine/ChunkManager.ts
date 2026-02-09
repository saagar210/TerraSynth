import * as THREE from 'three';
import type { Chunk, ChunkData, WorldConfig } from '../types/terrain';
import { createChunkLOD, disposeChunkLOD } from './TerrainChunk';
import { generateChunk } from '../generation/WasmBridge';

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private generationQueue: Array<{ x: number; z: number; distance: number }> = [];
  private scene: THREE.Scene;
  private config: WorldConfig;
  private maxChunksPerFrame = 2;
  private cacheMaxSize = 500;
  chunkCount = 0;
  onChunkLoaded: ((cx: number, cz: number, biomeData: Uint8Array, size: number) => void) | null = null;
  onChunkUnloaded: ((cx: number, cz: number) => void) | null = null;

  constructor(scene: THREE.Scene, config: WorldConfig) {
    this.scene = scene;
    this.config = config;
  }

  updateConfig(config: WorldConfig): void {
    const needsRegenerate =
      config.seed !== this.config.seed ||
      config.scale !== this.config.scale ||
      config.octaves !== this.config.octaves ||
      config.persistence !== this.config.persistence ||
      config.lacunarity !== this.config.lacunarity ||
      config.heightMultiplier !== this.config.heightMultiplier ||
      config.seaLevel !== this.config.seaLevel ||
      config.noiseType !== this.config.noiseType ||
      config.warpStrength !== this.config.warpStrength ||
      config.erosionEnabled !== this.config.erosionEnabled ||
      config.erosionIterations !== this.config.erosionIterations ||
      config.moistureEnabled !== this.config.moistureEnabled;

    this.config = config;

    if (needsRegenerate) {
      this.clearAll();
    }
  }

  update(cameraPosition: THREE.Vector3): void {
    const edge = this.config.chunkSize - 1;
    const camChunkX = Math.floor(cameraPosition.x / edge);
    const camChunkZ = Math.floor(cameraPosition.z / edge);
    const vd = this.config.viewDistance;

    // Determine which chunks should be loaded
    const needed = new Set<string>();
    const toGenerate: Array<{ x: number; z: number; distance: number }> = [];

    for (let dz = -vd; dz <= vd; dz++) {
      for (let dx = -vd; dx <= vd; dx++) {
        const cx = camChunkX + dx;
        const cz = camChunkZ + dz;
        const key = `${cx},${cz}`;
        needed.add(key);

        if (!this.chunks.has(key)) {
          const dist = dx * dx + dz * dz;
          toGenerate.push({ x: cx, z: cz, distance: dist });
        } else {
          const chunk = this.chunks.get(key)!;
          chunk.lastUsed = performance.now();
        }
      }
    }

    // Remove chunks beyond view distance (with hysteresis)
    const unloadDistance = vd + 2;
    const toRemove: string[] = [];
    for (const [key, chunk] of this.chunks) {
      const dx = chunk.x - camChunkX;
      const dz = chunk.z - camChunkZ;
      if (Math.abs(dx) > unloadDistance || Math.abs(dz) > unloadDistance) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      this.removeChunk(key);
    }

    // Sort by distance (closest first) and generate
    toGenerate.sort((a, b) => a.distance - b.distance);

    let generated = 0;
    for (const item of toGenerate) {
      if (generated >= this.maxChunksPerFrame) break;

      const key = `${item.x},${item.z}`;
      if (this.chunks.has(key)) continue;

      this.loadChunk(item.x, item.z);
      generated++;
    }

    this.chunkCount = this.chunks.size;

    // Enforce cache limit
    if (this.chunks.size > this.cacheMaxSize) {
      this.evictOldest(this.chunks.size - this.cacheMaxSize);
    }
  }

  private loadChunk(cx: number, cz: number): void {
    const chunkData = generateChunk(this.config, cx, cz);
    const lod = createChunkLOD(
      chunkData,
      cx,
      cz,
      this.config.heightMultiplier,
      this.config.seaLevel,
      this.config.wireframe,
    );

    this.scene.add(lod);

    const key = `${cx},${cz}`;
    const chunk: Chunk = {
      x: cx,
      z: cz,
      key,
      lod,
      heightData: chunkData.heightmap,
      biomeData: chunkData.biomeMap,
      lastUsed: performance.now(),
    };

    this.chunks.set(key, chunk);
    this.onChunkLoaded?.(cx, cz, chunkData.biomeMap, chunkData.width);
  }

  private removeChunk(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    this.scene.remove(chunk.lod);
    disposeChunkLOD(chunk.lod);
    this.chunks.delete(key);
    this.onChunkUnloaded?.(chunk.x, chunk.z);
  }

  private evictOldest(count: number): void {
    const sorted = [...this.chunks.entries()]
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    for (let i = 0; i < count && i < sorted.length; i++) {
      this.removeChunk(sorted[i]![0]);
    }
  }

  clearAll(): void {
    for (const key of [...this.chunks.keys()]) {
      this.removeChunk(key);
    }
    this.generationQueue = [];
  }

  getHeightAt(worldX: number, worldZ: number): number | null {
    const edge = this.config.chunkSize - 1;
    const cx = Math.floor(worldX / edge);
    const cz = Math.floor(worldZ / edge);
    const key = `${cx},${cz}`;
    const chunk = this.chunks.get(key);
    if (!chunk) return null;

    const localX = Math.floor(worldX - cx * edge);
    const localZ = Math.floor(worldZ - cz * edge);
    const idx = localZ * this.config.chunkSize + localX;
    const height = chunk.heightData[idx];
    if (height === undefined) return null;

    return height * this.config.heightMultiplier;
  }

  dispose(): void {
    this.clearAll();
  }
}
