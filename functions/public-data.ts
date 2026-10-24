import type { Match } from '../src/types/index.js';
import { normalizeMatches } from '../src/utils/matchData.js';
import { calculateTable } from '../src/utils/tableCalculator.js';
import { resolveMatchStatus } from '../src/utils/matchStatus.js';
import { formatDateYYYYMMDD, TOURNAMENT_TIME_ZONE } from '../src/utils/dateUtils.js';
import { EDITORIAL_TOURNAMENT, REGULAR_SEASON_LAST_JORNADA } from '../src/utils/tournamentRules.js';

export class PublicDataError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export type PublicRoute = { format: 'json' | 'html'; jornada?: number };

export function parsePublicRoute(path: string): PublicRoute {
  if (path === '/api/tabla.json') return { format: 'json' };
  if (path === '/datos/tabla') return { format: 'html' };
  const match = /^(\/api|\/datos)\/jornadas\/([^/]+)$/.exec(path);
  if (!match) throw new PublicDataError(404, 'not_found', 'La ruta no existe.');
  const format = match[1] === '/api' ? 'json' : 'html';
  const value = format === 'json' ? match[2].replace(/\.json$/, '') : match[2];
  if ((format === 'json' && !match[2].endsWith('.json')) ||
      !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new PublicDataError(400, 'invalid_jornada', 'La jornada debe ser un entero positivo.');
  }
  return { format, jornada: Number(value) };
}

function validDate(match: Match): Date | null {
  return match.fecha instanceof Date && Number.isFinite(match.fecha.getTime())
    ? match.fecha : null;
}

function score(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function createPublicData(
  route: PublicRoute,
  rawMatches: Record<string, Match> | Match[] | null,
  rawTeams: Record<string, string> | string[] | null,
  now = new Date(),
) {
  const matches = normalizeMatches(rawMatches);
  const metadata = {
    torneo: { id: EDITORIAL_TOURNAMENT.id, nombre: EDITORIAL_TOURNAMENT.label },
    zonaHoraria: TOURNAMENT_TIME_ZONE,
    consultadoEn: now.toISOString(),
    aviso: 'Momento de consulta de Firebase; no es la fecha de edición. Caché compartida de hasta 30 segundos.',
  };
  if (route.jornada !== undefined) {
    const selected = matches.filter(match => match.jornada === route.jornada)
      .sort((a, b) => (validDate(a)?.getTime() ?? Infinity) - (validDate(b)?.getTime() ?? Infinity) || a.idMatch - b.idMatch);
    if (!selected.length) throw new PublicDataError(404, 'jornada_not_found', 'No hay partidos para esta jornada.');
    return {
      ...metadata,
      tipo: 'jornada' as const,
      jornada: route.jornada,
      fase: route.jornada <= REGULAR_SEASON_LAST_JORNADA ? 'regular' : 'liguilla',
      partidos: selected.map(match => {
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
          minutoEnVivo: resolveMatchStatus(match) === 'live' ? score(match.liveMinute) : null,
        };
      }),
    };
  }
  const teams = Object.values(rawTeams || {});
  if (!teams.length || teams.some(team => typeof team !== 'string' || !team.trim())) {
    throw new PublicDataError(503, 'data_unavailable', 'No se pudieron obtener los equipos para calcular la tabla.');
  }
  const provisional = matches.some(match =>
    match.jornada <= REGULAR_SEASON_LAST_JORNADA && match.status !== 'cancelled' &&
    match.golLocal != null && match.golVisitante != null && resolveMatchStatus(match) !== 'finished',
  );
  return {
    ...metadata,
    tipo: 'tabla' as const,
    provisional,
    criterio: 'Mismo cálculo que la app: fase regular; desempates por puntos, diferencia de goles y goles a favor.',
    avisoTabla: 'Tabla en vivo y provisional: los resultados no finalizados no confirman clasificación ni eliminación.',
    posiciones: calculateTable(teams, matches).map((entry, index) => ({ posicion: index + 1, ...entry })),
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function renderDocument(title: string, content: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} | Liga MX HRLV</title></head><body><main><h1>${escapeHtml(title)}</h1>${content}</main></body></html>`;
}

const STATUS_LABELS = {
  scheduled: 'Programado', live: 'En vivo', finished: 'Finalizado', postponed: 'Aplazado', cancelled: 'Cancelado',
};

export function renderPublicHtml(data: ReturnType<typeof createPublicData>): string {
  const metadata = `<p>Torneo: ${escapeHtml(data.torneo.nombre)} (${escapeHtml(data.torneo.id)}).</p><p>Zona horaria: ${escapeHtml(data.zonaHoraria)}.</p><p>Consultado en Firebase: <time datetime="${escapeHtml(data.consultadoEn)}">${escapeHtml(data.consultadoEn)}</time>.</p><p>${escapeHtml(data.aviso)}</p>`;
  if (data.tipo === 'jornada') {
    const rows = data.partidos.map(match => `<tr><td>${match.idMatch}</td><td>${escapeHtml(match.fecha ?? 'Fecha pendiente')}</td><td>${escapeHtml(match.hora ?? 'Hora pendiente')}</td><td>${escapeHtml(match.local)}</td><td>${match.golLocal ?? 'Pendiente'}</td><td>${match.golVisitante ?? 'Pendiente'}</td><td>${escapeHtml(match.visitante)}</td><td>${escapeHtml(match.estadio ?? 'Pendiente')}</td><td>${STATUS_LABELS[match.estado]}</td><td>${match.minutoEnVivo ?? '—'}</td><td>${match.penaltyLocal ?? '—'}</td><td>${match.penaltyVisitante ?? '—'}</td></tr>`).join('');
    return renderDocument(`Jornada ${data.jornada}`, `${metadata}<p>Fase: ${data.fase === 'regular' ? 'Regular' : 'Liguilla'}. Partidos: ${data.partidos.length}.</p><p>Solo los partidos con estado Finalizado tienen un resultado definitivo.</p><table><caption>Calendario y resultados de la jornada ${data.jornada}</caption><thead><tr>${['ID', 'Fecha', 'Hora CDMX', 'Local', 'Goles local', 'Goles visitante', 'Visitante', 'Estadio', 'Estado', 'Minuto en vivo', 'Penales local', 'Penales visitante'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><p><a href="/api/jornadas/${data.jornada}.json">Estos datos en JSON</a> · <a href="/datos/tabla">Tabla general</a></p>`);
  }
  const rows = data.posiciones.map(entry => `<tr>${[entry.posicion, entry.equipo, entry.jj, entry.jg, entry.je, entry.jp, entry.gf, entry.gc, entry.dg, entry.pts, entry.clasificado ? 'Sí' : 'No', entry.playin ? 'Sí' : 'No', entry.eliminado ? 'Sí' : 'No'].map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
  return renderDocument('Tabla general', `${metadata}<p>${escapeHtml(data.criterio)}</p><p>Incluye marcadores no definitivos: ${data.provisional ? 'Sí' : 'No'}.</p><p>${escapeHtml(data.avisoTabla)}</p><table><caption>Tabla general de la fase regular</caption><thead><tr>${['Pos', 'Equipo', 'JJ', 'JG', 'JE', 'JP', 'GF', 'GC', 'DG', 'Pts', 'Clasificado', 'Play-in', 'Eliminado'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><p><a href="/api/tabla.json">Estos datos en JSON</a></p>`);
}
