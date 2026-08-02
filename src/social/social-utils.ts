import { Match, PlayerTeam, TableEntry } from '../types/index.js';
import { formatMatchMinute, getGoalEvents } from '../utils/functionUtils.js';
import { hasMatchEnded, hasMatchStarted } from '../utils/matchStatus.js';
import {
  DailyMatchesVariant,
  SOCIAL_CONFIG,
  SocialPresentationOptions,
  StandingsRange,
  TemplateId,
} from './social-config.js';
export { type JourneyResultsVariant } from './social-config.js';

export type { DailyMatchesVariant, SocialPresentationOptions, StandingsRange };

export type SocialPlatform = 'instagram' | 'x';
export type ResolvedMatchStatus =
  'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface SocialImageInput {
  template: TemplateId;
  matches: Match[];
  standings: TableEntry[];
  jornada?: number;
  dateKey?: string;
  matchId?: number;
  presentation?: SocialPresentationOptions;
}

export interface SocialXThreadCopy {
  post: string;
  reply: string;
}

export interface SocialScorer {
  name: string;
  ownGoal: boolean;
  minute: string;
}

export interface SocialRenderResult {
  alt: string;
  errors: string[];
  filename: string;
}

export interface FittedText {
  lines: string[];
  fontSize: number;
  truncated: boolean;
  accessibleText: string;
}

export function resolveMatchStatus(match: Match): ResolvedMatchStatus {
  if (match.status) return match.status;
  if (hasMatchEnded(match)) return 'finished';
  if (hasMatchStarted(match)) return 'live';
  return 'scheduled';
}

/** Última jornada con actividad real; conserva el contexto editorial de la tabla. */
export function latestPlayedJornada(matches: Match[]): number | undefined {
  const jornadas = matches
    .filter(
      match =>
        hasMatchStarted(match) ||
        hasMatchEnded(match) ||
        (Number.isFinite(match.golLocal) &&
          Number.isFinite(match.golVisitante)),
    )
    .map(match => match.jornada)
    .filter(Number.isFinite);
  return jornadas.length ? Math.max(...jornadas) : undefined;
}

/** Jornada editorial actual: la próxima con actividad, o la última que ya se jugó. */
export function defaultSocialJornada(
  matches: Match[],
  now = new Date(),
): number | undefined {
  const datedMatches = sortAndDeduplicateMatches(matches)
    .map(match => ({ match, date: toValidDate(match.fecha) }))
    .filter(
      (entry): entry is { match: Match; date: Date } =>
        entry.date !== undefined,
    )
    .sort((first, second) => first.date.getTime() - second.date.getTime());
  const upcoming = datedMatches.find(
    entry => entry.date.getTime() >= now.getTime(),
  );
  if (upcoming) return upcoming.match.jornada;

  const played = latestPlayedJornada(matches);
  if (played !== undefined) return played;

  const jornadas = [...new Set(matches.map(match => match.jornada))]
    .filter(Number.isFinite)
    .sort((first, second) => first - second);
  return datedMatches[datedMatches.length - 1]?.match.jornada ?? jornadas[0];
}

