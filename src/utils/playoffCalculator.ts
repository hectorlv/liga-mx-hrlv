import { FirebaseUpdates, Match, TableEntry } from '../types/index.js';
import { LIGUILLA } from './constants.js';
import { getPlayoffSeriesResult } from './functionUtils.js';
import { resolveMatchStatus } from './matchStatus.js';

export type PlayoffParticipants = Pick<Match, 'local' | 'visitante'>;

const ROUNDS = [
  [LIGUILLA.quarter1, LIGUILLA.quarter2, LIGUILLA.quarter3, LIGUILLA.quarter4],
  [LIGUILLA.semi1, LIGUILLA.semi2],
  [LIGUILLA.final],
];

export function hasPlayoffParticipants(
  match: Match | undefined,
  participants: PlayoffParticipants | undefined,
): match is Match {
  return (
    !!match &&
    !!participants &&
    match.local === participants.local &&
    match.visitante === participants.visitante
  );
}

export function hasFinishedPlayoffLeg(match: Match): boolean {
  return (
    [match.golLocal, match.golVisitante].every(
      score => Number.isSafeInteger(score) && score >= 0,
    ) && resolveMatchStatus(match) === 'finished'
  );
}

export function calculatePlayoffAssignments(
  table: TableEntry[],
  matches: Match[],
): Map<number, PlayoffParticipants> {
  const assignments = new Map<number, PlayoffParticipants>();
  const ranked = table.filter(team => !team.eliminado).map(team => team.equipo);
  let seeds = ranked.slice(0, 8);
  if (seeds.length < 8 || seeds.some(team => !team) || new Set(seeds).size < 8)
    return assignments;

  const matchesById = new Map(
    matches.map(match => [Number(match.idMatch), match]),
  );
  for (const round of ROUNDS) {
    const winners = round.map(series => {
      const local = seeds[series.local];
      const visitor = seeds[series.visitante];
      const awayLeg = { local: visitor, visitante: local };
      const homeLeg = { local, visitante: visitor };
      assignments.set(series.ida.id, awayLeg);
      assignments.set(series.vuelta.id, homeLeg);

      const ida = matchesById.get(series.ida.id);
      const vuelta = matchesById.get(series.vuelta.id);
      if (
        !hasPlayoffParticipants(ida, awayLeg) ||
        !hasPlayoffParticipants(vuelta, homeLeg) ||
        !hasFinishedPlayoffLeg(ida) ||
        !hasFinishedPlayoffLeg(vuelta)
      )
        return null;

      return (
        getPlayoffSeriesResult(series, [ida, vuelta], table)?.winner ?? null
      );
    });

    if (winners.some(winner => winner === null)) break;
    seeds = ranked.filter(team => winners.includes(team));
  }
  return assignments;
}

function hasRecordedPlayoffData(match: Match): boolean {
  return (
    [
      match.golLocal,
      match.golVisitante,
      match.penaltyLocal,
      match.penaltyVisitante,
    ].some(score => typeof score === 'number') ||
    [match.events, match.lineupLocal, match.lineupVisitor].some(collection =>
      Object.values(collection || {}).some(Boolean),
    )
  );
}

/** Returns the changes for the existing administrative save. */
export function calculateQuarterFinal(
  table: TableEntry[],
  matches: Match[],
): FirebaseUpdates {
  const updates: FirebaseUpdates = {};
  const assignments = calculatePlayoffAssignments(table, matches);
  const matchesById = new Map(
    matches.map(match => [Number(match.idMatch), match]),
  );

  for (const series of ROUNDS.flat()) {
    const legs = [series.ida.id, series.vuelta.id].flatMap(id => {
      const match = matchesById.get(id);
      const participants = assignments.get(id);
      return match && participants ? [{ id, match, participants }] : [];
    });

    // Updating either leg could associate existing match data with the wrong teams.
    if (
      legs.some(
        ({ match, participants }) =>
          !hasPlayoffParticipants(match, participants) &&
          hasRecordedPlayoffData(match),
      )
    )
      continue;

    for (const { id, match, participants } of legs) {
      if (hasRecordedPlayoffData(match)) continue;
      const estadio =
        hasPlayoffParticipants(match, participants) && match.estadio
          ? match.estadio
          : matches.find(
              candidate =>
                candidate.local === participants.local && candidate.estadio,
            )?.estadio || '';
      const fields = { ...participants, estadio };
      for (const field of ['local', 'visitante', 'estadio'] as const) {
        if (match[field] !== fields[field])
          updates[`/matches/${id}/${field}`] = fields[field];
      }
    }
  }
  return updates;
}

export function calculatePlayIn(table: TableEntry[], matches: Match[]) {
  return calculateQuarterFinal(table, matches);
}
