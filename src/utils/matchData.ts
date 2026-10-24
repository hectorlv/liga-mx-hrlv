import type { Match } from '../types/index.js';
import { formatDate } from './dateUtils.js';

/** Normalización compartida por la app y la fuente pública de lectura. */
export function normalizeMatches(raw: Record<string, Match> | Match[] | null): Match[] {
  const entries = Object.entries(raw || {}).filter(([, match]) => match != null);
  return entries.map(([key, match]) => ({
    ...match,
    golLocal: typeof match.golLocal === 'number' ? match.golLocal : null,
    golVisitante: typeof match.golVisitante === 'number' ? match.golVisitante : null,
    // Las claves de Firebase son la identidad, incluso en arreglos dispersos.
    idMatch: Number.isFinite(Number(key)) ? Number(key) : Number(match.idMatch),
    fecha: formatDate(match.fecha, match.hora),
    jornada: Number(match.jornada),
  })).sort((a, b) => {
    if (a.jornada !== b.jornada) return a.jornada - b.jornada;
    if (a.fecha < b.fecha) return -1;
    if (a.fecha > b.fecha) return 1;
    return 0;
  }) as Match[];
}
