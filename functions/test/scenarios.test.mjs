import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { after, before, test } from 'node:test';
import { init, killThreads } from 'z3-solver';
import { prepareScenarioData, pointBalances, goalThresholds, createPublicData } from '../generated/public-data.js';
import { solveScenarios, verifyWitness } from '../scenario-solver.mjs';
import { createScenarioRunner } from '../scenario-service.mjs';
import { createPublicDataLoader } from '../public-data-service.js';

let api;
before(async () => { api = await init(); });
after(async () => { if (api) await killThreads(api.em); });

function snapshot(rows, games, slots = 2, flags = {}) {
  const table = rows.map(([equipo, pts, dg = 0, gf = Math.max(10, dg)], index) => ({
    equipo, pts, dg, gf, gc: gf - dg, jj: 15, jg: 0, je: 0, jp: 0, posicion: index + 1,
  }));
  const names = table.map(row => row.equipo);
  const remaining = Object.fromEntries(names.map(name => [name, games.filter(g => g.local === name || g.visitante === name).length]));
  const qualified = flags.qualified ?? [], eliminated = flags.eliminated ?? [];
  const candidates = names.filter(name => !qualified.includes(name) && !eliminated.includes(name));
  return { estado: 'listo', tipo: 'escenarios', consultadoEn: '2026-11-01T23:00:00.000Z',
    plazasTotales: slots, plazasDisponibles: slots - qualified.length, tablaBase: table,
    clasificadosAsegurados: qualified, eliminadosAsegurados: eliminated, candidatos: candidates,
    pendientes: games, restantesPorEquipo: remaining, cobertura: {}, advertencias: [],
    equipos: table.filter(row => candidates.includes(row.equipo)).map(team => ({
      equipo: team.equipo, puntosActuales: team.pts, diferenciaActual: team.dg, partidosRestantes: remaining[team.equipo],
      casos: pointBalances(remaining[team.equipo]).map(row => ({ ...row, puntosFinales: team.pts + row.puntosSumados, estado: 'no_verificado' })),
      condicionesDesempate: table.filter(row => row !== team).map(rival => goalThresholds(team, rival)),
    })),
  };
}
const game = (idMatch, local, visitante) => ({ idMatch, local, visitante, estado: 'scheduled' });
async function analyze(data, options = {}) {
  const results = structuredClone(data);
  let valid = false;
  const invalid = [];
  const proof = [];
  await solveScenarios(api, data, { deadline: performance.now() + 15_000, ...options, emit: message => {
    if (message.type === 'verified') valid = true;
    if (message.type === 'invalid') invalid.push(message.motivo);
    if (message.type === 'case') {
      results.equipos[message.teamIndex].casos[message.caseIndex] = message.value;
      proof.push({ team: results.equipos[message.teamIndex].equipo, value: message.value, evidence: message.evidence });
    }
  } });
  return { results, proof, valid, invalid };
}

test('balances por puntos agrupan victorias/empates/derrotas sin inventar sumas', () => {
  assert.deepEqual(pointBalances(2).map(row => row.puntosSumados), [6, 4, 3, 2, 1, 0]);
  assert.deepEqual(pointBalances(3).find(row => row.puntosSumados === 3).balances,
    [{ victorias: 0, empates: 3, derrotas: 0 }, { victorias: 1, empates: 0, derrotas: 2 }]);
});

test('umbral +3 acumulado y segunda condición de goles a favor conservan los supuestos', () => {
  const threshold = goalThresholds({ equipo: 'Pachuca', dg: -2, gf: 20 }, { equipo: 'Santos', dg: 0, gf: 22 });
  assert.equal(threshold.diferenciaSobreSaldoFuturoRival, 3);
  assert.equal(threshold.golesAFavorSobreGolesFuturosRivalSiIgualanDG, 3);
  assert.ok(-2 + 3 > 0); // Dos victorias 2–0 y 1–0.
  assert.equal(-2 + 2, 0); // Dos 1–0 requieren resolver GF.
  assert.ok(!(-2 + 3 > 0 + 2)); // Si Santos mejora +2, +3 ya no basta.
});

