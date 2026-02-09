import type { WorldConfig } from '../types/terrain';
import { defaultWorldConfig } from '../types/terrain';

const HASH_KEYS: Array<[keyof WorldConfig, string]> = [
  ['seed', 's'],
  ['scale', 'sc'],
  ['octaves', 'o'],
  ['persistence', 'p'],
  ['lacunarity', 'l'],
  ['heightMultiplier', 'h'],
  ['seaLevel', 'sl'],
  ['noiseType', 'nt'],
  ['warpStrength', 'ws'],
  ['erosionEnabled', 'ee'],
  ['erosionIterations', 'ei'],
  ['viewDistance', 'vd'],
];

export function configToHash(config: WorldConfig): string {
  const defaults = defaultWorldConfig();
  const params: string[] = [];

  for (const [key, abbr] of HASH_KEYS) {
    if (config[key] !== defaults[key]) {
      params.push(`${abbr}=${config[key]}`);
    }
  }

  return params.length > 0 ? '#' + params.join('&') : '';
}

export function hashToConfig(hash: string): Partial<WorldConfig> {
  if (!hash || hash.length <= 1) return {};

  const params = new URLSearchParams(hash.substring(1));
  const overrides: Partial<WorldConfig> = {};

  for (const [key, abbr] of HASH_KEYS) {
    const val = params.get(abbr);
    if (val === null) continue;

    const defaults = defaultWorldConfig();
    const defaultVal = defaults[key];

    if (typeof defaultVal === 'boolean') {
      (overrides as Record<string, unknown>)[key] = val === 'true';
    } else if (typeof defaultVal === 'number') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        (overrides as Record<string, unknown>)[key] = parsed;
      }
    }
  }

  return overrides;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function updateHash(config: WorldConfig): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const hash = configToHash(config);
    history.replaceState(null, '', hash || window.location.pathname);
  }, 500);
}

export function loadConfigFromHash(): WorldConfig {
  const base = defaultWorldConfig();
  const overrides = hashToConfig(window.location.hash);
  return { ...base, ...overrides };
}
