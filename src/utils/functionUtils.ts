import {
  CardMatchEvent,
  CardType,
  FirebaseUpdates,
  FoulType,
  GoalMatchEvent,
  GoalType,
  MatchEvent,
  MatchPeriod,
  PhaseMatchEvent,
  SubstitutionMatchEvent,
  TeamSide,
  Match,
  TableEntry,
} from '../types';
import { LIGUILLA } from './constants.js';

export interface AggregateScore {
  local: number;
  visitante: number;
}

export interface PlayoffSeriesConfig {
  ida: {
    id: number;
  };
  vuelta: {
    id: number;
  };
}

export interface PlayoffSeriesResult {
  aggregate: Record<string, number>;
  winner: string | null;
}

const PLAYOFF_SERIES = [
  LIGUILLA.quarter1,
  LIGUILLA.quarter2,
  LIGUILLA.quarter3,
  LIGUILLA.quarter4,
  LIGUILLA.semi1,
  LIGUILLA.semi2,
  LIGUILLA.final,
];

function hasAvailableScore(match: Match): boolean {
  return (
    typeof match.golLocal === 'number' &&
    Number.isFinite(match.golLocal) &&
    typeof match.golVisitante === 'number' &&
    Number.isFinite(match.golVisitante)
  );
}

function hasTeams(match: Match): boolean {
  return match.local.trim() !== '' && match.visitante.trim() !== '';
}

export function getAggregateScoreForSecondLeg(
  match: Match,
  matches: Match[],
): AggregateScore | null {
  const series = PLAYOFF_SERIES.find(
    playoffSeries => playoffSeries.vuelta.id === match.idMatch,
  );

  if (!series || !hasTeams(match) || !hasAvailableScore(match)) return null;

  const firstLeg = matches.find(
    candidate => candidate.idMatch === series.ida.id,
  );

  if (!firstLeg || !hasTeams(firstLeg) || !hasAvailableScore(firstLeg)) {
    return null;
  }

  const secondLegTeams = new Set([match.local, match.visitante]);
  if (
    !secondLegTeams.has(firstLeg.local) ||
    !secondLegTeams.has(firstLeg.visitante)
  ) {
    return null;
  }

  const aggregate: Record<string, number> = {
    [firstLeg.local]: firstLeg.golLocal,
    [firstLeg.visitante]: firstLeg.golVisitante,
  };

  aggregate[match.local] += match.golLocal;
  aggregate[match.visitante] += match.golVisitante;

  return {
    local: aggregate[match.local],
    visitante: aggregate[match.visitante],
  };
}

export function getPlayoffSeriesMatches(
  series: PlayoffSeriesConfig,
  matches: Match[],
): { ida: Match | null; vuelta: Match | null } {
  return {
    ida: matches.find(candidate => candidate.idMatch === series.ida.id) || null,
    vuelta:
      matches.find(candidate => candidate.idMatch === series.vuelta.id) || null,
  };
}

export function getPlayoffSeriesResult(
  series: PlayoffSeriesConfig,
  matches: Match[],
  table: TableEntry[],
): PlayoffSeriesResult | null {
  const { ida, vuelta } = getPlayoffSeriesMatches(series, matches);

  if (
    !ida ||
    !vuelta ||
    !hasTeams(ida) ||
    !hasTeams(vuelta) ||
    !hasAvailableScore(ida) ||
    !hasAvailableScore(vuelta)
  ) {
    return null;
  }

  const secondLegTeams = new Set([vuelta.local, vuelta.visitante]);
  if (!secondLegTeams.has(ida.local) || !secondLegTeams.has(ida.visitante)) {
    return null;
  }

  const aggregate: Record<string, number> = {
    [ida.local]: ida.golLocal,
    [ida.visitante]: ida.golVisitante,
  };

  aggregate[vuelta.local] += vuelta.golLocal;
  aggregate[vuelta.visitante] += vuelta.golVisitante;

  let winner: string;
  if (aggregate[vuelta.local] > aggregate[vuelta.visitante]) {
    winner = vuelta.local;
  } else if (aggregate[vuelta.visitante] > aggregate[vuelta.local]) {
    winner = vuelta.visitante;
  } else {
    winner = getBestSeededTeam(vuelta.local, vuelta.visitante, table);
  }

  return { aggregate, winner };
}

function getBestSeededTeam(
  firstTeam: string,
  secondTeam: string,
  table: TableEntry[],
): string {
  const firstIndex = table.findIndex(team => team.equipo === firstTeam);
  const secondIndex = table.findIndex(team => team.equipo === secondTeam);

  if (firstIndex === -1 && secondIndex === -1) return firstTeam;
  if (firstIndex === -1) return secondTeam;
  if (secondIndex === -1) return firstTeam;
  return firstIndex <= secondIndex ? firstTeam : secondTeam;
}

export function dispatchEventMatchUpdated(
  detail: FirebaseUpdates,
): CustomEvent {
  const event = new CustomEvent('edit-match', {
    detail,
    bubbles: true,
    composed: true,
  });
  return event;
}

export function formatMatchMinute(minute: number, addedTime = 0): string {
  return addedTime > 0 ? `${minute}+${addedTime}'` : `${minute}'`;
}

export function getPeriodWeight(period: MatchPeriod): number {
  switch (period) {
    case '1T':
      return 1;
    case '2T':
      return 2;
    case '1TE':
      return 3;
    case '2TE':
      return 4;
    case 'PEN':
      return 5;
    default:
      return 99;
  }
}

