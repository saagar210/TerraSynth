import * as THREE from 'three';
import { BIOME_COLORS } from '../types/biome';

const tempColor = new THREE.Color();

export function getBiomeColor(biomeId: number): THREE.Color {
  return BIOME_COLORS[biomeId] ?? BIOME_COLORS[4]!; // fallback to grassland
}

export function getBlendedBiomeColor(
  biomeMap: Uint8Array,
  x: number,
  z: number,
  width: number,
  height: number,
): THREE.Color {
  const idx = z * width + x;
  const centerBiome = biomeMap[idx]!;
  const centerColor = getBiomeColor(centerBiome);

  // Check if at biome boundary — blend with neighbors
  if (x <= 0 || x >= width - 1 || z <= 0 || z >= height - 1) {
    return centerColor.clone();
  }

  const neighbors = [
    biomeMap[(z - 1) * width + x]!,
    biomeMap[(z + 1) * width + x]!,
    biomeMap[z * width + (x - 1)]!,
    biomeMap[z * width + (x + 1)]!,
  ];

  const hasDifferentNeighbor = neighbors.some(n => n !== centerBiome);
  if (!hasDifferentNeighbor) {
    return centerColor.clone();
  }

  // Blend: 60% center + 10% each neighbor
  let r = centerColor.r * 0.6;
  let g = centerColor.g * 0.6;
  let b = centerColor.b * 0.6;
  for (const n of neighbors) {
    tempColor.copy(getBiomeColor(n));
    r += tempColor.r * 0.1;
    g += tempColor.g * 0.1;
    b += tempColor.b * 0.1;
  }

  return new THREE.Color(r, g, b);
}

export function getElevationColor(elevation: number, seaLevel: number): THREE.Color {
  if (elevation < seaLevel - 0.1) {
    return new THREE.Color(0x1a3c5e); // deep ocean
  }
  if (elevation < seaLevel) {
    return new THREE.Color(0x2d7d9a); // shallow water
  }

  const t = (elevation - seaLevel) / (1.0 - seaLevel);

  if (t < 0.05) return new THREE.Color(0xe8d68a); // beach
  if (t < 0.3) return new THREE.Color().lerpColors(new THREE.Color(0x7cad3a), new THREE.Color(0x3a7d23), (t - 0.05) / 0.25);
  if (t < 0.6) return new THREE.Color().lerpColors(new THREE.Color(0x3a7d23), new THREE.Color(0x7a7a7a), (t - 0.3) / 0.3);
  if (t < 0.85) return new THREE.Color().lerpColors(new THREE.Color(0x7a7a7a), new THREE.Color(0xcccccc), (t - 0.6) / 0.25);
  return new THREE.Color().lerpColors(new THREE.Color(0xcccccc), new THREE.Color(0xffffff), (t - 0.85) / 0.15);
}
