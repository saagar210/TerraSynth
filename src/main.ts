import { SceneManager } from './engine/Scene';
import { ChunkManager } from './engine/ChunkManager';
import { Water } from './engine/Water';
import { createFog, removeFog } from './engine/Fog';
import { FlyControls } from './controls/FlyControls';
import { FPSCounter } from './ui/FPSCounter';
import { ControlPanel } from './ui/Panel';
import { Minimap } from './ui/Minimap';
import { initWasm } from './generation/WasmBridge';
import { defaultWorldConfig, type WorldConfig } from './types/terrain';
import { loadConfigFromHash, updateHash } from './utils/hashState';

async function main(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app container');

  // Show loading
  const loading = document.createElement('div');
  loading.className = 'loading-indicator';
  loading.textContent = 'Initializing TerraSynth...';
  document.body.appendChild(loading);

  // Initialize WASM
  await initWasm();
  loading.textContent = 'Generating terrain...';

  // Create scene
  const sceneManager = new SceneManager(app);

  // Load config from URL hash or use defaults
  let config = loadConfigFromHash();

  // Create chunk manager
  const chunkManager = new ChunkManager(sceneManager.scene, config);

  // Create water
  let water: Water | null = null;
  const recreateWater = (): void => {
    if (water) {
      sceneManager.scene.remove(water.mesh);
      water.dispose();
      water = null;
    }
    if (config.generateWater) {
      const waterSize = config.viewDistance * (config.chunkSize - 1) * 3;
      water = new Water(config.seaLevel, config.heightMultiplier, waterSize);
      sceneManager.scene.add(water.mesh);
    }
  };
  recreateWater();

  // Create fog
  if (config.generateFog) {
    createFog(sceneManager.scene, config.viewDistance, config.chunkSize);
  }

  // Create fly controls
  const flyControls = new FlyControls(sceneManager.camera, sceneManager.renderer.domElement);

  // Create FPS counter
  const fpsCounter = new FPSCounter();

  // Create minimap
  const minimap = new Minimap(config.chunkSize);
  minimap.onTeleport((worldX, worldZ) => {
    sceneManager.camera.position.set(worldX, 100, worldZ);
  });

  chunkManager.onChunkLoaded = (cx, cz, biomeData, size) => {
    minimap.registerChunk(cx, cz, biomeData, size);
  };
  chunkManager.onChunkUnloaded = (cx, cz) => {
    minimap.unregisterChunk(cx, cz);
  };

  // Controls hint
  const hint = document.createElement('div');
  hint.className = 'controls-hint';
  hint.innerHTML = 'Click to fly | WASD Move | Mouse Look | Scroll Speed | Space/Shift Up/Down';
  document.body.appendChild(hint);

  // Config change handler
  const handleConfigChange = (newConfig: WorldConfig): void => {
    const waterChanged = newConfig.generateWater !== config.generateWater ||
      newConfig.seaLevel !== config.seaLevel ||
      newConfig.heightMultiplier !== config.heightMultiplier;

    const fogChanged = newConfig.generateFog !== config.generateFog ||
      newConfig.viewDistance !== config.viewDistance;

    config = newConfig;
    chunkManager.updateConfig(config);
    updateHash(config);

    if (waterChanged) recreateWater();

    if (fogChanged) {
      if (config.generateFog) {
        createFog(sceneManager.scene, config.viewDistance, config.chunkSize);
      } else {
        removeFog(sceneManager.scene);
      }
    }
  };

  // Create control panel with export
  const _panel = new ControlPanel(
    config,
    handleConfigChange,
    () => sceneManager.renderer,
    () => sceneManager.scene,
    () => sceneManager.camera,
  );

  // Listen for settings import
  window.addEventListener('terrasnyth:import', ((event: CustomEvent) => {
    const imported = event.detail;
    if (imported && typeof imported === 'object') {
      const merged = { ...defaultWorldConfig(), ...imported } as WorldConfig;
      handleConfigChange(merged);
    }
  }) as EventListener);

  // Remove loading indicator
  loading.remove();

  // Minimap update throttle
  let frameCount = 0;

  // Animation loop
  sceneManager.onAnimate((delta, elapsed) => {
    flyControls.update(delta);
    chunkManager.update(sceneManager.camera.position);

    if (water && config.generateWater) {
      water.update(sceneManager.camera.position, elapsed);
    }

    frameCount++;
    if (frameCount % 10 === 0) {
      minimap.update(sceneManager.camera);
    }

    fpsCounter.update(delta, chunkManager.chunkCount);
  });

  sceneManager.start();
}

main().catch((err) => {
  console.error('TerraSynth initialization failed:', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="loading-indicator" style="color: #ff4444;">
      Failed to initialize: ${err instanceof Error ? err.message : String(err)}
    </div>`;
  }
});
