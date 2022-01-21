import { Factory, FactoryEvents } from './factory';
import { Stock } from './stock/stock';
import { FooQuantity } from './stock/foo-quantity';
import { BarQuantity } from './stock/bar-quantity';
import { FoobarQuantity } from './stock/foobar-quantity';
import { BankAccount } from './bank-account';
import { Workstation } from './workstation';
import { Clock } from './clock';
// import { BasicStrategy } from './strategy';
import { TfStrategy } from './tf-strategy';

async function startFoobartory() {

  const fooStock = new Stock(FooQuantity);
  const barStock = new Stock(BarQuantity);
  const foobarStock = new Stock(FoobarQuantity);
  const bankAccount = new BankAccount();
  const clock = new Clock();

  const factory = new Factory(fooStock, barStock, foobarStock, bankAccount, clock);
  // const strategy = new BasicStrategy(factory);
  const strategy = new TfStrategy(factory);
  await strategy.initialize();

  // Console UI
  factory.on(FactoryEvents.RobotAvailable, (robot) => {
    console.log(`robot ${robot.name} available`);
  });
  factory.on(FactoryEvents.RobotBusy, (robot, workstation) => {
    console.log(`robot ${robot.name} assigned to ${Workstation[workstation]}`);
  });
  factory.on(FactoryEvents.RobotMoving, (robot, destinationWorkstation) => {
    console.log(`robot ${robot.name} moving from ${Workstation[robot.currentWorkstation]} to ${Workstation[destinationWorkstation]}`);
  });
  factory.on(FactoryEvents.BarStockAvailable, () => console.table(factory.status));
  factory.on(FactoryEvents.FooStockAvailable, () => console.table(factory.status));
  factory.on(FactoryEvents.FoobarStockAvailable, () => console.table(factory.status));
  factory.on(FactoryEvents.MoneyDeposit, () => console.table(factory.status));


  try {
    const result = await strategy.runUntilWin();
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}

startFoobartory();
