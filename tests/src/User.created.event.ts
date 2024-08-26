import { MessageEvent } from '../../lib/decorators/MessageEvent';
import { UserEvent } from './User.event';

@MessageEvent(['created', 'v1'])
export class UserCreatedEvent extends UserEvent {}
