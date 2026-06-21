import { Match, PhaseMatchEvent } from '../types/index.js';
import { getPhaseEvents, sortMatchEvents } from './functionUtils.js';

const END_PHASES = new Set<PhaseMatchEvent['phase']>(['fulltime']);

export function hasMatchStarted(match: Match): boolean {
  return getPhaseEvents(match.events || []).some(
    event => event.phase === 'start',
  );
}

export function hasMatchEnded(match: Match): boolean {
  return getPhaseEvents(match.events || []).some(event =>
    END_PHASES.has(event.phase),
  );
}

export function isMatchLive(match: Match): boolean {
  return hasMatchStarted(match) && !hasMatchEnded(match);
}

export function getLiveMatchPeriodLabel(match: Match): string | null {
  if (!isMatchLive(match)) return null;

  const phaseEvents = sortMatchEvents(match.events || []).filter(
    (event): event is PhaseMatchEvent => event.type === 'phase',
  );
  const latestPhase = phaseEvents[phaseEvents.length - 1];

  if (!latestPhase) return '1T';

  const labels: Record<string, string | null> = {
    start: '1T',
    halftime: 'Descanso',
    secondHalf: '2T',
    fulltime: null,
  };

  return labels[latestPhase.phase] ?? null;
}

export function lineupsReadyBeforeKickoff(match: Match): boolean {
  if (hasMatchStarted(match)) return false;
  return (
    countStarters(match.lineupLocal || []) === 11 &&
    countStarters(match.lineupVisitor || []) === 11
  );
}

function countStarters(lineup: Match['lineupLocal']): number {
  return lineup.filter(player => player.titular).length;
}
