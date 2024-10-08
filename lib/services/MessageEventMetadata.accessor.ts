import { Injectable, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OnMessageEventMetadata } from '../decorators';
import {
  MESSAGE_EVENT_LISTENER_METADATA,
  MESSAGE_EVENT_METADATA,
} from '../Constants';
import { MessageEventMetadata } from '../decorators/MessageEvent';
import { IMessageEvent } from '../interfaces';

@Injectable()
export class MessageEventMetadataAccessor {
  constructor(private readonly reflector: Reflector) {}

  getMessageEventHandlerMetadata(
    target: Type<unknown>,
  ): OnMessageEventMetadata[] | undefined {
    if (
      !target ||
      (typeof target !== 'function' && typeof target !== 'object')
    ) {
      return undefined;
    }

    const metadata = this.reflector.get(
      MESSAGE_EVENT_LISTENER_METADATA,
      target,
    );
    if (!metadata) {
      return undefined;
    }
    return Array.isArray(metadata) ? metadata : [metadata];
  }

  getMessageEventMetadata(
    target: Type<IMessageEvent>,
  ): MessageEventMetadata[] | undefined {
    if (
      !target ||
      (typeof target !== 'function' && typeof target !== 'object')
    ) {
      return undefined;
    }

    const metadata = this.reflector.get(MESSAGE_EVENT_METADATA, target);

    if (!metadata) {
      return undefined;
    }
    return Array.isArray(metadata) ? metadata : [metadata];
  }
}
