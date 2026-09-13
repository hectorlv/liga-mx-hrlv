import { expect, test } from 'playwright/test';
import {
  EDITORIAL_TOURNAMENT,
  JORNADA_LIGUILLA,
  POSTSEASON_FORMAT,
  REGULAR_SEASON_LAST_JORNADA,
} from '../src/utils/tournamentRules.js';
import { calculateTable } from '../src/utils/tableCalculator.js';
import { calculateQuarterFinal } from '../src/utils/playoffCalculator.js';
import { LIGUILLA } from '../src/utils/constants.js';
import type { Match } from '../src/types/index.js';

const finishedMatch = (overrides: Partial<Match>): Match => ({
  idMatch: 1,
  estadio: 'Estadio HRLV',
  fecha: '2026/08/07',
  hora: '19:00',
  jornada: 1,
  local: 'América',
  visitante: 'Atlas',
  golLocal: 1,
  golVisitante: 0,
  lineupLocal: [],
  lineupVisitor: [],
  events: [{
    id: 'fulltime', type: 'phase', team: '', minute: 90,
    period: '2T', sequence: 1, phase: 'fulltime',
  }],
  ...overrides,
});

test('congela el reglamento editorial vigente sin Play-in', () => {
  expect(EDITORIAL_TOURNAMENT.regularSeason.jornadas).toBe(17);
  expect(REGULAR_SEASON_LAST_JORNADA).toBe(17);
  expect(POSTSEASON_FORMAT.directQualificationSpots).toBe(8);
  expect(POSTSEASON_FORMAT.playInSpots).toBe(0);
  expect(JORNADA_LIGUILLA.map(jornada => jornada.id)).toEqual([20, 21, 22]);
});

test('no suma un partido cancelado aunque conserve marcador', () => {
  const table = calculateTable(['América', 'Atlas'], [
    finishedMatch({ status: 'cancelled' }),
  ]);
  expect(table.map(team => [team.equipo, team.pts, team.jj])).toEqual([
    ['América', 0, 0],
    ['Atlas', 0, 0],
  ]);
});

test('reordena ganadores por siembra antes de semifinales y final', () => {
  const teams = Array.from({ length: 8 }, (_, index) => `Semilla ${index + 1}`);
  const table = teams.map((equipo, index) => ({
    equipo, jj: 17, jg: 10 - index, je: 0, jp: index, gf: 20 - index,
    gc: index, dg: 20 - index * 2, pts: 30 - index, eliminado: false,
  }));
  const playoffMatch = (
    idMatch: number,
    local: string,
    visitante: string,
    golLocal = 0,
    golVisitante = 0,
  ): Match => finishedMatch({ idMatch, local, visitante, golLocal, golVisitante, jornada: 20 });
  const pendingPlayoffMatch = (idMatch: number): Match => ({
    ...playoffMatch(idMatch, '', ''),
    events: [],
  });
  const matches = [
    playoffMatch(LIGUILLA.quarter1.ida.id, teams[7], teams[0]),
    playoffMatch(LIGUILLA.quarter1.vuelta.id, teams[0], teams[7]),
    playoffMatch(LIGUILLA.quarter2.ida.id, teams[6], teams[1], 1, 0),
    playoffMatch(LIGUILLA.quarter2.vuelta.id, teams[1], teams[6]),
    playoffMatch(LIGUILLA.quarter3.ida.id, teams[5], teams[2]),
    playoffMatch(LIGUILLA.quarter3.vuelta.id, teams[2], teams[5]),
    playoffMatch(LIGUILLA.quarter4.ida.id, teams[4], teams[3], 1, 0),
    playoffMatch(LIGUILLA.quarter4.vuelta.id, teams[3], teams[4]),
    pendingPlayoffMatch(LIGUILLA.semi1.ida.id),
    pendingPlayoffMatch(LIGUILLA.semi1.vuelta.id),
    pendingPlayoffMatch(LIGUILLA.semi2.ida.id),
    pendingPlayoffMatch(LIGUILLA.semi2.vuelta.id),
    pendingPlayoffMatch(LIGUILLA.final.ida.id),
    pendingPlayoffMatch(LIGUILLA.final.vuelta.id),
  ];

  const semiUpdates = calculateQuarterFinal(table, matches);
  expect(semiUpdates[`/matches/${LIGUILLA.semi1.ida.id}/local`]).toBe(teams[6]);
  expect(semiUpdates[`/matches/${LIGUILLA.semi1.ida.id}/visitante`]).toBe(teams[0]);

  matches.splice(
    8,
    4,
    playoffMatch(LIGUILLA.semi1.ida.id, teams[6], teams[0], 1, 0),
    playoffMatch(LIGUILLA.semi1.vuelta.id, teams[0], teams[6]),
    playoffMatch(LIGUILLA.semi2.ida.id, teams[4], teams[2]),
    playoffMatch(LIGUILLA.semi2.vuelta.id, teams[2], teams[4], 1, 0),
  );
  const finalUpdates = calculateQuarterFinal(table, matches);
  expect(finalUpdates[`/matches/${LIGUILLA.final.ida.id}/local`]).toBe(teams[6]);
  expect(finalUpdates[`/matches/${LIGUILLA.final.ida.id}/visitante`]).toBe(teams[2]);
});
