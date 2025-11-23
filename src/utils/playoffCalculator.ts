import { FirebaseUpdates, Match, TableEntry } from '../types/index.js';
import { LIGUILLA } from './constants.js';
import { saveUpdates } from '../services/firebaseService.js';

export function calculatePlayIn(table: TableEntry[], matches: Match[]) {
  const playIn1 : FirebaseUpdates = {};
  playIn1[`/matches/${LIGUILLA.playIn1.id}/local`] =
    table[LIGUILLA.playIn1.local].equipo;
  playIn1[`/matches/${LIGUILLA.playIn1.id}/visitante`] =
    table[LIGUILLA.playIn1.visitante].equipo;
  playIn1[`/matches/${LIGUILLA.playIn1.id}/estadio`] = getEstadio(
    table[LIGUILLA.playIn1.local].equipo,
    matches,
  );
  const playIn2 : FirebaseUpdates = {};
  playIn2[`/matches/${LIGUILLA.playIn2.id}/local`] =
    table[LIGUILLA.playIn2.local].equipo;
  playIn2[`/matches/${LIGUILLA.playIn2.id}/visitante`] =
    table[LIGUILLA.playIn2.visitante].equipo;
  playIn2[`/matches/${LIGUILLA.playIn2.id}/estadio`] = getEstadio(
    table[LIGUILLA.playIn2.local].equipo,
    matches,
  );
  const playIn3: FirebaseUpdates = {};
  const playIn1Match = matches.find(x => x.idMatch === LIGUILLA.playIn1.id);
  const playIn2Match = matches.find(x => x.idMatch === LIGUILLA.playIn2.id);
  if (playIn1Match && playIn1Match.golLocal >= 0 && playIn1Match.golVisitante >= 0) {
    if (playIn1Match.golLocal > playIn1Match.golVisitante) {
      playIn3[`/matches/${LIGUILLA.playOff3.id}/local`] =
        playIn1Match.visitante;
      playIn3[`/matches/${LIGUILLA.playOff3.id}/estadio`] = getEstadio(
        playIn1Match.visitante,
        matches,
      );
    } else if (playIn1Match.golLocal < playIn1Match.golVisitante) {
      playIn3[`/matches/${LIGUILLA.playOff3.id}/local`] = playIn1Match.local;
      playIn3[`/matches/${LIGUILLA.playOff3.id}/estadio`] = getEstadio(
        playIn1Match.local,
        matches,
      );
      [table[LIGUILLA.playIn1.local], table[LIGUILLA.playIn1.visitante]] = [
        table[LIGUILLA.playIn1.visitante],
        table[LIGUILLA.playIn1.local],
      ];
    }
  }
  if (playIn2Match && playIn2Match.golLocal >= 0 && playIn2Match.golVisitante >= 0) {
    if (playIn2Match.golLocal > playIn2Match.golVisitante) {
      playIn3[`/matches/${LIGUILLA.playOff3.id}/visitante`] =
        playIn2Match.local;
      table[LIGUILLA.playIn2.visitante].eliminado = true;
    } else if (playIn2Match.golLocal < playIn2Match.golVisitante) {
      playIn3[`/matches/${LIGUILLA.playOff3.id}/visitante`] =
        playIn2Match.visitante;
      table[LIGUILLA.playIn2.local].eliminado = true;
    }
  }

  if (
    matches[LIGUILLA.playOff3.id].golLocal >= 0 &&
    matches[LIGUILLA.playOff3.id].golVisitante >= 0
  ) {
    if (
      matches[LIGUILLA.playOff3.id].golLocal >
      matches[LIGUILLA.playOff3.id].golVisitante
    ) {
      const team = table.find(
        team => team.equipo === matches[LIGUILLA.playOff3.id].visitante,
      );
      if (team) team.eliminado = true;
    } else if (
      matches[LIGUILLA.playOff3.id].golLocal <
      matches[LIGUILLA.playOff3.id].golVisitante
    ) {
      const team = table.find(
        team => team.equipo === matches[LIGUILLA.playOff3.id].local,
      );
      if (team) team.eliminado = true;
    }
  }
  const updates = { ...playIn1, ...playIn2, ...playIn3 };
  saveUpdates(updates);
  calculateQuarterFinal(table, matches);
}

