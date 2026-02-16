import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

const cacheDir = process.env.VITE_CACHE_DIR || 'node_modules/.vite';

export default defineConfig({
  cacheDir,
  plugins: [wasm(), topLevelAwait()],
  worker: {
    plugins: () => [wasm(), topLevelAwait()],
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['terra-wasm'],
  },
});
