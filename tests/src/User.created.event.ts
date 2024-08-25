import { MessageEvent } from '../../lib/decorators/MessageEvent';
import { UserEvent } from './User.event';

@MessageEvent('created')
export class UserCreatedEvent extends UserEvent {}
