import * as THREE from 'three';

export function createFog(scene: THREE.Scene, viewDistance: number, chunkSize: number): void {
  const maxDist = viewDistance * (chunkSize - 1);
  scene.fog = new THREE.FogExp2(0x87ceeb, 2.5 / maxDist);
}

export function updateFogDensity(scene: THREE.Scene, viewDistance: number, chunkSize: number): void {
  if (scene.fog instanceof THREE.FogExp2) {
    const maxDist = viewDistance * (chunkSize - 1);
    scene.fog.density = 2.5 / maxDist;
  }
}

export function removeFog(scene: THREE.Scene): void {
  scene.fog = null;
}
