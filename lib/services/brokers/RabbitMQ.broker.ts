import { OnMessageEventOptions } from '../../interfaces';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import * as amqpConnectionManager from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/types/AmqpConnectionManager';
import type * as amqplib from 'amqplib';
import * as amqp from 'amqplib';
import { MessageBroker } from './MessageBroker.service';
import { MessageBrokerEmitOption } from '../../interfaces/MessageBrokerEmitOption.interface';

export type RabbitMQBrokerOptions = {
  url: amqp.Options.Connect & { httpPort?: number; httpProtocol?: string };

  /**
   * Default prefetch of a queue
   */
  prefetch?: number;
};

@Injectable()
export class RabbitMQBroker
  extends MessageBroker<RabbitMQBrokerOptions>
  implements OnApplicationBootstrap
{
  private connection: IAmqpConnectionManager | null = null;
  private chancel: ChannelWrapper | null = null;

  private messageExchange: amqplib.Replies.AssertExchange | null = null;
  private retriesExchange: amqplib.Replies.AssertExchange | null = null;

  private retriesQueue: amqplib.Replies.AssertQueue | null = null;

  private queues: amqplib.Replies.AssertQueue[] = [];

  private isStarted: boolean = false;
  private bindConsumers: Array<() => Promise<void>> = [];

  async connect(): Promise<void> {
    this.connection = amqpConnectionManager.connect(this.options.broker.url);
    this.chancel = this.connection.createChannel();
    await this.chancel.waitForConnect();

    await this.init();
  }

  async disconnect(): Promise<void> {
    await this.chancel.close();
    await this.connection.close();

    this.chancel = null;
    this.connection = null;
  }

  async init(): Promise<void> {
    await this.initExchanges();
    await this.initQueues();
  }

  async initExchanges(): Promise<void> {
    await this.initRetriesExchange();
    await this.initMessageExchange();
  }

  private async initQueues() {
    await this.initRetriesQueue();
  }

  private async initMessageExchange() {
    this.messageExchange = await this.chancel.assertExchange(
      this.buildNameTag(['messages']),
      'x-delayed-message',
      {
        durable: true,
        arguments: {
          'x-delayed-type': 'topic',
        },
      },
    );
  }

  private async initRetriesExchange() {
    this.retriesExchange = await this.chancel.assertExchange(
      this.buildNameTag(['retries']),
      'fanout',
      {
        durable: true,
      },
    );
  }

  private async initRetriesQueue() {
    this.retriesQueue = await this.chancel.assertQueue(
      this.buildNameTag(['retries']),
      {
        durable: true,
      },
    );
    this.queues.push(this.retriesQueue);

    await this.chancel.bindQueue(
      this.retriesQueue.queue,
      this.retriesExchange.exchange,
      this.options.multiLevelWildcards,
    );

    const consume = async () => {
      await this.chancel.consume(
        this.retriesQueue.queue,
        async (msg: amqplib.ConsumeMessage) => {
          try {
            // Get the count retries
            const retries = msg.properties.headers['x-retries'] ?? 0;

            // Republish in the message queue
            await this.chancel.publish(
              this.messageExchange.exchange,
              msg.fields.routingKey,
              msg.content,
              {
                priority: msg.properties.priority,
                headers: {
                  'x-delay': this.calculateRetryDelay(retries),
                  'x-retries': retries + 1,
                },
              },
            );

            this.chancel.ack(msg);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            this.chancel.nack(msg, false, false);
          }
        },
        {
          prefetch: 20,
        },
      );
    };

    if (this.isStarted) {
      await consume();
    } else {
      this.bindConsumers.push(consume);
    }
  }

  protected async initListener(
    nameTag: string,
    eventPattern: Array<string>,
    options: OnMessageEventOptions,
    onMessage: (buffer: Buffer, retry: number) => Promise<void>,
  ): Promise<void> {
    const queue = await this.chancel.assertQueue(nameTag, {
      durable: typeof options.volatile === 'boolean' ? !options.volatile : true,
      autoDelete:
        typeof options.volatile === 'boolean' ? options.volatile : false,
      deadLetterExchange: this.retriesExchange.exchange,
      deadLetterRoutingKey: this.buildRabbitmqRoutingKey('retry', nameTag),
    });
    this.queues.push(queue);

    // Bind for retry routing
    await this.chancel.bindQueue(
      queue.queue,
      this.messageExchange.exchange,
      this.buildRabbitmqRoutingKey('retry', nameTag),
    );

    // Bind to normal routing
    for (const event of eventPattern) {
      await this.chancel.bindQueue(
        queue.queue,
        this.messageExchange.exchange,
        this.buildRabbitmqRoutingKey('default', event),
      );
    }

    const consume = async () => {
      // Add consumer
      await this.chancel.consume(
        queue.queue,
        async (msg: amqplib.ConsumeMessage) => {
          try {
            await onMessage(
              msg.content,
              msg.properties?.headers['x-retries'] || 0,
            );
            this.chancel.ack(msg);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            this.chancel.nack(msg, false, false);
          }
        },
        {
          prefetch: options.prefetch ?? this.options.broker.prefetch ?? 1,
          priority: options.priority ?? undefined,
        },
      );
    };

    if (this.isStarted) {
      await consume();
    } else {
      this.bindConsumers.push(consume);
    }
  }

  async emitMessageEvent(
    route: string,
    buffer: Buffer,
    options?: MessageBrokerEmitOption,
  ): Promise<boolean> {
    return this.chancel.publish(
      this.messageExchange.exchange,
      this.buildRabbitmqRoutingKey('default', route),
      buffer,
      {
        priority: options.priority || 0,
        headers: {
          'x-delay': options.delay || 0,
          'x-retries': 0,
        },
      },
    );
  }

  async cleanUp() {
    try {
      const protocol = this.options.broker.url.httpProtocol ?? 'http';
      const host = this.options.broker.url.hostname;
      const port =
        this.options.broker.url.httpProtocol ??
        `1${this.options.broker.url.port}`;

      const response = await fetch(`${protocol}://${host}:${port}/api/queues`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${btoa(`${this.options.broker.url.username}:${this.options.broker.url.password}`)}`,
        },
      });
      const queues = (await response.json()) as Array<{ name: string }>;
      const filteredQueues = queues.filter(({ name }) => {
        return (
          name.startsWith(this.buildNameTag()) &&
          !this.queues.find((q) => q.queue === name)
        );
      });

      for (const noUsageQueue of filteredQueues) {
        await this.chancel.deleteQueue(noUsageQueue.name);
        this.logger.log(`Delete queue: ${noUsageQueue.name}`);
      }
    } catch (error) {
      this.logger.warn('CleanUp failed: ', { error: error });
    }
  }

  private buildRabbitmqRoutingKey(
    type: 'default' | 'retry',
    pattern: string,
  ): string {
    return `${type}${this.options.delimiter}${pattern}`;
  }

  async onApplicationBootstrap() {
    this.isStarted = true;
    for (const consumer of this.bindConsumers) {
      await consumer();
    }
  }
}
