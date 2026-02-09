import * as THREE from 'three';

export class Water {
  readonly mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshStandardMaterial;

  constructor(seaLevel: number, heightMultiplier: number, size: number) {
    this.geometry = new THREE.PlaneGeometry(size, size, 64, 64);
    this.geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.MeshStandardMaterial({
      color: 0x2288aa,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.3,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.y = seaLevel * heightMultiplier;
    this.mesh.renderOrder = 1;
    this.mesh.receiveShadow = true;
  }

  update(cameraPosition: THREE.Vector3, elapsed: number): void {
    // Follow camera horizontally
    this.mesh.position.x = cameraPosition.x;
    this.mesh.position.z = cameraPosition.z;

    // Subtle wave animation
    const positions = this.geometry.attributes['position'];
    if (!positions) return;
    const arr = positions.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i]!;
      const z = arr[i + 2]!;
      arr[i + 1] = Math.sin(elapsed * 0.8 + x * 0.02 + z * 0.015) * 0.3;
    }
    positions.needsUpdate = true;
  }

  setLevel(seaLevel: number, heightMultiplier: number): void {
    this.mesh.position.y = seaLevel * heightMultiplier;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
