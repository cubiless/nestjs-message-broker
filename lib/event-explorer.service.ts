import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  Type,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import {
  CLOUD_EVENT_DEFINITION,
  CloudEventOptions,
  ON_CLOUD_EVENT_METADATA,
} from './decorators';
import { MODULE_OPTIONS_TOKEN } from './message-broker.module-definition';
import { MessageBrokerOptions } from './message-broker.options';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

@Injectable()
export class EventExplorerService implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: MessageBrokerOptions,
  ) {}

  async onApplicationBootstrap() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();

    const filtered: InstanceWrapper[] = [...providers, ...controllers].filter(
      (wrapper) =>
        wrapper.instance &&
        typeof wrapper.instance === 'object' &&
        !wrapper.isAlias,
    );

    for (const wrapper of filtered) {
      const { instance, name } = wrapper;

      for (const methodKey of this.metadataScanner.getAllMethodNames(
        instance,
      )) {
        // Extract the cloud event or the routing key
        let route: string | Type<unknown> = this.reflector.get(
          ON_CLOUD_EVENT_METADATA,
          instance[methodKey],
        );
        if (!route) continue;

        if (typeof route !== 'string') {
          const meta: CloudEventOptions = this.reflector.get(
            CLOUD_EVENT_DEFINITION,
            route,
          );

          if (!meta) {
            throw new Error(
              `The class ... have not a @CloudEventDefinition decorator.`,
            );
          }

          route = meta.type;
        }

        await this.options.adapter.subscribe(
          `${name}.${methodKey}`,
          route,
          instance[methodKey].bind(instance),
        );
      }
    }
  }
}
