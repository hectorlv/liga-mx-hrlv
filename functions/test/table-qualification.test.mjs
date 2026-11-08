import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { rollup } from 'rollup';
import esbuildModule from 'rollup-plugin-esbuild';
import { createPublicData, prepareScenarioData } from '../generated/public-data.js';

let calculateTable;
before(async () => {
  const esbuild = esbuildModule.default || esbuildModule;
  const bundle = await rollup({ input: 'src/utils/tableCalculator.ts', plugins: [esbuild({ tsconfig: 'tsconfig.json' })] });
  const { output } = await bundle.generate({ format: 'es' });
  await bundle.close();
  ({ calculateTable } = await import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`));
});

// Complete, coherent one-round league: lower-numbered clubs beat every club below them.
function season() {
  const teams = Array.from({ length: 18 }, (_, index) => `Equipo ${index}`);
  const matches = [], circle = [...teams];
  for (let round = 0; round < 17; round++) {
    for (let pair = 0; pair < 9; pair++) {
      const local = circle[pair], visitante = circle[17 - pair];
      const homeWins = teams.indexOf(local) < teams.indexOf(visitante);
      matches.push({ idMatch: matches.length, local, visitante, jornada: round + 1,
        estadio: 'Estadio', fecha: '2026/11/01', hora: '20:00',
        golLocal: homeWins ? 1 : 0, golVisitante: homeWins ? 0 : 1,
        events: [{ type: 'phase', phase: 'fulltime' }], lineupLocal: [], lineupVisitor: [] });
    }
    circle.splice(1, 0, circle.pop());
  }
  return { teams, matches };
}
function between(fixture, a, b) {
  return fixture.matches.find(match => [match.local, match.visitante].includes(fixture.teams[a]) &&
    [match.local, match.visitante].includes(fixture.teams[b]));
}
function score(fixture, a, b, gf, gc) {
  const match = between(fixture, a, b);
  [match.golLocal, match.golVisitante] = match.local === fixture.teams[a] ? [gf, gc] : [gc, gf];
  return match;
}
const table = fixture => calculateTable(fixture.teams, fixture.matches);
const row = (fixture, index) => table(fixture).find(team => team.equipo === fixture.teams[index]);
const qualified = fixture => table(fixture).filter(team => team.clasificado).map(team => team.equipo);
function cutoff() {
  const fixture = season();
  score(fixture, 7, 17, 0, 1); // Clubs 7 and 8 finish on 27 points, DG +1 and GF 9.
  return fixture;
}

test('siete rivales capaces de alcanzar al candidato permiten confirmar su plaza; ocho no', () => {
  const fixture = cutoff();
  const pending = between(fixture, 8, 17);
  pending.events = [];
  assert.equal(row(fixture, 7).pts, 27);
  assert.equal(row(fixture, 7).clasificado, false); // Seven leaders plus club 8 can reach 27.
  score(fixture, 8, 17, 0, 1);
  pending.events = [{ type: 'phase', phase: 'fulltime' }];
  assert.equal(row(fixture, 7).clasificado, true); // Club 8 ends on 24; only seven can reach 27.
});

test('un empate alcanzable en puntos sigue siendo riesgo aunque la DG actual sea muy superior', () => {
  const fixture = cutoff();
  score(fixture, 7, 16, 10_000, 0);
  between(fixture, 8, 17).events = [];
  assert.equal(row(fixture, 7).clasificado, false);
});

test('marcadores en vivo cambian estadísticas y orden pero no confirman una clasificación', () => {
  const fixture = cutoff();
  const pending = score(fixture, 8, 17, 0, 1);
  pending.events = [{ type: 'phase', phase: 'start' }];
  const first = table(fixture);
  assert.equal(row(fixture, 7).clasificado, false);
  score(fixture, 8, 17, 99, 0);
  const second = table(fixture);
  assert.notDeepEqual(first.map(team => [team.equipo, team.pts, team.dg]), second.map(team => [team.equipo, team.pts, team.dg]));
  assert.deepEqual(qualified(fixture), first.filter(team => team.clasificado).map(team => team.equipo));
  score(fixture, 8, 17, 0, 1);
  pending.events = [{ type: 'phase', phase: 'fulltime' }];
  assert.equal(row(fixture, 7).clasificado, true);
});

test('DG y GF definitivos resuelven el corte sin usar un desempate por orden de aparición', () => {
  const fixture = cutoff();
  assert.equal(row(fixture, 7).clasificado, false);
  assert.equal(row(fixture, 8).clasificado, false);
  score(fixture, 7, 16, 2, 0);
  assert.equal(row(fixture, 7).clasificado, true); // Better DG.
  score(fixture, 7, 16, 2, 1);
  assert.equal(row(fixture, 7).clasificado, true); // Same DG, more GF.
  score(fixture, 7, 16, 1, 0);
  assert.equal(row(fixture, 7).clasificado, false);
  fixture.teams.reverse();
  assert.ok(!qualified(fixture).includes('Equipo 7') && !qualified(fixture).includes('Equipo 8'));
});

test('un calendario incompleto no reduce los partidos que un rival podría jugar hasta llegar a 17', () => {
  const fixture = cutoff();
  const missing = between(fixture, 8, 17);
  fixture.matches = fixture.matches.filter(match => match !== missing);
  assert.equal(row(fixture, 7).clasificado, false);
  assert.equal(row(fixture, 0).clasificado, true);
});

test('finales sin marcador completo o con goles inválidos no confirman plazas', () => {
  for (const invalid of [null, undefined, -1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const fixture = season();
    fixture.matches[0].golLocal = invalid;
    assert.deepEqual(qualified(fixture), [], String(invalid));
  }
});

test('identidades, jornadas, oponentes y equipos inconsistentes no producen garantías', () => {
  const corruptions = [
    fixture => { fixture.matches[1].idMatch = fixture.matches[0].idMatch; },
    fixture => { fixture.matches[0].visitante = 'Equipo inexistente'; },
    fixture => { fixture.matches[0].visitante = fixture.matches[0].local; },
    fixture => { fixture.matches[0].jornada = 0; },
    fixture => { fixture.matches[0].jornada = 1.5; },
    fixture => { between(fixture, 0, 1).jornada = between(fixture, 0, 2).jornada; },
    fixture => { fixture.matches.push({ ...fixture.matches[0], idMatch: 200, jornada: 17 }); },
    fixture => { fixture.teams[1] = fixture.teams[0]; },
    fixture => { fixture.teams.pop(); },
  ];
  for (const corrupt of corruptions) {
    const fixture = season(); corrupt(fixture);
    assert.deepEqual(qualified(fixture), []);
  }
});

test('aplazados, cancelados y liguilla no aportan resultados a las garantías regulares', () => {
  for (const status of ['postponed', 'cancelled']) {
    const fixture = cutoff();
    score(fixture, 8, 17, 0, 1).status = status;
    assert.equal(row(fixture, 7).clasificado, false);
  }
  const fixture = cutoff();
  fixture.matches.push({ ...fixture.matches[0], idMatch: 999, jornada: 20, golLocal: 100, golVisitante: 0 });
  assert.equal(row(fixture, 7).clasificado, false);
});

test('app, tabla pública y base de escenarios comparten las mismas garantías', () => {
  const fixture = season();
  const expected = table(fixture);
  const publicData = createPublicData({ format: 'json' }, fixture.matches, fixture.teams);
  assert.deepEqual(publicData.posiciones.map(({ posicion, ...team }) => team), expected);
  assert.deepEqual(prepareScenarioData(fixture.matches, fixture.teams).clasificadosAsegurados,
    expected.filter(team => team.clasificado).map(team => team.equipo));
  assert.match(publicData.avisoTabla, /plaza asegurada con resultados finalizados/);
});