export function sortMatchEvents(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => {
    const periodDiff = getPeriodWeight(a.period) - getPeriodWeight(b.period);
    if (periodDiff !== 0) return periodDiff;

    const minuteDiff = a.minute - b.minute;
    if (minuteDiff !== 0) return minuteDiff;

    const addedTimeDiff = (a.addedTime || 0) - (b.addedTime || 0);
    if (addedTimeDiff !== 0) return addedTimeDiff;

    return a.sequence - b.sequence;
  });
}

export function resequenceMatchEvents(events: MatchEvent[]): MatchEvent[] {
  return events.map((event, index) => ({
    ...event,
    sequence: index + 1,
  }));
}

export function inferMatchPeriod(minute: number): MatchPeriod {
  let inferredPeriod: MatchPeriod;
  if (minute <= 45) {
    inferredPeriod = '1T';
  } else if (minute <= 90) {
    inferredPeriod = '2T';
  } else if (minute <= 105) {
    inferredPeriod = '1TE';
  } else if (minute <= 120) {
    inferredPeriod = '2TE';
  } else {
    inferredPeriod = 'PEN';
  }
  return inferredPeriod;
}

export function buildGoalEvent(data: {
  id: string;
  team: TeamSide;
  minute: number;
  addedTime?: number;
  period?: MatchPeriod;
  sequence: number;
  player: number;
  ownGoal: boolean;
  goalType: GoalType;
  assist?: number | null;
}): GoalMatchEvent {
  return {
    id: data.id,
    type: 'goal',
    team: data.team,
    minute: data.minute,
    addedTime: data.addedTime || 0,
    period: data.period || inferMatchPeriod(data.minute),
    sequence: data.sequence,
    player: data.player,
    ownGoal: data.ownGoal,
    goalType: data.goalType,
    assist: data.assist ?? null,
  };
}

export function buildCardEvent(data: {
  id: string;
  team: TeamSide;
  minute: number;
  addedTime?: number;
  period?: MatchPeriod;
  sequence: number;
  player: number;
  cardType: CardType;
  foulType?: FoulType;
}): CardMatchEvent {
  return {
    id: data.id,
    type: 'card',
    team: data.team,
    minute: data.minute,
    addedTime: data.addedTime || 0,
    period: data.period || inferMatchPeriod(data.minute),
    sequence: data.sequence,
    player: data.player,
    cardType: data.cardType,
    foulType: data.foulType,
  };
}

export function buildSubstitutionEvent(data: {
  id: string;
  team: TeamSide;
  minute: number;
  addedTime?: number;
  period?: MatchPeriod;
  sequence: number;
  playerOut: number;
  playerIn: number;
}): SubstitutionMatchEvent {
  return {
    id: data.id,
    type: 'substitution',
    team: data.team,
    minute: data.minute,
    addedTime: data.addedTime || 0,
    period: data.period || inferMatchPeriod(data.minute),
    sequence: data.sequence,
    playerOut: data.playerOut,
    playerIn: data.playerIn,
  };
}

export function buildPhaseEvent(data: {
  id: string;
  phase: 'start' | 'halftime' | 'secondHalf' | 'fulltime';
  minute: number;
  addedTime?: number;
  period?: MatchPeriod;
  sequence: number;
}): PhaseMatchEvent {
  return {
    id: data.id,
    type: 'phase',
    phase: data.phase,
    minute: data.minute,
    addedTime: data.addedTime || 0,
    period: data.period || inferMatchPeriod(data.minute),
    sequence: data.sequence,
    team: '', // Phase events don't have a team, but we need to satisfy the type requirement.
  };
}

export function getGoalEvents(events: MatchEvent[]): GoalMatchEvent[] {
  return events
    ? events.filter((event): event is GoalMatchEvent => event.type === 'goal')
    : [];
}

export function getCardEvents(events: MatchEvent[]): CardMatchEvent[] {
  return events
    ? events.filter((event): event is CardMatchEvent => event.type === 'card')
    : [];
}

export function getSubstitutionEvents(
  events: MatchEvent[],
): SubstitutionMatchEvent[] {
  return events
    ? events.filter(
        (event): event is SubstitutionMatchEvent =>
          event.type === 'substitution',
      )
    : [];
}

export function getPhaseEvents(events: MatchEvent[]): PhaseMatchEvent[] {
  return events
    ? events.filter((event): event is PhaseMatchEvent => event.type === 'phase')
    : [];
}

export function calculateSequenceForNewEvent(
  events: MatchEvent[],
  minute: number,
  addedTime = 0,
): number {
  const sameMinuteEvents = events.filter(
    event => event.minute === minute && (event.addedTime || 0) === addedTime,
  );
  return sameMinuteEvents.length + 1; // +1 to place the new event after existing ones in the same minute
}

export function calculateSequenceForEditedEvent(
  events: MatchEvent[],
  eventId: string,
  minute: number,
  addedTime = 0,
): number {
  const eventBeingEdited = events.find(event => event.id === eventId);
  if (!eventBeingEdited) {
    return 1;
  }
  if (
    eventBeingEdited.minute === minute &&
    (eventBeingEdited.addedTime || 0) === addedTime
  ) {
    return eventBeingEdited.sequence;
  }
  const otherEventsSameMinute = events.filter(
    event =>
      event.id !== eventId &&
      event.minute === minute &&
      (event.addedTime || 0) === addedTime,
  );
  return otherEventsSameMinute.length + 1; // +1 to place the edited event after existing ones in the same minute
}
