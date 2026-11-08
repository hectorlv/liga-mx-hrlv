import type { Match } from '../src/types/index.js';
import { normalizeMatches } from '../src/utils/matchData.js';
import { REGULAR_SEASON_LAST_JORNADA } from '../src/utils/tournamentRules.js';

import { PublicDataError, publicMetadata, publicMatch, validDate } from './public-data-common.js';
import { publicTable } from './table-data.js';
export { PublicDataError } from './public-data-common.js';

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

export function createPublicData(
  route: PublicRoute,
  rawMatches: Record<string, Match> | Match[] | null,
  rawTeams: Record<string, string> | string[] | null,
  now = new Date(),
) {
  const matches = normalizeMatches(rawMatches);
  const metadata = publicMetadata(now);
  if (route.jornada !== undefined) {
    const selected = matches.filter(match => match.jornada === route.jornada)
      .sort((a, b) => (validDate(a)?.getTime() ?? Infinity) - (validDate(b)?.getTime() ?? Infinity) || a.idMatch - b.idMatch);
    if (!selected.length) throw new PublicDataError(404, 'jornada_not_found', 'No hay partidos para esta jornada.');
    return {
      ...metadata,
      tipo: 'jornada' as const,
      jornada: route.jornada,
      fase: route.jornada <= REGULAR_SEASON_LAST_JORNADA ? 'regular' : 'liguilla',
      partidos: selected.map(publicMatch),
    };
  }
  return { ...metadata, ...publicTable(rawTeams, matches) };
}

export { createExtendedData } from './extended-data.js';
export { createTournamentData } from './tournament-data.js';
export { prepareScenarioData, pointBalances, goalThresholds } from './scenario-data.js';

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
