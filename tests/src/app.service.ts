import { Injectable } from '@nestjs/common';
import { OnCloudEvent } from '../../lib';
import { OrderCreatedEvent } from './order.created.event';
import { CloudEvent } from 'cloudevents';

@Injectable()
export class AppService {
  @OnCloudEvent(OrderCreatedEvent)
  async handleOrderCreated(event: CloudEvent<OrderCreatedEvent>) {
    console.log('handleOrderCreated', event);
    if (Math.random() > 0.7) throw new Error(`Failed`);
  }
}
