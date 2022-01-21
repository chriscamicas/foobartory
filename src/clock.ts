import { WORLD_SPEED } from './world-parameters';

export class Clock {
  private _cumulativeTime = 0;

  /**
   * A Promisified version of setTimeout
   * @param ms time in ms to wait
   * @returns a promise resolved when the time is ellapsed
   */
  wait(ms: number) {
    this._cumulativeTime += ms;
    return new Promise((resolve) => setTimeout(resolve, ms / WORLD_SPEED));
  }

  getCumulativeTimeSpent() {
    return this._cumulativeTime;
  }
}
