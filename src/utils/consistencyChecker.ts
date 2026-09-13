import { GoalMatchEvent, Match, PlayerTeam } from '../types/index.js';
import { formatDate } from './dateUtils.js';
import { LIGUILLA } from './constants.js';

export type ConsistencyIssueKind =
  | 'invalid-schedule'
  | 'too-many-starters'
  | 'duplicate-jersey'
  | 'score-event-mismatch'
  | 'incomplete-playoff';

export interface ConsistencyIssue {
  id: string;
  kind: ConsistencyIssueKind;
  title: string;
  detail: string;
  href: string;
}

function matchHref(match: Match): string {
  return `?tab=Calendario&match=${encodeURIComponent(String(match.idMatch))}`;
}

function validSchedule(match: Match): boolean {
  const date = formatDate(match.fecha, match.hora);
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function addMatchIssues(issues: ConsistencyIssue[], matches: Match[]) {
  for (const match of matches) {
    if (!validSchedule(match)) {
      issues.push({
        id: `schedule-${match.idMatch}`,
        kind: 'invalid-schedule',
        title: 'Fecha u horario inválido',
        detail: `${match.local} vs ${match.visitante} no tiene una fecha y hora CDMX válidas.`,
        href: matchHref(match),
      });
    }

    for (const [side, lineup] of [
      ['Local', match.lineupLocal],
      ['Visitante', match.lineupVisitor],
    ] as const) {
      const starters = lineup.filter(player => player.titular).length;
      if (starters > 11) {
        issues.push({
          id: `starters-${match.idMatch}-${side}`,
          kind: 'too-many-starters',
          title: 'Más de once titulares',
          detail: `${match.local} vs ${match.visitante}: ${side.toLowerCase()} tiene ${starters} titulares.`,
          href: matchHref(match),
        });
      }
    }

    const goals = match.events.filter(
      (event): event is GoalMatchEvent => event.type === 'goal',
    );
    if (
      goals.length > 0 &&
      typeof match.golLocal === 'number' &&
      typeof match.golVisitante === 'number'
    ) {
      const fromEvents = goals.reduce(
        (score, goal) => {
          const localGoal = goal.team === 'local' ? !goal.ownGoal : goal.ownGoal;
          if (localGoal) score.local += 1;
          else score.visitante += 1;
          return score;
        },
        { local: 0, visitante: 0 },
      );
      if (
        fromEvents.local !== match.golLocal ||
        fromEvents.visitante !== match.golVisitante
      ) {
        issues.push({
          id: `goals-${match.idMatch}`,
          kind: 'score-event-mismatch',
          title: 'Marcador y eventos no coinciden',
          detail: `${match.local} vs ${match.visitante}: marcador ${match.golLocal}-${match.golVisitante}; eventos ${fromEvents.local}-${fromEvents.visitante}.`,
          href: matchHref(match),
        });
      }
    }
  }
}

function addDuplicateJerseys(issues: ConsistencyIssue[], players: PlayerTeam) {
  players.forEach((roster, team) => {
    const numbers = new Map<number, number>();
    roster.filter(player => !player.historical).forEach(player => {
      numbers.set(player.number, (numbers.get(player.number) || 0) + 1);
    });
    numbers.forEach((count, number) => {
      if (count > 1) {
        issues.push({
          id: `jersey-${team}-${number}`,
          kind: 'duplicate-jersey',
          title: 'Dorsal duplicado',
          detail: `${team} tiene ${count} jugadores activos con el dorsal ${number}.`,
          href: `?tab=Tabla%20General&team=${encodeURIComponent(team)}`,
        });
      }
    });
  });
}

function hasTeams(match: Match | undefined): boolean {
  return Boolean(match?.local?.trim() && match.visitante?.trim());
}

function addPlayoffIssues(issues: ConsistencyIssue[], matches: Match[]) {
  const series = [
    LIGUILLA.quarter1,
    LIGUILLA.quarter2,
    LIGUILLA.quarter3,
    LIGUILLA.quarter4,
    LIGUILLA.semi1,
    LIGUILLA.semi2,
    LIGUILLA.final,
  ];
  for (const current of series) {
    const ida = matches.find(match => match.idMatch === current.ida.id);
    const vuelta = matches.find(match => match.idMatch === current.vuelta.id);
    const idaReady = hasTeams(ida);
    const vueltaReady = hasTeams(vuelta);
    const inconsistentTeams =
      idaReady &&
      vueltaReady &&
      (ida!.local !== vuelta!.visitante || ida!.visitante !== vuelta!.local);
    if (idaReady !== vueltaReady || inconsistentTeams) {
      const target = ida || vuelta;
      if (!target) continue;
      issues.push({
        id: `playoff-${current.ida.id}`,
        kind: 'incomplete-playoff',
        title: 'Serie de liguilla incompleta',
        detail: `La serie ${current.ida.id}/${current.vuelta.id} no tiene participantes coherentes en ida y vuelta.`,
        href: matchHref(target),
      });
    }
  }
}

/** Pure, read-only diagnostic used by the admin consistency center. */
export function analyzeConsistency(
  matches: Match[],
  players: PlayerTeam,
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  addMatchIssues(issues, matches);
  addDuplicateJerseys(issues, players);
  addPlayoffIssues(issues, matches);
  return issues;
}
