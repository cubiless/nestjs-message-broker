import { SetMetadata } from '@nestjs/common/decorators/core/set-metadata.decorator';

export interface CloudEventOptions {
  type: string;
  source?: string;
}

export const CLOUD_EVENT_DEFINITION = 'CLOUD_EVENT_DEFINITION';

export const CloudEventDefinition = (
  options: CloudEventOptions,
): ClassDecorator => {
  return SetMetadata(CLOUD_EVENT_DEFINITION, options);
};
