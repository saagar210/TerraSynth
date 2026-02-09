import type * as THREE from 'three';
import type { WorldConfig } from '../types/terrain';
import { exportHeightmapPNG, exportBiomeMapPNG, exportNormalMapPNG, exportSettingsJSON, exportScreenshot } from '../utils/export';
import { generateChunk } from '../generation/WasmBridge';

export class ExportPanel {
  private container: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    getConfig: () => WorldConfig,
    getRenderer: () => THREE.WebGLRenderer,
    getScene: () => THREE.Scene,
    getCamera: () => THREE.Camera,
  ) {
    this.container = document.createElement('div');
    this.container.className = 'panel-section';

    const header = document.createElement('h3');
    header.textContent = 'Export';
    this.container.appendChild(header);

    const resGroup = document.createElement('div');
    resGroup.className = 'select-group';
    const resLabel = document.createElement('label');
    resLabel.textContent = 'Resolution';
    const resSelect = document.createElement('select');
    for (const res of [512, 1024, 2048]) {
      const opt = document.createElement('option');
      opt.value = String(res);
      opt.textContent = `${res}x${res}`;
      resSelect.appendChild(opt);
    }
    resSelect.value = '1024';
    resGroup.appendChild(resLabel);
    resGroup.appendChild(resSelect);
    this.container.appendChild(resGroup);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;';

    const makeBtn = (label: string, handler: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = label;
      btn.style.fontSize = '11px';
      btn.addEventListener('click', handler);
      return btn;
    };

    const getResolution = (): number => parseInt(resSelect.value, 10);

    // Generate center chunk data for export
    const getCenterChunkData = () => {
      const config = getConfig();
      return generateChunk(config, 0, 0);
    };

    btnRow.appendChild(makeBtn('Heightmap', () => {
      const data = getCenterChunkData();
      exportHeightmapPNG(data.heightmap, data.width, data.height, getResolution());
    }));

    btnRow.appendChild(makeBtn('Biome Map', () => {
      const data = getCenterChunkData();
      exportBiomeMapPNG(data.biomeMap, data.width, data.height, getResolution());
    }));

    btnRow.appendChild(makeBtn('Normal Map', () => {
      const data = getCenterChunkData();
      exportNormalMapPNG(data.heightmap, data.width, data.height, getResolution(), 8.0);
    }));

    btnRow.appendChild(makeBtn('Screenshot', () => {
      exportScreenshot(getRenderer(), getScene(), getCamera());
    }));

    btnRow.appendChild(makeBtn('Settings', () => {
      const config = getConfig();
      exportSettingsJSON(config as unknown as Record<string, unknown>);
    }));

    this.container.appendChild(btnRow);

    // Import settings
    const importBtn = makeBtn('Import Settings', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const imported = JSON.parse(reader.result as string);
            // Dispatch custom event with imported config
            window.dispatchEvent(new CustomEvent('terrasnyth:import', { detail: imported }));
          } catch {
            console.error('Invalid settings file');
          }
        };
        reader.readAsText(file);
      });
      input.click();
    });
    importBtn.style.marginTop = '6px';
    this.container.appendChild(importBtn);

    parent.appendChild(this.container);
  }
}
