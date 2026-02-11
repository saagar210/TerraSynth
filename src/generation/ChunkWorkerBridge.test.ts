import { describe, expect, it } from 'vitest';
import {
  ChunkRequestCancelledError,
  ChunkWorkerBridge,
} from './ChunkWorkerBridge';
import type { WorldConfig } from '../types/terrain';
import { defaultWorldConfig } from '../types/terrain';

type MessageHandler = (event: MessageEvent) => void;
type ErrorHandler = (event: ErrorEvent) => void;

class MockWorker {
  private messageHandler: MessageHandler | null = null;
  private errorHandler: ErrorHandler | null = null;
  public postedMessages: unknown[] = [];

  addEventListener(type: string, handler: EventListenerOrEventListenerObject): void {
    if (type === 'message') {
      this.messageHandler = handler as MessageHandler;
    }
    if (type === 'error') {
      this.errorHandler = handler as ErrorHandler;
    }
  }

  removeEventListener(type: string): void {
    if (type === 'message') {
      this.messageHandler = null;
    }
    if (type === 'error') {
      this.errorHandler = null;
    }
  }

  postMessage(message: unknown): void {
    this.postedMessages.push(message);
  }

  terminate(): void {
    // noop
  }

  emitMessage(data: unknown): void {
    this.messageHandler?.({ data } as MessageEvent);
  }

  emitError(message: string): void {
    this.errorHandler?.({ message } as ErrorEvent);
  }
}

describe('ChunkWorkerBridge', () => {
  const config: WorldConfig = defaultWorldConfig();

  it('resolves request when chunk response arrives', async () => {
    const mockWorker = new MockWorker();
    const bridge = new ChunkWorkerBridge(() => mockWorker as unknown as Worker);

    const promise = bridge.requestChunk(config, 1, 2, 0);
    const request = mockWorker.postedMessages[0] as { requestId: number };

    mockWorker.emitMessage({
      type: 'chunk',
      requestId: request.requestId,
      generationId: 0,
      chunkX: 1,
      chunkZ: 2,
      data: {
        width: 2,
        height: 2,
        minHeight: 0,
        maxHeight: 1,
        heightmap: new Float32Array([0, 0, 0, 0]),
        moistureMap: new Float32Array([0, 0, 0, 0]),
        biomeMap: new Uint8Array([0, 0, 0, 0]),
      },
    });

    const result = await promise;
    expect(result.width).toBe(2);

    bridge.dispose();
  });

  it('rejects pending request when generation is cancelled', async () => {
    const mockWorker = new MockWorker();
    const bridge = new ChunkWorkerBridge(() => mockWorker as unknown as Worker);

    const promise = bridge.requestChunk(config, 4, 5, 7);
    bridge.cancelGenerationRequests(7);

    await expect(promise).rejects.toBeInstanceOf(ChunkRequestCancelledError);

    bridge.dispose();
  });

  it('rejects all pending requests when worker errors', async () => {
    const mockWorker = new MockWorker();
    const bridge = new ChunkWorkerBridge(() => mockWorker as unknown as Worker);

    const p1 = bridge.requestChunk(config, 0, 0, 1);
    const p2 = bridge.requestChunk(config, 1, 1, 1);

    mockWorker.emitError('boom');

    await expect(p1).rejects.toThrow('boom');
    await expect(p2).rejects.toThrow('boom');

    bridge.dispose();
  });
});
