import { Match, TableEntry } from '../types';
import { POSTSEASON_FORMAT } from './constants.js';

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
const TOTAL_REGULAR_SEASON_MATCHES = 17;

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
        match.jornada <= TOTAL_REGULAR_SEASON_MATCHES,
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
  markQualifiedTeams(table);
  return table;
}

function markQualifiedTeams(table: TableEntry[]): void {
  const { directQualificationSpots, playInSpots } = POSTSEASON_FORMAT;
  const totalPostseasonSpots = directQualificationSpots + playInSpots;
  const allTeamsFinished = table.every(
    team => team.jj >= TOTAL_REGULAR_SEASON_MATCHES,
  );

  resetPostseasonStatus(table);

  if (allTeamsFinished) {
    table.forEach((team, index) => {
      team.clasificado = index < directQualificationSpots;
      team.playin =
        index >= directQualificationSpots && index < totalPostseasonSpots;
      team.eliminado = index >= totalPostseasonSpots;
    });
    return;
  }

  const directChallengers = table.slice(directQualificationSpots);
  const playInChallengers = table.slice(totalPostseasonSpots);
  const postseasonCutoffTeam = table[totalPostseasonSpots - 1];

  table.forEach((team, index) => {
    team.clasificado =
      index < directQualificationSpots &&
      directChallengers.every(
        challenger => getMaxPossiblePoints(challenger) < team.pts,
      );
    team.playin =
      playInSpots > 0 &&
      index >= directQualificationSpots &&
      index < totalPostseasonSpots &&
      playInChallengers.every(
        challenger => getMaxPossiblePoints(challenger) < team.pts,
      );
    team.eliminado =
      index >= totalPostseasonSpots &&
      postseasonCutoffTeam != null &&
      getMaxPossiblePoints(team) < postseasonCutoffTeam.pts;
  });
}

function resetPostseasonStatus(table: TableEntry[]): void {
  table.forEach(team => {
    team.clasificado = false;
    team.playin = false;
    team.eliminado = false;
  });
}

function getMaxPossiblePoints(team: TableEntry): number {
  const pendingMatches = Math.max(0, TOTAL_REGULAR_SEASON_MATCHES - team.jj);
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
