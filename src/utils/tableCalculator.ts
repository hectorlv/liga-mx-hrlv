import { Match, TableEntry } from '../types';
import { POSTSEASON_FORMAT, REGULAR_SEASON_LAST_JORNADA } from './constants.js';
import { resolveMatchStatus } from './matchStatus.js';

type TeamSide = 'home' | 'away';
type MatchResult = 'win' | 'draw' | 'loss';
type ResultCounters = {
  jg: number;
  je: number;
  jp: number;
};
type MatchWithScore = Match & {
  golLocal: number;
  golVisitante: number;
};

function calculateTeamStats(team: string, matches: Match[]): TableEntry {
  const counters: ResultCounters = { jg: 0, je: 0, jp: 0 };
  let gf = 0;
  let gc = 0;

  for (const match of matches) {
    if (!hasFinalScore(match)) {
      continue;
    }

    const side = getTeamSide(match, team);
    if (!side) {
      continue;
    }

    const [goalsFor, goalsAgainst] = getPerspectiveGoals(match, side);
    gf += goalsFor;
    gc += goalsAgainst;

    const result = resolveResult(goalsFor, goalsAgainst);
    applyResult(counters, result);
  }

  const { jg, je, jp } = counters;
  return {
    equipo: team,
    jj: jg + je + jp,
    jg,
    je,
    jp,
    gf,
    gc,
    dg: gf - gc,
    pts: 3 * jg + je,
  };
}

export function calculateTable(
  teams: string[],
  matches: Match[],
): TableEntry[] {
  const table = teams.map(team => {
    const teamMatches = matches.filter(
      match =>
        (match.local === team || match.visitante === team) &&
        match.golLocal != null &&
        match.golVisitante != null &&
        match.status !== 'cancelled' &&
        match.jornada <= REGULAR_SEASON_LAST_JORNADA,
    );
    const teamStats = calculateTeamStats(team, teamMatches);
    return teamStats;
  });
  table.sort((a, b) => {
    if (a.pts !== b.pts) {
      return b.pts - a.pts;
    }
    if (a.dg !== b.dg) {
      return b.dg - a.dg;
    }
    return b.gf - a.gf;
  });
  markPostseasonStatus(table);
  markGuaranteedQualifiedTeams(table, teams, matches);
  return table;
}

function markPostseasonStatus(table: TableEntry[]): void {
  const { directQualificationSpots, playInSpots } = POSTSEASON_FORMAT;
  const totalPostseasonSpots = directQualificationSpots + playInSpots;
  const allTeamsFinished = table.every(
    team => team.jj >= REGULAR_SEASON_LAST_JORNADA,
  );

  resetPostseasonStatus(table);

  if (allTeamsFinished) {
    table.forEach((team, index) => {
      team.playin =
        index >= directQualificationSpots && index < totalPostseasonSpots;
      team.eliminado = index >= totalPostseasonSpots;
    });
    return;
  }

  const playInChallengers = table.slice(totalPostseasonSpots);
  const postseasonCutoffTeam = table[totalPostseasonSpots - 1];

  table.forEach((team, index) => {
    team.playin =
      playInSpots > 0 &&
      index >= directQualificationSpots &&
      index < totalPostseasonSpots &&
      playInChallengers.every(
        challenger => getMaxPossiblePoints(challenger) < team.pts,
      );
    team.eliminado =
      index >= totalPostseasonSpots &&
      (team.jj >= REGULAR_SEASON_LAST_JORNADA ||
        (postseasonCutoffTeam != null &&
          getMaxPossiblePoints(team) < postseasonCutoffTeam.pts));
  });
}

