import { getRandomIntInclusive } from '../src/math/random-between';

describe('Generate a random number', () => {
  it('generates between 0 and 1', () => {
    const FIXED_RANDOM_NUMBER = 0.123456789;

    jest.spyOn(global.Math, 'random').mockReturnValue(FIXED_RANDOM_NUMBER);
    expect(getRandomIntInclusive(0, 1)).toBe(0);
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('generates between 5 and 10', () => {
    const FIXED_RANDOM_NUMBER = 0.123456789;

    jest.spyOn(global.Math, 'random').mockReturnValue(FIXED_RANDOM_NUMBER);
    expect(getRandomIntInclusive(5, 10)).toBe(5);
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('includes min', () => {
    const FIXED_RANDOM_NUMBER = 0;

    jest.spyOn(global.Math, 'random').mockReturnValue(FIXED_RANDOM_NUMBER);
    expect(getRandomIntInclusive(5, 10)).toBe(5);
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('includes max', () => {
    const FIXED_RANDOM_NUMBER = 0.99;

    jest.spyOn(global.Math, 'random').mockReturnValue(FIXED_RANDOM_NUMBER);
    expect(getRandomIntInclusive(5, 10)).toBe(10);
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('generates between 1000 and 2000', () => {
    const FIXED_RANDOM_NUMBER = 0.42424242;

    jest.spyOn(global.Math, 'random').mockReturnValue(FIXED_RANDOM_NUMBER);
    expect(getRandomIntInclusive(1000, 2000)).toBe(1424);
    jest.spyOn(global.Math, 'random').mockRestore();
  });

});
