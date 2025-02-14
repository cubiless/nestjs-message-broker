import { IMessageEvent } from '../interfaces';

export interface MessageBrokerSerializer {
  deserializer(message: Buffer): IMessageEvent;

  serializer(value: IMessageEvent): Buffer;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MessageBrokerSerializer {
  export function json(): MessageBrokerSerializer {
    return {
      deserializer: (message: Buffer) => JSON.parse(message.toString()),
      serializer: (value: IMessageEvent) => Buffer.from(JSON.stringify(value)),
    };
  }
}