test('dos victorias con margen acumulado +3 se prueban en el modelo y se presentan con el supuesto del rival', async () => {
  const data = snapshot([['Pachuca', 0, -2, 20], ['Santos', 6, 0, 22], ['C', 0], ['D', 0]],
    [game(1, 'Pachuca', 'C'), game(2, 'Pachuca', 'D')], 1);
  const open = await analyze(data);
  const row = open.results.equipos[0].casos.find(row => row.puntosSumados === 6);
  const example = row.ejemplosDesempate.find(example => example.rival === 'Santos');
  assert.deepEqual(example.supuesto, { puntosFinalesIguales: 6, saldoFuturoRival: 0 });
  assert.equal(example.margenAcumuladoPropioParaSuperarPorDG, 3);
  assert.equal(example.margenAcumuladoPropioParaIgualarDG, 2);
  assert.equal(example.diferenciaFinalRival, 0);
  assert.equal(example.diferenciaFinalPropiaConUmbral, 1);
  assert.equal(example.golesFuturosPropiosSobreRivalSiIgualanDG, 3);
  assert.match(example.explicacion, /margen acumulado >= 3/);
  const withMargin = await analyze(data, { constraintsForTest: (ctx, games, teams) => [teams.get('Pachuca').finalDG.ge(1)] });
  assert.equal(withMargin.results.equipos[0].casos.find(row => row.puntosSumados === 6).estado, 'asegura_su_lugar');
});

test('enfrentamiento directo acoplado impide que dos rivales sumen tres puntos del mismo partido', async () => {
  const data = snapshot([['A', 11], ['B', 9], ['C', 9]], [game(1, 'B', 'C')], 2);
  const output = await analyze(data);
  const row = output.results.equipos.find(team => team.equipo === 'A').casos[0];
  assert.equal(row.estado, 'asegura_su_lugar');
  assert.equal(row.verificacion.quedaFuera, 'unsat');
  assert.equal(output.valid, true);
});

test('partidos contra eliminados siguen afectando a candidatos y plazas de clasificados se ocupan', async () => {
  const data = snapshot([['Q', 40, 20], ['A', 20], ['B', 19], ['E', 0]], [game(1, 'B', 'E')], 2,
    { qualified: ['Q'], eliminated: ['E'] });
  const output = await analyze(data);
  assert.equal(output.valid, true);
  assert.deepEqual(output.invalid, []);
  const a = output.results.equipos.find(team => team.equipo === 'A').casos[0];
  assert.equal(a.estado, 'depende_de_otros_resultados');
  const evidence = output.proof.find(row => row.team === 'A').evidence;
  assert.ok(verifyWitness(data, evidence.clasifica, 'A', 'clasifica'));
  assert.ok(verifyWitness(data, evidence.quedaFuera, 'A', 'quedaFuera'));
  assert.equal(evidence.quedaFuera.marcadores[0][0], 1);
});

test('goladas sin límite artificial permiten remontar diferencias mayores de cincuenta goles', async () => {
  const data = snapshot([['A', 0, -100, 0], ['B', 3, 0, 10], ['C', 0, 0, 10]], [game(1, 'A', 'C')], 1);
  const output = await analyze(data);
  const proof = output.proof.find(row => row.team === 'A' && row.value.puntosSumados === 3);
  assert.equal(proof.value.estado, 'depende_de_otros_resultados');
  assert.ok(proof.evidence.clasifica.marcadores[0][1] - proof.evidence.clasifica.marcadores[0][2] >= 100);
  assert.ok(verifyWitness(data, proof.evidence.clasifica, 'A', 'clasifica'));
});

test('goles a favor resuelven DG igual, y empate total nunca usa orden alfabético como garantía', async () => {
  const decided = snapshot([['Z', 10, 0, 12], ['A', 10, 0, 11]], [], 1);
  const first = await analyze(decided);
  assert.equal(first.results.equipos[0].casos[0].estado, 'asegura_su_lugar');
  assert.equal(first.results.equipos[1].casos[0].estado, 'sin_opcion_bajo_este_caso');
  const tied = snapshot([['Z', 10, 0, 12], ['A', 10, 0, 12]], [], 1);
  const second = await analyze(tied);
  assert.ok(second.results.equipos.every(team => team.casos[0].estado === 'depende_de_otros_resultados'));
  assert.ok(second.results.equipos.every(team => team.casos[0].empateTotalPendienteEnTestigos));
});

test('el modelo rechaza exclusiones contradictorias en vez de cambiar banderas de la tabla', async () => {
  const data = snapshot([['Q', 0], ['A', 0]], [game(1, 'Q', 'A')], 1, { qualified: ['Q'] });
  const copy = structuredClone(data);
  const output = await analyze(data);
  assert.equal(output.valid, false);
  assert.equal(output.invalid.length, 1);
  assert.deepEqual(data, copy);
});

