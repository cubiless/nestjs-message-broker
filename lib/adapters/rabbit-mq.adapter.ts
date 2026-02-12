import {
  IMessageBrokerAdapter,
  IMessageBrokerPublishOptions,
  IMessageBrokerSubscribeOptions,
} from '../interfaces/message-broker-adapter.interface';
import * as amqpConnectionManager from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/types/AmqpConnectionManager';
import type * as amqplib from 'amqplib';
import * as amqp from 'amqplib';
import { CloudEvent } from 'cloudevents';
import { Logger } from '@nestjs/common';
import { RetryPolicy } from '../retry-policy';

export type RabbitMqAdapterOptions = {
  url: amqp.Options.Connect & { httpPort?: number; httpProtocol?: string };
  prefetch?: number;
  namespace: string;
};

export class RabbitMqAdapter implements IMessageBrokerAdapter {
  private readonly NAME_DELIMITER = '.';

  private readonly logger: Logger = new Logger('RabbitMqAdapter');

  private readonly options: RabbitMqAdapterOptions;
  private connection: IAmqpConnectionManager | null = null;
  private channel: ChannelWrapper | null = null;

  private exchange: amqplib.Replies.AssertExchange | null = null;

  constructor(options: RabbitMqAdapterOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    this.connection = amqpConnectionManager.connect(this.options.url);
    this.channel = this.connection.createChannel();
    await this.channel.waitForConnect();

    await this.init();
  }

  async disconnect(): Promise<void> {
    await this.channel.close();
    await this.connection.close();

    this.channel = null;
    this.connection = null;
  }

  private generateNameTags(...tags: string[]) {
    return [this.options.namespace, ...tags].join(this.NAME_DELIMITER);
  }

  async init(): Promise<void> {
    this.exchange = await this.channel.assertExchange(
      this.generateNameTags('events'),
      'x-delayed-message',
      {
        durable: true,
        arguments: {
          'x-delayed-type': 'fanout',
        },
      },
    );
  }

  public publish<T>(
    event: CloudEvent<T>,
    options?: IMessageBrokerPublishOptions,
  ): Promise<boolean> {
    if (!event.type || !event.source) {
      throw new Error('Invalid CloudEvent Format');
    }

    const { priority, delay }: IMessageBrokerPublishOptions = {
      delay: 0,
      priority: 0,
      ...options,
    };

    return this.channel.publish(
      this.exchange.exchange,
      event.type,
      Buffer.from(JSON.stringify(event)),
      {
        contentType: 'application/cloudevents+json',
        messageId: event.id,
        timestamp: event.time
          ? new Date(event.time as string).getTime()
          : Date.now(),
        priority: priority,
        headers: {
          'x-delay': delay,
          'ce-retries': event['retries'] || 0,
          'ce-specversion': event.specversion,
          'ce-type': event.type,
          'ce-source': event.source,
        },
      },
    );
  }

  async subscribe(
    name: string,
    pattern: string,
    handler: (event: CloudEvent) => Promise<void>,
    options?: IMessageBrokerSubscribeOptions,
  ): Promise<void> {
    const { volatile, prefetch, priority }: IMessageBrokerSubscribeOptions = {
      volatile: false,
      prefetch: 1,
      priority: 0,
      ...options,
    };

    // Define queue
    const queue = await this.channel.assertQueue(
      this.generateNameTags(
        ...(volatile ? [name, crypto.randomUUID()] : [name]),
      ),
      {
        durable: !volatile,
        autoDelete: volatile,
      },
    );

    // Bind the queue to the exchange
    await this.channel.bindQueue(queue.queue, this.exchange.exchange, pattern);

    // Bind for retries
    await this.channel.bindQueue(
      queue.queue,
      this.exchange.exchange,
      queue.queue,
    );

    // Listen to queue
    await this.channel.consume(
      queue.queue,
      async (msg: amqplib.ConsumeMessage) => {
        if (msg === null) return;

        try {
          const rawBody = msg.content.toString();
          const jsonBody = JSON.parse(rawBody);
          let event = new CloudEvent(jsonBody);

          try {
            await handler(event);
            this.channel.ack(msg);
          } catch (error) {
            const retries = ((event.retries as number) ?? 0) + 1;
            const delay = RetryPolicy.getDelayInMs(retries);

            this.logger.error(
              `Event ${event.id} failed. Next try is in ${delay}ms.`,
              error,
            );

            event = new CloudEvent({ ...event, retries });

            await this.channel.publish(
              this.exchange.exchange,
              queue.queue,
              Buffer.from(JSON.stringify(event)),
              {
                contentType: 'application/cloudevents+json',
                messageId: event.id,
                timestamp: event.time
                  ? new Date(event.time as string).getTime()
                  : Date.now(),
                priority: priority,
                headers: {
                  'x-delay': delay || 0,
                  'ce-retries': event['retries'] || 0,
                  'ce-specversion': event.specversion,
                  'ce-type': event.type,
                  'ce-source': event.source,
                },
              },
            );

            this.channel.ack(msg);
          }
        } catch (error) {
          this.logger.error(`Invalid Cloud-Event`, error);
          this.channel.nack(msg, false, false);
        }
      },
      {
        prefetch,
        priority,
      },
    );
  }
}
