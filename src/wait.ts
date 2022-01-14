/**
 * A Promisified version of setTimeout
 * @param ms time in ms to wait
 * @returns a promise resolved when the time is ellapsed
 */
export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
