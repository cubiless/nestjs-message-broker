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
