import { InjectMessageBroker, OnMessageEvent, RabbitMQBroker } from '../../lib';
import { Injectable } from '@nestjs/common';
import { UserCreatedEvent } from './User.created.event';
import { UserEvent } from './User.event';

@Injectable()
export class AppService {
  constructor(
    @InjectMessageBroker()
    private readonly messageBroker: RabbitMQBroker,
  ) {}

  @OnMessageEvent(UserEvent, { exact: false })
  async handleAllUser(payload: UserEvent) {
    console.log('handleAllUser', payload);
  }

  @OnMessageEvent(UserCreatedEvent)
  async handleCreatedUser(payload: UserCreatedEvent, _, retries: number) {
    if (Math.random() > 0.8) throw new Error(`Retry: ${retries}`);
    await this.emitByEvent(payload);
  }

  @OnMessageEvent(UserCreatedEvent, { volatile: true })
  async handleCreatedUserPerInstance(payload: UserCreatedEvent) {
    console.log('handleAllUserPerInstance', payload);
  }

  async emitByEvent(createdEvent: UserCreatedEvent) {
    return this.messageBroker.emit(createdEvent, {
      priority: 10,
      delay: 10000,
    });
  }
}
