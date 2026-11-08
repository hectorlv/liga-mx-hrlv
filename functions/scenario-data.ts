import type { Match, TableEntry } from '../src/types/index.js';
import { normalizeMatches } from '../src/utils/matchData.js';
import { resolveMatchStatus } from '../src/utils/matchStatus.js';
import { calculateTable } from '../src/utils/tableCalculator.js';
import {
  POSTSEASON_FORMAT,
  REGULAR_SEASON_LAST_JORNADA,
} from '../src/utils/tournamentRules.js';
import { publicMatch, publicMetadata } from './public-data-common.js';

export function pointBalances(remaining: number) {
  const cases = new Map<
    number,
    { victorias: number; empates: number; derrotas: number }[]
  >();
  for (let wins = 0; wins <= remaining; wins++) {
    for (let draws = 0; draws <= remaining - wins; draws++) {
      const points = wins * 3 + draws;
      const rows = cases.get(points) ?? [];
      rows.push({
        victorias: wins,
        empates: draws,
        derrotas: remaining - wins - draws,
      });
      cases.set(points, rows);
    }
  }
  return [...cases]
    .sort(([a], [b]) => b - a)
    .map(([puntosSumados, balances]) => ({ puntosSumados, balances }));
}

/** These inequalities compare two teams only; no fixed future rival margin is assumed. */
export function goalThresholds(team: TableEntry, rival: TableEntry) {
  return {
    rival: rival.equipo,
    diferenciaSobreSaldoFuturoRival: rival.dg - team.dg + 1,
    golesAFavorSobreGolesFuturosRivalSiIgualanDG: rival.gf - team.gf + 1,
  };
}

