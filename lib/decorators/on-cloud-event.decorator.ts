import { Type } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common/decorators/core/set-metadata.decorator';

export const ON_CLOUD_EVENT_METADATA = 'ON_CLOUD_EVENT_METADATA';

export const OnCloudEvent = (
  event: string | Type<unknown>,
): MethodDecorator => {
  return SetMetadata(ON_CLOUD_EVENT_METADATA, event);
};
