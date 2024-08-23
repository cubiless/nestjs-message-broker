import { Inject } from '@nestjs/common';
import { MESSAGE_BROKER } from '../Constants';

export const InjectMessageBroker = () => Inject(MESSAGE_BROKER);
