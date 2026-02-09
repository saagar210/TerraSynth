import type * as THREE from 'three';
import type { WorldConfig } from '../types/terrain';
import { PresetGalleryUI } from './PresetGallery';
import { ExportPanel } from './ExportPanel';

type ConfigChangeCallback = (config: WorldConfig) => void;

export class ControlPanel {
  private panel: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private collapsed = false;
  private config: WorldConfig;
  private onChange: ConfigChangeCallback;
  private getRenderer: (() => THREE.WebGLRenderer) | null = null;
  private getScene: (() => THREE.Scene) | null = null;
  private getCamera: (() => THREE.Camera) | null = null;

  constructor(
    config: WorldConfig,
    onChange: ConfigChangeCallback,
    getRenderer?: () => THREE.WebGLRenderer,
    getScene?: () => THREE.Scene,
    getCamera?: () => THREE.Camera,
  ) {
    this.config = { ...config };
    this.onChange = onChange;
    this.getRenderer = getRenderer ?? null;
    this.getScene = getScene ?? null;
    this.getCamera = getCamera ?? null;

    // Toggle button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'panel-toggle';
    this.toggleBtn.textContent = 'Controls';
    this.toggleBtn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.toggleBtn);

    // Panel
    this.panel = document.createElement('div');
    this.panel.className = 'control-panel';
    document.body.appendChild(this.panel);

    this.buildUI();
  }

  private toggle(): void {
    this.collapsed = !this.collapsed;
    this.panel.classList.toggle('collapsed', this.collapsed);
    this.toggleBtn.style.right = this.collapsed ? '12px' : '312px';
  }

  private buildUI(): void {
    this.panel.innerHTML = '';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'TerraSynth';
    title.style.cssText = 'font-size: 16px; margin-bottom: 16px; font-weight: 600;';
    this.panel.appendChild(title);

    // World section
    this.addSection('World', [
      this.createSeedInput(),
      this.createSlider('Scale', 'scale', 0.1, 3.0, 0.1),
      this.createSlider('Height', 'heightMultiplier', 10, 200, 1),
      this.createSlider('Sea Level', 'seaLevel', 0.0, 0.8, 0.01),
    ]);

    // Noise section
    this.addSection('Noise', [
      this.createSelect('Type', 'noiseType', [
        { value: '0', label: 'Simplex' },
        { value: '1', label: 'Perlin' },
        { value: '2', label: 'Ridged' },
        { value: '3', label: 'Warped' },
      ]),
      this.createSlider('Octaves', 'octaves', 1, 8, 1),
      this.createSlider('Persistence', 'persistence', 0.1, 1.0, 0.05),
      this.createSlider('Lacunarity', 'lacunarity', 1.0, 4.0, 0.1),
      this.createSlider('Warp Strength', 'warpStrength', 0.1, 2.0, 0.1),
    ]);

    // Erosion section
    this.addSection('Erosion', [
      this.createToggle('Enable Erosion', 'erosionEnabled'),
      this.createSlider('Iterations', 'erosionIterations', 10000, 200000, 10000),
      this.createSlider('Inertia', 'erosionInertia', 0.01, 0.2, 0.01),
      this.createSlider('Capacity', 'erosionCapacity', 1.0, 8.0, 0.5),
      this.createSlider('Erosion Rate', 'erosionErosionRate', 0.1, 0.9, 0.05),
      this.createSlider('Deposition', 'erosionDeposition', 0.1, 0.9, 0.05),
    ]);

    // Presets section
    const presetsSection = document.createElement('div');
    presetsSection.className = 'panel-section';
    const presetsHeader = document.createElement('h3');
    presetsHeader.textContent = 'Presets';
    presetsSection.appendChild(presetsHeader);
    this.panel.appendChild(presetsSection);
    new PresetGalleryUI(presetsSection, this.config, (newConfig) => {
      this.config = { ...newConfig };
      this.onChange(this.config);
      this.buildUI(); // rebuild to reflect new slider values
    });

    // Rendering section
    this.addSection('Rendering', [
      this.createSlider('View Distance', 'viewDistance', 2, 8, 1),
      this.createToggle('Water', 'generateWater'),
      this.createToggle('Fog', 'generateFog'),
      this.createToggle('Wireframe', 'wireframe'),
    ]);

    // Export section
    if (this.getRenderer && this.getScene && this.getCamera) {
      new ExportPanel(
        this.panel,
        () => this.config,
        this.getRenderer!,
        this.getScene!,
        this.getCamera!,
      );
    }

    // Controls hint
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size: 11px; color: var(--text-secondary); margin-top: 20px; line-height: 1.6;';
    hint.innerHTML = 'Click viewport to fly<br>WASD + Mouse look<br>Space/Shift: up/down<br>Scroll: speed';
    this.panel.appendChild(hint);
  }

  private addSection(name: string, elements: HTMLElement[]): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const header = document.createElement('h3');
    header.textContent = name;
    section.appendChild(header);

    for (const el of elements) {
      section.appendChild(el);
    }

    this.panel.appendChild(section);
  }

  private createSeedInput(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'seed-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = String(this.config.seed);
    input.addEventListener('change', () => {
      const parsed = parseInt(input.value, 10);
      if (!isNaN(parsed)) {
        this.config.seed = parsed;
        this.emitChange();
      }
    });

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Random';
    btn.addEventListener('click', () => {
      this.config.seed = Math.floor(Math.random() * 999999);
      input.value = String(this.config.seed);
      this.emitChange();
    });

    group.appendChild(input);
    group.appendChild(btn);
    return group;
  }

  private createSlider(
    label: string,
    key: keyof WorldConfig,
    min: number,
    max: number,
    step: number,
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const labelEl = document.createElement('label');
    const nameSpan = document.createTextNode(label);
    const valueSpan = document.createElement('span');
    valueSpan.textContent = String(this.config[key]);
    labelEl.appendChild(nameSpan);
    labelEl.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.config[key]);

    input.addEventListener('input', () => {
      valueSpan.textContent = input.value;
    });

    input.addEventListener('change', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.config as any)[key] = parseFloat(input.value);
      this.emitChange();
    });

    group.appendChild(labelEl);
    group.appendChild(input);
    return group;
  }

  private createToggle(label: string, key: keyof WorldConfig): HTMLElement {
    const group = document.createElement('div');
    group.className = 'toggle-group';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const toggle = document.createElement('label');
    toggle.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.config[key] as boolean;

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';

    input.addEventListener('change', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.config as any)[key] = input.checked;
      this.emitChange();
    });

    toggle.appendChild(input);
    toggle.appendChild(slider);

    group.appendChild(labelEl);
    group.appendChild(toggle);
    return group;
  }

  private createSelect(
    label: string,
    key: keyof WorldConfig,
    options: Array<{ value: string; label: string }>,
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'select-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const select = document.createElement('select');
    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (String(this.config[key]) === opt.value) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.config as any)[key] = parseInt(select.value, 10);
      this.emitChange();
    });

    group.appendChild(labelEl);
    group.appendChild(select);
    return group;
  }

  private emitChange(): void {
    this.onChange({ ...this.config });
  }

  dispose(): void {
    this.panel.remove();
    this.toggleBtn.remove();
  }
}
