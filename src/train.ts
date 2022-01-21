import { Factory, FactoryEvents } from './factory';
import { Stock } from './stock/stock';
import { FooQuantity } from './stock/foo-quantity';
import { BarQuantity } from './stock/bar-quantity';
import { FoobarQuantity } from './stock/foobar-quantity';
import { BankAccount } from './bank-account';
import { TfStrategy } from './tf-strategy';
import { getRandomIntInclusive } from './math/random-between';
import { Clock } from './clock';
import { Workstation } from './workstation';
import path = require('path');
import fs = require('fs');
import { getYesNo } from 'cli-interact';

const POPULATION_SIZE = 30;
const BEST_POPULATION_RATE_TO_KEEP = 0.1;
const MUTATION_RATE = 0.05;
const TRAINING_ITERATION_TIMEOUT = 5 * 1000;
const DEBUG_TRAINING = false;

let population: TfStrategy[] = [];
let gen = 0;
let stop = false;
const modelPath = path.join(__dirname, '../../model');

function createIndividual(strategyToCopy?: TfStrategy) {
  const fooStock = new Stock(FooQuantity);
  const barStock = new Stock(BarQuantity);
  const foobarStock = new Stock(FoobarQuantity);
  const bankAccount = new BankAccount();
  const clock = new Clock();

  const factory = new Factory(fooStock, barStock, foobarStock, bankAccount, clock);
  const strategy = new TfStrategy(factory);
  strategy.initializeModel({ strategyToCopy: strategyToCopy });

  //
  if (DEBUG_TRAINING) {
    factory.on(FactoryEvents.RobotAvailable, (robot) => {
      console.log(`robot ${robot.name} available`);
    });
    factory.on(FactoryEvents.RobotBusy, (robot, workstation) => {
      console.log(`robot ${robot.name} assigned to ${Workstation[workstation]}`);
    });
    factory.on(FactoryEvents.RobotMoving, (robot, destinationWorkstation) => {
      console.log(
        `robot ${robot.name} moving from ${Workstation[robot.currentWorkstation]} to ${
          Workstation[destinationWorkstation]
        }`,
      );
    });
    factory.on(FactoryEvents.BarStockAvailable, () => console.table(factory.status));
    factory.on(FactoryEvents.FooStockAvailable, () => console.table(factory.status));
    factory.on(FactoryEvents.FoobarStockAvailable, () => console.table(factory.status));
    factory.on(FactoryEvents.MoneyDeposit, () => console.table(factory.status));
  }
  //

  return strategy;
}

function createNewGeneration() {
  console.log(`Creating generation #${++gen}...`);

  if (population.length === 0) {
    for (let i = 0; i < POPULATION_SIZE; i++) {
      const individual = createIndividual();
      population.push(individual);
    }
  } else if (population.length === 1) {
    // last best model loaded
    const best = population[0];
    for (let i = 1; i < POPULATION_SIZE; i++) {
      const newIndividual = createIndividual(best);
      newIndividual.mutate(0.03); // lower mutation rate at beginning (try to converge faster)
      population.push(newIndividual);
    }
  } else {
    const newGen = [];
    const newGenStats = [];

    // keep the 10% best individuals as possible parents
    const topNumber = Math.floor(population.length * BEST_POPULATION_RATE_TO_KEEP);
    const bestStrategies = population.sort((a, b) => b.score - a.score).slice(0, topNumber);

    const totalFitness = bestStrategies.reduce((acc, individual) => acc + individual.score, 0);

    for (const ancestor of bestStrategies) {
      const newStrategy = createIndividual(ancestor);
      newStrategy.name = ancestor.name;
      newGenStats.push({
        name: newStrategy.name,
        status: 'clone',
      });
      newGen.push(newStrategy);
    }

    // Roulette Wheel Selection the next parents
    while (newGen.length < POPULATION_SIZE) {
      //Pick a pair
      const pickA = getRandomIntInclusive(0, totalFitness - 1);
      const parentA = roulettePick(bestStrategies, pickA);
      let parentB;
      do {
        const pickB = getRandomIntInclusive(0, totalFitness - 1);
        parentB = roulettePick(bestStrategies, pickB);
      } while (parentB.name == parentA.name);

      // Crossover and mutation
      const child = createIndividual(parentA);
      child.crossover(parentB);
      const nbOfMutations = child.mutate(MUTATION_RATE);
      newGen.push(child);
      newGenStats.push({
        name: child.name,
        status: 'child',
        parentA: parentA.name,
        parentB: parentB.name,
        mutations: nbOfMutations,
      });
    }

    // Dispose old gen
    for (const individual of population) individual.dispose();

    population = newGen;
    console.table(newGenStats);
  }
}

function roulettePick(parents: TfStrategy[], pick: number) {
  let current = 0;
  for (const parent of parents) {
    current += parent.score;
    if (current > pick) {
      return parent;
    }
  }
  return null;
}

async function startGeneration() {
  createNewGeneration();

  console.log(`Running simulation #${gen}...`);

  const promiseTimeout = new Promise<string>((resolve) => {
    setTimeout(resolve, TRAINING_ITERATION_TIMEOUT, `!!! timeout !!!`);
  });

  const promises: Promise<string>[] = [];
  for (const individual of population) {
    promises.push(individual.runUntilWin());
  }
  promises.push(promiseTimeout);

  // Run all strategy simultaneously
  // Stop if timeout is reached
  await Promise.race(promises);
  // const exitCode = await Promise.race(promises);
  // console.table(exitCode);

  for (const individual of population) {
    individual.stop();
  }

  console.log(`Simulation #${gen} done, best individuals are:`);

  const topResults = population
    .map((individual) => individual.state)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  console.table(topResults);
}

// Using a single function to handle multiple signals
async function handle(signal: string) {
  console.log(`Received ${signal}`);
  console.log(`Stopping at the end of the current simulation...`);
  stop = true;
}

process.on('SIGINT', handle);
// process.on('SIGTERM', handle);

async function saveBest() {
  const bests = population.sort((a, b) => b.score - a.score);
  const best = bests[0];

  console.log(`Saving ${best.name} to ${modelPath}`);
  await best.save('file://' + modelPath);
}

async function loadModel() {
  if (!fs.existsSync(modelPath)) {
    console.log('No previous model found');
    return;
  }
  const newIndividual = createIndividual();
  await newIndividual.loadModel(modelPath);

  // tf.tidy(() => {
  //   const weights = model.getWeights();
  //   for (let i = 0; i < weights.length; i++) {
  //     console.table(weights[i].dataSync());
  //   }
  // });

  population.push(newIndividual);
}

(async () => {
  // load last best model
  const wantToLoad = getYesNo('Do you want to load the latest best strategy ?');
  if (wantToLoad) {
    console.log('Loading last best model');
    await loadModel();
    console.log('Model loaded successfully');
  }

  while (!stop) {
    await startGeneration();
  }
  console.log('Saving best model');
  const wantToSave = getYesNo('Do you want to save the best strategy ?');
  if (wantToSave) await saveBest();
  console.log('Saving done');
})();
