export class RetryPolicy {
  static getDelayInMs(retries: number): number {
    const baseDelay = 1000;
    const delay = baseDelay * Math.pow(2, retries);
    const min = baseDelay;
    const max = 1000 * 60 * 60; // 1h
    return Math.max(min, Math.min(delay, max));
  }
}
