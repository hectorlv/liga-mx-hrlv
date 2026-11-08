/** Independently re-evaluate each solver witness, including exact large integers. */
export function verifyWitness(snapshot, witness, name, kind) {
  const table = new Map(snapshot.tablaBase.map(team => [team.equipo, {
    pts: BigInt(team.pts), dg: BigInt(team.dg), gf: BigInt(team.gf),
  }]));
  if (witness.marcadores.length !== snapshot.pendientes.length) return false;
  for (let index = 0; index < snapshot.pendientes.length; index++) {
    const match = snapshot.pendientes[index], [id, h, a] = witness.marcadores[index];
    if (id !== match.idMatch) return false;
    const home = BigInt(h), away = BigInt(a);
    if (home < 0n || away < 0n) return false;
    const local = table.get(match.local), visitor = table.get(match.visitante);
    local.gf += home; visitor.gf += away;
    local.dg += home - away; visitor.dg += away - home;
    local.pts += home > away ? 3n : home === away ? 1n : 0n;
    visitor.pts += away > home ? 3n : home === away ? 1n : 0n;
  }
  if (witness.tabla.some(row => {
    const actual = table.get(row.equipo);
    return !actual || actual.pts !== BigInt(row.pts) || actual.gf !== BigInt(row.gf) || actual.dg !== BigInt(row.dg);
  })) return false;
  const team = table.get(name);
  const others = [...table].filter(([other]) => other !== name).map(([, row]) => row);
  const above = others.filter(row => row.pts > team.pts || row.pts === team.pts &&
    (row.dg > team.dg || row.dg === team.dg && row.gf > team.gf)).length;
  const tied = others.filter(row => row.pts === team.pts && row.dg === team.dg && row.gf === team.gf).length;
  return kind === 'clasifica' ? above < snapshot.plazasTotales : above + tied >= snapshot.plazasTotales;
}

const jsonInteger = value => value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : value.toString();
function rankedWitness(snapshot, standings, scores, name) {
  const target = standings.find(team => team.equipo === name);
  const above = standings.filter(other => BigInt(other.pts) > BigInt(target.pts) || BigInt(other.pts) === BigInt(target.pts) &&
    (BigInt(other.dg) > BigInt(target.dg) || BigInt(other.dg) === BigInt(target.dg) && BigInt(other.gf) > BigInt(target.gf))).length;
  const ties = standings.filter(team => team.equipo !== name && BigInt(team.pts) === BigInt(target.pts) &&
    BigInt(team.dg) === BigInt(target.dg) && BigInt(team.gf) === BigInt(target.gf)).length;
  return { marcadores: scores, tabla: standings, mejorPosicion: above + 1, peorPosicion: above + ties + 1,
    empateTotalEnCorte: above < snapshot.plazasTotales && above + ties >= snapshot.plazasTotales };
}

