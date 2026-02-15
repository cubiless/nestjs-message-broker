import { CloudEvent } from 'cloudevents';
import { InMemoryAdapter } from './in-memory.adapter';

describe('In-Memory-Adapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await adapter.connect();
  });

  it('Simple publish event without subscribe', async () => {
    await adapter.publish(
      new CloudEvent({ type: 'order.created', source: 'order' }),
    );
  });

  it('Simple subscribe event without publish event', async () => {
    await adapter.subscribe('queue', '*', async () => {});
  });

  it('Subscribe and publish one event with fix pattern', async () => {
    jest.useFakeTimers();
    const handler = jest.fn().mockResolvedValue(undefined);

    await adapter.subscribe('queue', 'order.created', handler);
    await adapter.publish(
      new CloudEvent({ type: 'order.created', source: 'order' }),
    );

    expect(handler).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('Subscribe and publish one event with dot pattern', async () => {
    jest.useFakeTimers();
    const handler = jest.fn().mockResolvedValue(undefined);

    await adapter.subscribe('queue', 'order.*', handler);
    await adapter.publish(
      new CloudEvent({ type: 'order.created', source: 'order' }),
    );

    expect(handler).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('Subscribe and publish one event with multi-level pattern', async () => {
    jest.useFakeTimers();
    const handler = jest.fn().mockResolvedValue(undefined);

    await adapter.subscribe('queue', '#', handler);
    await adapter.publish(
      new CloudEvent({ type: 'order.created', source: 'order' }),
    );

    expect(handler).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('Subscribe and publish one event with first fail', async () => {
    jest.useFakeTimers();
    const handler = jest
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockResolvedValueOnce(undefined);

    await adapter.subscribe('queue', 'order.created', handler);
    await adapter.publish(
      new CloudEvent({ type: 'order.created', source: 'order' }),
    );

    expect(handler).toHaveBeenCalledTimes(1);

    jest.runAllTimers();

    expect(handler).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  afterEach(async () => {
    await adapter.disconnect();
    adapter = null;
  });
});
