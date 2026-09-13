import { FirebaseUpdates, Match, TableEntry } from '../types/index.js';
import { LIGUILLA } from './constants.js';
import { hasMatchEnded } from './matchStatus.js';

type Series = typeof LIGUILLA.quarter1;

const sameId = (left: string | number, right: string | number) =>
  String(left) === String(right);

function matchById(matches: Match[], id: number): Match | undefined {
  return matches.find(match => sameId(match.idMatch, id));
}

function hasFinalScore(match: Match | undefined): match is Match {
  return (
    !!match &&
    hasMatchEnded(match) &&
    match.golLocal != null &&
    match.golVisitante != null
  );
}

function stadiumFor(team: string, matches: Match[]): string {
  return matches.find(match => match.local === team)?.estadio || '';
}

function setIfChanged(
  updates: FirebaseUpdates,
  match: Match | undefined,
  id: number,
  field: 'local' | 'visitante' | 'estadio',
  value: string,
) {
  if (match?.[field] !== value) updates[`/matches/${id}/${field}`] = value;
}

function assignSeries(
  updates: FirebaseUpdates,
  series: Series,
  orderedTeams: string[],
  matches: Match[],
) {
  const local = orderedTeams[series.local];
  const visitor = orderedTeams[series.visitante];
  if (!local || !visitor) return;
  const ida = matchById(matches, series.ida.id);
  const vuelta = matchById(matches, series.vuelta.id);
  setIfChanged(updates, ida, series.ida.id, 'local', visitor);
  setIfChanged(updates, ida, series.ida.id, 'visitante', local);
  setIfChanged(updates, ida, series.ida.id, 'estadio', stadiumFor(visitor, matches));
  setIfChanged(updates, vuelta, series.vuelta.id, 'local', local);
  setIfChanged(updates, vuelta, series.vuelta.id, 'visitante', visitor);
  setIfChanged(updates, vuelta, series.vuelta.id, 'estadio', stadiumFor(local, matches));
}

/** Returns a winner only after both legs are complete. */
function seriesWinner(
  series: Series,
  matches: Match[],
  rank: Map<string, number>,
): string | null {
  const ida = matchById(matches, series.ida.id);
  const vuelta = matchById(matches, series.vuelta.id);
  if (!hasFinalScore(ida) || !hasFinalScore(vuelta)) return null;
  if (!ida.local || !ida.visitante || !vuelta.local || !vuelta.visitante)
    return null;
  const totals = new Map<string, number>([
    [ida.local, ida.golLocal],
    [ida.visitante, ida.golVisitante],
  ]);
  totals.set(vuelta.local, (totals.get(vuelta.local) || 0) + vuelta.golLocal);
  totals.set(
    vuelta.visitante,
    (totals.get(vuelta.visitante) || 0) + vuelta.golVisitante,
  );
  const [first, second] = [...totals.entries()];
  if (!first || !second) return null;
  if (first[1] !== second[1]) return first[1] > second[1] ? first[0] : second[0];
  return (rank.get(first[0]) ?? Infinity) < (rank.get(second[0]) ?? Infinity)
    ? first[0]
    : second[0];
}

/**
 * Pure calculation. It does not persist or mutate the table, and it never
 * promotes an incomplete series. The caller saves the one batch of changes.
 */
export function calculateQuarterFinal(
  table: TableEntry[],
  matches: Match[],
): FirebaseUpdates {
  const updates: FirebaseUpdates = {};
  const ranked = table.filter(team => !team.eliminado).map(team => team.equipo);
  if (ranked.length < 8) return updates;
  const rank = new Map(table.map((team, index) => [team.equipo, index]));
  const quarters = [
    LIGUILLA.quarter1,
    LIGUILLA.quarter2,
    LIGUILLA.quarter3,
    LIGUILLA.quarter4,
  ];
  quarters.forEach(series => assignSeries(updates, series, ranked, matches));

  const semiTeams = quarters.map(series => seriesWinner(series, matches, rank));
  if (semiTeams.every((team): team is string => !!team)) {
    assignSeries(updates, LIGUILLA.semi1, semiTeams, matches);
    assignSeries(updates, LIGUILLA.semi2, semiTeams, matches);
    const finalTeams = [
      seriesWinner(LIGUILLA.semi1, matches, rank),
      seriesWinner(LIGUILLA.semi2, matches, rank),
    ];
    if (finalTeams.every((team): team is string => !!team))
      assignSeries(updates, LIGUILLA.final, finalTeams, matches);
  }
  return updates;
}

export function calculatePlayIn(table: TableEntry[], matches: Match[]) {
  return calculateQuarterFinal(table, matches);
}
