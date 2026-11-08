import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { prepareScenarioData } from '../generated/public-data.js';
import { createFirebaseReader } from '../public-data-service.js';
import { createScenarioRunner } from '../scenario-service.mjs';

const read = createFirebaseReader('https://ligamx-b16f7-default-rtdb.firebaseio.com');
const [matches, teams] = await Promise.all([read('matches'), read('teams')]);
const snapshot = prepareScenarioData(matches, teams);
const run = createScenarioRunner({ includeEvidence: true });
const started = performance.now();
const report = await run(snapshot);
await mkdir('.firebase/liga-mcp-scenarios', { recursive: true });
await writeFile('.firebase/liga-mcp-scenarios/snapshot.json', JSON.stringify(snapshot, null, 2));
await writeFile('.firebase/liga-mcp-scenarios/benchmark.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ estado: report.estado, durationMs: Math.round(performance.now() - started), checks: report.comprobaciones,
  candidatosIniciales: snapshot.candidatos.length, candidatosActuales: report.candidatos.length, pendientes: snapshot.pendientes.length,
  casos: report.equipos.reduce((n, t) => n + t.casos.length, 0), sinVerificar: report.casosPendientes?.length,
  warnings: report.advertencias,
  equipos: report.equipos.map(t => ({ equipo: t.equipo, casos: t.casos.map(c => [c.puntosSumados, c.estado]) })),
}));
assert.equal(report.estado, 'completo');
assert.ok(report.duracionAnalisisMs <= 20_000);
