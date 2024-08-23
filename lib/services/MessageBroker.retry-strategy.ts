export type IMessageBrokerRetryStrategy = (retries: number) => number;

/**
 * Default message broker retries strategy
 * Each function calculates the delay of new retries
 */
export namespace MessageBrokerRetryStrategy {
  /**
   * Constant delay of each retries
   * @param delay Time in mms
   */
  export function constant(
    delay: number = 1000 * 60 * 5,
  ): IMessageBrokerRetryStrategy {
    return () => delay;
  }

  /**
   * Calculate with Linear-Function the delay
   *
   * @param pitch The Pitch delay in mms
   * @param min Maximum of delay in mms
   * @param max Minimum of delay in mms
   */
  export function linear(
    pitch: number = 1000 * 60 * 5,
    min: number = 500,
    max: number = 1000 * 60 * 60 * 6,
  ): IMessageBrokerRetryStrategy {
    return (retries) => {
      return Math.max(min, Math.min(retries * pitch, max));
    };
  }

  /**
   * Calculate with Cube-Function the delay
   *
   * @param exponent The exponent number
   * @param base The base number in mms
   * @param min Maximum of delay in mms
   * @param max Minimum of delay in mms
   */
  export function cube(
    exponent: number = 1000,
    min: number = 500,
    max: number = 1000 * 60 * 60 * 6,
    base: number = 3,
  ): IMessageBrokerRetryStrategy {
    return (retries) => {
      return Math.max(min, Math.min(Math.pow(base, retries) * exponent, max));
    };
  }

  /**
   * Define a fix delay for each retry.
   * The last step is the maximum of delay
   *
   * @param steps Get for each retry the delay in mms
   */
  export function steps(
    steps: number[] = [
      1000,
      1000 * 5,
      1000 * 30,
      1000 * 60 * 3,
      1000 * 60 * 10,
      1000 * 60 * 60,
      1000 * 60 * 60 * 6,
    ],
  ): IMessageBrokerRetryStrategy {
    return (retries) => {
      if (steps.length > 0) {
        return steps[Math.min(steps.length, retries)];
      }
      return 0;
    };
  }
}
