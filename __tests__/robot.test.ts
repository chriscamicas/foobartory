import { Factory } from '../src/factory';
import { mocked, MockedObjectDeep, MockedFunction } from 'jest-mock';
import { Robot } from '../src/robot';
import { wait } from '../src/wait';
import { Workstation } from '../src/workstation';
import { Stock } from '../src/stock/stock';
import { FooQuantity } from '../src/stock/foo-quantity';
import { BarQuantity } from '../src/stock/bar-quantity';
import { FoobarQuantity } from '../src/stock/foobar-quantity';
import { BankAccount } from '../src/bank-account';
import { WORLD_SPEED, FOOBAR_SELLING_PRICE } from '../src/world-parameters';

jest.mock('../src/stock/stock');
jest.mock('../src/bank-account');
jest.mock('../src/factory');
jest.mock('../src/wait');
jest.mock('../src/math/random-between');

let mockedBankAccount: MockedObjectDeep<typeof BankAccount>;
let mockedStock: MockedObjectDeep<typeof Stock>;
let mockedFactory: MockedObjectDeep<typeof Factory>;
let mockedWait: MockedFunction<(ms: number) => Promise<unknown>>;

describe('Robot', () => {
  let factory: Factory;
  let robot: Robot;

  beforeAll(async () => {
    mockedBankAccount = mocked(BankAccount, true);
    mockedStock = mocked(Stock, true);
    mockedFactory = mocked(Factory, true);

    mockedWait = mocked(wait);
  });

  beforeEach(() => {
    mockedBankAccount.mockClear();
    mockedStock.mockClear();
    mockedFactory.mockClear();
    mockedWait.mockClear();

    const fooStock = new Stock(FooQuantity);
    const barStock = new Stock(BarQuantity);
    const foobarStock = new Stock(FoobarQuantity);
    const bankAccount = new BankAccount();
    factory = new Factory(fooStock, barStock, foobarStock, bankAccount);

    robot = new Robot(factory);
  });

  it('mine foo', async () => {
    await robot.mineAndStoreFoo();

    expect(factory.storeFoo).toHaveBeenCalledWith(new FooQuantity(1));
    expect(mockedWait).toHaveBeenCalledWith(1000 / WORLD_SPEED);
  });

  it('mine bar', async () => {
    await robot.mineAndStoreBar();

    expect(factory.storeBar).toHaveBeenCalledWith(new BarQuantity(1));
    expect(mockedWait).toHaveBeenCalledWith(5000 / WORLD_SPEED);
  });

  it('move to workstation', async () => {
    await robot.moveToIfNeeded(Workstation.SellingFoobar);

    expect(robot.currentWorkstation).toBe(Workstation.SellingFoobar);
    expect(mockedWait).toHaveBeenCalledWith(5000 / WORLD_SPEED);
  });

  it('craft foobar successfully', async () => {
    // setup mock factory to have enought stock
    jest.spyOn(factory, 'hasEnoughFoo').mockReturnValue(true);
    jest.spyOn(factory, 'hasEnoughBar').mockReturnValue(true);

    // mock to always succeed (cast needed to mock a private method)
    (<any>robot)._craftFoobar = jest.fn(() => {
      return true;
    });

    await robot.craftAndStoreFoobar();

    expect(factory.takeFoo).toHaveBeenCalledWith(new FooQuantity(1));
    expect(factory.takeBar).toHaveBeenCalledWith(new BarQuantity(1));
    expect(factory.storeFoobar).toHaveBeenCalledWith(new FoobarQuantity(1));

    jest.spyOn(factory, 'hasEnoughFoo').mockRestore();
    jest.spyOn(factory, 'hasEnoughBar').mockRestore();
  });

  it('craft foobar unsuccessfully', async () => {
    // setup mock factory to have enought stock
    jest.spyOn(factory, 'hasEnoughFoo').mockReturnValue(true);
    jest.spyOn(factory, 'hasEnoughBar').mockReturnValue(true);

    // mock to always fail (cast needed to mock a private method)
    (<any>robot)._craftFoobar = jest.fn(() => {
      return false;
    });

    await robot.craftAndStoreFoobar();

    expect(factory.takeFoo).toHaveBeenCalledWith(new FooQuantity(1));
    expect(factory.takeBar).toHaveBeenCalledWith(new BarQuantity(1));
    expect(factory.storeFoobar).not.toHaveBeenCalled();
    expect(factory.storeBar).toHaveBeenCalledWith(new BarQuantity(1));
    expect(factory.storeFoo).not.toHaveBeenCalled();

    jest.spyOn(factory, 'hasEnoughFoo').mockRestore();
    jest.spyOn(factory, 'hasEnoughBar').mockRestore();
  });

  it('sell foobar', async () => {
    // mock private property to have enought stock
    Object.defineProperty(factory, 'foobarQuantityAvailableInStock', { get: () => {
      return new FoobarQuantity(5);
    } });

    await robot.sellFoobar(new FoobarQuantity(5));

    expect(factory.takeFoobar).toHaveBeenCalledWith(new FoobarQuantity(5));
    expect(factory.makeDeposit).toHaveBeenCalledWith(FOOBAR_SELLING_PRICE);
    expect(mockedWait).toHaveBeenCalledWith(10000 / WORLD_SPEED);
    expect(factory.makeDeposit).toHaveBeenCalledWith(1);

  });

  it('buy robot', async () => {
    // setup mock factory to have enought stock
    jest.spyOn(factory, 'hasEnoughFoo').mockReturnValue(true);
    jest.spyOn(factory, 'hasEnoughMoney').mockReturnValue(true);

    await robot.buyNewRobot();

    expect(factory.takeFoo).toHaveBeenCalledWith(new FooQuantity(6));
    expect(factory.withdrawMoney).toHaveBeenCalledWith(Robot.ROBOT_RETAIL_PRICE);
    expect(factory.addNewRobot).toHaveBeenCalled();

    jest.spyOn(factory, 'hasEnoughFoo').mockRestore();
    jest.spyOn(factory, 'hasEnoughMoney').mockRestore();
  });

});
