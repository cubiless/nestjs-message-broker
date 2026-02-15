import {
  IMessageBrokerAdapter,
  IMessageBrokerPublishOptions,
  IMessageBrokerSubscribeOptions,
} from '../interfaces';
import { CloudEvent } from 'cloudevents';
import { Logger } from '@nestjs/common';
import { filter, Subject } from 'rxjs';
import { RetryPolicy } from '../retry-policy';

export class InMemoryAdapter implements IMessageBrokerAdapter {
  private readonly logger: Logger = new Logger('InMemoryAdapter');

  private eventBus: Subject<CloudEvent<unknown>> | null = null;

  async connect(): Promise<void> {
    this.eventBus = new Subject<CloudEvent<unknown>>();
  }

  async disconnect(): Promise<void> {
    this.eventBus.unsubscribe();
  }

  async publish<T>(
    event: CloudEvent<T>,
    options?: IMessageBrokerPublishOptions,
  ): Promise<boolean> {
    const { delay }: IMessageBrokerPublishOptions = {
      delay: 0,
      priority: 0,
      ...options,
    };

    if (delay > 0) {
      setTimeout(() => {
        this.eventBus.next(event);
      }, delay);
    } else {
      this.eventBus.next(event);
    }
    return true;
  }

  async subscribe<T>(
    name: string,
    pattern: string,
    handler: (event: CloudEvent<T>) => Promise<void>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: IMessageBrokerSubscribeOptions,
  ): Promise<void> {
    const regexPattern = new RegExp(
      '^' +
        pattern
          .replace(/\./g, '\\.') // dot escapen
          .replace(/\*/g, '[^.]+') // *
          .replace(/#/g, '.+') + // #
        '$',
    );

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;

    async function handle(event: CloudEvent<T>, retries = 0) {
      try {
        await handler(new CloudEvent({ ...event, retries }));
        return;
      } catch (error) {
        const delay = RetryPolicy.getDelayInMs(retries);
        that.logger.error(
          `Event ${event.id} failed. Next try is in ${delay}ms.`,
          error,
        );

        setTimeout(() => {
          handle(event, retries + 1);
        }, delay);
      }
    }

    this.eventBus
      .pipe(filter((event) => regexPattern.test(event.type)))
      .subscribe({
        next: (event) => handle(event as CloudEvent<T>),
        error: (err) => this.logger.error('Critical Bus Error', err),
      });
  }
}
