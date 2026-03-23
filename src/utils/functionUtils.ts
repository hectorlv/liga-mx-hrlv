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
} from '../types';

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
  const otherEventsSameMinute = events.filter(
    event =>
      event.id !== eventId &&
      event.minute === minute &&
      (event.addedTime || 0) === addedTime,
  );
  return otherEventsSameMinute.length + 1; // +1 to place the edited event after existing ones in the same minute
}
