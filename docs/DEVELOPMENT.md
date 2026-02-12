# Development Guide

## Prerequisites

- Node.js 18+
- pnpm 9+
- Rust stable
- `wasm-pack` (for local WASM builds)

## Setup

```bash
pnpm install
pnpm build:wasm
pnpm dev
```

## Quality Commands

```bash
pnpm lint
pnpm test
pnpm build
cd rust && cargo test
```

## Common Issue

If runtime initialization fails with a missing `terra_wasm.js`, generate the WASM package:

```bash
pnpm build:wasm
```
