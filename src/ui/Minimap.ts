import * as THREE from 'three';
import { BIOME_COLORS } from '../types/biome';

const MINIMAP_RESOLUTION = 200;

const _tempVec = new THREE.Vector3();

export class Minimap {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chunkBiomeData = new Map<string, { data: Uint8Array; size: number }>();
  private chunkSize = 128;
  private onClick: ((worldX: number, worldZ: number) => void) | null = null;
  private cameraChunkX = 0;
  private cameraChunkZ = 0;
  private cameraAngle = 0;

  constructor(chunkSize: number) {
    this.chunkSize = chunkSize;

    this.container = document.createElement('div');
    this.container.className = 'minimap';

    this.canvas = document.createElement('canvas');
    this.canvas.width = MINIMAP_RESOLUTION;
    this.canvas.height = MINIMAP_RESOLUTION;
    this.container.appendChild(this.canvas);

    const rawCtx = this.canvas.getContext('2d');
    if (!rawCtx) throw new Error('Failed to get 2d context for minimap');
    this.ctx = rawCtx;

    this.canvas.addEventListener('click', this.handleClick);

    document.body.appendChild(this.container);
  }

  private handleClick = (event: MouseEvent): void => {
    if (!this.onClick) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const mz = (event.clientY - rect.top) / rect.height;

    const edge = this.chunkSize - 1;
    const viewRange = 5;
    const worldX = (this.cameraChunkX - viewRange + mx * viewRange * 2) * edge;
    const worldZ = (this.cameraChunkZ - viewRange + mz * viewRange * 2) * edge;

    this.onClick(worldX, worldZ);
  };

  onTeleport(callback: (worldX: number, worldZ: number) => void): void {
    this.onClick = callback;
  }

  registerChunk(cx: number, cz: number, biomeData: Uint8Array, size: number): void {
    this.chunkBiomeData.set(`${cx},${cz}`, { data: biomeData, size });
  }

  unregisterChunk(cx: number, cz: number): void {
    this.chunkBiomeData.delete(`${cx},${cz}`);
  }

  update(camera: THREE.PerspectiveCamera): void {
    const edge = this.chunkSize - 1;
    this.cameraChunkX = Math.floor(camera.position.x / edge);
    this.cameraChunkZ = Math.floor(camera.position.z / edge);

    const dir = camera.getWorldDirection(_tempVec);
    this.cameraAngle = Math.atan2(dir.x, dir.z);

    this.render();
  }

  private render(): void {
    const { ctx } = this;
    const viewRange = 5;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, MINIMAP_RESOLUTION, MINIMAP_RESOLUTION);

    const pixelsPerChunk = MINIMAP_RESOLUTION / (viewRange * 2);

    for (let dz = -viewRange; dz < viewRange; dz++) {
      for (let dx = -viewRange; dx < viewRange; dx++) {
        const cx = this.cameraChunkX + dx;
        const cz = this.cameraChunkZ + dz;
        const key = `${cx},${cz}`;
        const chunk = this.chunkBiomeData.get(key);

        const px = (dx + viewRange) * pixelsPerChunk;
        const pz = (dz + viewRange) * pixelsPerChunk;

        if (!chunk) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(px, pz, pixelsPerChunk, pixelsPerChunk);
          continue;
        }

        const samplesPerChunk = Math.ceil(pixelsPerChunk);
        for (let sy = 0; sy < samplesPerChunk; sy++) {
          for (let sx = 0; sx < samplesPerChunk; sx++) {
            const bx = Math.floor((sx / samplesPerChunk) * chunk.size);
            const bz = Math.floor((sy / samplesPerChunk) * chunk.size);
            const biomeId = chunk.data[bz * chunk.size + bx] ?? 4;
            const color = BIOME_COLORS[biomeId];
            if (color) {
              const r = Math.floor(color.r * 255);
              const g = Math.floor(color.g * 255);
              const b = Math.floor(color.b * 255);
              ctx.fillStyle = `rgb(${r},${g},${b})`;
            } else {
              ctx.fillStyle = '#333';
            }
            ctx.fillRect(px + sx, pz + sy, 1.2, 1.2);
          }
        }
      }
    }

    // Camera indicator
    const centerX = MINIMAP_RESOLUTION / 2;
    const centerZ = MINIMAP_RESOLUTION / 2;
    ctx.save();
    ctx.translate(centerX, centerZ);
    ctx.rotate(-this.cameraAngle);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  dispose(): void {
    this.container.remove();
  }
}
