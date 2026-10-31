import type { Match, PlayerGame, TeamSide } from '../types/index.js';
import { getCardEvents, getSubstitutionEvents } from './functionUtils.js';
import { resolveMatchStatus } from './matchStatus.js';
import { formatDate, formatDateDDMMYYYY } from './dateUtils.js';
import {
  JORNADA_LIGUILLA,
  REGULAR_SEASON_LAST_JORNADA,
} from './tournamentRules.js';

export interface PlayerAppearance {
  match: Match;
  minutes: number;
  starter: boolean | undefined;
}

/** Conserva las reglas de minutos de la lista de jugadores (sin tiempo añadido). */
function appearanceMinutes(
  player: PlayerGame,
  match: Match,
  side: TeamSide,
): number {
  const substitutions = getSubstitutionEvents(match.events);
  const inMinute = player.entroDeCambio
    ? (substitutions.find(
        event => event.team === side && event.playerIn === player.number,
      )?.minute ?? 0)
    : 0;
  const outMinute = player.salioDeCambio
    ? (substitutions.find(
        event => event.team === side && event.playerOut === player.number,
      )?.minute ?? 90)
    : (getCardEvents(match.events).find(
        event =>
          event.team === side &&
          event.player === player.number &&
          event.cardType === 'red',
      )?.minute ?? 90);
  return outMinute - inMinute;
}

export function appearanceDate(match: Match): Date | null {
  const date =
    match.fecha instanceof Date
      ? match.fecha
      : formatDate(match.fecha, match.hora || '00:00');
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}

export function appearanceDateLabel(match: Match): string {
  const date = appearanceDate(match);
  return date ? formatDateDDMMYYYY(date) : '—';
}

export function appearancePhase(match: Match): string {
  if (match.jornada >= 1 && match.jornada <= REGULAR_SEASON_LAST_JORNADA)
    return 'Fase regular';
  return (
    JORNADA_LIGUILLA.find(phase => phase.id === match.jornada)?.descripcion ??
    '—'
  );
}

function createPlayerAppearance(
  player: PlayerGame,
  match: Match,
  side: TeamSide,
): PlayerAppearance {
  return {
    match,
    minutes: appearanceMinutes(player, match, side),
    starter: player.titular ?? (player.entroDeCambio ? false : undefined),
  };
}

/** Solo participaciones del equipo consultado; también alimentan los totales PJ/Min. */
export function getTeamPlayerAppearances(
  matches: Match[],
  team: string,
): Map<number, PlayerAppearance[]> {
  const appearances = new Map<number, PlayerAppearance[]>();
  for (const match of matches) {
    if (resolveMatchStatus(match) !== 'finished') continue;
    if (match.local !== team && match.visitante !== team) continue;
    const side = match.local === team ? 'local' : 'visitor';
    const lineup = side === 'local' ? match.lineupLocal : match.lineupVisitor;
    for (const player of lineup || []) {
      const rows = appearances.get(player.number) ?? [];
      rows.push(createPlayerAppearance(player, match, side));
      appearances.set(player.number, rows);
    }
  }
  for (const rows of appearances.values()) {
    rows.sort(
      (a, b) =>
        (appearanceDate(a.match)?.getTime() ?? 0) -
          (appearanceDate(b.match)?.getTime() ?? 0) ||
        a.match.idMatch - b.match.idMatch,
    );
  }
  return appearances;
}
