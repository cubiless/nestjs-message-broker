import { CloudEvent } from 'cloudevents';

export interface IMessageBrokerAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  publish<T>(
    event: CloudEvent<T>,
    options?: IMessageBrokerPublishOptions,
  ): Promise<boolean>;
  subscribe<T>(
    name: string,
    pattern: string,
    handler: (event: CloudEvent<T>) => Promise<void>,
    options?: IMessageBrokerSubscribeOptions,
  ): Promise<void>;
}

export type IMessageBrokerSubscribeOptions = {
  prefetch?: number;
  priority?: number;
  volatile?: boolean;
};

export type IMessageBrokerPublishOptions = {
  delay?: number;
  priority?: number;
};
