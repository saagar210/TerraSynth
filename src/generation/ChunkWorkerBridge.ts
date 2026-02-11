import type { ChunkData, WorldConfig } from '../types/terrain';

interface ChunkRequestMessage {
  type: 'generate';
  requestId: number;
  generationId: number;
  chunkX: number;
  chunkZ: number;
  config: WorldConfig;
}

interface ChunkResponseMessage {
  type: 'chunk';
  requestId: number;
  generationId: number;
  chunkX: number;
  chunkZ: number;
  data: ChunkData;
}

interface ChunkErrorMessage {
  type: 'error';
  requestId: number;
  generationId: number;
  message: string;
}

interface PendingRequest {
  generationId: number;
  resolve: (value: ChunkData) => void;
  reject: (reason?: unknown) => void;
}

type WorkerFactory = () => Worker;

const defaultWorkerFactory: WorkerFactory = () => new Worker(new URL('../workers/terrainWorker.ts', import.meta.url), {
  type: 'module',
});

export class ChunkRequestCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChunkRequestCancelledError';
  }
}

export function isChunkRequestCancelledError(error: unknown): error is ChunkRequestCancelledError {
  return error instanceof ChunkRequestCancelledError;
}

export class ChunkWorkerBridge {
  private worker: Worker;
  private requestId = 0;
  private pending = new Map<number, PendingRequest>();

  constructor(workerFactory: WorkerFactory = defaultWorkerFactory) {
    this.worker = workerFactory();

    this.worker.addEventListener('message', this.onMessage);
    this.worker.addEventListener('error', this.onError);
  }

  requestChunk(config: WorldConfig, chunkX: number, chunkZ: number, generationId: number): Promise<ChunkData> {
    return new Promise<ChunkData>((resolve, reject) => {
      const requestId = ++this.requestId;
      this.pending.set(requestId, {
        generationId,
        resolve,
        reject,
      });

      const message: ChunkRequestMessage = {
        type: 'generate',
        requestId,
        generationId,
        chunkX,
        chunkZ,
        config,
      };

      this.worker.postMessage(message);
    });
  }

  cancelGenerationRequests(generationId: number): void {
    const toCancel: number[] = [];

    for (const [requestId, pending] of this.pending) {
      if (pending.generationId === generationId) {
        toCancel.push(requestId);
      }
    }

    for (const requestId of toCancel) {
      const pending = this.pending.get(requestId);
      if (!pending) continue;
      this.pending.delete(requestId);
      pending.reject(new ChunkRequestCancelledError(`Chunk request cancelled for generation ${generationId}`));
    }
  }

  private onMessage = (event: MessageEvent<ChunkResponseMessage | ChunkErrorMessage>): void => {
    const message = event.data;
    if (!message) return;

    const pending = this.pending.get(message.requestId);
    if (!pending) return;
    this.pending.delete(message.requestId);

    if (message.type === 'error') {
      pending.reject(new Error(message.message));
      return;
    }

    pending.resolve(message.data);
  };

  private onError = (event: ErrorEvent): void => {
    for (const [, pending] of this.pending) {
      pending.reject(new Error(event.message || 'Chunk worker crashed'));
    }
    this.pending.clear();
  };

  dispose(): void {
    this.worker.removeEventListener('message', this.onMessage);
    this.worker.removeEventListener('error', this.onError);

    for (const [, pending] of this.pending) {
      pending.reject(new ChunkRequestCancelledError('Chunk worker disposed'));
    }
    this.pending.clear();

    this.worker.terminate();
  }
}
