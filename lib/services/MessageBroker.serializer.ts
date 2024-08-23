import { IMessageEvent } from '../interfaces';

export interface MessageBrokerSerializer {
  deserializer(message: Buffer): IMessageEvent;

  serializer(value: IMessageEvent): Buffer;
}

export namespace MessageBrokerSerializer {
  export function json() {
    return {
      deserializer: (message: Buffer) => JSON.parse(message.toString()),
      serializer: (value: IMessageEvent) => Buffer.from(JSON.stringify(value)),
    };
  }
}
