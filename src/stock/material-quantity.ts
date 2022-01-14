export abstract class MaterialQuantity {
  private _quantity = 0;

  constructor(quantity: number) {
    this._quantity = quantity;
  }

  toNumber() {
    return this._quantity;
  }
}
