import { expect, test } from 'playwright/test';
import {
  EDITORIAL_TOURNAMENT,
  JORNADA_LIGUILLA,
  POSTSEASON_FORMAT,
  REGULAR_SEASON_LAST_JORNADA,
} from '../src/utils/tournamentRules.js';
import { calculateTable } from '../src/utils/tableCalculator.js';
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
