import type { ChunkData } from '../types/terrain';
import { BIOME_COLORS } from '../types/biome';

export function exportHeightmapPNG(
  heightmap: Float32Array,
  width: number,
  height: number,
  resolution: number,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(resolution, resolution);

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const sx = Math.floor((x / resolution) * width);
      const sy = Math.floor((y / resolution) * height);
      const idx = sy * width + sx;
      const val = Math.floor((heightmap[idx] ?? 0) * 255);
      const pi = (y * resolution + x) * 4;
      imageData.data[pi] = val;
      imageData.data[pi + 1] = val;
      imageData.data[pi + 2] = val;
      imageData.data[pi + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  downloadCanvas(canvas, 'heightmap.png');
}

export function exportBiomeMapPNG(
  biomeMap: Uint8Array,
  width: number,
  height: number,
  resolution: number,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(resolution, resolution);

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const sx = Math.floor((x / resolution) * width);
      const sy = Math.floor((y / resolution) * height);
      const idx = sy * width + sx;
      const biomeId = biomeMap[idx] ?? 4;
      const color = BIOME_COLORS[biomeId];
      const pi = (y * resolution + x) * 4;
      if (color) {
        imageData.data[pi] = Math.floor(color.r * 255);
        imageData.data[pi + 1] = Math.floor(color.g * 255);
        imageData.data[pi + 2] = Math.floor(color.b * 255);
      }
      imageData.data[pi + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  downloadCanvas(canvas, 'biomemap.png');
}

export function exportNormalMapPNG(
  heightmap: Float32Array,
  width: number,
  height: number,
  resolution: number,
  strength: number = 1.0,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(resolution, resolution);

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const sx = Math.floor((x / resolution) * width);
      const sy = Math.floor((y / resolution) * height);

      // Sample heights for gradient
      const hL = heightmap[sy * width + Math.max(0, sx - 1)] ?? 0;
      const hR = heightmap[sy * width + Math.min(width - 1, sx + 1)] ?? 0;
      const hU = heightmap[Math.max(0, sy - 1) * width + sx] ?? 0;
      const hD = heightmap[Math.min(height - 1, sy + 1) * width + sx] ?? 0;

      // Normal from height differences
      let nx = (hL - hR) * strength;
      let ny = 2.0;
      let nz = (hU - hD) * strength;

      // Normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      // Map [-1,1] to [0,255]
      const pi = (y * resolution + x) * 4;
      imageData.data[pi] = Math.floor((nx * 0.5 + 0.5) * 255);
      imageData.data[pi + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      imageData.data[pi + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      imageData.data[pi + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  downloadCanvas(canvas, 'normalmap.png');
}

export function exportSettingsJSON(config: Record<string, unknown>, filename: string = 'terrasnyth-settings.json'): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function exportScreenshot(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
  // Render at current resolution
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (blob) downloadBlob(blob, 'terrasnyth-screenshot.png');
  }, 'image/png');
}

// Need THREE types for the renderer
import type * as THREE from 'three';

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
