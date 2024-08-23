# Message Broker for NestJs

> The idea behind this module is to connect it to a message broker that enables the permanent distribution of messages.

## Install

```
$ npm i @cubiles/nestjs-message-broker
```

| Support | Message-Broker | Docker-Image                                |
|---------|----------------|---------------------------------------------|
| ✅       | RabbitMQ       | `heidiks/rabbitmq-delayed-message-exchange` |

## Features

- ✅ simple Usage without much configuration
- ✅ support the native routing pattern
- ✅ auto-retry of messages with a lot of strategies
- ✅ group messages in Namespaces and Scopes

## Example

### Code

```ts
@Module({
  imports: [
    MessageBrokerModule.register(RabbitMQBroker, {
      broker: {
        password: 'guest',
        user: 'guest',
        host: 'localhost',
        port: 5672,
        prefix: 'my-broker',
      },
      namespace: 'user-service',
    }),
  ],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {
}
```

```ts
@Injectable()
export class AppService {
  constructor(
    @InjectMessageBroker()
    private readonly messageBroker: RabbitMQBroker,
  ) {
  }

  @OnMessageEvent('user.created')
  async handleCreatedUser(user) {
    console.log('New user', user);
  }

  @OnMessageEvent('user.*')
  async handleUser(user) {
    console.log('On user', user);
  }

  async sendMessages() {
    await this.messageBroker.emit('user.created', { name: 'peter' });
  }
}
```

### Auto-build of Message-Brokers

#### Exchanges

- `my-broker/messages`
- `my-broker/retries`

#### Queues

- `my-broker/retries`
- `my-broker/user-services/app-service/handle-created-user`
- `my-broker/user-services/app-service/handle-user`

### Flow-Chart

1. Publish in `my-broker/messages`
2. Route to
    1. `my-broker/user-services/app-service/handle-created-user`
    2. `my-broker/user-services/app-service/handle-user`
3. Process message

### What happens if the processing fails

1. Reroute to `my-broker/retries`
2. Calculate the delay of the next try
3. Publish again in `my-broker/messages` and wait the delay
4. Route **only** to the subscriber of failed process

## Retry-Strategy

| function   | default                                 | 1      | 2      | 3       | 4       | 5       | 6       | 7       | 8        | 9        | 10       | ...    |
|------------|-----------------------------------------|--------|--------|---------|---------|---------|---------|---------|----------|----------|----------|--------|
| `constant` | `delay=5min`                            | `5min` | `5min` | `5min`  | `5min`  | `5min`  | `5min`  | `5min`  | `5min`   | `5min`   | `5min`   | `5min` |       
| `linear`   | `pitch=1min` `min=0.5s` `max=6h`        | `0.5s` | `5min` | `10min` | `15min` | `20min` | `25min` | `30min` | `35min`  | `40min`  | `45min`  | `6h`   |          
| `cube`     | `pitch=1s` `min=0.5s` `max=6h` `base=3` | `0.5s` | `1.5s` | `4.5s`  | `~13s`  | `~40s`  | `~2min` | `~6min` | `~18min` | `~54min` | `~2.75h` | `6h`   |        
| `steps`    | `steps=[...]`                           | `1s`   | `5s`   | `30s`   | `3min`  | `10min` | `1h`    | `6h`    | `6h`     | `6h`     | `6h`     | `6h`   | 

## Auto-Build of exchanges and queues

This module extract out the code the require exchanges, queues and bindings.

### Exchanges

Require only static to two exchanges

1. `${name}/messages` All Message put in this exchange
2. `${name}/retries` If messages fail to put in these exchanges for next consuming

### Queues

For each `@OnMessagesEvent('user.*')` create own queue `${name}/$namespace}/${class-key}/${methode-key}` and bind to
the messages exchange with the following rules `${queue}` or `-.${scope}.${event}`.

1. Global Scope `-.global.${event}`
2. Retry route `${queue}`
3. For each custom Scope `-.${scope}.${event}`

## Api

### Methods

#### `MessagesBroker.emit(route: string, payload: IMessageEvent, options?: MessageBrokerEmitOption): Promise<boolean>`

##### Params

- `route` Route of event
- `payload` Options of this queue
- `options` Optional Options

##### Example

```ts
this.messageBroker.emit('user.created', { userId: '1' });

this.messageBroker.emit('user.created', { userId: '1' }, {
  priority: 10,
  scope: 'user',
  delay: 60 * 1000,
});
```

### Decorators

#### `@InjectMessageBroker()`

This is the short of `@Inject(MESSAGE_BROKER)` for the getting of the MessagesBroker.

##### Example

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
class AppServices {

  constructor(
    @InjectMessageBroker()
    private readonly messageBroker: RabbitMQBroker,
  ) {
  }
}
```

#### `@OnEventMessages(event:string,options?:OnEventMessageOptions)`

##### Params

- `event` Pattern of message route
    - `*` can substitute for exactly one word.
    - `#` can substitute for zero or more words
    - `split.with.dot` can group events
- `options` Options of this queue

##### Example

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
class AppServices {

  @OnEventMessages('your.route')
  async onHandle(payload: any, options: OnEventMessageOptions, retries: number) {
    // Your code
  }
}
```

### Types

````ts
export interface OnMessageEventOptions {
  /**
   * Custom name of queue
   *
   * Default ${class-name}/${methode-key}
   */
  queue?: string;

  /**
   * Print the errors int the console
   *
   * Default true
   */
  suppressErrors?: string;

  /**
   * Maximal count of parallel processing
   *
   * Default 1
   */
  prefetch?: number;

  /**
   * Priority of queue
   *
   * Default 0
   */
  priority?: number;

  /**
   * Listen only in these scopes for new messages.
   * The global scope is always active.
   *
   * Default []
   */
  scope?: string | Array<string>;
}
````

````ts
export interface MessageBrokerEmitOption {
  /**
   * Delay of consume the messages
   *
   * Default 0
   */
  delay?: number;

  /**
   * Messages priority
   *
   * Default 0
   */
  priority?: number;

  /**
   * Emit the message in the scope
   *
   * Default global
   */
  scope?: string;
}
````

````ts
export interface MessageBrokerOptions<T> {
  /**
   * Is the module global?
   *
   * Default false
   */
  global?: boolean;

  /**
   * Custom serializer methode of string to buffer
   *
   * Default JSON.parse() and JSON.stringify()
   */
  serializer?: MessageBrokerSerializer;

  /**
   * Calculate the delay of a retry if messages failed
   *
   * Default MessageBrokerRetryStrategy.cube()
   */
  retryStrategy?: IMessageBrokerRetryStrategy;

  /**
   * Option of the usages messages broker
   */
  broker: T;

  /**
   * Change the default scope of messages
   *
   * Default global
   */
  defaultScope?: string;

  /**
   * Namespace of queue and exchanges
   */
  namespace?: string | null;
}
````
