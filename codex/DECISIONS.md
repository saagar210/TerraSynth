# Decisions


## D-001: Introduce explicit cancellation error for worker requests
- Context: Config changes invalidate in-flight chunk requests.
- Decision: Use `ChunkRequestCancelledError` to distinguish expected cancellations from true failures.
- Alternatives considered:
  - Generic `Error` with message parsing (rejected: brittle).
  - Silent drop without rejection (rejected: unresolved Promises risk).
- Consequence: Manager can suppress expected cancellation logs while preserving error visibility.

## D-002: Add worker factory injection seam for unit tests
- Context: Bridge behavior needed tests without relying on real browser Worker.
- Decision: Constructor accepts optional `workerFactory` (default uses module worker).
- Alternative rejected: global Worker monkeypatching in tests (fragile, leaky).
- Consequence: testability improved with minimal production-path impact.