function calculateQuarterFinal(table: TableEntry[], matches: Match[]) {
  const quarters = table.filter(team => !team.eliminado);
  const quarter1 : FirebaseUpdates = {};
  quarter1[`/matches/${LIGUILLA.quarter1.ida.id}/local`] =
    quarters[LIGUILLA.quarter1.visitante].equipo;
  quarter1[`/matches/${LIGUILLA.quarter1.ida.id}/visitante`] =
    quarters[LIGUILLA.quarter1.local].equipo;
  quarter1[`/matches/${LIGUILLA.quarter1.vuelta.id}/local`] =
    quarters[LIGUILLA.quarter1.local].equipo;
  quarter1[`/matches/${LIGUILLA.quarter1.vuelta.id}/visitante`] =
    quarters[LIGUILLA.quarter1.visitante].equipo;
  quarter1[`/matches/${LIGUILLA.quarter1.ida.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter1.visitante].equipo,
    matches,
  );
  quarter1[`/matches/${LIGUILLA.quarter1.vuelta.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter1.local].equipo,
    matches,
  );
  const quarter2 : FirebaseUpdates = {};
  quarter2[`/matches/${LIGUILLA.quarter2.ida.id}/local`] =
    quarters[LIGUILLA.quarter2.visitante].equipo;
  quarter2[`/matches/${LIGUILLA.quarter2.ida.id}/visitante`] =
    quarters[LIGUILLA.quarter2.local].equipo;
  quarter2[`/matches/${LIGUILLA.quarter2.vuelta.id}/local`] =
    quarters[LIGUILLA.quarter2.local].equipo;
  quarter2[`/matches/${LIGUILLA.quarter2.vuelta.id}/visitante`] =
    quarters[LIGUILLA.quarter2.visitante].equipo;
  quarter2[`/matches/${LIGUILLA.quarter2.ida.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter2.visitante].equipo,
    matches,
  );
  quarter2[`/matches/${LIGUILLA.quarter2.vuelta.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter2.local].equipo,
    matches,
  );
  const quarter3 : FirebaseUpdates = {};
  quarter3[`/matches/${LIGUILLA.quarter3.ida.id}/local`] =
    quarters[LIGUILLA.quarter3.visitante].equipo;
  quarter3[`/matches/${LIGUILLA.quarter3.ida.id}/visitante`] =
    quarters[LIGUILLA.quarter3.local].equipo;
  quarter3[`/matches/${LIGUILLA.quarter3.vuelta.id}/local`] =
    quarters[LIGUILLA.quarter3.local].equipo;
  quarter3[`/matches/${LIGUILLA.quarter3.vuelta.id}/visitante`] =
    quarters[LIGUILLA.quarter3.visitante].equipo;
  quarter3[`/matches/${LIGUILLA.quarter3.ida.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter3.visitante].equipo,
    matches,
  );
  quarter3[`/matches/${LIGUILLA.quarter3.vuelta.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter3.local].equipo,
    matches,
  );
  const quarter4 : FirebaseUpdates = {};
  quarter4[`/matches/${LIGUILLA.quarter4.ida.id}/local`] =
    quarters[LIGUILLA.quarter4.visitante].equipo;
  quarter4[`/matches/${LIGUILLA.quarter4.ida.id}/visitante`] =
    quarters[LIGUILLA.quarter4.local].equipo;
  quarter4[`/matches/${LIGUILLA.quarter4.vuelta.id}/local`] =
    quarters[LIGUILLA.quarter4.local].equipo;
  quarter4[`/matches/${LIGUILLA.quarter4.vuelta.id}/visitante`] =
    quarters[LIGUILLA.quarter4.visitante].equipo;
  quarter4[`/matches/${LIGUILLA.quarter4.ida.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter4.visitante].equipo,
    matches,
  );
  quarter4[`/matches/${LIGUILLA.quarter4.vuelta.id}/estadio`] = getEstadio(
    quarters[LIGUILLA.quarter4.local].equipo,
    matches,
  );
  const updates = { ...quarter1, ...quarter2, ...quarter3, ...quarter4 };
  saveUpdates(updates);
  calculateSemiFinal(table, matches);
}

function calculateSemiFinal(table: TableEntry[], matches: Match[]) {
  const quarter1 = {
    local: matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)?.visitante || '',
    visitante: matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)?.local || '',
    golLocal:
      (matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)?.golVisitante || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter1.vuelta.id)?.golLocal || 0),
    golVisitante:
      (matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)?.golLocal || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter1.vuelta.id)?.golVisitante || 0),
  };
  const quarter2 = {
    local: matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)?.visitante || '',
    visitante: matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)?.local || '',
    golLocal:
      (matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)?.golVisitante || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter2.vuelta.id)?.golLocal || 0),
    golVisitante:
      (matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)?.golLocal || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter2.vuelta.id)?.golVisitante || 0),
  };
  const quarter3 = {
    local: matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)?.visitante || '',
    visitante: matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)?.local || '',
    golLocal:
      (matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)?.golVisitante || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter3.vuelta.id)?.golLocal || 0),
    golVisitante:
      (matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)?.golLocal || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter3.vuelta.id)?.golVisitante || 0),
  };
  const quarter4 = {
    local: matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)?.visitante || '',
    visitante: matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)?.local || '',
    golLocal:
      (matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)?.golVisitante || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter4.vuelta.id)?.golLocal || 0),
    golVisitante:
      (matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)?.golLocal || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.quarter4.vuelta.id)?.golVisitante || 0),
  };
  if (quarter1.golLocal >= quarter1.golVisitante) {
    const q1Visitante = table.find(team => team.equipo === quarter1.visitante);
    if (q1Visitante) q1Visitante.eliminado = true;
  } else {
    const q1Local = table.find(team => team.equipo === quarter1.local);
    if (q1Local) q1Local.eliminado = true;
  }
  if (quarter2.golLocal >= quarter2.golVisitante) {
    const q2Visitante = table.find(team => team.equipo === quarter2.visitante);
    if (q2Visitante) q2Visitante.eliminado = true;
  } else {
    const q2Local = table.find(team => team.equipo === quarter2.local);
    if (q2Local) q2Local.eliminado = true;
  }
  if (quarter3.golLocal >= quarter3.golVisitante) {
    const q3Visitante = table.find(team => team.equipo === quarter3.visitante);
    if (q3Visitante) q3Visitante.eliminado = true;
  } else {
    const q3Local = table.find(team => team.equipo === quarter3.local);
    if (q3Local) q3Local.eliminado = true;
  }
  if (quarter4.golLocal >= quarter4.golVisitante) {
    const q4Visitante = table.find(team => team.equipo === quarter4.visitante);
    if (q4Visitante) q4Visitante.eliminado = true;
  } else {
    const q4Local = table.find(team => team.equipo === quarter4.local);
    if (q4Local) q4Local.eliminado = true;
  }
  const semis = table.filter(team => !team.eliminado);
  const semis1 : FirebaseUpdates = {};
  semis1[`/matches/${LIGUILLA.semi1.ida.id}/local`] =
    semis[LIGUILLA.semi1.visitante].equipo;
  semis1[`/matches/${LIGUILLA.semi1.ida.id}/visitante`] =
    semis[LIGUILLA.semi1.local].equipo;
  semis1[`/matches/${LIGUILLA.semi1.vuelta.id}/local`] =
    semis[LIGUILLA.semi1.local].equipo;
  semis1[`/matches/${LIGUILLA.semi1.vuelta.id}/visitante`] =
    semis[LIGUILLA.semi1.visitante].equipo;
  semis1[`/matches/${LIGUILLA.semi1.ida.id}/estadio`] = getEstadio(
    semis[LIGUILLA.semi1.visitante].equipo,
    matches,
  );
  semis1[`/matches/${LIGUILLA.semi1.vuelta.id}/estadio`] = getEstadio(
    semis[LIGUILLA.semi1.local].equipo,
    matches,
  );
  const semis2 : FirebaseUpdates = {};
  semis2[`/matches/${LIGUILLA.semi2.ida.id}/local`] =
    semis[LIGUILLA.semi2.visitante].equipo;
  semis2[`/matches/${LIGUILLA.semi2.ida.id}/visitante`] =
    semis[LIGUILLA.semi2.local].equipo;
  semis2[`/matches/${LIGUILLA.semi2.vuelta.id}/local`] =
    semis[LIGUILLA.semi2.local].equipo;
  semis2[`/matches/${LIGUILLA.semi2.vuelta.id}/visitante`] =
    semis[LIGUILLA.semi2.visitante].equipo;
  semis2[`/matches/${LIGUILLA.semi2.ida.id}/estadio`] = getEstadio(
    semis[LIGUILLA.semi2.visitante].equipo,
    matches,
  );
  semis2[`/matches/${LIGUILLA.semi2.vuelta.id}/estadio`] = getEstadio(
    semis[LIGUILLA.semi2.local].equipo,
    matches,
  );
  const updates = { ...semis1, ...semis2 };
  saveUpdates(updates);
  calculateFinal(table, matches);
}

function calculateFinal(table: TableEntry[], matches: Match[]) {
  const semis1 = {
    local: matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id)?.visitante || '',
    visitante: matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id)?.local || '',
    golLocal:
      (matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id)?.golVisitante || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.semi1.vuelta.id)?.golLocal || 0),
    golVisitante:
      (matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id)?.golLocal || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.semi1.vuelta.id)?.golVisitante || 0),
  };
  const semis2 = {
    local: matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id)?.visitante || '',
    visitante: matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id)?.local || '',
    golLocal:
      (matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id)?.golVisitante || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.semi2.vuelta.id)?.golLocal || 0),
    golVisitante:
      (matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id)?.golLocal || 0) +
      (matches.find(x => x.idMatch === LIGUILLA.semi2.vuelta.id)?.golVisitante || 0),
  };
  if (semis1.golLocal >= semis1.golVisitante) {
    const s1Visitante = table.find(team => team.equipo === semis1.visitante);
    if (s1Visitante) s1Visitante.eliminado = true;
  } else {
    const s1Local = table.find(team => team.equipo === semis1.local);
    if (s1Local) s1Local.eliminado = true;
  }
  if (semis2.golLocal >= semis2.golVisitante) {
    const s2Visitante = table.find(team => team.equipo === semis2.visitante);
    if (s2Visitante) s2Visitante.eliminado = true;
  } else {
    const s2Local = table.find(team => team.equipo === semis2.local);
    if (s2Local) s2Local.eliminado = true;
  }

  const teams = table.filter(team => !team.eliminado);
  const final : FirebaseUpdates = {};
  final[`/matches/${LIGUILLA.final.ida.id}/local`] =
    teams[LIGUILLA.final.visitante].equipo;
  final[`/matches/${LIGUILLA.final.ida.id}/visitante`] =
    teams[LIGUILLA.final.local].equipo;
  final[`/matches/${LIGUILLA.final.vuelta.id}/local`] =
    teams[LIGUILLA.final.local].equipo;
  final[`/matches/${LIGUILLA.final.vuelta.id}/visitante`] =
    teams[LIGUILLA.final.visitante].equipo;
  final[`/matches/${LIGUILLA.final.ida.id}/estadio`] = getEstadio(
    teams[LIGUILLA.final.visitante].equipo,
    matches,
  );
  final[`/matches/${LIGUILLA.final.vuelta.id}/estadio`] = getEstadio(
    teams[LIGUILLA.final.local].equipo,
    matches,
  );

  const updates = { ...final };
  saveUpdates(updates);
}

function getEstadio(team: string, matches: Match[]) {
  return matches.find(x => x.local === team)?.estadio || '';
}
