import { extendArrayMetadata } from '@nestjs/common/utils/extend-metadata.util';
import { MESSAGE_EVENT_LISTENER_METADATA } from '../Constants';
import { OnMessageEventOptions } from '../interfaces';

export interface OnMessageEventMetadata {
  events: Array<string>;
  options: OnMessageEventOptions;
}

export const OnMessageEvent = (
  event: string | Array<string>,
  options: OnMessageEventOptions = {},
): MethodDecorator => {
  const decoratorFactory = (target: object, key?: any, descriptor?: any) => {
    extendArrayMetadata(
      MESSAGE_EVENT_LISTENER_METADATA,
      [
        {
          events: Array.isArray(event) ? event : [event],
          options,
        } as OnMessageEventMetadata,
      ],
      descriptor.value,
    );
    return descriptor;
  };
  decoratorFactory.KEY = MESSAGE_EVENT_LISTENER_METADATA;
  return decoratorFactory;
};
