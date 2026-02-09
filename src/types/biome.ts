import * as THREE from 'three';

export enum Biome {
  DeepOcean = 0,
  ShallowWater = 1,
  Beach = 2,
  Desert = 3,
  Grassland = 4,
  Forest = 5,
  DenseForest = 6,
  Jungle = 7,
  Tundra = 8,
  Snow = 9,
  Mountain = 10,
  Volcanic = 11,
}

export const BIOME_COLORS: Record<number, THREE.Color> = {
  [Biome.DeepOcean]:    new THREE.Color(0x1a3c5e),
  [Biome.ShallowWater]: new THREE.Color(0x2d7d9a),
  [Biome.Beach]:        new THREE.Color(0xe8d68a),
  [Biome.Desert]:       new THREE.Color(0xd4a862),
  [Biome.Grassland]:    new THREE.Color(0x7cad3a),
  [Biome.Forest]:       new THREE.Color(0x3a7d23),
  [Biome.DenseForest]:  new THREE.Color(0x1f5c15),
  [Biome.Jungle]:       new THREE.Color(0x2d8c2d),
  [Biome.Tundra]:       new THREE.Color(0x8fa38c),
  [Biome.Snow]:         new THREE.Color(0xf0f0f0),
  [Biome.Mountain]:     new THREE.Color(0x7a7a7a),
  [Biome.Volcanic]:     new THREE.Color(0x4a2020),
};

export const BIOME_COUNT = 12;
