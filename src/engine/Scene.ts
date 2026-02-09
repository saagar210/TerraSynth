import * as THREE from 'three';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly clock: THREE.Clock;

  private animationCallbacks: Array<(delta: number, elapsed: number) => void> = [];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      10000,
    );
    this.camera.position.set(0, 100, 0);
    this.camera.lookAt(50, 0, 50);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    // Lighting
    const ambient = new THREE.AmbientLight(0x6688cc, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4e6, 1.2);
    sun.position.set(200, 300, 100);
    sun.castShadow = false;
    this.scene.add(sun);

    // Hemisphere light for natural sky/ground coloring
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.4);
    this.scene.add(hemi);

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  onAnimate(callback: (delta: number, elapsed: number) => void): void {
    this.animationCallbacks.push(callback);
  }

  start(): void {
    const animate = (): void => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      for (const cb of this.animationCallbacks) {
        cb(delta, elapsed);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
