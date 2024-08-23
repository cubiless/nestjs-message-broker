import { DynamicModule, Type } from '@nestjs/common';
import {
  MessageBroker,
  MessageEventMetadataAccessor,
  MessageEventSubscribersLoader,
} from './services';
import { DiscoveryModule } from '@nestjs/core';
import { MessageBrokerOptions } from './interfaces';
import { MESSAGE_BROKER, MESSAGE_BROKER_OPTIONS } from './Constants';
import { ConfigurableModuleAsyncOptions } from '@nestjs/common/module-utils/interfaces/configurable-module-async-options.interface';

export class MessageBrokerModule {
  static register<T>(
    broker: Type<MessageBroker<T>>,
    options: MessageBrokerOptions<T>,
  ): DynamicModule {
    return {
      global: options.global,
      module: MessageBrokerModule,
      imports: [DiscoveryModule],
      providers: [
        MessageEventSubscribersLoader,
        MessageEventMetadataAccessor,
        { provide: MESSAGE_BROKER, useClass: broker },
        {
          provide: MESSAGE_BROKER_OPTIONS,
          useValue: options,
        },
      ],
      exports: [{ provide: MESSAGE_BROKER, useClass: broker }],
    };
  }

  static registerAsync<T>(
    broker: Type<MessageBroker<T>>,
    options: ConfigurableModuleAsyncOptions<MessageBrokerOptions<T>>,
  ): DynamicModule {
    return {
      module: MessageBrokerModule,
      imports: [DiscoveryModule, ...options.imports],
      providers: [
        MessageEventSubscribersLoader,
        MessageEventMetadataAccessor,
        { provide: MESSAGE_BROKER, useClass: broker },
        {
          provide: MESSAGE_BROKER_OPTIONS,
          useClass: options.useClass,
          useExisting: options.useExisting,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [{ provide: MESSAGE_BROKER, useClass: broker }],
    };
  }
}
