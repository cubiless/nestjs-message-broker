import { MessageEvent } from '../../lib/decorators/MessageEvent';
import { IMessageEvent } from '../../lib';

@MessageEvent('user')
export class UserEvent implements IMessageEvent {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}
