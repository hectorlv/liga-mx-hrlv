import type {
  Match,
  MatchEvent,
  Player,
  PlayerGame,
  TeamSide,
} from '../src/types/index.js';
import { normalizeMatches } from '../src/utils/matchData.js';
import { resolveMatchStatus } from '../src/utils/matchStatus.js';
import { sortMatchEvents } from '../src/utils/functionUtils.js';
import { REGULAR_SEASON_LAST_JORNADA } from '../src/utils/tournamentRules.js';
import {
  PublicDataError,
  publicMatch,
  publicMetadata,
  score,
  validDate,
} from './public-data-common.js';

export type TeamPhase = 'regular' | 'liguilla' | 'todas';
export type ExtendedQuery =
  | { tipo: 'partido'; idMatch: number }
  | { tipo: 'equipo'; equipo: string; fase?: TeamPhase }
  | {
      tipo: 'calendario';
      equipo?: string;
      jornadaDesde?: number;
      jornadaHasta?: number;
      fechaDesde?: string;
      fechaHasta?: string;
      estado?: ReturnType<typeof resolveMatchStatus>;
    };

export type RawPlayers = Record<string, Player[] | Record<string, Player>> | null;

export const values = <T>(raw: T[] | Record<string, T> | null | undefined): T[] =>
  Object.values(raw || {}).filter((item): item is T => item != null);
export const folded = (name: string) =>
  name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
const rosterKey = (name: string) => folded(name.replaceAll('.', ''));

export function canonicalTeam(input: string, teams: string[]): string {
  const candidates = [
    ...new Set(teams.filter(team => folded(team) === folded(input))),
  ];
  if (candidates.length > 1)
    throw new PublicDataError(
      400,
      'ambiguous_team',
      'El nombre coincide con varios equipos.',
      candidates,
    );
  if (!candidates.length)
    throw new PublicDataError(
      404,
      'team_not_found',
      'No se encontró el equipo. Usa un nombre canónico del calendario.',
      teams,
    );
  return candidates[0];
}

export function rosterFor(team: string, rawPlayers: RawPlayers): Player[] | null {
  const entries = Object.entries(rawPlayers || {}).filter(
    ([key]) => rosterKey(key) === rosterKey(team),
  );
  if (!entries.length) return null;
  return entries.flatMap(([, roster]) => values(roster));
}

export function publicPlayer(player: Player) {
  return {
    id: typeof player.id === 'string' ? player.id : null,
    number: score(player.number),
    name:
      typeof player.name === 'string' && player.name.trim()
        ? player.name
        : null,
    fullName:
      typeof player.fullName === 'string' && player.fullName.trim()
        ? player.fullName
        : null,
    position: typeof player.position === 'string' ? player.position : null,
    nationality:
      typeof player.nationality === 'string' ? player.nationality : null,
    historical: player.historical === true,
  };
}

/** Unknown dates stay last for either direction; IDs provide stable ordering. */
export function chronological(a: Match, b: Match, descending = false): number {
  const left = validDate(a)?.getTime();
  const right = validDate(b)?.getTime();
  if (left === undefined)
    return right === undefined ? a.idMatch - b.idMatch : 1;
  if (right === undefined) return -1;
  return descending
    ? right - left || b.idMatch - a.idMatch
    : left - right || a.idMatch - b.idMatch;
}

export function phaseMatches(match: Match, phase: TeamPhase): boolean {
  if (phase === 'todas') return true;
  return phase === 'regular'
    ? match.jornada >= 1 && match.jornada <= REGULAR_SEASON_LAST_JORNADA
    : match.jornada > REGULAR_SEASON_LAST_JORNADA;
}

