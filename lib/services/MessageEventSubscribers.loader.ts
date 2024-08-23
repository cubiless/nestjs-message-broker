import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MessageEventMetadataAccessor } from './MessageEventMetadata.accessor';
import { InjectMessageBroker, OnMessageEventMetadata } from '../decorators';
import { MessageBroker } from './brokers/MessageBroker.service';
import { IMessageEvent } from '../interfaces';

@Injectable()
export class MessageEventSubscribersLoader
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger('MessageBroker');

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly messageMetadataAccessor: MessageEventMetadataAccessor,
    @InjectMessageBroker()
    private readonly messageBroker: MessageBroker<any>,
  ) {}

  async onApplicationBootstrap() {
    await this.messageBroker.connect();
    await this.loadEventListeners();
  }

  async onApplicationShutdown() {
    await this.messageBroker.removeAllListener();
    await this.messageBroker.disconnect();
  }

  async loadEventListeners() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();

    const filtered: InstanceWrapper[] = [...providers, ...controllers].filter(
      (wrapper) => wrapper.instance && !wrapper.isAlias,
    );

    for (const wrapper of filtered) {
      const { instance, name } = wrapper;

      for (const methodKey of this.metadataScanner.getAllMethodNames(
        instance,
      )) {
        await this.subscribeToEventIfListener(name, instance, methodKey);
      }
    }
  }

  private async subscribeToEventIfListener(
    name: string,
    instance: Record<string, any>,
    methodKey: string,
  ) {
    const messageMetadatas: OnMessageEventMetadata[] =
      this.messageMetadataAccessor.getMessageEventHandlerMetadata(
        instance[methodKey],
      );

    if (!messageMetadatas) return;

    const defaultQueueName = `${name}/${methodKey}`;

    for (const messageMetadata of messageMetadatas) {
      // Set default queue name
      if (!messageMetadata.options?.queue) {
        messageMetadata.options.queue = defaultQueueName;
      }

      try {
        await this.messageBroker.addListener(
          messageMetadata,
          async (
            event: IMessageEvent,
            metadata: OnMessageEventMetadata,
            retires: number,
          ) => {
            try {
              return await instance[methodKey].call(
                instance,
                event,
                metadata,
                retires,
              );
            } catch (e) {
              if (messageMetadata?.options?.suppressErrors ?? true) {
                this.logger.error(`${messageMetadata.options.queue}: ${e}`);
              }
              throw e;
            }
          },
        );

        this.logger.log(
          `${messageMetadata.options.queue}(${messageMetadata.events.join('|')}) initialized`,
        );
      } catch (e) {
        this.logger.error(
          `Init Subscriber: ${messageMetadata.options.queue}`,
          e,
        );
      }
    }
  }
}
