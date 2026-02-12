import { IMessageBrokerAdapter } from './interfaces/message-broker-adapter.interface';

export interface MessageBrokerOptions {
  adapter: IMessageBrokerAdapter;
  default: {
    source: string;
  };
  debug?: boolean;
}
