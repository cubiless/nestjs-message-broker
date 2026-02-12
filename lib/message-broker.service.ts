import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MessageBrokerOptions } from './message-broker.options';
import { MODULE_OPTIONS_TOKEN } from './message-broker.module-definition';
import { CloudEvent } from 'cloudevents';
import {
  IMessageBrokerPublishOptions,
  IMessageBrokerSubscribeOptions,
} from './interfaces';
import { CLOUD_EVENT_DEFINITION, CloudEventOptions } from './decorators';
import { Reflector } from '@nestjs/core';

@Injectable()
export class MessageBrokerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger('MessageBroker');

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: MessageBrokerOptions,
    private readonly reflector: Reflector,
  ) {}

  async onModuleInit() {
    await this.options.adapter.connect();
  }

  async onModuleDestroy() {
    await this.options.adapter.disconnect();
  }

  async publish<T>(
    event: CloudEvent<T>,
    options?: IMessageBrokerPublishOptions,
  ): Promise<boolean>;
  async publish(event: object, options?: IMessageBrokerPublishOptions);
  async publish<T>(
    event: object | CloudEvent<T>,
    options?: IMessageBrokerPublishOptions,
  ) {
    let validateEvent: null | CloudEvent<T> = null;

    const meta: CloudEventOptions = this.reflector.get(
      CLOUD_EVENT_DEFINITION,
      event.constructor,
    );

    if (meta) {
      validateEvent = new CloudEvent<T>({
        id: crypto.randomUUID(),
        type: meta.type,
        source: meta.source || this.options.default.source,
        time: new Date().toISOString(),
        data: event as T,
      });
    } else {
      if (!(event instanceof CloudEvent)) {
        throw new Error(
          `Event is not a CloudEvent or the class ${event.constructor.name} have not a @CloudEventDefinition decorator.`,
        );
      }

      if (!event.validate()) {
        throw new Error('CloudEvent is not valide.');
      }

      validateEvent = event;
    }

    return this.options.adapter.publish(validateEvent, options);
  }

  async subscribe(
    name: string,
    pattern: string,
    handler: (event: CloudEvent) => Promise<void>,
    options?: IMessageBrokerSubscribeOptions,
  ): Promise<void> {
    await this.options.adapter.subscribe(name, pattern, handler, options);
  }
}
