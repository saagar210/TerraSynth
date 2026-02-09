export class FPSCounter {
  private element: HTMLDivElement;
  private frames: number[] = [];
  private chunkCount = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'fps-counter';
    this.element.textContent = 'FPS: --';
    document.body.appendChild(this.element);
  }

  update(delta: number, chunks: number): void {
    this.chunkCount = chunks;
    const fps = delta > 0 ? 1 / delta : 0;
    this.frames.push(fps);
    if (this.frames.length > 60) this.frames.shift();

    // Update display every 10 frames
    if (this.frames.length % 10 === 0) {
      const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      const ms = delta * 1000;
      this.element.textContent = `FPS: ${Math.round(avg)} | ${ms.toFixed(1)}ms | Chunks: ${this.chunkCount}`;
    }
  }

  dispose(): void {
    this.element.remove();
  }
}
