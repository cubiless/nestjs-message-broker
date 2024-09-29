# Message Broker for NestJs

> The idea behind this module is to connect it to a message broker that enables the permanent distribution of messages.

## Install

```
$ npm i @cubiles/nestjs-message-broker
```

| Support       | Message-Broker | Docker-Image                                |
|---------------|----------------|---------------------------------------------|
| ✅ Supported   | RabbitMQ       | `heidiks/rabbitmq-delayed-message-exchange` |

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
    MessageBrokerModule.forRoot(RabbitMQBroker, {
      broker: {
        password: 'guest',
        user: 'guest',
        host: 'localhost',
        port: 5672,
      },
      name: 'my-broker',
      namespace: 'user-service',
      delimiter: '.',
      wildcards: '*',
      multiLevelWildcards: '#', 
      debug: true
    }),
  ],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {
}
```

```ts
@MessageEvent('user')
export class UserEvent implements IMessageEvent {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}
```

```ts
@MessageEvent('created')
export class UserCreatedEvent extends UserEvent {
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

  @OnMessageEvent(UserEvent, { exact: false })
  async handleUser(user) {
    console.log('On user', user);
  }

  @OnMessageEvent('user.created')
  async handleCreatedUser(user) {
    console.log('New user', user);
  }

  async sendMessages() {
    await this.messageBroker.emit(new UserCreatedEvent('1024'));
  }
}
```

### Auto-build of Message-Brokers

#### Exchanges

- `my-broker.user-services.messages`
- `my-broker.user-services.retries`

#### Queues

- `my-broker.user-services.retries`
- `my-broker.user-services.app-service.handle-created-user`
- `my-broker.user-services.app-service.handle-user`

### Flow-Chart

1. Publish in `my-broker.messages`
2. Route to
    1. `my-broker.user-services.app-service.handle-created-user`
    2. `my-broker.user-services.app-service.handle-user`
3. Process message

### What happens if the processing fails

1. Reroute to `my-broker.user-services.retries`
2. Calculate the delay of the next try
3. Publish again in `my-broker.user-services.messages` and wait the delay
4. Route **only** to the subscriber of failed process

## Retry-Strategy

| function   | default                                 | 1      | 2      | 3       | 4       | 5       | 6       | 7       | 8        | 9        | 10       | ...    |
|------------|-----------------------------------------|--------|--------|---------|---------|---------|---------|---------|----------|----------|----------|--------|
| `constant` | `delay=5min`                            | `5min` | `5min` | `5min`  | `5min`  | `5min`  | `5min`  | `5min`  | `5min`   | `5min`   | `5min`   | `5min` |       
| `linear`   | `pitch=1min` `min=0.5s` `max=6h`        | `0.5s` | `5min` | `10min` | `15min` | `20min` | `25min` | `30min` | `35min`  | `40min`  | `45min`  | `6h`   |          
| `cube`     | `pitch=1s` `min=0.5s` `max=6h` `base=3` | `0.5s` | `1.5s` | `4.5s`  | `~13s`  | `~40s`  | `~2min` | `~6min` | `~18min` | `~54min` | `~2.75h` | `6h`   |        
| `steps`    | `steps=[...]`                           | `1s`   | `5s`   | `30s`   | `3min`  | `10min` | `1h`    | `6h`    | `6h`     | `6h`     | `6h`     | `6h`   | 

## Api

> Coming soon

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

   /**
    * Enable logs of handle events
    *
    * Default false
    */
   debug?: boolean;
}
````
