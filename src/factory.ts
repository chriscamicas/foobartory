import { EventEmitter } from 'stream';
import { BankAccount } from './bank-account';
import { Robot } from './robot';
import { BarQuantity } from './stock/bar-quantity';
import { FooQuantity } from './stock/foo-quantity';
import { FoobarQuantity } from './stock/foobar-quantity';
import { Stock } from './stock/stock';

export enum FactoryEvents {
  FooStockAvailable = 'foo-stock-available',
  BarStockAvailable = 'bar-stock-available',
  FoobarStockAvailable = 'foobar-stock-available',
  MoneyDeposit = 'money-deposit',
  RobotAvailable = 'robot-available',
  RobotBusy = 'robot-busy',
  RobotMoving = 'robot-moving',
  NewRobotBought = 'new-robot-bought',
}

export class Factory extends EventEmitter {
  private readonly _robots: Robot[] = [];

  constructor(
    private fooStock: Stock<FooQuantity>,
    private barStock: Stock<BarQuantity>,
    private foobarStock: Stock<FoobarQuantity>,
    private bankAccount: BankAccount,
  ) {
    super();
  }

  /**
   * Start the factory with 2 robots
   */
  public start() {
    this.addNewRobot();
    this.addNewRobot();
  }

  public get robots() {
    return this._robots;
  }

  /**
   * Foo Stock Management
   */
  public takeFoo(quantityToTake: FooQuantity) {
    this.fooStock.take(quantityToTake);
  }
  public storeFoo(quantityToStore: FooQuantity) {
    this.fooStock.store(quantityToStore);
    this.emit(FactoryEvents.FooStockAvailable);
  }
  public hasEnoughFoo(quantityToTake: FooQuantity) {
    return this.fooStock.hasEnoughMaterial(quantityToTake);
  }
  public get fooQuantityAvailableInStock(): FooQuantity {
    return this.fooStock.quantityInStock;
  }

  /**
   * Bar Stock Management
   */
  public takeBar(quantityToTake: BarQuantity) {
    this.barStock.take(quantityToTake);
  }
  public storeBar(quantityToStore: BarQuantity) {
    this.barStock.store(quantityToStore);
    this.emit(FactoryEvents.BarStockAvailable);
  }
  public hasEnoughBar(quantityToTake: BarQuantity) {
    return this.barStock.hasEnoughMaterial(quantityToTake);
  }
  public get barQuantityAvailableInStock(): BarQuantity {
    return this.barStock.quantityInStock;
  }

  /**
   * Foobar Stock Management
   */
  public takeFoobar(quantityToTake: FoobarQuantity) {
    this.foobarStock.take(quantityToTake);
  }
  public storeFoobar(quantityToStore: FoobarQuantity) {
    this.foobarStock.store(quantityToStore);
    this.emit(FactoryEvents.FoobarStockAvailable);
  }
  public get foobarQuantityAvailableInStock(): FoobarQuantity {
    return this.foobarStock.quantityInStock;
  }

  /**
   * Bank Account Management
   */
  public withdrawMoney(amountToWithdraw: number) {
    this.bankAccount.withdraw(amountToWithdraw);
  }
  public makeDeposit(amountToDeposit: number) {
    this.bankAccount.deposit(amountToDeposit);
    this.emit(FactoryEvents.MoneyDeposit);
  }
  public hasEnoughMoney(amount: number) {
    return this.bankAccount.balance >= amount;
  }
  public get balance() {
    return this.bankAccount.balance;
  }

  public addNewRobot() {
    const newRobot = new Robot(this);
    this._robots.push(newRobot);
    this.emit(FactoryEvents.NewRobotBought);
    this.emit(FactoryEvents.RobotAvailable, newRobot);
  }

  get status() {
    return {
      balance: this.bankAccount.balance,
      foo: this.fooStock.quantityInStock.toNumber(),
      bar: this.barStock.quantityInStock.toNumber(),
      foobar: this.foobarStock.quantityInStock.toNumber(),
      robotCount: this.robots.length,
    };
  }
}
