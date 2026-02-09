import * as THREE from 'three';
import type { ChunkData } from '../types/terrain';
import { getBlendedBiomeColor, getElevationColor } from '../generation/BiomeColors';

export function createTerrainMesh(
  chunkData: ChunkData,
  chunkX: number,
  chunkZ: number,
  heightMultiplier: number,
  seaLevel: number,
  lodLevel: number,
  wireframe: boolean,
): THREE.Mesh {
  const size = chunkData.width;
  const edge = size - 1;
  const step = Math.pow(2, lodLevel);
  const segments = Math.floor(edge / step);

  const geometry = new THREE.BufferGeometry();

  const vertexCount = (segments + 1) * (segments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  const worldOffsetX = chunkX * edge;
  const worldOffsetZ = chunkZ * edge;

  const hasBiomes = chunkData.biomeMap.length > 0;

  // Fill vertex positions and colors
  let vi = 0;
  for (let gz = 0; gz <= segments; gz++) {
    for (let gx = 0; gx <= segments; gx++) {
      const hx = gx * step;
      const hz = gz * step;
      const idx = hz * size + hx;
      const height = chunkData.heightmap[idx] ?? 0;

      positions[vi * 3] = worldOffsetX + hx;
      positions[vi * 3 + 1] = height * heightMultiplier;
      positions[vi * 3 + 2] = worldOffsetZ + hz;

      let color: THREE.Color;
      if (hasBiomes) {
        color = getBlendedBiomeColor(chunkData.biomeMap, hx, hz, size, size);
      } else {
        color = getElevationColor(height, seaLevel);
      }

      colors[vi * 3] = color.r;
      colors[vi * 3 + 1] = color.g;
      colors[vi * 3 + 2] = color.b;

      vi++;
    }
  }

  // Build index buffer
  const indexCount = segments * segments * 6;
  const indices = new Uint32Array(indexCount);
  let ii = 0;
  const row = segments + 1;

  for (let gz = 0; gz < segments; gz++) {
    for (let gx = 0; gx < segments; gx++) {
      const tl = gz * row + gx;
      const tr = tl + 1;
      const bl = (gz + 1) * row + gx;
      const br = bl + 1;

      indices[ii++] = tl;
      indices[ii++] = bl;
      indices[ii++] = tr;

      indices[ii++] = tr;
      indices[ii++] = bl;
      indices[ii++] = br;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: false,
    wireframe,
    roughness: 0.85,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  return mesh;
}

export function createChunkLOD(
  chunkData: ChunkData,
  chunkX: number,
  chunkZ: number,
  heightMultiplier: number,
  seaLevel: number,
  wireframe: boolean,
): THREE.LOD {
  const lod = new THREE.LOD();
  const edge = chunkData.width - 1;

  // LOD 0: full resolution
  const mesh0 = createTerrainMesh(chunkData, chunkX, chunkZ, heightMultiplier, seaLevel, 0, wireframe);
  lod.addLevel(mesh0, 0);

  // LOD 1: half resolution
  const mesh1 = createTerrainMesh(chunkData, chunkX, chunkZ, heightMultiplier, seaLevel, 1, wireframe);
  lod.addLevel(mesh1, edge * 3);

  // LOD 2: quarter resolution
  const mesh2 = createTerrainMesh(chunkData, chunkX, chunkZ, heightMultiplier, seaLevel, 2, wireframe);
  lod.addLevel(mesh2, edge * 6);

  return lod;
}

export function disposeChunkLOD(lod: THREE.LOD): void {
  for (const level of lod.levels) {
    const mesh = level.object as THREE.Mesh;
    mesh.geometry.dispose();
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
    }
  }
}
