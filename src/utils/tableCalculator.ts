import { Match, TableEntry } from '../types';

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
        match.jornada <= 17,
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
  table.forEach((team, index) => {
    team.eliminado = index >= 10;
  });
  return table;
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

function applyResult(
  counters: ResultCounters,
  result: MatchResult,
): void {
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
