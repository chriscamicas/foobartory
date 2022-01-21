import { Factory, FactoryEvents } from './factory';
import { Robot } from './robot';
import { ProductionStrategy } from './strategy';

import * as tf from '@tensorflow/tfjs-node-gpu';
import path = require('path');

export interface InitializeArgs {
  strategyToCopy?: TfStrategy;
  modelPathToLoad?: string;
}

export class TfStrategy extends ProductionStrategy {
  private model: tf.Sequential;

  constructor(factory: Factory) {
    super(factory);
    this.factory.on(FactoryEvents.RobotAvailable, (robot) => {
      setTimeout((robot) => this.assignRobot(robot), 0, robot);
    }); // needed to free up the EventLoop
  }

  get state() {
    return {
      name: this.name,
      foo: this.factory.fooQuantityAvailableInStock.toNumber(),
      bar: this.factory.barQuantityAvailableInStock.toNumber(),
      foobar: this.factory.foobarQuantityAvailableInStock.toNumber(),
      balance: this.factory.balance,
      robots: this.factory.robots.length,
      score: this.score,
      time: this.factory.clock.getCumulativeTimeSpent(),
    };
  }

  assignRobot(robot: Robot) {
    if (this.stopAllOperation) return;

    // Divide by 100 to normalize
    const state = [
      this.factory.fooQuantityAvailableInStock.toNumber() / 100,
      this.factory.barQuantityAvailableInStock.toNumber() / 100,
      this.factory.foobarQuantityAvailableInStock.toNumber() / 100,
      this.factory.balance / 100,
      this.factory.robots.length / 100,
      robot.currentWorkstation,
    ];

    let operation = 0;
    const outputs = this.predict(state);
    let maxValue = 0;
    outputs.length;
    for (let actionTemp = 0; actionTemp < outputs.length; actionTemp++) {
      const value = outputs[actionTemp];
      if (value > maxValue) {
        maxValue = value;
        operation = actionTemp;
      }
    }
    // const operation = getRandomIntInclusive(1, 5);
    switch (operation) {
      case 0:
        robot.mineAndStoreBar();
        break;
      case 1:
        robot.mineAndStoreFoo();
        break;
      case 2:
        robot.craftAndStoreFoobar();
        break;
      case 3:
        robot.sellFoobar(this.factory.foobarQuantityAvailableInStock);
        break;
      case 4:
        robot.buyNewRobot();
        break;
    }
  }

  public get score() {
    // return this.factory.clock.getCumulativeTimeSpent();

    // return this.factory.robots.length;
    if (this.factory.robots.length >= 30) {
      return 100 * 1000 * 1000 - this.factory.clock.getCumulativeTimeSpent();
    }

    return (
      this.factory.robots.length * 100 * 1000 +
      this.factory.balance * 10 * 1000 +
      this.factory.foobarQuantityAvailableInStock.toNumber() * 1000 +
      this.factory.barQuantityAvailableInStock.toNumber() * 100 +
      this.factory.fooQuantityAvailableInStock.toNumber() * 1
    );
  }

  async loadModel(modelPath: string) {
    const model = (await tf.loadLayersModel('file://' + modelPath + '/model.json')) as tf.Sequential;
    this.useModel(model);
  }
  async initialize() {
    await super.initialize();
    const modelPath = path.join(__dirname, '../../model');
    await this.initializeModel({ modelPathToLoad: modelPath });
  }

  async initializeModel(options: InitializeArgs) {
    if (options.modelPathToLoad) {
      await this.loadModel(options.modelPathToLoad);
    } else {
      this.model = tf.sequential();
      // 6 inputs = factory state + robot current workstation
      // 1 hidden layer with 16 nodes
      this.model.add(
        tf.layers.dense({ biasInitializer: 'randomNormal', units: 16, inputShape: [6], activation: 'relu6' }),
      );
      // 5 outputs = possible operations (mineBar, mineFoo, carftFoobar, sellFoobar, buyRobot)

      // softmax function will do 2 things:
      // 1. convert all scores to probabilities.
      // 2. sum of all probabilities is 1.
      this.model.add(tf.layers.dense({ biasInitializer: 'randomNormal', units: 5, activation: 'softmax' }));

      // Copy weights from existing Strategy
      if (options.strategyToCopy) {
        tf.tidy(() => {
          const weights = options.strategyToCopy.model.getWeights();
          this.model.setWeights(weights);
        });
      }
    }
  }

