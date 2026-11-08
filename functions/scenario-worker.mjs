import { parentPort, workerData } from 'node:worker_threads';
import { init, killThreads } from 'z3-solver';
import { solveScenarios } from './scenario-solver.mjs';

let api;
try {
  api = await init();
  const result = await solveScenarios(api, workerData.snapshot, {
    deadline: performance.now() + Math.max(0, workerData.budgetMs - (Date.now() - workerData.startedAt)),
    emit: message => parentPort.postMessage(message),
  });
  parentPort.postMessage({ type: 'done', ...result });
} catch {
  parentPort.postMessage({ type: 'failed' });
} finally {
  if (api) await killThreads(api.em);
  parentPort.close();
}
