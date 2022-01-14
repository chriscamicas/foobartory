import { BarQuantity } from './stock/bar-quantity';
import { FooQuantity } from './stock/foo-quantity';
import { FoobarQuantity } from './stock/foobar-quantity';

import { Workstation } from './workstation';
import { Factory, FactoryEvents } from './factory';

import { getRandomIntInclusive } from './math/random-between';
import { wait } from './wait';
import { nicknames } from 'memorable-moniker';

import {
  WORLD_SPEED,
  QUANTITY_OF_BAR_REQUIRED_TO_CRAFT_FOOBAR,
  QUANTITY_OF_FOO_REQUIRED_TO_CRAFT_FOOBAR,
  FOOBAR_SELLING_PRICE,
  QUANTITY_OF_FOO_REQUIRED_TO_BUY_ROBOT,
} from './world-parameters';

// Example output: murky-hands
export enum Status {
  Available,
  Busy,
}

export class Robot {
  // Duration parameters, depend on robot characterics (bigger robots might work faster)
  private static readonly MOVE_DURATION_IN_MS = (5 * 1000) / WORLD_SPEED;
  private static readonly FOO_MINING_DURATION_IN_MS = (1 * 1000) / WORLD_SPEED;
  private static readonly BAR_MINING_DURATION_MIN_IN_MS = (0.5 * 1000) / WORLD_SPEED;
  private static readonly BAR_MINING_DURATION_MAX_IN_MS = (2 * 1000) / WORLD_SPEED;
  private static readonly FOOBAR_CRAFTING_DURATION_IN_MS = (2 * 1000) / WORLD_SPEED;
  private static readonly FOOBAR_SELLING_DURATION_IN_MS = (10 * 1000) / WORLD_SPEED;
  private static readonly FOOBAR_CRAFTING_CHANCES = 60 / 100; // 60 %
  private static readonly QUANTIY_OF_FOO_PER_MINING_OPERATION = 1;
  private static readonly QUANTIY_OF_BAR_PER_MINING_OPERATION = 1;
  public static readonly ROBOT_RETAIL_PRICE = 3;

  private _currentWorkstation: Workstation = Workstation.MiningFoo;
  private _status = Status.Available;
  private _name = nicknames.next();

  public get currentWorkstation() {
    return this._currentWorkstation;
  }

  get status() {
    return this._status;
  }
  private set status(value) {
    this._status = value;
  }

  get name() {
    return this._name;
  }

  constructor(private factory: Factory) {}

  private async startOperation(destinationWorkstation: Workstation) {
    this._status = Status.Busy;
    this.factory.emit(FactoryEvents.RobotBusy, this, destinationWorkstation);
    await this.moveToIfNeeded(destinationWorkstation);
  }

  private operationCompleted() {
    this._status = Status.Available;
    this.factory.emit(FactoryEvents.RobotAvailable, this);
  }

  /**
   * Move, Mine and Store Foo
   */
  async mineAndStoreFoo() {
    await this.startOperation(Workstation.MiningFoo);
    const fooMined = await this._mineFoo();
    this.factory.storeFoo(fooMined);
    this.operationCompleted();
  }

  /**
   * Move, Mine and Store Bar
   */
  async mineAndStoreBar() {
    await this.startOperation(Workstation.MiningBar);
    const barMined = await this._mineBar();
    this.factory.storeBar(barMined);
    this.operationCompleted();
  }

  /**
   * Move, Craft and Store Foobar
   */
  async craftAndStoreFoobar() {
    await this.startOperation(Workstation.CraftingFoobar);

    const barNeeded = new BarQuantity(QUANTITY_OF_BAR_REQUIRED_TO_CRAFT_FOOBAR);
    const fooNeeded = new FooQuantity(QUANTITY_OF_FOO_REQUIRED_TO_CRAFT_FOOBAR);

    // A non effective production strategy may have sent the robot to craft foobar while no stock is available
    // or another robot might have taken the stock while moving
    // Complete the operation without crafting a foobar
    if (this.factory.hasEnoughBar(barNeeded) && this.factory.hasEnoughFoo(fooNeeded)) {
      this.factory.takeBar(barNeeded);
      this.factory.takeFoo(fooNeeded);

      const craftingSucceeded = await this._craftFoobar();
      if (craftingSucceeded) {
        this.factory.storeFoobar(new FoobarQuantity(1));
      } else {
        this.factory.storeBar(barNeeded);
      }
    }

    this.operationCompleted();
  }

  /**
   * Move, Take and Sell Foobar
   * Selling duration : 10s for 1 to 5 foobar (included)
   * Might sell less than asked for depending on the quantity available in stock
   */
  async sellFoobar(foodbarToSell: FoobarQuantity) {
    await this.startOperation(Workstation.SellingFoobar);

    const foobarSellable = Math.min(foodbarToSell.toNumber(), this.factory.foobarQuantityAvailableInStock.toNumber());
    if (foobarSellable > 0) {
      this.factory.takeFoobar(new FoobarQuantity(foobarSellable));
      const sellingDuration = Math.ceil(foobarSellable / 5) * Robot.FOOBAR_SELLING_DURATION_IN_MS;
      await wait(sellingDuration);
      this.factory.makeDeposit(FOOBAR_SELLING_PRICE);
    }
    this.operationCompleted();
  }

  /**
   * Move, buy a new robot, take needed materials and cash
   */
  async buyNewRobot() {
    await this.startOperation(Workstation.BuyingRobot);

    const fooRequired = new FooQuantity(QUANTITY_OF_FOO_REQUIRED_TO_BUY_ROBOT);
    if (this.factory.hasEnoughFoo(fooRequired) && this.factory.hasEnoughMoney(Robot.ROBOT_RETAIL_PRICE)) {
      this.factory.takeFoo(fooRequired);
      this.factory.withdrawMoney(Robot.ROBOT_RETAIL_PRICE);
      this.factory.addNewRobot();
    }
    this.operationCompleted();
  }

  async moveToIfNeeded(workstationToMoveTo: Workstation) {
    if (this._currentWorkstation != workstationToMoveTo) {
      this.factory.emit(FactoryEvents.RobotMoving, this, workstationToMoveTo);

      this._currentWorkstation = Workstation.Moving;
      await wait(Robot.MOVE_DURATION_IN_MS);

      this._currentWorkstation = workstationToMoveTo;
    }
  }

  private async _mineFoo() {
    await wait(Robot.FOO_MINING_DURATION_IN_MS);
    return new FooQuantity(Robot.QUANTIY_OF_FOO_PER_MINING_OPERATION);
  }

  private async _mineBar() {
    const miningDuration = getRandomIntInclusive(
      Robot.BAR_MINING_DURATION_MIN_IN_MS,
      Robot.BAR_MINING_DURATION_MAX_IN_MS,
    );
    await wait(miningDuration);
    return new BarQuantity(Robot.QUANTIY_OF_BAR_PER_MINING_OPERATION);
  }

  /***
   * Craft a Foobar with a chance of success
   * @returns {boolean} true if success
   */
  private async _craftFoobar() {
    await wait(Robot.FOOBAR_CRAFTING_DURATION_IN_MS);
    return Math.random() <= Robot.FOOBAR_CRAFTING_CHANCES;
  }
}
