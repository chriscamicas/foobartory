import { MaterialQuantity } from './material-quantity';

/***
 * Stock of material
 */
export class Stock<Type extends MaterialQuantity> {
  private _quantityInStock: Type;

  constructor(private type: new (quantity: number) => Type) {
    this._quantityInStock = new type(0);
  }

  store(quantityToStore: Type) {
    this._quantityInStock = new this.type(this._quantityInStock.toNumber() + quantityToStore.toNumber());
  }

  take(quantityToTake: Type) {
    if (!this.hasEnoughMaterial(quantityToTake)) throw new Error('Not enough in stock');

    this._quantityInStock = new this.type(this._quantityInStock.toNumber() - quantityToTake.toNumber());
  }

  hasEnoughMaterial(quantityNeeded: Type): boolean {
    return quantityNeeded.toNumber() <= this._quantityInStock.toNumber();
  }

  public get quantityInStock(): Type {
    return this._quantityInStock;
  }
}
