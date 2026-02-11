# Delta Plan

## A) Executive Summary

### Current state (repo-grounded)
- `ChunkManager` now requests chunks asynchronously via `ChunkWorkerBridge` instead of directly calling `generateChunk` on the main thread (`src/engine/ChunkManager.ts`).
- Worker orchestration exists in `ChunkWorkerBridge` with request ID correlation and Promise-based API (`src/generation/ChunkWorkerBridge.ts`).
- Terrain generation worker initializes wasm and runs `generate_chunk` (`src/workers/terrainWorker.ts`).
- Main-thread wasm bridge remains in place for initialization and non-worker use (`src/generation/WasmBridge.ts`).
- Ambient declaration added for generated wasm module imports (`src/types/wasm-pkg.d.ts`).
- Baseline verification is yellow: TS + Rust unit tests pass; build is blocked by missing generated wasm artifacts due absent `wasm-pack`.

### Key risks
- Pending worker requests are not explicitly cancellable by generation epoch in bridge layer.
- `generationId` travels through worker messages but is not used centrally to prune old in-flight promises.
- Error handling can produce noisy logs for stale requests rather than classifying cancellation/stale outcomes.
- No TS regression tests currently exist for new worker request lifecycle behavior.

### Improvement themes (prioritized)
1. Harden worker request lifecycle (cancellation by generation).
2. Strengthen stale response/error handling semantics.
3. Add focused TS unit tests for bridge lifecycle logic.
4. Preserve verification health + update session artifacts for auditable resume.

## B) Constraints & Invariants (Repo-derived)

### Explicit invariants
- Terrain generation config contract between TS and Rust must remain unchanged (`WorldConfig` ↔ `TerrainConfig`).
- Existing chunk loading behavior (view-distance prioritized generation, LOD insertion, unload policy) must remain functional.
- No framework introduction; keep vanilla TS + Three.js + Rust WASM architecture.

### Implicit invariants (inferred)
- Chunk boundary determinism and Rust algorithm correctness remain protected by existing Rust tests.
- Main thread must avoid synchronous heavy generation workload during camera update loop.
- Worker failures should not crash app loop; they should fail request-level operations.

### Non-goals
- No redesign of wasm artifact generation pipeline.
- No migration of export/minimap features in this delta.
- No changes to Rust generation algorithms.

## C) Proposed Changes by Theme

### Theme 1: Worker lifecycle hardening
- Current: `ChunkWorkerBridge` stores pending promises by request ID only.
- Proposed: Track pending metadata (generationId) and add cancellation API to reject stale generation requests proactively.
- Why: Avoid stale backlog and improve deterministic behavior after config regeneration.
- Tradeoffs: Slightly larger bridge state model; minimal complexity increase.
- Scope: `ChunkWorkerBridge` + `ChunkManager` integration only.
- Migration: Add API in bridge, call from `ChunkManager.updateConfig` when generation increments.

### Theme 2: Error taxonomy for expected stale/cancel paths
- Current: all failed requests surface as errors and get logged in `ChunkManager` catch.
- Proposed: introduce explicit cancellation error classification and suppress noisy logs for expected cancellation.
- Why: Preserve observability while reducing false alarm logs.
- Tradeoffs: Additional error type handling in TS.
- Scope: bridge + manager catch path.

### Theme 3: Regression tests
- Current: no TS tests.
- Proposed: add unit tests for cancellation behavior using dependency injection for worker constructor.
- Why: lock lifecycle semantics and prevent regressions.
- Tradeoffs: small test harness abstraction in bridge.
- Scope: `ChunkWorkerBridge` + new test file.

## D) File/Module Delta (Exact)

### ADD
- `src/generation/ChunkWorkerBridge.test.ts` — unit tests for request lifecycle/cancellation.

### MODIFY
- `src/generation/ChunkWorkerBridge.ts` — pending metadata, cancellation API, worker factory for testability.
- `src/engine/ChunkManager.ts` — invoke cancellation on generation changes and handle cancellation errors cleanly.
- `codex/*.md` — logs, decisions, checkpoints, verification, changelog draft.

### REMOVE/DEPRECATE
- None.

### Boundary rules
- `ChunkManager` can depend on bridge API, but not on worker internals.
- Worker file stays focused on wasm execution and message handling only.

## E) Data Models & API Contracts (Delta)

### Current
- Worker message contracts defined inline in bridge/worker files.

### Proposed
- Bridge internal pending model gains `generationId` and optional `chunkKey` metadata.
- Bridge public API gains a cancellation method (`cancelGenerationRequests`).

### Compatibility
- No external/public API impact beyond internal module contracts.
- Worker postMessage schema remains unchanged for compatibility.

### Migrations
- None (no persisted data).

### Versioning
- N/A (internal app modules).

## F) Implementation Sequence (Dependency-Explicit)

1. **Step S1 — Bridge cancellation API**
   - Objective: add generation-aware cancellation.
   - Files: `src/generation/ChunkWorkerBridge.ts`
   - Preconditions: baseline tsc green.
   - Dependencies: none.
   - Verify: `pnpm exec tsc --noEmit`
   - Rollback: restore previous bridge file.

2. **Step S2 — Manager integration + cancellation-aware logging**
   - Objective: call cancellation on regen and suppress expected cancellation logs.
   - Files: `src/engine/ChunkManager.ts`
   - Preconditions: S1 complete.
   - Dependencies: new bridge API.
   - Verify: `pnpm exec tsc --noEmit`
   - Rollback: revert manager changes only.

3. **Step S3 — Unit tests for bridge lifecycle**
   - Objective: prove cancellation behavior.
   - Files: `src/generation/ChunkWorkerBridge.test.ts`, maybe small test-only bridge hooks.
   - Preconditions: S1 stable.
   - Dependencies: vitest available.
   - Verify: `pnpm test -- src/generation/ChunkWorkerBridge.test.ts`
   - Rollback: remove tests/hooks if brittle.

4. **Step S4 — Full verification + docs update**
   - Objective: collect end-state evidence.
   - Files: `codex/*.md`
   - Verify: `pnpm exec tsc --noEmit`, `pnpm test -- src/generation/ChunkWorkerBridge.test.ts`, `cd rust && cargo test`, `pnpm build` (expected env limitation), `cd rust && ./build.sh` (expected env limitation)
   - Rollback: if regressions, revert last code step and retain docs notes.

## G) Error Handling & Edge Cases

- Current pattern: Promise rejection for worker errors and generic `console.error` in manager.
- Improve by introducing identifiable cancellation error code/name.
- Edge cases:
  - Config changes while many requests pending.
  - Worker crash with pending map populated.
  - Late response for canceled generation.
- Tests:
  - cancellation rejects pending request with cancellation error
  - non-canceled response resolves normally
  - worker error rejects all pending

## H) Integration & Testing Strategy

- Integration points: `ChunkManager -> ChunkWorkerBridge -> terrainWorker`.
- Unit tests: bridge-level lifecycle tests (mock worker).
- Regression tests: targeted cancellation + error fanout.
- DoD per theme:
  - Theme1/2: `tsc` green, manager uses cancellation API, no stale-noise logging.
  - Theme3: targeted tests pass.

## I) Assumptions & Judgment Calls

### Assumptions
- Worker environment supports module workers under Vite config.
- No hidden runtime contracts depend on current noisy stale error logs.

### Judgment calls
- Add small testability seam (worker factory injection) in bridge instead of broad refactor.
- Keep worker message schema unchanged to minimize risk.
- Treat wasm build failures as environment limitations, not code regressions.
