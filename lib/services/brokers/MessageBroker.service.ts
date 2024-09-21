import { OnMessageEventMetadata } from '../../decorators';
import {
  IMessageEvent,
  MessageBrokerOptions,
  OnMessageEventOptions,
} from '../../interfaces';
import { Inject, Logger, Type } from '@nestjs/common';
import { MESSAGE_BROKER_OPTIONS } from '../../Constants';
import { MessageBrokerRetryStrategy } from '../MessageBroker.retry-strategy';
import { MessageBrokerEmitOption } from '../../interfaces/MessageBrokerEmitOption.interface';
import { MessageBrokerSerializer } from '../MessageBroker.serializer';
import { MessageEventMetadataAccessor } from '../MessageEventMetadata.accessor';
import { MessageEventMetadata } from '../../decorators/MessageEvent';
import { plainToInstance } from 'class-transformer';
import { NameUtils } from '../../utils/Name.utils';

export abstract class MessageBroker<BrokerOption> {
  private readonly logger = new Logger('MessageBroker');
  protected readonly options: Required<MessageBrokerOptions<BrokerOption>>;

  constructor(
    @Inject(MESSAGE_BROKER_OPTIONS)
    messageBrokerOptions: MessageBrokerOptions<BrokerOption>,
    private messageEventMetadataAccessor: MessageEventMetadataAccessor,
  ) {
    this.options = {
      serializer: MessageBrokerSerializer.json(),
      retryStrategy: MessageBrokerRetryStrategy.cube(),
      defaultScope: 'default',
      namespace: null,
      delimiter: '.',
      nameDelimiter: '.',
      wildcards: '*',
      multiLevelWildcards: '**',
      ...messageBrokerOptions,
    };
  }

  abstract connect(): Promise<void>;

  abstract disconnect(): Promise<void>;

  async bind(
    metadata: OnMessageEventMetadata,
    onMessage: (
      event: IMessageEvent,
      options: OnMessageEventOptions,
      retry: number,
    ) => Promise<void>,
  ): Promise<void> {
    const nameTag = this.buildNameTag(
      Array.isArray(metadata.options.queue)
        ? metadata.options.queue.join(this.options.nameDelimiter)
        : metadata.options.queue,
    );
    const scopes = [this.options.defaultScope];

    // Init additional scopes
    if (metadata.options.scope) {
      if (Array.isArray(metadata.options.scope)) {
        scopes.concat(metadata.options.scope);
      } else {
        scopes.push(metadata.options.scope);
      }
    }

    // Build patterns and read maybe an event type
    let classType: Type<IMessageEvent> | null = null;
    const eventPattern: string[] = [];
    for (const event of metadata.events) {
      const basicEventPattern = this.extractEventPattern(event);
      eventPattern.push(
        ...scopes.map((scope) => `${scope}.${basicEventPattern}`),
      );

      if (typeof event !== 'string') {
        classType = event;
      }
    }

    // Add children rules
    if (!metadata.options.exact) {
      eventPattern.push(
        ...eventPattern.map(
          (pattern) => `${pattern}.${this.options.multiLevelWildcards}`,
        ),
      );
    }

    // Normalize all keys
    const normalizeNameTag = NameUtils.toKebabCase(nameTag);
    const normalizePattern = eventPattern.map(NameUtils.toKebabCase);

    await this.initListener(
      normalizeNameTag,
      normalizePattern,
      metadata.options,
      async (buffer: Buffer, retry: number = 0) => {
        // Decode messages
        const decode = this.options.serializer.deserializer(buffer);

        // If declare a class then create an instance
        const message = classType ? plainToInstance(classType, decode) : decode;

        // Consume messages
        await onMessage(message, metadata.options, retry);
      },
    );

    this.logger.log(`${nameTag}(${normalizePattern.join('|')}) initialized`);
  }

  protected extractEventPattern(event: string | Type<IMessageEvent>): string {
    if (typeof event === 'string') {
      return event;
    }

    const metadatas: MessageEventMetadata[] =
      this.messageEventMetadataAccessor.getMessageEventMetadata(event);

    if (!metadatas || metadatas.length === 0) {
      throw new Error(
        `Can not found metadata of MessageEventMetadata. Add @MessageEvent to this class.`,
      );
    }

    return metadatas.flatMap((v) => v.route).join(this.options.delimiter);
  }

  protected abstract initListener(
    nameTag: string,
    eventPattern: Array<string>,
    options: OnMessageEventOptions,
    onMessage: (buffer: Buffer, retry: number) => Promise<void>,
  ): Promise<void>;

  async emit(
    event: string,
    payload: IMessageEvent,
    options: MessageBrokerEmitOption,
  ): Promise<boolean>;
  async emit(
    event: IMessageEvent,
    options: MessageBrokerEmitOption,
  ): Promise<boolean>;
  async emit(
    event: string | IMessageEvent,
    payload: IMessageEvent | MessageBrokerEmitOption,
    options?: MessageBrokerEmitOption,
  ): Promise<boolean> {
    const message: IMessageEvent = typeof event === 'string' ? payload : event;
    const emitOption: MessageBrokerEmitOption =
      typeof event === 'string' ? options : payload;

    const eventMetadata = this.extractMessageEventMetaData(event, emitOption);
    const encodeMessage = this.options.serializer.serializer(message);

    return this.emitMessageEvent(
      NameUtils.toKebabCase(
        Array.isArray(eventMetadata.route)
          ? this.concatRoute(...eventMetadata.route)
          : eventMetadata.route,
      ),
      encodeMessage,
      eventMetadata.options,
    );
  }

  protected extractMessageEventMetaData(
    event: string | IMessageEvent,
    options: MessageBrokerEmitOption = {},
  ): MessageEventMetadata {
    if (typeof event === 'string') {
      return {
        route: event,
        options: options ?? {},
      };
    }

    const metadatas: MessageEventMetadata[] =
      this.messageEventMetadataAccessor.getMessageEventMetadata(
        event?.constructor as Type<IMessageEvent>,
      );

    if (metadatas.length === 0)
      throw new Error(
        'Can not found metadata of MessageEventMetadata. Add @MessageEvent to this class.',
      );

    const route = metadatas.map((v) => v.route).join(this.options.delimiter);
    let routeOption: MessageBrokerEmitOption = {};
    metadatas
      .map((v) => v.options)
      .forEach((emitOption: MessageBrokerEmitOption) => {
        routeOption = {
          ...routeOption,
          ...emitOption,
        };
      });

    return {
      route,
      options: {
        ...routeOption,
        ...options,
      },
    };
  }

  protected abstract emitMessageEvent(
    route: string,
    buffer: Buffer,
    options?: MessageBrokerEmitOption,
  ): Promise<boolean>;

  protected calculateRetryDelay(retry: number): number {
    return this.options.retryStrategy(retry);
  }

  protected buildNameTag(...names: string[]) {
    return this.concatRoute(
      this.options.name,
      this.options.namespace,
      ...names,
    );
  }

  protected concatRoute(...names: string[]) {
    return names.filter((v) => !!v).join(this.options.nameDelimiter);
  }
}
