import { ConfigurableModuleClass } from './message-broker.module-definition';
import { Module } from '@nestjs/common';
import { EventExplorerService } from './event-explorer.service';
import { MessageBrokerService } from './message-broker.service';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [EventExplorerService, MessageBrokerService],
  exports: [MessageBrokerService],
})
export class MessageBrokerModule extends ConfigurableModuleClass {}