/** Guaranteed places use finalized results, independently of the live order. */
function markGuaranteedQualifiedTeams(
  table: TableEntry[],
  teams: string[],
  matches: Match[],
): void {
  // An incomplete team list could hide a challenger. Missing fixtures, however,
  // remain possible games through the conservative 17 - finalized JJ bound.
  if (
    teams.length !== REGULAR_SEASON_LAST_JORNADA + 1 ||
    teams.some(team => typeof team !== 'string' || !team.trim()) ||
    new Set(teams).size !== teams.length
  )
    return;

  const regular = matches
    .filter(match => match.jornada <= REGULAR_SEASON_LAST_JORNADA)
    .map(match => ({
      ...match,
      events: Object.values(match.events || {}).filter(event => event != null),
    }));
  if (
    regular.some(
      match =>
        !Number.isSafeInteger(match.idMatch) ||
        match.idMatch < 0 ||
        !Number.isInteger(match.jornada) ||
        match.jornada < 1 ||
        !teams.includes(match.local) ||
        !teams.includes(match.visitante) ||
        match.local === match.visitante,
    ) ||
    new Set(regular.map(match => match.idMatch)).size !== regular.length
  )
    return;

  const finished = regular.filter(
    match => resolveMatchStatus(match) === 'finished',
  );
  if (
    finished.some(
      match =>
        ![match.golLocal, match.golVisitante].every(
          value => Number.isSafeInteger(value) && value >= 0,
        ),
    )
  )
    return;

  const finalizedTable: TableEntry[] = [];
  for (const team of teams) {
    const own = regular.filter(
      match => match.local === team || match.visitante === team,
    );
    if (
      own.length > REGULAR_SEASON_LAST_JORNADA ||
      new Set(own.map(match => match.jornada)).size !== own.length ||
      new Set(
        own.map(match =>
          match.local === team ? match.visitante : match.local,
        ),
      ).size !== own.length
    )
      return;
    const stats = calculateTeamStats(team, finished);
    if (![stats.pts, stats.gf, stats.gc, stats.dg].every(Number.isSafeInteger))
      return;
    finalizedTable.push(stats);
  }

  for (const team of finalizedTable) {
    const challengers = finalizedTable.filter(rival => {
      if (rival.equipo === team.equipo) return false;
      const maximum = getMaxPossiblePoints(rival);
      if (maximum !== team.pts) return maximum > team.pts;
      // Future goals are unbounded, so an attainable points tie remains a risk.
      if (
        team.jj < REGULAR_SEASON_LAST_JORNADA ||
        rival.jj < REGULAR_SEASON_LAST_JORNADA
      )
        return true;
      return (
        rival.dg > team.dg || (rival.dg === team.dg && rival.gf >= team.gf)
      );
    });
    const displayed = table.find(row => row.equipo === team.equipo);
    if (displayed)
      displayed.clasificado =
        challengers.length < POSTSEASON_FORMAT.directQualificationSpots;
  }
}

function resetPostseasonStatus(table: TableEntry[]): void {
  table.forEach(team => {
    team.clasificado = false;
    team.playin = false;
    team.eliminado = false;
  });
}

function getMaxPossiblePoints(team: TableEntry): number {
  const pendingMatches = Math.max(0, REGULAR_SEASON_LAST_JORNADA - team.jj);
  return team.pts + pendingMatches * 3;
}

function hasFinalScore(match: Match): match is MatchWithScore {
  return match.golLocal != null && match.golVisitante != null;
}

function getTeamSide(match: Match, team: string): TeamSide | null {
  if (match.local === team) {
    return 'home';
  }
  if (match.visitante === team) {
    return 'away';
  }
  return null;
}

function getPerspectiveGoals(
  match: MatchWithScore,
  side: TeamSide,
): [number, number] {
  return side === 'home'
    ? [match.golLocal, match.golVisitante]
    : [match.golVisitante, match.golLocal];
}

function resolveResult(goalsFor: number, goalsAgainst: number): MatchResult {
  if (goalsFor === goalsAgainst) {
    return 'draw';
  }
  return goalsFor > goalsAgainst ? 'win' : 'loss';
}

function applyResult(counters: ResultCounters, result: MatchResult): void {
  if (result === 'win') {
    counters.jg += 1;
    return;
  }
  if (result === 'draw') {
    counters.je += 1;
    return;
  }
  counters.jp += 1;
}
