/**
 * Generates a random number between min and max (both included)
 * based on Math.random pseudo number generation
 * https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 * @param min
 * @param max
 * @returns
 */
export function getRandomIntInclusive(min: number, max: number) {
  // console.log('getRandomIntInclusive', min, max);
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min +1)) + min;
}