export function statistics(matches: Match[], team: string) {
  const result = { jj: 0, jg: 0, je: 0, jp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
  for (const match of matches) {
    const home = match.local === team;
    const gf = home ? match.golLocal : match.golVisitante;
    const gc = home ? match.golVisitante : match.golLocal;
    result.jj++;
    result.gf += gf;
    result.gc += gc;
    if (gf > gc) result.jg++;
    else if (gf === gc) result.je++;
    else result.jp++;
  }
  result.dg = result.gf - result.gc;
  result.pts = result.jg * 3 + result.je;
  return result;
}

function matchDetail(match: Match, rawPlayers: RawPlayers) {
  const warnings = new Set<string>();
  const teamName = (side: TeamSide) =>
    side === 'local' ? match.local : match.visitante;
  const identify = (side: TeamSide, number: number) => {
    const team = teamName(side);
    // Include historical entries: the current jersey holder is not proof of historical identity.
    const candidates = (rosterFor(team, rawPlayers) || []).filter(
      player => player.number === number,
    );
    if (
      candidates.length !== 1 ||
      !(candidates[0].name?.trim() || candidates[0].fullName?.trim())
    ) {
      warnings.add(
        `${team}, dorsal ${number}: identidad ${candidates.length > 1 ? 'ambigua' : 'no registrada'}; no se atribuye un nombre.`,
      );
      return { equipo: team, number, name: null, fullName: null, id: null };
    }
    const player = publicPlayer(candidates[0]);
    return {
      equipo: team,
      number,
      name: player.name,
      fullName: player.fullName,
      id: player.id,
    };
  };
  const lineup = (side: TeamSide, raw: PlayerGame[] | undefined) =>
    values(raw).map(player => ({
      ...identify(side, player.number),
      titular: typeof player.titular === 'boolean' ? player.titular : null,
      entroDeCambio:
        typeof player.entroDeCambio === 'boolean' ? player.entroDeCambio : null,
      salioDeCambio:
        typeof player.salioDeCambio === 'boolean' ? player.salioDeCambio : null,
    }));
  const local = lineup('local', match.lineupLocal);
  const visitante = lineup('visitor', match.lineupVisitor);
  const rawEvents = values(match.events);
  const events = sortMatchEvents(rawEvents).map((event: MatchEvent) => {
    const base = {
      id: event.id,
      type: event.type,
      team: event.team,
      minute: event.minute,
      addedTime: event.addedTime ?? null,
      period: event.period,
      sequence: event.sequence,
    };
    if (event.type === 'phase') return { ...base, phase: event.phase };
    const side =
      event.team === 'local' || event.team === 'visitor' ? event.team : null;
    if (!side)
      warnings.add(
        `Evento ${event.id}: equipo no registrado; no se atribuye un jugador.`,
      );
    if (event.type === 'goal') {
      const authorSide =
        side && event.ownGoal ? (side === 'local' ? 'visitor' : 'local') : side;
      return {
        ...base,
        player: event.player,
        ownGoal: event.ownGoal ?? null,
        goalType: event.goalType ?? null,
        assist: event.assist ?? null,
        equipoBeneficiado: side ? teamName(side) : null,
        jugador: authorSide ? identify(authorSide, event.player) : null,
        asistencia:
          side && !event.ownGoal && event.assist != null
            ? identify(side, event.assist)
            : null,
      };
    }
    if (event.type === 'card')
      return {
        ...base,
        player: event.player,
        cardType: event.cardType,
        foulType: event.foulType ?? null,
        jugador: side ? identify(side, event.player) : null,
      };
    return {
      ...base,
      playerIn: event.playerIn,
      playerOut: event.playerOut,
      entra: side ? identify(side, event.playerIn) : null,
      sale: side ? identify(side, event.playerOut) : null,
    };
  });
  const coverage = (line: typeof local) =>
    !line.length
      ? 'sin_registro'
      : line.filter(player => player.titular === true).length === 11
        ? 'once_titulares_registrados'
        : 'parcial';
  if (!events.length)
    warnings.add(
      'No hay eventos registrados; no se puede reconstruir la crónica.',
    );
  if (coverage(local) !== 'once_titulares_registrados')
    warnings.add('La alineación local no tiene once titulares registrados.');
  if (coverage(visitante) !== 'once_titulares_registrados')
    warnings.add(
      'La alineación visitante no tiene once titulares registrados.',
    );
  if (
    !rosterFor(match.local, rawPlayers) ||
    !rosterFor(match.visitante, rawPlayers)
  )
    warnings.add('Falta al menos una plantilla para resolver nombres.');
  const summary = publicMatch(match);
  if (
    summary.estado === 'finished' &&
    (summary.golLocal === null || summary.golVisitante === null)
  )
    warnings.add('Partido finalizado sin marcador completo.');
  if (summary.golLocal !== null && summary.golVisitante !== null) {
    const goals = rawEvents.filter(
      event => event.type === 'goal' && event.period !== 'PEN',
    );
    if (
      goals.filter(event => event.team === 'local').length !==
        summary.golLocal ||
      goals.filter(event => event.team === 'visitor').length !==
        summary.golVisitante
    )
      warnings.add(
        'Los goles registrados en eventos no coinciden con el marcador; no se reconstruyen eventos faltantes.',
      );
  }
  return {
    partido: {
      jornada: match.jornada,
      fase:
        match.jornada <= REGULAR_SEASON_LAST_JORNADA ? 'regular' : 'liguilla',
      ...summary,
    },
    alineaciones: { local, visitante },
    eventos: events,
    cobertura: {
      eventos: events.length ? 'registrados' : 'sin_registro',
      alineacionLocal: coverage(local),
      alineacionVisitante: coverage(visitante),
    },
    advertencias: [...warnings],
  };
}

export function createExtendedData(
  query: ExtendedQuery,
  rawMatches: Record<string, Match> | Match[] | null,
  rawTeams: Record<string, string> | string[] | null,
  rawPlayers: RawPlayers,
  now = new Date(),
) {
  const matches = normalizeMatches(rawMatches);
  const metadata = publicMetadata(now);
  if (query.tipo === 'partido') {
    const match = matches.find(item => item.idMatch === query.idMatch);
    if (!match)
      throw new PublicDataError(
        404,
        'match_not_found',
        'No se encontró el partido.',
      );
    return {
      ...metadata,
      tipo: 'partido' as const,
      ...matchDetail(match, rawPlayers),
    };
  }
  const teams = values(rawTeams);
  if (
    !teams.length ||
    teams.some(team => typeof team !== 'string' || !team.trim())
  )
    throw new PublicDataError(
      503,
      'data_unavailable',
      'No se pudieron obtener los nombres canónicos de equipos.',
    );
  const team =
    query.equipo === undefined ? undefined : canonicalTeam(query.equipo, teams);
  const selected = team
    ? matches.filter(match => match.local === team || match.visitante === team)
    : matches;
  if (query.tipo === 'calendario') {
    let unknownDates = 0;
    const filtered = selected
      .filter(match => {
        if (
          query.jornadaDesde !== undefined &&
          match.jornada < query.jornadaDesde
        )
          return false;
        if (
          query.jornadaHasta !== undefined &&
          match.jornada > query.jornadaHasta
        )
          return false;
        if (
          query.estado !== undefined &&
          resolveMatchStatus(match) !== query.estado
        )
          return false;
        const date = publicMatch(match).fecha;
        if ((query.fechaDesde || query.fechaHasta) && !date) {
          unknownDates++;
          return false;
        }
        return (
          (!query.fechaDesde || date! >= query.fechaDesde) &&
          (!query.fechaHasta || date! <= query.fechaHasta)
        );
      })
      .sort((a, b) => chronological(a, b));
    return {
      ...metadata,
      tipo: 'calendario' as const,
      filtros: {
        equipo: team ?? null,
        jornadaDesde: query.jornadaDesde ?? null,
        jornadaHasta: query.jornadaHasta ?? null,
        fechaDesde: query.fechaDesde ?? null,
        fechaHasta: query.fechaHasta ?? null,
        estado: query.estado ?? null,
      },
      partidos: filtered.map(match => ({
        jornada: match.jornada,
        ...publicMatch(match),
      })),
      advertencias: unknownDates
        ? [
            `${unknownDates} partidos excluidos del filtro por fecha porque no tienen fecha y hora verificables.`,
          ]
        : [],
    };
  }
  const phase = query.fase ?? 'regular';
  const scoped = selected.filter(match => phaseMatches(match, phase));
  const completed = scoped.filter(
    match => resolveMatchStatus(match) === 'finished',
  );
  const eligible = completed.filter(
    match =>
      score(match.golLocal) !== null && score(match.golVisitante) !== null,
  );
  const missingScores = completed
    .filter(match => !eligible.includes(match))
    .map(match => match.idMatch);
  const unknownDates = eligible
    .filter(match => !validDate(match))
    .map(match => match.idMatch);
  const roster = rosterFor(team!, rawPlayers);
  const pending = scoped
    .filter(match =>
      ['scheduled', 'postponed'].includes(resolveMatchStatus(match)),
    )
    .sort((a, b) => chronological(a, b));
  return {
    ...metadata,
    tipo: 'equipo' as const,
    equipo: team!,
    fase: phase,
    criterio:
      'Solo partidos finalizados con marcador completo. Puntos descriptivos: 3 por victoria y 1 por empate; penales separados. No determina posiciones ni clasificación.',
    plantilla:
      roster === null
        ? null
        : roster
            .filter(player => !player.historical)
            .map(publicPlayer)
            .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity)),
    estadisticas: {
      total: statistics(eligible, team!),
      local: statistics(
        eligible.filter(match => match.local === team),
        team!,
      ),
      visitante: statistics(
        eligible.filter(match => match.visitante === team),
        team!,
      ),
    },
    ultimosCinco: [...eligible]
      .sort((a, b) => chronological(a, b, true))
      .slice(0, 5)
      .map(match => {
        const gf = match.local === team ? match.golLocal : match.golVisitante;
        const gc = match.local === team ? match.golVisitante : match.golLocal;
        return {
          jornada: match.jornada,
          ...publicMatch(match),
          resultado: gf > gc ? 'victoria' : gf === gc ? 'empate' : 'derrota',
        };
      }),
    rachaVerificable: unknownDates.length === 0 && missingScores.length === 0,
    proximosCinco: pending
      .slice(0, 5)
      .map(match => ({ jornada: match.jornada, ...publicMatch(match) })),
    pendientesRegistrados: pending.length,
    excluidosSinMarcador: missingScores,
    finalizadosSinFecha: unknownDates,
    advertencias: [
      ...(roster === null
        ? [
            'Plantilla no registrada; no equivale a una plantilla vacía confirmada.',
          ]
        : []),
      ...(missingScores.length
        ? [
            'Hay partidos finalizados sin marcador completo, excluidos de estadísticas y racha.',
          ]
        : []),
      ...(unknownDates.length
        ? [
            'Hay partidos finalizados sin fecha verificable; no se puede confirmar cuáles fueron los últimos cinco.',
          ]
        : []),
      ...(pending.some(match => !validDate(match))
        ? [
            'Hay pendientes sin fecha; aparecen después de los partidos con fecha y no se puede confirmar el orden de los próximos cinco.',
          ]
        : []),
    ],
  };
}
