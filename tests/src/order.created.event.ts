import { CloudEventDefinition } from '../../lib';

@CloudEventDefinition({
  type: 'com.orders.created',
  source: 'order-service',
})
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly amount: number,
  ) {}
}
