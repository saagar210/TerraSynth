# Deployment

TerraSynth deploys as a static frontend bundle.

## CI Requirements

- Frontend build (`pnpm build`)
- Frontend tests (`pnpm test`)
- Rust unit tests (`cd rust && cargo test`)

## Production Build

```bash
pnpm install --frozen-lockfile
pnpm build:wasm
pnpm build
```

Publish the `dist/` directory to a static host (Vercel, Netlify, GitHub Pages).