test('fixtures pequeños coinciden con enumeración exhaustiva independiente de marcadores', async () => {
  const data = snapshot([['A', 2, -1, 2], ['B', 2, 1, 3], ['C', 1, 0, 2]],
    [game(1, 'A', 'B'), game(2, 'B', 'C'), game(3, 'C', 'A')], 2);
  const possibilities = new Map();
  const enumerate = (index, table) => {
    if (index === data.pendientes.length) {
      for (const target of table) {
        const above = table.filter(row => row !== target && (row.pts > target.pts || row.pts === target.pts &&
          (row.dg > target.dg || row.dg === target.dg && row.gf > target.gf))).length;
        const ties = table.filter(row => row !== target && row.pts === target.pts && row.dg === target.dg && row.gf === target.gf).length;
        const key = `${target.equipo}:${target.pts}`;
        const value = possibilities.get(key) ?? { qualifies: false, fails: false };
        value.qualifies ||= above < 2;
        value.fails ||= above + ties >= 2;
        possibilities.set(key, value);
      }
      return;
    }
    const match = data.pendientes[index];
    for (let h = 0; h <= 2; h++) for (let a = 0; a <= 2; a++) {
      const next = structuredClone(table);
      const home = next.find(row => row.equipo === match.local), away = next.find(row => row.equipo === match.visitante);
      home.pts += h > a ? 3 : h === a ? 1 : 0; away.pts += a > h ? 3 : h === a ? 1 : 0;
      home.gf += h; away.gf += a; home.dg += h - a; away.dg += a - h;
      enumerate(index + 1, next);
    }
  };
  enumerate(0, structuredClone(data.tablaBase));
  const output = await analyze(data, { constraintsForTest: (ctx, games) => games.flatMap(game => [game.home.le(2), game.away.le(2)]) });
  for (const team of output.results.equipos) for (const row of team.casos) {
    const expected = possibilities.get(`${team.equipo}:${row.puntosFinales}`);
    const state = !expected.qualifies ? 'sin_opcion_bajo_este_caso' : !expected.fails ? 'asegura_su_lugar' : 'depende_de_otros_resultados';
    assert.equal(row.estado, state, `${team.equipo} sumando ${row.puntosSumados}`);
  }
  for (const proof of output.proof) for (const [kind, witness] of Object.entries(proof.evidence))
    if (witness) assert.ok(verifyWitness(data, witness, proof.team, kind));
});

test('los marcadores testigo reproducen puntos, DG y GF con el cálculo existente de la tabla', async () => {
  const data = snapshot([['A', 0, 0, 0], ['B', 0, 0, 0], ['C', 0, 0, 0]],
    [game(0, 'A', 'B'), game(1, 'B', 'C'), game(2, 'C', 'A')], 2);
  const output = await analyze(data);
  for (const proof of output.proof) for (const witness of Object.values(proof.evidence)) {
    if (!witness) continue;
    const matches = Object.fromEntries(witness.marcadores.map(([id, home, away], index) => [id, {
      ...data.pendientes[index], jornada: index + 1, golLocal: home, golVisitante: away,
      events: [{ type: 'phase', phase: 'fulltime' }],
    }]));
    const table = createPublicData({ format: 'json' }, matches, ['A', 'B', 'C']);
    for (const expected of witness.tabla) {
      const actual = table.posiciones.find(row => row.equipo === expected.equipo);
      for (const key of ['pts', 'dg', 'gf']) assert.equal(actual[key], expected[key]);
    }
  }
});

function calendar() {
  const teams = Array.from({ length: 18 }, (_, i) => `Equipo ${i}`);
  const matches = {};
  const circle = [...teams];
  for (let round = 0; round < 17; round++) {
    for (let pair = 0; pair < 9; pair++) matches[round * 9 + pair] = {
      jornada: round + 1, local: circle[pair], visitante: circle[17 - pair],
      fecha: '2026/11/01', hora: '20:00', golLocal: 1, golVisitante: 0,
      events: [{ type: 'phase', phase: 'fulltime' }],
    };
    circle.splice(1, 0, circle.pop());
  }
  return { teams, matches };
}

test('base solo finalizada, aplazados/en vivo pendientes, cancelados excluidos y calendario validado', () => {
  const data = calendar();
  data.matches[0].events = [{ type: 'phase', phase: 'start' }];
  data.matches[0].golLocal = 999;
  data.matches[1].status = 'postponed';
  data.matches[2].status = 'cancelled';
  const stamp = new Date('2026-11-01T23:00:00.000Z');
  const base = prepareScenarioData(data.matches, data.teams, stamp);
  assert.equal(base.estado, 'listo');
  assert.equal(base.consultadoEn, stamp.toISOString());
  assert.equal(base.pendientes.length, 2);
  assert.equal(base.tablaBase.find(row => row.equipo === 'Equipo 0').gf, 16);
  const finalOnly = Object.fromEntries(Object.entries(data.matches).filter(([id]) => Number(id) > 2));
  const table = createPublicData({ format: 'json' }, finalOnly, data.teams, stamp);
  assert.deepEqual(base.tablaBase, table.posiciones.map(({ posicion, ...row }) => row));
  delete data.matches[100];
  assert.equal(prepareScenarioData(data.matches, data.teams).estado, 'no_verificable');
  const bad = calendar(); delete bad.matches[0].golLocal;
  assert.equal(prepareScenarioData(bad.matches, bad.teams).estado, 'no_verificable');
});

