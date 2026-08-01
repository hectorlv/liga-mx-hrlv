import { Match, TableEntry } from '../types/index.js';

type MatchFixture = Partial<Match> &
  Pick<Match, 'idMatch' | 'local' | 'visitante'>;

function matchFixture(values: MatchFixture): Match {
  return {
    estadio: 'Estadio HRLV',
    fecha: '2026/08/07',
    hora: '19:00',
    jornada: 1,
    golLocal: null as unknown as number,
    golVisitante: null as unknown as number,
    lineupLocal: [],
    lineupVisitor: [],
    events: [],
    ...values,
  };
}

/** Datos estables para pruebas manuales o snapshots del lienzo social. */
export const SOCIAL_FIXTURES: Record<
  string,
  { matches: Match[]; table: TableEntry[] }
> = {
  normalRound: {
    matches: [
      ['América', 'Atlas'],
      ['Cruz Azul', 'Toluca'],
      ['Guadalajara', 'Pachuca'],
      ['Monterrey', 'Tigres de la U.A.N.L.'],
      ['León', 'Necaxa'],
      ['Puebla F.C.', 'Santos Laguna'],
      ['Tijuana', 'FC Juárez'],
      ['Universidad Nacional', 'Club Atlético de San Luis'],
      ['Atlante', 'Gallos Blancos de Querétaro'],
    ].map(([local, visitante], index) =>
      matchFixture({
        idMatch: index,
        local,
        visitante,
        hora: `${String(17 + (index % 3) * 2).padStart(2, '0')}:00`,
        fecha: `2026/08/${String(7 + Math.floor(index / 3)).padStart(2, '0')}`,
      }),
    ),
    table: [],
  },
  edgeCases: {
    matches: [
      matchFixture({
        idMatch: 100,
        local: 'Gallos Blancos de Querétaro',
        visitante: 'Tigres de la U.A.N.L.',
        hora: '12:00',
      }),
      matchFixture({
        idMatch: 101,
        local: 'América',
        visitante: 'Atlas',
        golLocal: 0,
        golVisitante: 0,
        events: [
          {
            id: 'fulltime',
            type: 'phase',
            team: '',
            minute: 90,
            period: '2T',
            sequence: 1,
            phase: 'fulltime',
          },
        ],
      }),
      matchFixture({
        idMatch: 102,
        local: 'Cruz Azul',
        visitante: 'Pachuca',
        golLocal: 10,
        golVisitante: 0,
        events: [
          {
            id: 'start',
            type: 'phase',
            team: '',
            minute: 0,
            period: '1T',
            sequence: 1,
            phase: 'start',
          },
        ],
        liveMinute: 77,
      }),
      matchFixture({
        idMatch: 103,
        local: 'Monterrey',
        visitante: 'Toluca',
        status: 'postponed',
      }),
      matchFixture({
        idMatch: 104,
        local: 'Escudo inexistente',
        visitante: 'Necaxa',
        status: 'cancelled',
      }),
      matchFixture({
        idMatch: 105,
        local: 'León',
        visitante: 'Santos Laguna',
        hora: '',
      }),
      matchFixture({
        idMatch: 106,
        local: 'Universidad Nacional',
        visitante: 'Guadalajara',
        golLocal: 3,
        golVisitante: 3,
        penaltyLocal: 5,
        penaltyVisitante: 4,
        events: [
          {
            id: 'fulltime-penalties',
            type: 'phase',
            team: '',
            minute: 120,
            period: '2TE',
            sequence: 2,
            phase: 'fulltime',
          },
        ],
      }),
    ],
    table: [
      'América',
      'Cruz Azul',
      'Toluca',
      'Pachuca',
      'Monterrey',
      'Tigres de la U.A.N.L.',
      'Guadalajara',
      'Universidad Nacional',
      'León',
      'Necaxa',
      'Puebla F.C.',
      'Santos Laguna',
      'Tijuana',
      'FC Juárez',
      'Atlas',
      'Club Atlético de San Luis',
      'Atlante',
      'Gallos Blancos de Querétaro',
    ].map((equipo, index) => ({
      equipo,
      jj: 3,
      jg: Math.max(0, 3 - Math.floor(index / 3)),
      je: index % 3,
      jp: Math.min(3, Math.floor(index / 4)),
      gf: Math.max(0, 9 - index),
      gc: index % 5,
      dg: 9 - index - (index % 5),
      pts: Math.max(0, 12 - index),
      clasificado: index < 8,
      playin: index >= 8 && index < 10,
      eliminado: index >= 10,
    })),
  },
};
