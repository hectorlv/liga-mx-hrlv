import type { Match } from '../src/types/index.js';
import { resolveMatchStatus } from '../src/utils/matchStatus.js';
import {
  formatDateYYYYMMDD,
  TOURNAMENT_TIME_ZONE,
} from '../src/utils/dateUtils.js';
import { EDITORIAL_TOURNAMENT } from '../src/utils/tournamentRules.js';

export class PublicDataError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public candidates?: string[],
  ) {
    super(message);
  }
}

export function validDate(match: Match): Date | null {
  return match.fecha instanceof Date && Number.isFinite(match.fecha.getTime())
    ? match.fecha
    : null;
}

export function score(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function publicMetadata(now: Date) {
  return {
    torneo: { id: EDITORIAL_TOURNAMENT.id, nombre: EDITORIAL_TOURNAMENT.label },
    zonaHoraria: TOURNAMENT_TIME_ZONE,
    consultadoEn: now.toISOString(),
    aviso:
      'Momento de consulta de Firebase; no es la fecha de edición. Respuesta sin caché de navegador ni CDN; comprueba este momento de consulta si tu herramienta conserva una copia.',
  };
}

export function publicMatch(match: Match) {
  const date = validDate(match);
  return {
    idMatch: match.idMatch,
    local: match.local,
    visitante: match.visitante,
    estadio: match.estadio || null,
    fecha: date ? formatDateYYYYMMDD(date) : null,
    hora: date ? match.hora : null,
    inicio: date?.toISOString() ?? null,
    golLocal: score(match.golLocal),
    golVisitante: score(match.golVisitante),
    penaltyLocal: score(match.penaltyLocal),
    penaltyVisitante: score(match.penaltyVisitante),
    estado: resolveMatchStatus(match),
    minutoEnVivo:
      resolveMatchStatus(match) === 'live' ? score(match.liveMinute) : null,
  };
}
