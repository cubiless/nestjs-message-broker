# Message Broker for NestJs

> A CloudEvents-compliant message broker for NestJS with flexible adapter architecture (e.g. RabbitMQ) for decoupling infrastructure and logic.

## Install

```
$ npm i @cubiles/nestjs-message-broker
```

## Features

- ✅ CloudEvents-compliant
- ✅ minimal configuration
- ✅ Supplementable of [asyncapi](https://github.com/flamewow/nestjs-asyncapi)
- ✅ auto-retry of messages

## Adapters

| Support         | Message-Broker | Docker-Image                                |
|-----------------|----------------|---------------------------------------------|
| ✅ in planning | InMemory       |                                             |
| 🟦️ in planning | Redis          |                                             |
| ✅ Supported     | RabbitMQ       | `heidiks/rabbitmq-delayed-message-exchange` |

## Example

### Code

```ts

@Module({
  imports: [
    MessageBrokerModule.forRoot({
      adapter: new RabbitMqAdapter({
        namespace: 'test',
        url: {
          password: 'guest',
          username: 'guest',
          hostname: 'localhost',
          port: 5672,
        },
      }),
      default: {
        source: 'com',
      },
    }),
  ],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {
}
```

```ts

@CloudEventDefinition({
  type: 'com.orders.created',
  source: 'order-service',
})
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly amount: number,
  ) {
  }
}

```

```ts
import { MessageBrokerService } from './message-broker.service';

@Injectable()
export class AppService {
  constructor(
    @Inject()
    private readonly messageBroker: MessageBrokerService,
  ) {
  }

  @OnCloudEvent(OrderCreatedEvent)
  async handleOrderCreated(event: CloudEvent<OrderCreatedEvent>) {
    console.log('New order', event);
  }

  async sendMessages() {
    const event = new OrderCreatedEvent('42', 23);
    await this.messageBroker.publish(event);
  }
}
```
