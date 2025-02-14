import { extendArrayMetadata } from '@nestjs/common/utils/extend-metadata.util';
import { MESSAGE_EVENT_METADATA } from '../Constants';
import { MessageBrokerEmitOption } from '../interfaces/MessageBrokerEmitOption.interface';

export interface MessageEventMetadata {
  route: string | Array<string>;
  options: MessageBrokerEmitOption;
}

export const MessageEvent = (
  route: string | Array<string>,
  options: MessageBrokerEmitOption = {},
): ClassDecorator => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (constructor: Function) => {
    extendArrayMetadata(
      MESSAGE_EVENT_METADATA,
      [
        {
          route,
          options,
        } as MessageEventMetadata,
      ],
      constructor,
    );
  };
};
