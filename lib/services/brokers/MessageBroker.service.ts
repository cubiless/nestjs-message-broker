import { OnMessageEventMetadata } from '../../decorators';
import { IMessageEvent, MessageBrokerOptions } from '../../interfaces';
import { Inject } from '@nestjs/common';
import { MESSAGE_BROKER_OPTIONS } from '../../Constants';
import { MessageBrokerRetryStrategy } from '../MessageBroker.retry-strategy';
import { MessageBrokerEmitOption } from '../../interfaces/MessageBrokerEmitOption.interface';
import { MessageBrokerSerializer } from '../MessageBroker.serializer';

export abstract class MessageBroker<BrokerOption> {
  readonly options: Required<MessageBrokerOptions<BrokerOption>>;

  constructor(
    @Inject(MESSAGE_BROKER_OPTIONS)
    messageBrokerOptions: MessageBrokerOptions<BrokerOption>,
  ) {
    this.options = {
      global: false,
      serializer: MessageBrokerSerializer.json(),
      retryStrategy: MessageBrokerRetryStrategy.cube(),
      defaultScope: 'global',
      namespace: null,
      ...messageBrokerOptions,
    };
  }

  get brokerOption(): BrokerOption {
    return this.options.broker;
  }

  abstract connect(): Promise<void>;

  abstract disconnect(): Promise<void>;

  abstract addListener(
    metadata: OnMessageEventMetadata,
    onMessages: (
      event: IMessageEvent,
      metadata: OnMessageEventMetadata,
      retires: number,
    ) => Promise<void>,
  ): Promise<void>;

  abstract removeAllListener(): Promise<void>;

  abstract emit(
    route: string,
    payload: IMessageEvent,
    options?: MessageBrokerEmitOption,
  ): Promise<boolean>;
}