export function prepareScenarioData(
  rawMatches: Record<string, Match> | Match[] | null,
  rawTeams: Record<string, string> | string[] | null,
  now = new Date(),
) {
  const metadata = publicMetadata(now);
  const teams = Object.values(rawTeams || {});
  const warnings: string[] = [];
  if (
    !teams.length ||
    teams.some(team => typeof team !== 'string' || !team.trim()) ||
    new Set(teams).size !== teams.length
  )
    warnings.push('No hay una lista válida y única de equipos.');
  if (teams.length !== REGULAR_SEASON_LAST_JORNADA + 1)
    warnings.push(
      'La lista de equipos no coincide con el formato de una vuelta de la fase regular vigente.',
    );
  if (POSTSEASON_FORMAT.playInSpots !== 0)
    warnings.push(
      'El informe solo admite el formato de plazas directas vigente, sin play-in.',
    );
  const regular = normalizeMatches(rawMatches)
    .filter(
      match =>
        match.jornada >= 1 && match.jornada <= REGULAR_SEASON_LAST_JORNADA,
    )
    .map(match => ({
      ...match,
      events: Object.values(match.events || {}).filter(event => event != null),
    }));
  const finalScore = (match: Match) =>
    [match.golLocal, match.golVisitante].every(
      value => Number.isSafeInteger(value) && value >= 0,
    );
  const finished = regular.filter(
    match => resolveMatchStatus(match) === 'finished',
  );
  if (finished.some(match => !finalScore(match)))
    warnings.push(
      'Hay partidos finalizados sin marcador entero completo; no se puede construir la base.',
    );
  if (
    regular.some(
      match =>
        !Number.isSafeInteger(match.idMatch) ||
        !Number.isInteger(match.jornada) ||
        !teams.includes(match.local) ||
        !teams.includes(match.visitante) ||
        match.local === match.visitante,
    )
  )
    warnings.push(
      'Hay partidos de fase regular con identidad o equipos inválidos.',
    );
  const counts = teams.map(team => ({
    equipo: team,
    registrados: regular.filter(
      match => match.local === team || match.visitante === team,
    ).length,
  }));
  if (counts.some(team => team.registrados !== REGULAR_SEASON_LAST_JORNADA))
    warnings.push(
      'El calendario no contiene exactamente los partidos de fase regular esperados para cada equipo, incluidos cancelados.',
    );
  if (
    teams.some(team => {
      const own = regular.filter(
        match => match.local === team || match.visitante === team,
      );
      return (
        new Set(own.map(match => match.jornada)).size !== own.length ||
        new Set(
          own.map(match =>
            match.local === team ? match.visitante : match.local,
          ),
        ).size !== own.length
      );
    })
  )
    warnings.push(
      'Hay jornadas u oponentes duplicados para un equipo; no se puede confirmar que el calendario esté completo.',
    );
  const base = warnings.length ? [] : calculateTable(teams, finished);
  if (
    base.some(
      row => ![row.pts, row.gf, row.gc, row.dg].every(Number.isSafeInteger),
    )
  )
    warnings.push(
      'Los totales de la base exceden la representación entera exacta.',
    );
  const pending = regular.filter(
    match => !['finished', 'cancelled'].includes(resolveMatchStatus(match)),
  );
  const qualified = base
    .filter(team => team.clasificado)
    .map(team => team.equipo);
  const eliminated = base
    .filter(team => team.eliminado)
    .map(team => team.equipo);
  const candidates = base
    .filter(team => !team.clasificado && !team.eliminado)
    .map(team => team.equipo);
  const remaining = Object.fromEntries(
    teams.map(team => [
      team,
      pending.filter(match => match.local === team || match.visitante === team)
        .length,
    ]),
  );
  return {
    ...metadata,
    tipo: 'escenarios' as const,
    estado: warnings.length ? 'no_verificable' : 'listo',
    base: 'Solo partidos finalizados con marcador completo; los marcadores en vivo no forman parte de esta fotografía.',
    plazasTotales: POSTSEASON_FORMAT.directQualificationSpots,
    plazasDisponibles: Math.max(
      0,
      POSTSEASON_FORMAT.directQualificationSpots - qualified.length,
    ),
    clasificadosAsegurados: qualified,
    eliminadosAsegurados: eliminated,
    candidatos: candidates,
    tablaBase: base,
    pendientes: pending.map(publicMatch),
    restantesPorEquipo: remaining,
    cobertura: {
      partidosFinalizados: finished.length,
      partidosPendientes: pending.length,
      partidosRelevantes: pending.filter(
        match =>
          candidates.includes(match.local) ||
          candidates.includes(match.visitante),
      ).length,
      calendarioPorEquipo: counts,
    },
    criterio:
      'Puntos, diferencia de goles y goles a favor. Empates totales sin criterio adicional quedan indeterminados. No se impone un límite a los goles futuros.',
    criterioMargenes:
      'Saldo futuro = suma de goles a favor menos goles en contra en los pendientes. Si igualan puntos, para superar por DG: saldo propio >= saldo rival + diferenciaSobreSaldoFuturoRival. Si también igualan DG: GF futuros propios >= GF futuros del rival + golesAFavorSobreGolesFuturosRivalSiIgualanDG. Estas condiciones superan a un rival; por sí solas no aseguran una plaza.',
    significadoEstados: {
      asegura_su_lugar:
        'Sumando esos puntos clasifica con cualquier combinación restante, incluidos los goles y el peor desempate total.',
      depende_de_otros_resultados:
        'Hay finalizaciones favorables y desfavorables; puede depender de resultados, márgenes de goles o un empate total no resuelto.',
      sin_opcion_bajo_este_caso:
        'No entra sumando esos puntos, incluso con desempates favorables; no equivale a estar eliminado si otro caso aún permite entrar.',
      no_verificado: 'No hay una conclusión demostrada para este caso.',
    },
    equipos: base
      .filter(row => candidates.includes(row.equipo))
      .map(team => ({
        equipo: team.equipo,
        puntosActuales: team.pts,
        diferenciaActual: team.dg,
        golesAFavorActuales: team.gf,
        partidosRestantes: remaining[team.equipo],
        casos: pointBalances(remaining[team.equipo]).map(row => ({
          ...row,
          puntosFinales: team.pts + row.puntosSumados,
          estado: 'no_verificado',
          verificacion: { clasificacion: 'unknown', quedaFuera: 'unknown' },
        })),
        condicionesDesempate: base
          .filter(
            rival =>
              rival.equipo !== team.equipo &&
              candidates.includes(rival.equipo) &&
              Math.max(team.pts, rival.pts) <=
                Math.min(
                  team.pts + 3 * remaining[team.equipo],
                  rival.pts + 3 * remaining[rival.equipo],
                ),
          )
          .map(rival => goalThresholds(team, rival)),
      })),
    advertencias: warnings,
  };
}
