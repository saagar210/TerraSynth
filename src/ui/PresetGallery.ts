import type { WorldConfig } from '../types/terrain';
import { defaultWorldConfig } from '../types/terrain';

export interface Preset {
  name: string;
  config: Partial<WorldConfig>;
}

export const PRESETS: Preset[] = [
  {
    name: 'Default',
    config: {},
  },
  {
    name: 'Archipelago',
    config: {
      seaLevel: 0.55,
      scale: 0.8,
      octaves: 6,
      persistence: 0.45,
      lacunarity: 2.2,
      heightMultiplier: 60,
      noiseType: 0,
      moistureEnabled: true,
    },
  },
  {
    name: 'Alpine',
    config: {
      seaLevel: 0.2,
      scale: 1.2,
      octaves: 8,
      persistence: 0.55,
      lacunarity: 2.0,
      heightMultiplier: 150,
      noiseType: 2, // Ridged
      moistureEnabled: true,
    },
  },
  {
    name: 'Desert Canyon',
    config: {
      seaLevel: 0.1,
      scale: 1.0,
      octaves: 6,
      persistence: 0.5,
      lacunarity: 2.5,
      heightMultiplier: 120,
      noiseType: 2, // Ridged
      erosionEnabled: true,
      erosionIterations: 100000,
      moistureEnabled: true,
    },
  },
  {
    name: 'Tropical Islands',
    config: {
      seaLevel: 0.5,
      scale: 0.6,
      octaves: 5,
      persistence: 0.4,
      lacunarity: 2.0,
      heightMultiplier: 50,
      noiseType: 0,
      moistureEnabled: true,
    },
  },
  {
    name: 'Volcanic',
    config: {
      seaLevel: 0.3,
      scale: 1.5,
      octaves: 7,
      persistence: 0.6,
      lacunarity: 2.3,
      heightMultiplier: 180,
      noiseType: 2, // Ridged
      moistureEnabled: true,
    },
  },
  {
    name: 'Flat Plains',
    config: {
      seaLevel: 0.25,
      scale: 0.5,
      octaves: 3,
      persistence: 0.3,
      lacunarity: 2.0,
      heightMultiplier: 30,
      noiseType: 0,
      moistureEnabled: true,
    },
  },
  {
    name: 'Warped Alien',
    config: {
      seaLevel: 0.3,
      scale: 1.0,
      octaves: 6,
      persistence: 0.5,
      lacunarity: 2.0,
      heightMultiplier: 100,
      noiseType: 3, // Warped
      warpStrength: 1.5,
      moistureEnabled: true,
    },
  },
];

export function applyPreset(presetName: string, current: WorldConfig): WorldConfig {
  const preset = PRESETS.find(p => p.name === presetName);
  if (!preset) return current;

  const base = defaultWorldConfig();
  return { ...base, seed: current.seed, ...preset.config };
}

export class PresetGalleryUI {
  private container: HTMLDivElement;
  private onSelect: (config: WorldConfig) => void;
  private currentConfig: WorldConfig;

  constructor(parent: HTMLElement, config: WorldConfig, onSelect: (config: WorldConfig) => void) {
    this.currentConfig = config;
    this.onSelect = onSelect;
    this.container = document.createElement('div');
    this.container.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;';

    for (const preset of PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = preset.name;
      btn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
      btn.addEventListener('click', () => {
        const newConfig = applyPreset(preset.name, this.currentConfig);
        this.currentConfig = newConfig;
        this.onSelect(newConfig);
      });
      this.container.appendChild(btn);
    }

    parent.appendChild(this.container);
  }

  updateConfig(config: WorldConfig): void {
    this.currentConfig = config;
  }
}
