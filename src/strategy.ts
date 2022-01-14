import { Factory, FactoryEvents } from './factory';
import { getRandomIntInclusive } from './math/random-between';
import { Robot } from './robot';
import { BarQuantity } from './stock/bar-quantity';
import { FooQuantity } from './stock/foo-quantity';
import {
  QUANTITY_OF_BAR_REQUIRED_TO_CRAFT_FOOBAR,
  QUANTITY_OF_FOO_REQUIRED_TO_BUY_ROBOT,
  QUANTITY_OF_FOO_REQUIRED_TO_CRAFT_FOOBAR,
} from './world-parameters';

export abstract class ProductionStrategy {
  private _stopAllOperation = false;

  constructor(protected factory: Factory) {
  }

  get stopAllOperation() {
    return this._stopAllOperation;
  }
  async runUntilWin() {
    this.factory.start();
    return new Promise<string>((resolve) => {
      this.factory.on(FactoryEvents.NewRobotBought, () => {
        if (this.factory.robots.length >= 30){
          this._stopAllOperation = true;
          resolve('victory !');
        }
      });
    });
  }
}

export class BasicStrategy extends ProductionStrategy {

  constructor(factory: Factory) {
    super(factory);
    this.factory.on(FactoryEvents.RobotAvailable, (robot) => this.assignRobot(robot));
  }

  /**
   * The strategy is simple
   * - if enough money => buy a new robot
   * - if enough foobar (>=5) => sell foobar
   * - if enough foo and bar => craft foobar
   * - else go mine foo or bar randomly
   */
  async assignRobot(robot: Robot) {
    if(this.stopAllOperation) return;

    const fooRequiredToBuyARobot = new FooQuantity(QUANTITY_OF_FOO_REQUIRED_TO_BUY_ROBOT);

    if (this.factory.hasEnoughFoo(fooRequiredToBuyARobot) && this.factory.hasEnoughMoney(Robot.ROBOT_RETAIL_PRICE)) {
      await robot.buyNewRobot();
    } else if (this.factory.foobarQuantityAvailableInStock.toNumber() >= 5) {
      await robot.sellFoobar(this.factory.foobarQuantityAvailableInStock);
    } else if (Math.random() < 0.5) {
      await robot.mineAndStoreFoo();
    } else if (
      this.factory.hasEnoughFoo(new FooQuantity(QUANTITY_OF_FOO_REQUIRED_TO_CRAFT_FOOBAR)) &&
      this.factory.hasEnoughBar(new BarQuantity(QUANTITY_OF_BAR_REQUIRED_TO_CRAFT_FOOBAR))
    ) {
      await robot.craftAndStoreFoobar();
    } else {
      await robot.mineAndStoreBar();
    }
  }
}


export class RandomStrategy extends ProductionStrategy {

  constructor(factory: Factory) {
    super(factory);
    this.factory.on(FactoryEvents.RobotAvailable, (robot) => this.assignRobot(robot));
  }

  /**
   * The strategy is random
   * - pick a number between 1 and 5 included, and assign the robot to the corresponding operation
   */
  async assignRobot(robot: Robot) {
    if(this.stopAllOperation) return;

    const operation = getRandomIntInclusive(1, 5);
    switch(operation) {
      case 1:
        await robot.mineAndStoreBar();
        break;
      case 2:
        await robot.mineAndStoreFoo();
        break;
      case 3:
        await robot.craftAndStoreFoobar();
        break;
      case 4:
        await robot.sellFoobar(this.factory.foobarQuantityAvailableInStock);
        break;
      case 5:
        await robot.buyNewRobot();
        break;
    }
  }
}
