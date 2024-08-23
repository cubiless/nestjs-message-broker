import { InjectMessageBroker, OnMessageEvent, RabbitMQBroker } from '../../lib';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(
    @InjectMessageBroker()
    private readonly messageBroker: RabbitMQBroker,
  ) {}

  @OnMessageEvent('user.#', { scope: 'user' })
  async handleAllUser() {}

  @OnMessageEvent('user.created', { scope: 'user' })
  async handleCreatedUser(payload: any, _, retries: number) {
    if (Math.random() > 0.8) throw new Error(`Retry: ${retries}`);
    setTimeout(() => {
      this.emitCreateUser(payload);
    }, 100);
  }

  @OnMessageEvent('#', { scope: 'user' })
  async handleAllInUseScope() {}

  async emitCreateUser(user: any) {
    return this.messageBroker.emit('user.created', user, {
      priority: 10,
      scope: 'user',
      delay: 60 * 1000,
    });
  }
}