test('lector no consulta players y consultadoEn antecede al cálculo, sin reutilizar lecturas', async () => {
  const data = calendar(); const reads = []; let time = new Date('2026-11-01T23:00:00Z');
  const load = createPublicDataLoader(async path => { reads.push(path); return data[path]; }, {
    now: () => time, scenarioRunner: async report => { time = new Date(time.getTime() + 5000); return { ...report, calculatedAt: time.toISOString() }; },
  });
  const one = await load({ tipo: 'escenarios' }), two = await load({ tipo: 'escenarios' });
  assert.deepEqual(reads, ['matches', 'teams', 'matches', 'teams']);
  assert.ok(one.consultadoEn < one.calculatedAt);
  assert.ok(two.consultadoEn > one.consultadoEn);
});

function fakeWorker(action) {
  const worker = new EventEmitter(); worker.terminate = async () => { worker.terminated = true; };
  setImmediate(() => action(worker));
  return worker;
}
test('un solo worker, timeout parcial y fallo liberan el slot sin convertir unknown en eliminación', async () => {
  const data = snapshot([['A', 0], ['B', 0]], [game(1, 'A', 'B')], 1);
  let created;
  const run = createScenarioRunner({ budgetMs: 40, makeWorker: () => (created = fakeWorker(worker => worker.emit('message', { type: 'verified' }))) });
  const first = run(data);
  await assert.rejects(run(data), error => error.code === 'analysis_busy');
  const partial = await first;
  assert.equal(partial.estado, 'parcial');
  assert.ok(partial.equipos.every(team => team.casos.every(row => row.estado === 'no_verificado')));
  assert.equal(created.terminated, true);
  assert.equal((await run(data)).estado, 'parcial');
  let failed = true;
  const crash = createScenarioRunner({ makeWorker: () => fakeWorker(worker => {
    if (failed) worker.emit('error', new Error('private path and credentials'));
    else { worker.emit('message', { type: 'verified' }); worker.emit('message', { type: 'done', checks: 0 }); }
  }) });
  await assert.rejects(crash(data), error => error.code === 'analysis_unavailable' && !/private|credentials/.test(error.message));
  failed = false;
  assert.equal((await crash(data)).estado, 'parcial');
});

test('inicialización agotada y exclusiones no verificadas no publican conclusiones', async () => {
  const data = snapshot([['A', 0], ['B', 0]], [game(1, 'A', 'B')], 1);
  const run = createScenarioRunner({ budgetMs: 20, makeWorker: () => fakeWorker(() => {}) });
  assert.equal((await run(data)).estado, 'no_verificable');
  const invalid = createScenarioRunner({ makeWorker: () => fakeWorker(worker => worker.emit('message', { type: 'invalid', motivo: 'Exclusión contradictoria' })) });
  const result = await invalid(data);
  assert.equal(result.estado, 'no_verificable');
  assert.ok(result.advertencias.includes('Exclusión contradictoria'));
});

test('garantías adicionales probadas excluyen candidatos sin modificar la tabla existente', async () => {
  const data = snapshot([['A', 11], ['B', 9], ['C', 9]], [game(1, 'B', 'C')], 2);
  const original = structuredClone(data.tablaBase);
  const run = createScenarioRunner({ budgetMs: 10_000 });
  const result = await run(data);
  assert.equal(result.estado, 'completo');
  assert.ok(result.garantiasAdicionalesDelAnalisis.clasificados.includes('A'));
  assert.ok(!result.candidatos.includes('A'));
  assert.equal(result.plazasDisponibles, 1);
  assert.deepEqual(result.tablaBase, original);
});

test('condición conjunta indica cuántos rivales deben quedar detrás y no exige que todos pierdan', async () => {
  const data = snapshot([['Q', 40, 20], ['A', 20], ['B', 19], ['E', 0]], [game(1, 'B', 'E')], 2,
    { qualified: ['Q'], eliminated: ['E'] });
  const result = await createScenarioRunner()(data);
  const a = result.equipos.find(team => team.equipo === 'A').casos[0];
  assert.equal(a.condicionConjunta.caracter, 'suficiente');
  assert.equal(a.condicionConjunta.minimoRivalesDetras, 1);
  assert.deepEqual(a.condicionConjunta.rivales, [{ rival: 'B', maximoPuntosSumados: 0, empateSumando: 1 }]);
});
