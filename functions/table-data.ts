import type { Match } from '../src/types/index.js';
import { calculateTable } from '../src/utils/tableCalculator.js';
import { resolveMatchStatus } from '../src/utils/matchStatus.js';
import { REGULAR_SEASON_LAST_JORNADA } from '../src/utils/tournamentRules.js';
import { PublicDataError } from './public-data-common.js';

/** Misma tabla y banderas de clasificación de la app, sin un segundo cálculo. */
export function publicTable(
  rawTeams: Record<string, string> | string[] | null,
  matches: Match[],
) {
  const teams = Object.values(rawTeams || {});
  if (
    !teams.length ||
    teams.some(team => typeof team !== 'string' || !team.trim())
  ) {
    throw new PublicDataError(
      503,
      'data_unavailable',
      'No se pudieron obtener los equipos para calcular la tabla.',
    );
  }
  const provisional = matches.some(
    match =>
      match.jornada <= REGULAR_SEASON_LAST_JORNADA &&
      match.status !== 'cancelled' &&
      match.golLocal != null &&
      match.golVisitante != null &&
      resolveMatchStatus(match) !== 'finished',
  );
  return {
    tipo: 'tabla' as const,
    provisional,
    criterio:
      'Mismo cálculo que la app: fase regular; desempates por puntos, diferencia de goles y goles a favor.',
    avisoTabla:
      'Las posiciones y estadísticas pueden cambiar en vivo. Los equipos marcados como clasificados tienen su plaza asegurada con resultados finalizados; las eliminaciones pueden ser provisionales durante partidos en curso.',
    posiciones: calculateTable(teams, matches).map((entry, index) => ({
      posicion: index + 1,
      ...entry,
    })),
  };
}
