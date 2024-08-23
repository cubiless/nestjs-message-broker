import {
  IMessageBrokerRetryStrategy,
  MessageBrokerSerializer,
} from '../services';

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