export function dateKey(value: string | Date): string {
  const date = toValidDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SOCIAL_CONFIG.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatSocialDate(value: string | Date): string {
  const date = toValidDate(value);
  if (!date) return 'Fecha pendiente';
  return new Intl.DateTimeFormat(SOCIAL_CONFIG.locale, {
    timeZone: SOCIAL_CONFIG.timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function formatShortSocialDate(value: string | Date): string {
  const date = toValidDate(value);
  if (!date) return 'Fecha pendiente';
  return new Intl.DateTimeFormat(SOCIAL_CONFIG.locale, {
    timeZone: SOCIAL_CONFIG.timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
}

function toValidDate(value: string | Date): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function formatKickoff(time: string): string {
  const [rawHours, rawMinutes] = time.split(':');
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes))
    return 'HORARIO PENDIENTE';
  const period = hours >= 12 ? 'p. m.' : 'a. m.';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function statusLabel(status: ResolvedMatchStatus): string {
  const labels: Record<ResolvedMatchStatus, string> = {
    scheduled: 'programado',
    live: 'en vivo',
    finished: 'finalizado',
    postponed: 'pospuesto',
    cancelled: 'cancelado',
  };
  return labels[status];
}

export function sortAndDeduplicateMatches(matches: Match[]): Match[] {
  const unique = new Map<number, Match>();
  matches.forEach(match => unique.set(match.idMatch, match));
  return [...unique.values()].sort((first, second) => {
    const firstDate = dateKey(first.fecha) || '9999-12-31';
    const secondDate = dateKey(second.fecha) || '9999-12-31';
    const byDate = firstDate.localeCompare(secondDate);
    return byDate || (first.hora || '').localeCompare(second.hora || '');
  });
}

export function selectTemplateMatches(input: SocialImageInput): Match[] {
  const selected = sortAndDeduplicateMatches(input.matches).filter(match =>
    input.jornada == null ? true : match.jornada === input.jornada,
  );
  const dated = input.dateKey
    ? selected.filter(match => dateKey(match.fecha) === input.dateKey)
    : selected;
  return input.template === 'match-summary' && input.matchId != null
    ? dated.filter(match => match.idMatch === input.matchId)
    : dated;
}

export interface SocialMatchDayGroup {
  dateKey: string;
  label: string;
  matches: Match[];
}

export function groupMatchesByDay(matches: Match[]): SocialMatchDayGroup[] {
  const groups = new Map<string, Match[]>();
  sortAndDeduplicateMatches(matches).forEach(match => {
    const key = dateKey(match.fecha) || 'pending';
    const current = groups.get(key) || [];
    current.push(match);
    groups.set(key, current);
  });
  return [...groups.entries()].map(([key, dayMatches]) => ({
    dateKey: key,
    label:
      key === 'pending'
        ? 'FECHA PENDIENTE'
        : formatSocialDate(`${key}T12:00:00`).toLocaleUpperCase(
            SOCIAL_CONFIG.locale,
          ),
    matches: dayMatches,
  }));
}

export function dailyMatchesVariant(matches: Match[]): DailyMatchesVariant {
  if (matches.length <= 1) return 'one-match';
  if (matches.length === 2) return 'two-matches';
  if (matches.length === 3) return 'three-matches';
  return 'four-matches';
}

export function selectStandingsRange(
  standings: TableEntry[],
  range: StandingsRange,
): Array<{ entry: TableEntry; position: number }> {
  const ordered = [...standings]
    .sort(
      (first, second) =>
        second.pts - first.pts || second.dg - first.dg || second.gf - first.gf,
    )
    .map((entry, index) => ({ entry, position: index + 1 }));
  if (range === 'top') return ordered.slice(0, 10);
  if (range === 'bottom') return ordered.slice(10, 18);
  return ordered.slice(0, 18);
}

export function validateSocialInput(input: SocialImageInput): string[] {
  if (input.template === 'standings') {
    return input.standings.length
      ? []
      : ['No hay posiciones para generar la tabla.'];
  }
  const matches = selectTemplateMatches(input);
  if (!matches.length) return ['No hay partidos para la selección actual.'];
  const isResults =
    input.template === 'day-results' ||
    input.template === 'round-results' ||
    input.template === 'match-summary';
  return matches.flatMap(match => {
    if (!match.local?.trim() || !match.visitante?.trim()) {
      return [`El partido ${match.idMatch} no tiene ambos equipos.`];
    }
    if (!isResults && (!dateKey(match.fecha) || !match.hora)) {
      return [`El partido ${match.idMatch} no tiene fecha u hora.`];
    }
    const status = resolveMatchStatus(match);
    const hasScore =
      Number.isFinite(match.golLocal) && Number.isFinite(match.golVisitante);
    if (
      input.template === 'match-summary' &&
      (!hasScore || status !== 'finished')
    ) {
      return [
        `El partido ${match.idMatch} debe estar finalizado y tener marcador.`,
      ];
    }
    if (isResults && !hasScore && status === 'live') {
      return [
        `El partido ${match.idMatch} no tiene marcador o estado editorial.`,
      ];
    }
    return [];
  });
}

export function buildAltText(input: SocialImageInput): string {
  if (input.template === 'standings') {
    const rows = selectStandingsRange(
      input.standings,
      input.presentation?.standingsRange || 'all',
    )
      .map(
        ({ entry, position }) =>
          `${position}. ${entry.equipo}, ${entry.pts} puntos`,
      )
      .join('. ');
    return `Tabla general de Liga MX HRLV. ${rows}`;
  }
  const matches = selectTemplateMatches(input)
    .map(match => {
      const status = resolveMatchStatus(match);
      const score =
        Number.isFinite(match.golLocal) && Number.isFinite(match.golVisitante)
          ? `, ${match.golLocal} a ${match.golVisitante}`
          : '';
      return `${match.local} contra ${match.visitante}${score}, ${statusLabel(status)}`;
    })
    .join('. ');
  return `${templateLabel(input.template)} de Liga MX HRLV. ${matches}`;
}

export function templateLabel(template: TemplateId): string {
  const labels: Record<TemplateId, string> = {
    'round-preview': 'Previa de jornada',
    'day-preview': 'Partidos del día',
    'day-results': 'Resultados del día',
    standings: 'Tabla general',
    'round-results': 'Resultados completos de jornada',
    'match-summary': 'Resumen final de partido',
  };
  return labels[template];
}

export function buildSocialCopy(
  input: SocialImageInput,
  platform: SocialPlatform,
): string {
  const isInstagram = platform === 'instagram';
  const url = buildTrackingUrl(input, platform);
  const callToAction = isInstagram
    ? 'Consulta los detalles en el enlace de la bio.'
    : `Consulta los detalles en: ${url}`;
  const round = input.jornada ? ` Jornada ${input.jornada}` : '';
  const matches = selectTemplateMatches(input);
  const summary = matches
    .slice(0, input.template === 'round-results' ? 9 : 5)
    .map(match => {
      const hasScore =
        Number.isFinite(match.golLocal) && Number.isFinite(match.golVisitante);
      return hasScore
        ? `${match.local} ${match.golLocal}–${match.golVisitante} ${match.visitante}`
        : `${match.local} vs ${match.visitante}`;
    })
    .join('\n');
  const copies: Record<TemplateId, string> = {
    'round-preview': `⚽ Todo listo para la${round} de Liga MX HRLV.\n\nPartidos, fechas y horarios para no perderte nada.\n\n${callToAction}\n\n#LigaMX #FutbolMexicano #LigaMXHRLV`,
    'day-preview': `⚽ Partidos de hoy${input.dateKey ? `, ${formatSocialDate(`${input.dateKey}T12:00:00`)}` : ''}.\n\n${summary}\n\n${callToAction}\n\n#LigaMX #FutbolMexicano`,
    'day-results': `📊 Resultados del día${round}.\n\n${summary}\n\n${callToAction}\n\n#LigaMX #Resultados`,
    standings: `📈 Así marcha la tabla general${round ? ` después de la${round}` : ''}.\n\n${callToAction}\n\n#LigaMX #TablaGeneral`,
    'round-results': `🏁 Resultados completos de la${round}.\n\n${summary}\n\n${callToAction}\n\n#LigaMX #Resultados`,
    'match-summary': `🏁 Marcador final${round}.\n\n${summary}\n\n${callToAction}\n\n#LigaMX #Resultados`,
  };
  return copies[input.template];
}

const CLASSIC_PAIRS = [
  ['América', 'Guadalajara'],
  ['América', 'Cruz Azul'],
  ['América', 'Universidad Nacional'],
  ['Monterrey', 'Tigres de la U.A.N.L.'],
] as const;

function isClassic(match: Match): boolean {
  return CLASSIC_PAIRS.some(
    ([first, second]) =>
      (match.local === first && match.visitante === second) ||
      (match.local === second && match.visitante === first),
  );
}

function resultLine(match: Match): string {
  return `${match.local} ${match.golLocal}–${match.golVisitante} ${match.visitante}`;
}

/** Copy listo para publicar manualmente como un hilo de dos posts en X. */
export function buildXRoundResultsThread(
  input: SocialImageInput,
): SocialXThreadCopy {
  const matches = selectTemplateMatches({
    ...input,
    matchId: undefined,
  }).filter(
    match =>
      resolveMatchStatus(match) === 'finished' &&
      Number.isFinite(match.golLocal) &&
      Number.isFinite(match.golVisitante),
  );
  const ranked = matches
    .map((match, index) => ({ match, index }))
    .sort((first, second) => {
      const classicOrder =
        Number(isClassic(second.match)) - Number(isClassic(first.match));
      if (classicOrder) return classicOrder;
      const firstGoals =
        (first.match.golLocal || 0) + (first.match.golVisitante || 0);
      const secondGoals =
        (second.match.golLocal || 0) + (second.match.golVisitante || 0);
      if (secondGoals !== firstGoals) return secondGoals - firstGoals;
      const firstDifference = Math.abs(
        (first.match.golLocal || 0) - (first.match.golVisitante || 0),
      );
      const secondDifference = Math.abs(
        (second.match.golLocal || 0) - (second.match.golVisitante || 0),
      );
      return secondDifference - firstDifference || first.index - second.index;
    });
  const header = `🏁 Resultados J${input.jornada || ''}`.trim();
  const suffix = '#LigaMX #Resultados';
  const lines: string[] = [];
  for (const { match } of ranked) {
    const next = [...lines, resultLine(match)];
    const candidate = `${header}\n\n${next.join('\n')}\n\n${suffix}`;
    if (candidate.length <= 280) lines.push(resultLine(match));
  }
  return {
    post: `${header}\n\n${lines.join('\n')}\n\n${suffix}`,
    reply: `Consulta marcadores, fichas y detalles de la Jornada ${input.jornada || ''}:\n${buildTrackingUrl(input, 'x')}`,
  };
}

export function resolveMatchScorers(
  match: Match,
  players: PlayerTeam,
): { local: SocialScorer[]; visitor: SocialScorer[] } {
  const resolve = (team: string, number: number) =>
    players
      .get(team.replaceAll('.', ''))
      ?.find(player => player.number === number)?.name || `Jugador #${number}`;
  const scorers = {
    local: [] as SocialScorer[],
    visitor: [] as SocialScorer[],
  };
  getGoalEvents(match.events || []).forEach(goal => {
    const team = goal.team === 'local' ? match.local : match.visitante;
    const side = goal.team === 'local' ? 'local' : 'visitor';
    scorers[side].push({
      name: resolve(team, goal.player),
      ownGoal: Boolean(goal.ownGoal),
      minute: formatMatchMinute(goal.minute, goal.addedTime),
    });
  });
  return scorers;
}

export function buildTrackingUrl(
  input: SocialImageInput,
  platform: SocialPlatform,
): string {
  const url = new URL(SOCIAL_CONFIG.siteUrl);
  url.searchParams.set(
    'tab',
    input.template === 'standings' ? 'Tabla General' : 'Calendario',
  );
  if (input.jornada)
    url.searchParams.set('filterJornada', String(input.jornada));
  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set(
    'utm_campaign',
    input.jornada ? `jornada_${input.jornada}` : 'liga_mx',
  );
  url.searchParams.set('utm_content', input.template);
  return url.toString();
}

export function buildRenderResult(input: SocialImageInput): SocialRenderResult {
  const errors = validateSocialInput(input);
  const date = input.dateKey || new Date().toISOString().slice(0, 10);
  return {
    alt: buildAltText(input),
    errors,
    filename: `liga-mx-hrlv-${input.template}-j${input.jornada || 'actual'}-${date}.png`,
  };
}