  useModel(model: tf.Sequential) {
    this.model = model;
  }

  dispose() {
    this.model.dispose();
  }
  predict(state: number[]) {
    // tf.tidy(() => {
    const distTensor = tf.tensor2d([state]);
    const predictions = this.model.predict(distTensor) as tf.Tensor<tf.Rank>;
    const outputs = predictions.dataSync();
    distTensor.dispose();
    predictions.dispose();
    // })
    return outputs;
  }
  async predictAsync(state: number[]) {
    const distTensor = tf.tensor2d([state]);
    const predictions = this.model.predict(distTensor) as tf.Tensor<tf.Rank>;
    const outputs = await predictions.data();
    distTensor.dispose();
    predictions.dispose();
    return outputs;
  }

  // copy() {
  //   let newBrain = new TfStrategy(this.factory);
  //   tf.tidy(() => {
  //     const weights = this.model.getWeights();
  //     newBrain.model.setWeights(weights);
  //   });
  //   return newBrain;
  // }

  mutate(rate = 0.1) {
    let nbOfMutations = 0;
    tf.tidy(() => {
      const weights = this.model.getWeights();
      const mutatedWeights = [];
      for (let i = 0; i < weights.length; i++) {
        const tensor = weights[i];
        const shape = weights[i].shape;
        const values = tensor.dataSync().slice();
        for (let j = 0; j < values.length; j++) {
          if (Math.random() < rate) {
            const mutated = tf.randomNormal([1]).dataSync()[0]; //actual mutation
            values[j] = mutated;
            nbOfMutations++;
          }
        }
        const newTensor = tf.tensor(values, shape);
        mutatedWeights[i] = newTensor;
      }
      this.model.setWeights(mutatedWeights);
    });
    return nbOfMutations;
  }

  crossover(otherStrategy: TfStrategy) {
    //keep half of our weights, use other half from the other brain
    tf.tidy(() => {
      const myWeights = this.model.getWeights();
      const otherWeights = otherStrategy.model.getWeights();

      const newWeights = [];
      for (let i = 0; i < myWeights.length; i++) {
        const myTensor = myWeights[i];
        const otherTensor = otherWeights[i];
        const shape = myWeights[i].shape;
        let myValues = myTensor.dataSync().slice();
        const otherValues = otherTensor.dataSync().slice();

        myValues = this.oneOutOfTwoCrossover(myValues, otherValues);

        const newTensor = tf.tensor(myValues, shape);
        newWeights[i] = newTensor;
      }
      this.model.setWeights(newWeights);
    });
  }
  oneOutOfTwoCrossover(
    myValues: Float32Array | Int32Array | Uint8Array,
    otherValues: Float32Array | Int32Array | Uint8Array,
  ) {
    for (let j = 0; j < myValues.length; j++) {
      if (j % 2 === 0) myValues[j] = otherValues[j];
    }
    return myValues;
  }

  run(timeoutInMs: number) {
    const promiseTimeout = new Promise<string>((resolve) => {
      setTimeout(resolve, timeoutInMs, `${this.name} => timeout !!!`);
    });
    // const promiseWin = new Promise<string>((resolve) => {
    //   setTimeout(resolve, timeoutInMs * 10, `${this.name} => win !!!`);
    // });
    const promiseWin = new Promise<string>((resolve) => {
      this.factory.on(FactoryEvents.NewRobotBought, () => {
        if (this.factory.robots.length >= 30) {
          this.stop();
          resolve(`${this.name} => victory in ${this.factory.clock.getCumulativeTimeSpent()}`);
        }
      });
    });
    this.factory.start();
    return Promise.race([promiseTimeout, promiseWin]);
  }

  save(path: string) {
    return this.model.save(path);
  }
}
