import { IMessageEvent } from '../../interfaces';
import { Injectable } from '@nestjs/common';
import { OnMessageEventMetadata } from '../../decorators';
import * as amqpConnectionManager from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/types/AmqpConnectionManager';
import type * as amqplib from 'amqplib';
import { MessageBroker } from './MessageBroker.service';
import { MessageBrokerEmitOption } from '../../interfaces/MessageBrokerEmitOption.interface';
import { NameUtils } from '../../utils/Name.utils';

export interface RabbitMQBrokerOptions {
  user: string;
  password: string;
  host: string;
  port: number;

  /**
   * Exchange and queue name of the project
   */
  prefix: string;

  /**
   * Default prefetch of a queue
   */
  prefetch?: number;
}

@Injectable()
export class RabbitMQBroker extends MessageBroker<RabbitMQBrokerOptions> {
  private connection: IAmqpConnectionManager | null = null;
  private chancel: ChannelWrapper | null = null;

  private messageExchange: amqplib.Replies.AssertExchange | null = null;
  private retriesExchange: amqplib.Replies.AssertExchange | null = null;

  private retriesQueue: amqplib.Replies.AssertQueue | null = null;

  get amqpUrl() {
    const { user, password, host, port } = super.brokerOption;
    return `amqp://${user}:${password}@${host}:${port}`;
  }

  async connect(): Promise<void> {
    this.connection = amqpConnectionManager.connect(this.amqpUrl);
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
      this.getPrefixName('messages'),
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
      this.getPrefixName('retries'),
      'fanout',
      {
        durable: true,
      },
    );
  }

  private async initRetriesQueue() {
    this.retriesQueue = await this.chancel.assertQueue(
      this.getPrefixName('retries'),
      {
        durable: true,
      },
    );
    await this.chancel.bindQueue(
      this.retriesQueue.queue,
      this.retriesExchange.exchange,
      '*',
    );
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
                'x-delay': this.options.retryStrategy(retries),
                'x-retries': retries + 1,
              },
            },
          );

          this.chancel.ack(msg);
        } catch (e) {
          this.chancel.nack(msg, false, false);
        }
      },
      {
        prefetch: 20,
      },
    );
  }

  async addListener(
    metadata: OnMessageEventMetadata,
    onMessages: (
      event: IMessageEvent,
      metadata: OnMessageEventMetadata,
      retires: number,
    ) => Promise<void>,
  ): Promise<void> {
    for (const event of metadata.events) {
      const scope = metadata.options.scope ?? [];
      const scopes = Array.isArray(scope) ? (scope ?? []) : [scope];
      scopes.push(this.options.defaultScope);

      const formatEvent = NameUtils.toKebabCase(event);
      const formatQueue = NameUtils.toKebabCase(
        `${this.options.namespace}/${metadata.options.queue}`,
      );
      const formatScopes = scopes.map(NameUtils.toKebabCase);

      const queue = await this.chancel.assertQueue(
        this.getPrefixName(formatQueue),
        {
          durable: true,
          deadLetterExchange: this.retriesExchange.exchange,
          deadLetterRoutingKey: this.buildRoutingKey(formatQueue),
        },
      );

      // Bind fo
      await this.chancel.bindQueue(
        queue.queue,
        this.messageExchange.exchange,
        this.buildRoutingKey(formatQueue),
      );

      // Bind queues
      for (const scope of formatScopes) {
        await this.chancel.bindQueue(
          queue.queue,
          this.messageExchange.exchange,
          this.buildRoutingKey(null, scope, formatEvent),
        );
      }

      await this.chancel.consume(
        queue.queue,
        async (msg: amqplib.ConsumeMessage) => {
          try {
            await onMessages(
              this.options.serializer.deserializer(msg.content),
              metadata,
              msg.properties?.headers['x-retries'] || 0,
            );
            this.chancel.ack(msg);
          } catch (e) {
            this.chancel.nack(msg, false, false);
          }
        },
        {
          prefetch:
            metadata.options.prefetch ?? this.brokerOption.prefetch ?? 1,
          priority: metadata.options.priority ?? undefined,
        },
      );
    }
  }

  async removeAllListener(): Promise<void> {}

  async emit(
    route: string,
    payload: IMessageEvent,
    options: MessageBrokerEmitOption = {},
  ): Promise<boolean> {
    return this.chancel.publish(
      this.messageExchange.exchange,
      this.buildRoutingKey(
        null,
        NameUtils.toKebabCase(options.scope ?? this.options.defaultScope),
        NameUtils.toKebabCase(route),
      ),
      this.options.serializer.serializer(payload),
      {
        priority: options.priority || 0,
        headers: {
          'x-delay': options.delay || 0,
          'x-retries': 0,
        },
      },
    );
  }

  private buildRoutingKey(...names: (string | null)[]) {
    return names.map((v) => v ?? '-').join('.');
  }

  private getPrefixName(...names: (string | null)[]): string {
    return [super.brokerOption.prefix, ...names].filter((v) => !!v).join('/');
  }
}