/** Integer constraints share each game's score between both clubs. No score ceiling. */
export async function solveScenarios(api, snapshot, { deadline = Infinity, emit = () => {}, checkTimeoutMs = 1200, constraintsForTest } = {}) {
  const ctx = new api.Context('scenarios');
  const { Int, Bool, If, And, Or, Sum, Solver, PbEq, PbGe, PbLe } = ctx;
  const solver = new Solver();
  const pointsSolver = new Solver();
  const zero = Int.val(0);
  const sum = terms => terms.length ? Sum(...terms) : zero;
  const entries = snapshot.tablaBase;
  const modelTeams = new Map(entries.map((row, index) => [row.equipo, {
    ...row, index, points: [], pointFlags: [], pointWeights: [], goalsFor: [], goalsAgainst: [],
  }]));
  const games = snapshot.pendientes.map((match, index) => {
    const home = Int.const(`h${index}`), away = Int.const(`a${index}`);
    const outcome = Int.const(`result${index}`); // 0 draw, 1 home win, 2 away win.
    const homeWin = Bool.const(`hw${index}`), awayWin = Bool.const(`aw${index}`), draw = Bool.const(`d${index}`);
    pointsSolver.add(PbEq([homeWin, awayWin, draw], [1, 1, 1], 1));
    solver.add(home.ge(0), away.ge(0), outcome.eq(If(home.eq(away), zero, If(home.gt(away), Int.val(1), Int.val(2)))));
    const local = modelTeams.get(match.local), visitor = modelTeams.get(match.visitante);
    local.pointFlags.push(homeWin, draw); local.pointWeights.push(3, 1);
    visitor.pointFlags.push(awayWin, draw); visitor.pointWeights.push(3, 1);
    local.points.push(If(outcome.eq(1), Int.val(3), If(outcome.eq(0), Int.val(1), zero)));
    visitor.points.push(If(outcome.eq(2), Int.val(3), If(outcome.eq(0), Int.val(1), zero)));
    local.goalsFor.push(home); local.goalsAgainst.push(away);
    visitor.goalsFor.push(away); visitor.goalsAgainst.push(home);
    return { ...match, home, away, outcome, homeWin, awayWin };
  });
  for (const team of modelTeams.values()) {
    team.finalPoints = sum(team.points).add(team.pts);
    team.finalGF = sum(team.goalsFor).add(team.gf);
    team.finalDG = sum(team.goalsFor).sub(sum(team.goalsAgainst)).add(team.dg);
    team.maxPoints = team.pts + team.points.length * 3;
  }
  if (constraintsForTest) solver.add(...constraintsForTest(ctx, games, modelTeams));
  const rankCache = new Map();
  const rankFor = name => {
    if (rankCache.has(name)) return rankCache.get(name);
    const team = modelTeams.get(name);
    const strict = [], worst = [];
    for (const other of modelTeams.values()) {
      if (other === team) continue;
      const equalPoints = other.finalPoints.eq(team.finalPoints);
      const equalDG = other.finalDG.eq(team.finalDG);
      const equalGF = other.finalGF.eq(team.finalGF);
      const above = Or(other.finalPoints.gt(team.finalPoints), And(equalPoints, other.finalDG.gt(team.finalDG)),
        And(equalPoints, equalDG, other.finalGF.gt(team.finalGF)));
      strict.push(If(above, Int.val(1), zero));
      worst.push(If(Or(above, And(equalPoints, equalDG, equalGF)), Int.val(1), zero));
    }
    const result = { canQualify: sum(strict).lt(snapshot.plazasTotales), canFail: sum(worst).ge(snapshot.plazasTotales) };
    rankCache.set(name, result);
    return result;
  };
  const integer = (model, expr) => {
    const value = model.eval(expr, true).value();
    return jsonInteger(value);
  };
  const pointsAtLeast = (team, points) => {
    if (points <= team.pts) return Bool.val(true);
    if (points > team.maxPoints) return Bool.val(false);
    return PbGe(team.pointFlags, team.pointWeights, points - team.pts);
  };
  const witness = (model, name) => {
    const standings = [...modelTeams.values()].map(team => ({ equipo: team.equipo,
      pts: integer(model, team.finalPoints), dg: integer(model, team.finalDG), gf: integer(model, team.finalGF) }));
    return rankedWitness(snapshot, standings, games.map(game => [game.idMatch, integer(model, game.home), integer(model, game.away)]), name);
  };
  const minimalWitness = (outcomes, name) => {
    const table = new Map(entries.map(row => [row.equipo, { equipo: row.equipo, pts: BigInt(row.pts), dg: BigInt(row.dg), gf: BigInt(row.gf) }]));
    const scores = games.map((game, index) => {
      const home = outcomes[index] === 1 ? 1n : 0n, away = outcomes[index] === 2 ? 1n : 0n;
      const local = table.get(game.local), visitor = table.get(game.visitante);
      local.pts += home > away ? 3n : home === away ? 1n : 0n;
      visitor.pts += away > home ? 3n : home === away ? 1n : 0n;
      local.gf += home; visitor.gf += away; local.dg += home - away; visitor.dg += away - home;
      return [game.idMatch, Number(home), Number(away)];
    });
    return rankedWitness(snapshot, [...table.values()].map(row => ({ equipo: row.equipo, pts: jsonInteger(row.pts), dg: jsonInteger(row.dg), gf: jsonInteger(row.gf) })), scores, name);
  };
  let checks = 0;
  const check = async (conditions, team) => {
    const remaining = deadline - performance.now();
    if (remaining < 30) return { status: 'unknown' };
    solver.set('timeout', Math.max(1, Math.floor(Math.min(checkTimeoutMs, remaining - 20))));
    checks++;
    const status = await solver.check(...conditions);
    return { status, ...(status === 'sat' ? { witness: witness(solver.model(), team) } : {}) };
  };
  // A points-only UNSAT proof is sound for the richer goal model. A points-only
  // SAT result is never enough: verify an actual score witness or refine with
  // the full unbounded-goal model before concluding anything.
  const checkCase = async (ownPoints, rank, kind, name, finalPoints) => {
    const remaining = deadline - performance.now();
    if (remaining < 30) return { status: 'unknown' };
    pointsSolver.set('timeout', Math.max(1, Math.floor(Math.min(500, remaining - 20))));
    checks++;
    const target = modelTeams.get(name);
    const ownCase = target.pointFlags.length ? PbEq(target.pointFlags, target.pointWeights, finalPoints - target.pts) : Bool.val(finalPoints === target.pts);
    const contenders = [...modelTeams.values()].filter(team => team !== target)
      .map(team => pointsAtLeast(team, finalPoints + (kind === 'clasifica' ? 1 : 0)));
    const pointRank = kind === 'clasifica' ? PbLe(contenders, contenders.map(() => 1), snapshot.plazasTotales - 1)
      : PbGe(contenders, contenders.map(() => 1), snapshot.plazasTotales);
    const abstract = await pointsSolver.check(ownCase, pointRank);
    if (abstract === 'unsat') return { status: 'unsat' };
    const goalCondition = kind === 'clasifica' ? rank.canQualify : rank.canFail;
    if (abstract === 'sat') {
      const model = pointsSolver.model();
      const outcomes = games.map(game => model.eval(game.homeWin, true).toString() === 'true' ? 1 : model.eval(game.awayWin, true).toString() === 'true' ? 2 : 0);
      const simple = minimalWitness(outcomes, name);
      if (!constraintsForTest && verifyWitness(snapshot, simple, name, kind)) return { status: 'sat', witness: simple };
      const refined = await check([ownPoints, goalCondition, ...games.map((game, index) => game.outcome.eq(outcomes[index]))], name);
      if (refined.status === 'sat') return refined;
    }
    return check([ownPoints, goalCondition], name);
  };
  // Validate source flags rather than silently changing the app's classification.
  for (const name of [...snapshot.clasificadosAsegurados, ...snapshot.eliminadosAsegurados]) {
    const team = modelTeams.get(name);
    const others = [...modelTeams.values()].filter(row => row !== team);
    const qualified = snapshot.clasificadosAsegurados.includes(name);
    const provenByPoints = qualified
      ? others.filter(other => other.maxPoints >= team.pts).length < snapshot.plazasTotales
      : others.filter(other => other.pts > team.maxPoints).length >= snapshot.plazasTotales;
    if (provenByPoints) continue;
    const result = await check([qualified ? rankFor(name).canFail : rankFor(name).canQualify], name);
    if (result.status !== 'unsat') {
      emit({ type: 'invalid', motivo: result.status === 'sat' ? 'Una exclusión de la tabla no está asegurada bajo todos los desempates del modelo.' : 'No se pudo verificar una exclusión de la tabla dentro del presupuesto.' });
      return { checks, complete: false };
    }
  }
  emit({ type: 'verified' });
  const tasks = snapshot.equipos.flatMap((report, teamIndex) => report.casos.map((row, caseIndex) => ({ report, row, teamIndex, caseIndex })));
  // Round-robin: a slow case cannot consume the entire report before other candidates are considered.
  tasks.sort((a, b) => a.caseIndex - b.caseIndex || a.teamIndex - b.teamIndex);
  const deferred = [];
  async function solveTask(task, prior = {}) {
    const { report, row, teamIndex, caseIndex } = task;
    const team = modelTeams.get(report.equipo);
    const others = [...modelTeams.values()].filter(other => other !== team);
    const ownPoints = team.finalPoints.eq(row.puntosFinales);
    let qualify = prior.qualify, fail = prior.fail;
    if (others.filter(other => other.pts > row.puntosFinales).length >= snapshot.plazasTotales) {
      qualify = { status: 'unsat' };
    } else if (others.filter(other => other.maxPoints >= row.puntosFinales).length < snapshot.plazasTotales) {
      fail = { status: 'unsat' };
    } else {
      const rank = rankFor(report.equipo);
      if (!qualify || qualify.status === 'unknown') qualify = await checkCase(ownPoints, rank, 'clasifica', report.equipo, row.puntosFinales);
      if (!fail || fail.status === 'unknown') fail = await checkCase(ownPoints, rank, 'quedaFuera', report.equipo, row.puntosFinales);
    }
    const state = qualify?.status === 'unsat' ? 'sin_opcion_bajo_este_caso'
      : fail?.status === 'unsat' ? 'asegura_su_lugar'
        : qualify?.status === 'sat' && fail?.status === 'sat' ? 'depende_de_otros_resultados' : 'no_verificado';
    if (qualify?.witness && !verifyWitness(snapshot, qualify.witness, report.equipo, 'clasifica') ||
        fail?.witness && !verifyWitness(snapshot, fail.witness, report.equipo, 'quedaFuera')) throw new Error('Invalid solver witness');
    for (const proof of [qualify?.witness, fail?.witness]) {
      if (proof && proof.tabla.find(team => team.equipo === report.equipo).pts !== row.puntosFinales) throw new Error('Invalid own points in witness');
    }
    const examples = [];
    const feasible = qualify?.witness;
    if (feasible) {
      const target = feasible.tabla.find(row => row.equipo === report.equipo);
      for (const rival of feasible.tabla.filter(row => row.equipo !== target.equipo && row.pts === target.pts && snapshot.candidatos.includes(row.equipo))) {
        const rivalBase = modelTeams.get(rival.equipo);
        if (!Number.isSafeInteger(rival.dg) || !Number.isSafeInteger(rival.dg - team.dg + 1)) continue;
        const margin = rival.dg - team.dg + 1;
        const gfOffset = rivalBase.gf - team.gf + 1;
        if (![margin, margin - 1, rival.dg + 1, gfOffset].every(Number.isSafeInteger)) continue;
        examples.push({ rival: rival.equipo, supuesto: { puntosFinalesIguales: target.pts, saldoFuturoRival: rival.dg - rivalBase.dg },
          margenAcumuladoPropioParaSuperarPorDG: margin,
          margenAcumuladoPropioParaIgualarDG: margin - 1,
          diferenciaFinalRival: rival.dg,
          diferenciaFinalPropiaConUmbral: rival.dg + 1,
          golesFuturosPropiosSobreRivalSiIgualanDG: gfOffset,
          explicacion: `Si ambos terminan con ${target.pts} puntos y ${rival.equipo} tiene saldo futuro ${rival.dg - rivalBase.dg}, ${team.equipo} supera su DG con margen acumulado >= ${margin}. Con margen ${margin - 1}, igualan la DG final en ${rival.dg}; entonces GF futuros propios >= GF futuros del rival + (${gfOffset}) permite superarlo por GF. Si también igualan GF, el desempate queda indeterminado.`,
          alcance: 'Los supuestos del rival proceden de un escenario hipotético verificado. Las desigualdades son condiciones suficientes para superar solo a ese rival: no prueban por sí solas la alcanzabilidad del margen ni aseguran una plaza. No son pronósticos.' });
      }
    }
    const value = { ...row, estado: state,
      verificacion: { clasificacion: qualify?.status ?? 'deducido_por_cotas', quedaFuera: fail?.status ?? 'deducido_por_cotas' },
      ejemplosDesempate: examples,
      empateTotalPendienteEnTestigos: Boolean(qualify?.witness?.empateTotalEnCorte || fail?.witness?.empateTotalEnCorte),
    };
    emit({ type: 'case', teamIndex, caseIndex, value, evidence: { clasifica: qualify?.witness, quedaFuera: fail?.witness } });
    return { value, qualify, fail };
  }
  for (const task of tasks) {
    if (performance.now() >= deadline - 30) break;
    const result = await solveTask(task);
    if (result.value.estado === 'no_verificado') deferred.push({ task, ...result });
  }
  for (const item of deferred) {
    if (performance.now() >= deadline - 30) break;
    await solveTask(item.task, item);
  }
  return { checks, complete: performance.now() < deadline - 30 };
}
