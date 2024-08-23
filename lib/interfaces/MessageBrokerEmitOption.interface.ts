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
