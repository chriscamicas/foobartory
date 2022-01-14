import { BarQuantity } from '../src/stock/bar-quantity';
import { Stock } from '../src/stock/stock';

describe('Stock management', () => {
  let barStock : Stock<BarQuantity>;

  beforeEach(async () => {
    barStock = new Stock(BarQuantity);
  });

  it('increase stock', () => {
    barStock.store(new BarQuantity(5));
    expect(barStock.quantityInStock.toNumber()).toBe(5);
  });

  it('decrease stock', () => {
    barStock.store(new BarQuantity(5));
    barStock.take(new BarQuantity(2));
    expect(barStock.quantityInStock.toNumber()).toBe(3);
  });

  it('throw if not enought stock', () => {
    barStock.store(new BarQuantity(2));
    expect(() => barStock.take(new BarQuantity(5))).toThrow();
  });

});
