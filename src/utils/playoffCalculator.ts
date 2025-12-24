import { FirebaseUpdates, Match, TableEntry } from '../types/index.js';
import { LIGUILLA } from './constants.js';
import { saveUpdates } from '../services/firebaseService.js';

function createPlayInMatches(
  table: TableEntry[],
  matches: Match[],
  playInConfig: typeof LIGUILLA.playIn1,
): FirebaseUpdates {
  const updates: FirebaseUpdates = {};
  updates[`/matches/${playInConfig.id}/local`] =
    table[playInConfig.local].equipo;
  updates[`/matches/${playInConfig.id}/visitante`] =
    table[playInConfig.visitante].equipo;
  updates[`/matches/${playInConfig.id}/estadio`] = getEstadio(
    table[playInConfig.local].equipo,
    matches,
  );
  return updates;
}

function handlePlayInMatch(
  match: Match | undefined,
  playInConfig: typeof LIGUILLA.playIn1,
  playOff3Id: number,
  table: TableEntry[],
  matches: Match[],
  playIn3: FirebaseUpdates,
  isFirstMatch: boolean,
): void {
  if (!match || match.golLocal < 0 || match.golVisitante < 0) return;

  const winner =
    match.golLocal >= match.golVisitante ? match.local : match.visitante;
  const loser =
    match.golLocal >= match.golVisitante ? match.visitante : match.local;

  if (isFirstMatch) {
    playIn3[`/matches/${playOff3Id}/local`] = loser;
    const estadio = getEstadio(loser, matches);
    playIn3[`/matches/${playOff3Id}/estadio`] = estadio;
    if (winner === match.visitante) {
      [table[playInConfig.local], table[playInConfig.visitante]] = [
        table[playInConfig.visitante],
        table[playInConfig.local],
      ];
    }
  } else {
    playIn3[`/matches/${playOff3Id}/visitante`] = winner;
    if (loser === match.local) {
      table[playInConfig.local].eliminado = true;
    } else {
      table[playInConfig.visitante].eliminado = true;
    }
  }
}

function handlePlayOff3Match(match: Match, table: TableEntry[]): void {
  if (match.golLocal < 0 || match.golVisitante < 0) return;

  const loserTeam =
    match.golLocal > match.golVisitante ? match.visitante : match.local;
  const team = table.find(t => t.equipo === loserTeam);
  if (team) team.eliminado = true;
}

export function calculatePlayIn(table: TableEntry[], matches: Match[]) {
  const playIn1 = createPlayInMatches(table, matches, LIGUILLA.playIn1);
  const playIn2 = createPlayInMatches(table, matches, LIGUILLA.playIn2);
  const playIn3: FirebaseUpdates = {};

  const playIn1Match = matches.find(x => x.idMatch === LIGUILLA.playIn1.id);
  const playIn2Match = matches.find(x => x.idMatch === LIGUILLA.playIn2.id);

  handlePlayInMatch(
    playIn1Match,
    LIGUILLA.playIn1,
    LIGUILLA.playOff3.id,
    table,
    matches,
    playIn3,
    true,
  );
  handlePlayInMatch(
    playIn2Match,
    LIGUILLA.playIn2,
    LIGUILLA.playOff3.id,
    table,
    matches,
    playIn3,
    false,
  );

  const playOff3Match = matches.find(x => x.idMatch === LIGUILLA.playOff3.id);
  if (playOff3Match) {
    handlePlayOff3Match(playOff3Match, table);
  }

  const updates = { ...playIn1, ...playIn2, ...playIn3 };
  saveUpdates(updates);
  calculateQuarterFinal(table, matches);
}

