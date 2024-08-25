import { extendArrayMetadata } from '@nestjs/common/utils/extend-metadata.util';
import { MESSAGE_EVENT_LISTENER_METADATA } from '../Constants';
import { IMessageEvent, OnMessageEventOptions } from '../interfaces';
import { Type } from '@nestjs/common';

export interface OnMessageEventMetadata {
  events: Array<string | Type<IMessageEvent>>;
  options: OnMessageEventOptions;
}

export const OnMessageEvent = (
  event: string | Array<string> | Type<IMessageEvent>,
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
