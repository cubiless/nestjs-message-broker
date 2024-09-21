import {
  IMessageBrokerRetryStrategy,
  MessageBrokerSerializer,
} from '../services';

export interface MessageBrokerOptions<T> {
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
   * Name of a project
   */
  name: string;

  /**
   * the delimiter used to segment namespaces
   *
   * Default .
   */
  delimiter?: string;

  /**
   * the delimiter used to segment namespaces
   *
   * Default .
   */
  nameDelimiter?: string;

  /**
   *  Wildcard for the next sub event
   *
   * Default **
   */
  wildcards?: string;

  /**
   *  Wildcard for each sub event
   *
   * Default **
   */
  multiLevelWildcards?: string;
}