function createPlayoffMatches(
  playoffMatch: typeof LIGUILLA.quarter1,
  quarters: TableEntry[],
  matches: Match[],
): FirebaseUpdates {
  const update: FirebaseUpdates = {};
  update[`/matches/${playoffMatch.ida.id}/local`] =
    quarters[playoffMatch.visitante].equipo;
  update[`/matches/${playoffMatch.ida.id}/visitante`] =
    quarters[playoffMatch.local].equipo;
  update[`/matches/${playoffMatch.vuelta.id}/local`] =
    quarters[playoffMatch.local].equipo;
  update[`/matches/${playoffMatch.vuelta.id}/visitante`] =
    quarters[playoffMatch.visitante].equipo;
  update[`/matches/${playoffMatch.ida.id}/estadio`] = getEstadio(
    quarters[playoffMatch.visitante].equipo,
    matches,
  );
  update[`/matches/${playoffMatch.vuelta.id}/estadio`] = getEstadio(
    quarters[playoffMatch.local].equipo,
    matches,
  );
  return update;
}

function calculateQuarterFinal(table: TableEntry[], matches: Match[]) {
  const quarters = table.filter(team => !team.eliminado);
  const quarter1: FirebaseUpdates = createPlayoffMatches(
    LIGUILLA.quarter1,
    quarters,
    matches,
  );
  const quarter2: FirebaseUpdates = createPlayoffMatches(
    LIGUILLA.quarter2,
    quarters,
    matches,
  );
  const quarter3: FirebaseUpdates = createPlayoffMatches(
    LIGUILLA.quarter3,
    quarters,
    matches,
  );
  const quarter4: FirebaseUpdates = createPlayoffMatches(
    LIGUILLA.quarter4,
    quarters,
    matches,
  );
  const updates = { ...quarter1, ...quarter2, ...quarter3, ...quarter4 };
  saveUpdates(updates);
  calculateSemiFinal(table, matches);
}

function handlePlayOffMatch(
  playoffMatch: typeof LIGUILLA.quarter1,
  table: TableEntry[],
  matches: Match[],
): void {
  const idaMatch = matches.find(x => x.idMatch === playoffMatch.ida.id);
  const vueltaMatch = matches.find(x => x.idMatch === playoffMatch.vuelta.id);
  if (
    !idaMatch ||
    idaMatch.golLocal < 0 ||
    idaMatch.golVisitante < 0 ||
    !vueltaMatch ||
    vueltaMatch.golLocal < 0 ||
    vueltaMatch.golVisitante < 0
  )
    return;
  const match = {
    local: idaMatch.visitante || '',
    visitante: idaMatch.local || '',
    golLocal: (idaMatch.golVisitante || 0) + (vueltaMatch.golLocal || 0),
    golVisitante: (idaMatch.golLocal || 0) + (vueltaMatch.golVisitante || 0),
  };
  const losser =
    match.golLocal >= match.golVisitante ? match.visitante : match.local;
  const team = table.find(t => t.equipo === losser);
  if (team) team.eliminado = true;
}

function calculateSemiFinal(table: TableEntry[], matches: Match[]) {
  handlePlayOffMatch(LIGUILLA.quarter1, table, matches);
  handlePlayOffMatch(LIGUILLA.quarter2, table, matches);
  handlePlayOffMatch(LIGUILLA.quarter3, table, matches);
  handlePlayOffMatch(LIGUILLA.quarter4, table, matches);
  const semis = table.filter(team => !team.eliminado);
  const semis1: FirebaseUpdates = createPlayoffMatches(
    LIGUILLA.semi1,
    semis,
    matches,
  );
  const semis2: FirebaseUpdates = createPlayoffMatches(
    LIGUILLA.semi2,
    semis,
    matches,
  );
  const updates = { ...semis1, ...semis2 };
  saveUpdates(updates);
  calculateFinal(table, matches);
}

function calculateFinal(table: TableEntry[], matches: Match[]) {
  handlePlayOffMatch(LIGUILLA.semi1, table, matches);
  handlePlayOffMatch(LIGUILLA.semi2, table, matches);
  const teams = table.filter(team => !team.eliminado);
  const final: FirebaseUpdates = createPlayoffMatches(
    LIGUILLA.final,
    teams,
    matches,
  );

  const updates = { ...final };
  saveUpdates(updates);
}

function getEstadio(team: string, matches: Match[]) {
  return matches.find(x => x.local === team)?.estadio || '';
}
