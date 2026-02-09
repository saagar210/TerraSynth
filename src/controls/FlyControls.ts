import * as THREE from 'three';

export class FlyControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private keys = new Set<string>();
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private isLocked = false;
  speed = 50;
  private sensitivity = 0.002;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Initialize euler from camera
    this.euler.setFromQuaternion(camera.quaternion);

    domElement.addEventListener('click', this.requestPointerLock);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private requestPointerLock = (): void => {
    this.domElement.requestPointerLock().catch(() => {
      // Pointer lock not available, fallback to drag mode
    });
  };

  private onPointerLockChange = (): void => {
    this.isLocked = document.pointerLockElement === this.domElement;
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isLocked) return;

    this.euler.y -= event.movementX * this.sensitivity;
    this.euler.x -= event.movementY * this.sensitivity;
    this.euler.x = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onWheel = (event: WheelEvent): void => {
    this.speed = Math.max(5, Math.min(500, this.speed - event.deltaY * 0.1));
  };

  update(delta: number): void {
    if (!this.isLocked) return;

    const moveSpeed = this.speed * delta;
    const direction = new THREE.Vector3();

    // Forward/backward (W/S)
    if (this.keys.has('KeyW')) direction.z -= 1;
    if (this.keys.has('KeyS')) direction.z += 1;

    // Strafe (A/D)
    if (this.keys.has('KeyA')) direction.x -= 1;
    if (this.keys.has('KeyD')) direction.x += 1;

    // Vertical (Space/Shift)
    if (this.keys.has('Space')) direction.y += 1;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) direction.y -= 1;

    if (direction.lengthSq() === 0) return;

    direction.normalize();

    // Transform direction by camera quaternion (but keep Y world-relative)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

    const movement = new THREE.Vector3();
    movement.addScaledVector(right, direction.x * moveSpeed);
    movement.y += direction.y * moveSpeed;
    movement.addScaledVector(forward, -direction.z * moveSpeed);

    this.camera.position.add(movement);
  }

  get locked(): boolean {
    return this.isLocked;
  }

  dispose(): void {
    this.domElement.removeEventListener('click', this.requestPointerLock);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('wheel', this.onWheel);
  }
}
